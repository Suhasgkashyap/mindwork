#!/usr/bin/env node
/**
 * MindWork macOS Desktop Application Tracker
 * 
 * Privacy Architecture:
 * - Queries ONLY localized process name / frontmost application via NSWorkspace / JXA
 * - Queries hardware idle duration via IOHIDSystem
 * - ZERO keystroke logging, ZERO screen captures, ZERO URLs or private contents
 * - Whitelists permitted applications (VS Code, Chrome, Safari, Terminal, MySQL Workbench, Figma, Slack, Finder)
 */

import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

const SERVER_URL = process.env.MINDWORK_SERVER_URL || 'http://localhost:3000';
const TARGET_EMPLOYEE_ID = process.env.MINDWORK_EMPLOYEE_ID || 'emp_alice';
const POLL_INTERVAL_MS = 2000;

const PERMITTED_APPS: Record<string, string> = {
  code: 'VS Code',
  'visual studio code': 'VS Code',
  vscode: 'VS Code',
  'vs code': 'VS Code',
  chrome: 'Chrome',
  'google chrome': 'Chrome',
  safari: 'Safari',
  terminal: 'Terminal',
  iterm: 'Terminal',
  iterm2: 'Terminal',
  alacritty: 'Terminal',
  kitty: 'Terminal',
  warp: 'Terminal',
  mysqlworkbench: 'MySQL Workbench',
  'mysql workbench': 'MySQL Workbench',
  workbench: 'MySQL Workbench',
  figma: 'Figma',
  slack: 'Slack',
  finder: 'Finder'
};

function normalizePermittedApp(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (PERMITTED_APPS[cleaned]) return PERMITTED_APPS[cleaned];
  for (const [key, canonical] of Object.entries(PERMITTED_APPS)) {
    if (cleaned === key || cleaned.includes(key)) return canonical;
  }
  return null;
}

async function checkAccessibilityPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') return false;
  try {
    const cmd = `osascript -l JavaScript -e 'ObjC.import("ApplicationServices"); $.AXIsProcessTrusted();'`;
    const { stdout } = await execAsync(cmd, { timeout: 2500 });
    return stdout.trim().toLowerCase() === 'true';
  } catch {
    try {
      const alt = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
      await execAsync(alt, { timeout: 2500 });
      return true;
    } catch {
      return false;
    }
  }
}

async function getFrontmostApp(): Promise<string | null> {
  if (process.platform !== 'darwin') return null;
  try {
    const jxaCmd = `osascript -l JavaScript -e 'ObjC.import("AppKit"); try { const app = $.NSWorkspace.sharedWorkspace.frontmostApplication; app ? app.localizedName.js : ""; } catch(e) { "" }'`;
    const { stdout } = await execAsync(jxaCmd, { timeout: 2000 });
    const name = stdout.trim();
    if (name) return name;
  } catch {}

  try {
    const appleScriptCmd = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
    const { stdout } = await execAsync(appleScriptCmd, { timeout: 2000 });
    return stdout.trim() || null;
  } catch {}

  return null;
}

async function getIdleSeconds(): Promise<number> {
  if (process.platform !== 'darwin') return 0;
  try {
    const cmd = `ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print int($NF/1000000000); exit}'`;
    const { stdout } = await execAsync(cmd, { timeout: 2000 });
    const sec = parseInt(stdout.trim(), 10);
    return isNaN(sec) ? 0 : sec;
  } catch {
    return 0;
  }
}

async function sendTelemetry(payload: any) {
  try {
    await fetch(`${SERVER_URL}/api/telemetry/tracker-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err: any) {
    // Backend may be starting or offline
  }
}

async function main() {
  console.log('=====================================================');
  console.log('MindWork Live Desktop Application Tracker (macOS)');
  console.log(`Server: ${SERVER_URL} | Target: ${TARGET_EMPLOYEE_ID}`);
  console.log('=====================================================');

  if (process.platform !== 'darwin') {
    console.warn(`[WARNING] Current platform is ${process.platform}. macOS is required for native NSWorkspace tracking.`);
    console.warn('The tracker will report "Tracking Unavailable" to the server.');
    await sendTelemetry({
      app_name: '',
      accessibility_granted: false,
      employee_id: TARGET_EMPLOYEE_ID
    });
    return;
  }

  let lastApp: string | null = null;
  let hasWarnedPermission = false;

  async function tick() {
    const isTrusted = await checkAccessibilityPermission();

    if (!isTrusted) {
      if (!hasWarnedPermission) {
        console.warn('\n[PERMISSION REQUIRED] macOS Accessibility authorization not yet granted!');
        console.warn('To enable live desktop tracking:');
        console.warn('  1. Open System Settings > Privacy & Security > Accessibility');
        console.warn('  2. Enable your Terminal / Node.js application.');
        console.warn('  3. MindWork only queries application names — no keystrokes or URLs.\n');
        hasWarnedPermission = true;
      }
      await sendTelemetry({
        app_name: '',
        accessibility_granted: false,
        employee_id: TARGET_EMPLOYEE_ID
      });
      return;
    }

    if (hasWarnedPermission) {
      console.log('[SUCCESS] macOS Accessibility permission detected & verified!');
      hasWarnedPermission = false;
    }

    const rawApp = await getFrontmostApp();
    const idleSec = await getIdleSeconds();
    const canonicalApp = normalizePermittedApp(rawApp);
    const isActive = idleSec < 60;

    if (canonicalApp) {
      if (canonicalApp !== lastApp) {
        console.log(`[MindWork Tracker] Switched to permitted app: ${canonicalApp} (Raw: "${rawApp}")`);
        lastApp = canonicalApp;
      }

      await sendTelemetry({
        app_name: canonicalApp,
        duration_seconds: 2,
        active_seconds: isActive ? 2 : 0,
        idle_seconds: isActive ? 0 : 2,
        is_active: isActive,
        idle_seconds_raw: idleSec,
        accessibility_granted: true,
        employee_id: TARGET_EMPLOYEE_ID
      });
    } else {
      if (lastApp !== null) {
        console.log(`[MindWork Tracker] Switched away from permitted apps (Current: "${rawApp || 'Desktop'}"). Tracking paused.`);
        lastApp = null;
      }

      await sendTelemetry({
        app_name: '',
        accessibility_granted: true,
        employee_id: TARGET_EMPLOYEE_ID
      });
    }
  }

  // Initial tick
  await tick();
  setInterval(tick, POLL_INTERVAL_MS);
}

main().catch(console.error);
