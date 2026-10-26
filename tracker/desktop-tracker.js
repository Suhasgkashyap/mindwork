#!/usr/bin/env node
/**
 * MindWork – Multi-Laptop Standalone Desktop Tracker
 * 
 * Cross-Platform (macOS, Windows, Linux) Employee Workplace Activity Client
 * Features:
 * - Transparent UI Controls: Start, Pause, Resume, Stop
 * - Server URL & Employee ID configuration
 * - Offline Buffer Queue: stores events locally when offline, flushes automatically on reconnect
 * - Strict Privacy-Preserving Architecture:
 *   * Only Permitted Application Names (VS Code, Chrome, Terminal, Safari, MySQL Workbench, Figma, Slack, Finder)
 *   * ZERO Keystrokes, ZERO URLs, ZERO Screen Captures, ZERO Private Contents
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

// Configuration Defaults
let SERVER_URL = process.env.MINDWORK_SERVER_URL || 'http://localhost:3000';
let EMPLOYEE_ID = process.env.MINDWORK_EMPLOYEE_ID || 'emp_alice';
let POLL_INTERVAL_MS = 3000;
let LOCAL_CONTROL_PORT = 3100;

// State
let isRunning = false;
let isPaused = false;
let activeAppName = 'None';
let idleSeconds = 0;
let lastAppName = null;
let appStartEpoch = Date.now();
let offlineQueue = [];
const QUEUE_FILE = path.resolve(__dirname, 'offline_queue.json');

// Permitted Application Whitelist
const PERMITTED_APPS = {
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
  powershell: 'Terminal',
  cmd: 'Terminal',
  bash: 'Terminal',
  alacritty: 'Terminal',
  kitty: 'Terminal',
  warp: 'Terminal',
  mysqlworkbench: 'MySQL Workbench',
  'mysql workbench': 'MySQL Workbench',
  workbench: 'MySQL Workbench',
  figma: 'Figma',
  slack: 'Slack',
  finder: 'Finder',
  explorer: 'Finder'
};

function normalizePermittedApp(raw) {
  if (!raw) return null;
  const cleaned = raw.trim().toLowerCase();
  if (PERMITTED_APPS[cleaned]) return PERMITTED_APPS[cleaned];
  for (const [key, canonical] of Object.entries(PERMITTED_APPS)) {
    if (cleaned === key || cleaned.includes(key)) return canonical;
  }
  return null;
}

// Load offline queue
try {
  if (fs.existsSync(QUEUE_FILE)) {
    const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
    offlineQueue = JSON.parse(raw) || [];
  }
} catch (e) {
  offlineQueue = [];
}

function persistQueue() {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(offlineQueue, null, 2));
  } catch (e) {}
}

// Cross-Platform Active Application Detection
async function getFrontmostApp() {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      const jxa = `osascript -l JavaScript -e 'ObjC.import("AppKit"); try { const a = $.NSWorkspace.sharedWorkspace.frontmostApplication; a ? a.localizedName.js : ""; } catch(e) { "" }'`;
      const { stdout } = await execAsync(jxa, { timeout: 2000 });
      return stdout.trim() || null;
    } else if (platform === 'win32') {
      // Windows PowerShell frontmost window query
      const ps = `powershell "Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Select-Object -ExpandProperty ProcessName"`;
      const { stdout } = await execAsync(ps, { timeout: 2000 });
      const first = stdout.trim().split(/\r?\n/)[0];
      return first ? first.trim() : null;
    } else if (platform === 'linux') {
      // Linux xdotool or wmctrl query
      try {
        const { stdout } = await execAsync('xdotool getwindowfocus getwindowname', { timeout: 1500 });
        return stdout.trim() || null;
      } catch {
        return null;
      }
    }
  } catch (err) {
    return null;
  }
  return null;
}

// Cross-Platform Idle Seconds
async function getIdleTimeSeconds() {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      const cmd = `ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print int($NF/1000000000); exit}'`;
      const { stdout } = await execAsync(cmd, { timeout: 1500 });
      const val = parseInt(stdout.trim(), 10);
      return isNaN(val) ? 0 : val;
    }
  } catch {}
  return 0;
}

// Send or Buffer Telemetry Event
async function postTelemetry(eventPayload) {
  const urlObj = new URL(`${SERVER_URL}/api/telemetry/tracker-event`);
  const isHttps = urlObj.protocol === 'https:';
  const transport = isHttps ? https : http;

  const bodyData = JSON.stringify(eventPayload);

  return new Promise((resolve) => {
    const req = transport.request(
      urlObj,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyData),
        },
        timeout: 4000,
      },
      (res) => {
        let respBody = '';
        res.on('data', (c) => (respBody += c));
        res.on('end', () => {
          resolve(res.statusCode >= 200 && res.statusCode < 300);
        });
      }
    );

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.write(bodyData);
    req.end();
  });
}

// Flush buffered events when network is reconnected
async function flushOfflineQueue() {
  if (offlineQueue.length === 0) return;
  console.log(`[Offline Sync] Attempting to flush ${offlineQueue.length} queued events...`);

  const batch = offlineQueue.slice(0, 50);
  const success = await postTelemetry({ events: batch });

  if (success) {
    offlineQueue = offlineQueue.slice(batch.length);
    persistQueue();
    console.log(`[Offline Sync] Successfully uploaded ${batch.length} buffered events. Remaining: ${offlineQueue.length}`);
  }
}

// Periodic tick
async function trackingTick() {
  if (!isRunning || isPaused) return;

  try {
    const raw = await getFrontmostApp();
    const idle = await getIdleTimeSeconds();
    idleSeconds = idle;

    const canonical = normalizePermittedApp(raw);
    activeAppName = canonical || 'Non-Work App';

    const nowEpoch = Date.now();
    const duration = Math.max(1, Math.floor((nowEpoch - appStartEpoch) / 1000));

    const payload = {
      employee_id: EMPLOYEE_ID,
      app_name: activeAppName,
      duration_seconds: duration,
      idle_seconds: idleSeconds,
      is_active_input: idleSeconds < 60,
      timestamp: new Date().toISOString(),
      platform: process.platform,
    };

    const sent = await postTelemetry(payload);
    if (!sent) {
      // Buffer in offline queue
      offlineQueue.push(payload);
      if (offlineQueue.length > 500) offlineQueue.shift();
      persistQueue();
    } else {
      // Connected! Flush queue if anything is buffered
      await flushOfflineQueue();
    }

    if (raw !== lastAppName) {
      lastAppName = raw;
      appStartEpoch = nowEpoch;
    }
  } catch (err) {
    console.error('[Tracker Tick Error]:', err.message);
  }
}

let tickTimer = null;
function startTracking() {
  if (isRunning) return;
  isRunning = true;
  isPaused = false;
  appStartEpoch = Date.now();
  tickTimer = setInterval(trackingTick, POLL_INTERVAL_MS);
  console.log(`[Tracker Started] Monitoring active apps for ${EMPLOYEE_ID} -> ${SERVER_URL}`);
}

function pauseTracking() {
  isPaused = true;
  console.log('[Tracker Paused]');
}

function resumeTracking() {
  isPaused = false;
  appStartEpoch = Date.now();
  console.log('[Tracker Resumed]');
}

function stopTracking() {
  isRunning = false;
  isPaused = false;
  if (tickTimer) clearInterval(tickTimer);
  console.log('[Tracker Stopped]');
}

// Built-in Local Web Control UI on http://localhost:3100
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${LOCAL_CONTROL_PORT}`);

  if (url.pathname === '/api/control') {
    const action = url.searchParams.get('action');
    if (action === 'start') startTracking();
    else if (action === 'pause') pauseTracking();
    else if (action === 'resume') resumeTracking();
    else if (action === 'stop') stopTracking();

    const newUrl = url.searchParams.get('server_url');
    if (newUrl) SERVER_URL = newUrl;
    const newEmp = url.searchParams.get('employee_id');
    if (newEmp) EMPLOYEE_ID = newEmp;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        isRunning,
        isPaused,
        activeAppName,
        idleSeconds,
        offlineQueueLength: offlineQueue.length,
        SERVER_URL,
        EMPLOYEE_ID,
      })
    );
  }

  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        isRunning,
        isPaused,
        activeAppName,
        idleSeconds,
        offlineQueueLength: offlineQueue.length,
        SERVER_URL,
        EMPLOYEE_ID,
      })
    );
  }

  // Render Control Dashboard HTML
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MindWork – Desktop Activity Tracker</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF7F0; color: #1C1917; margin: 0; padding: 24px; }
    .card { background: white; border: 1px solid #DDD5C5; border-radius: 16px; padding: 24px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    h1 { font-size: 20px; color: #2D4A36; margin-top: 0; display: flex; align-items: center; gap: 8px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: bold; background: #EBF1ED; color: #2D4A36; }
    .btn { padding: 10px 16px; border-radius: 10px; font-weight: bold; font-size: 13px; cursor: pointer; border: none; margin-right: 8px; }
    .btn-green { background: #2D4A36; color: white; }
    .btn-orange { background: #EA580C; color: white; }
    .btn-outline { background: white; border: 1px solid #DDD5C5; color: #44403C; }
    .field { margin-bottom: 14px; }
    label { display: block; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #78716C; margin-bottom: 4px; }
    input { width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 8px; border: 1px solid #DDD5C5; font-size: 13px; }
    .privacy { background: #F8F5EE; border: 1px solid #E8E2D5; border-radius: 12px; padding: 14px; font-size: 12px; margin-top: 20px; line-height: 1.5; color: #57534E; }
  </style>
</head>
<body>
  <div class="card">
    <h1>MindWork Desktop Activity Tracker</h1>
    <p style="font-size: 13px; color: #78716C;">Multi-Laptop Workplace Telemetry Client</p>

    <div style="margin: 16px 0; padding: 14px; background: #F4F8F5; border: 1px solid #D1E0D5; border-radius: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; font-weight: bold;">Status:</span>
        <span id="status-badge" class="badge">${isRunning ? (isPaused ? 'PAUSED' : 'TRACKING ACTIVE') : 'STOPPED'}</span>
      </div>
      <div style="margin-top: 8px; font-size: 13px;">
        <strong>Active App:</strong> <span id="active-app">${activeAppName}</span>
      </div>
      <div style="margin-top: 4px; font-size: 12px; color: #78716C;">
        Offline Queue Buffer: <span id="queue-count">${offlineQueue.length}</span> events
      </div>
    </div>

    <div class="field">
      <label>Shared Server URL</label>
      <input type="text" id="serverUrl" value="${SERVER_URL}">
    </div>

    <div class="field">
      <label>Employee ID</label>
      <input type="text" id="employeeId" value="${EMPLOYEE_ID}">
    </div>

    <div style="margin-top: 18px;">
      <button class="btn btn-green" onclick="control('start')">▶ Start Tracking</button>
      <button class="btn btn-orange" onclick="control('pause')">⏸ Pause</button>
      <button class="btn btn-outline" onclick="control('resume')">⏯ Resume</button>
      <button class="btn btn-outline" onclick="control('stop')">⏹ Stop</button>
    </div>

    <div class="privacy">
      <strong>🔒 Transparent Privacy Guarantee:</strong>
      <ul style="margin: 6px 0 0 16px; padding: 0;">
        <li>Permitted tracked processes: VS Code, Chrome, Safari, Terminal, MySQL Workbench, Figma, Slack, Finder.</li>
        <li><strong>Strictly Prohibited:</strong> Keystrokes, URLs, screenshots, microphone/webcam, clipboard, documents.</li>
      </ul>
    </div>
  </div>

  <script>
    async function control(action) {
      const serverUrl = encodeURIComponent(document.getElementById('serverUrl').value);
      const employeeId = encodeURIComponent(document.getElementById('employeeId').value);
      const res = await fetch('/api/control?action=' + action + '&server_url=' + serverUrl + '&employee_id=' + employeeId);
      const data = await res.json();
      updateUI(data);
    }

    async function poll() {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        updateUI(data);
      } catch (e) {}
    }

    function updateUI(data) {
      const b = document.getElementById('status-badge');
      if (!data.isRunning) { b.textContent = 'STOPPED'; b.style.background = '#F3F4F6'; b.style.color = '#4B5563'; }
      else if (data.isPaused) { b.textContent = 'PAUSED'; b.style.background = '#FFEDD5'; b.style.color = '#EA580C'; }
      else { b.textContent = 'TRACKING ACTIVE'; b.style.background = '#EBF1ED'; b.style.color = '#2D4A36'; }

      document.getElementById('active-app').textContent = data.activeAppName;
      document.getElementById('queue-count').textContent = data.offlineQueueLength;
    }

    setInterval(poll, 2500);
  </script>
</body>
</html>`);
});

server.listen(LOCAL_CONTROL_PORT, () => {
  console.log(`=============================================================`);
  console.log(`MindWork Desktop Tracker started!`);
  console.log(`Local Control UI: http://localhost:${LOCAL_CONTROL_PORT}`);
  console.log(`Target Server:    ${SERVER_URL}`);
  console.log(`Employee ID:      ${EMPLOYEE_ID}`);
  console.log(`Platform:         ${process.platform}`);
  console.log(`=============================================================`);
  startTracking();
});
