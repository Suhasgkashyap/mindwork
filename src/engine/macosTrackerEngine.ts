import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export const PERMITTED_DESKTOP_APPS: Record<string, string> = {
  // VS Code variations
  code: 'VS Code',
  'visual studio code': 'VS Code',
  vscode: 'VS Code',
  'vs code': 'VS Code',

  // Chrome
  chrome: 'Chrome',
  'google chrome': 'Chrome',
  'google chrome canary': 'Chrome',

  // Safari
  safari: 'Safari',
  'safari technology preview': 'Safari',

  // Terminal
  terminal: 'Terminal',
  iterm: 'Terminal',
  iterm2: 'Terminal',
  alacritty: 'Terminal',
  kitty: 'Terminal',
  warp: 'Terminal',

  // MySQL Workbench
  mysqlworkbench: 'MySQL Workbench',
  'mysql workbench': 'MySQL Workbench',
  workbench: 'MySQL Workbench',

  // Figma
  figma: 'Figma',
  'figma beta': 'Figma',

  // Slack
  slack: 'Slack',

  // Finder
  finder: 'Finder'
};

/**
 * Normalizes a raw macOS process name or application title to a canonical permitted name.
 * Strictly returns null if the application is not in the permitted whitelist.
 */
export function normalizePermittedApp(rawName: string | null | undefined): string | null {
  if (!rawName) return null;
  const cleaned = rawName.trim().toLowerCase();
  
  if (PERMITTED_DESKTOP_APPS[cleaned]) {
    return PERMITTED_DESKTOP_APPS[cleaned];
  }

  for (const [key, canonical] of Object.entries(PERMITTED_DESKTOP_APPS)) {
    if (cleaned === key || cleaned.includes(key) || key.includes(cleaned)) {
      return canonical;
    }
  }

  return null;
}

export interface MacOsTrackerStatus {
  telemetry_state: 'Live Tracking Active' | 'Tracking Permission Required' | 'Tracking Unavailable' | 'Demo Data';
  macos_accessibility_required: boolean;
  macos_accessibility_granted: boolean;
  active_app: string | null;
  raw_active_app: string | null;
  is_active_input: boolean;
  idle_seconds: number;
  last_check_timestamp: string;
  target_employee_id: string;
  source: 'native_daemon' | 'external_agent' | 'none';
  permission_instructions?: string;
}

export class MacOsTrackerEngine {
  private db: any;
  private intervalTimer: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;

  private targetEmployeeId: string = 'emp_alice';
  private currentPermittedApp: string | null = null;
  private currentSegmentStart: string | null = null;
  private isAccessibilityGranted: boolean = false;
  private lastHeartbeatTime: number = 0;
  private lastIdleSeconds: number = 0;
  private lastRawApp: string | null = null;
  private source: 'native_daemon' | 'external_agent' | 'none' = 'none';

  constructor(db: any) {
    this.db = db;
    this.ensureSchemaColumns();
  }

  private ensureSchemaColumns() {
    try {
      this.db.prepare('ALTER TABLE application_usage ADD COLUMN app_start_time TEXT').run();
    } catch {}
    try {
      this.db.prepare('ALTER TABLE application_usage ADD COLUMN app_end_time TEXT').run();
    } catch {}
  }

  public setTargetEmployee(employeeId: string) {
    if (employeeId && employeeId !== this.targetEmployeeId) {
      // Finalize current segment before switching target
      this.finalizeCurrentSegment();
      this.targetEmployeeId = employeeId;
    }
  }

  public getTargetEmployee(): string {
    return this.targetEmployeeId;
  }

  /**
   * Checks whether macOS Accessibility authorization (AXIsProcessTrusted) is granted.
   * If false, queries System Settings instructions.
   */
  public async checkAccessibilityPermission(): Promise<boolean> {
    if (process.platform !== 'darwin') {
      return false;
    }

    try {
      // Direct JXA AXIsProcessTrusted check
      const cmd = `osascript -l JavaScript -e 'ObjC.import("ApplicationServices"); $.AXIsProcessTrusted();'`;
      const { stdout } = await execAsync(cmd, { timeout: 2500 });
      return stdout.trim().toLowerCase() === 'true';
    } catch (err) {
      // Fallback check: attempt simple frontmost process lookup via System Events
      try {
        const altCmd = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
        await execAsync(altCmd, { timeout: 2500 });
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Queries the frontmost macOS application name via NSWorkspace / JXA.
   * Does NOT capture window titles, URLs, file contents, or screen pixels.
   */
  public async queryFrontmostApplication(): Promise<string | null> {
    if (process.platform !== 'darwin') {
      return null;
    }

    try {
      // NSWorkspace frontmostApplication localizedName
      const jxaCmd = `osascript -l JavaScript -e 'ObjC.import("AppKit"); try { const app = $.NSWorkspace.sharedWorkspace.frontmostApplication; app ? app.localizedName.js : ""; } catch(e) { "" }'`;
      const { stdout } = await execAsync(jxaCmd, { timeout: 2000 });
      const name = stdout.trim();
      if (name) return name;
    } catch {}

    try {
      // Fallback: System Events
      const appleScriptCmd = `osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`;
      const { stdout } = await execAsync(appleScriptCmd, { timeout: 2000 });
      const name = stdout.trim();
      if (name) return name;
    } catch {}

    return null;
  }

  /**
   * Queries system idle duration in seconds from IOHIDSystem.
   * Pure hardware timing since last mouse or keyboard input — zero keystroke content collected.
   */
  public async querySystemIdleSeconds(): Promise<number> {
    if (process.platform !== 'darwin') {
      return 0;
    }

    try {
      const cmd = `ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print int($NF/1000000000); exit}'`;
      const { stdout } = await execAsync(cmd, { timeout: 2000 });
      const sec = parseInt(stdout.trim(), 10);
      return isNaN(sec) ? 0 : sec;
    } catch {
      return 0;
    }
  }

  /**
   * Ensures an active, open live work session exists for the target employee (is_demo_seed = 0).
   */
  public getOrCreateActiveWorkSession(employeeId: string): any {
    const existing = this.db.prepare(`
      SELECT * FROM work_sessions
      WHERE employee_id = ? AND (logout_time = '' OR logout_time IS NULL) AND is_demo_seed = 0
      ORDER BY login_time DESC LIMIT 1
    `).get(employeeId);

    if (existing) return existing;

    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10);
    const nowStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const sessionId = 'ws_live_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);

    this.db.prepare(`
      INSERT INTO work_sessions (id, employee_id, date, login_time, logout_time, total_working_hours, active_hours, idle_hours, is_demo_seed)
      VALUES (?, ?, ?, ?, '', 0.0, 0.0, 0.0, 0)
    `).run(sessionId, employeeId, dateStr, nowStr);

    return this.db.prepare('SELECT * FROM work_sessions WHERE id = ?').get(sessionId);
  }

  /**
   * Records or increments application telemetry for a tick interval.
   */
  public recordAppTick(
    canonicalApp: string,
    isActive: boolean,
    tickSeconds: number,
    startIso?: string,
    endIso?: string
  ) {
    const session = this.getOrCreateActiveWorkSession(this.targetEmployeeId);
    if (!session) return;

    const nowStr = endIso || new Date().toISOString().replace('T', ' ').substring(0, 19);
    const startTimeStr = startIso || this.currentSegmentStart || nowStr;

    const addActiveSec = isActive ? tickSeconds : 0;
    const addIdleSec = isActive ? 0 : tickSeconds;

    const existingAppUsage = this.db.prepare(`
      SELECT * FROM application_usage
      WHERE work_session_id = ? AND app_name = ?
      LIMIT 1
    `).get(session.id, canonicalApp);

    if (existingAppUsage) {
      const updatedActive = existingAppUsage.active_seconds + addActiveSec;
      const updatedIdle = existingAppUsage.idle_seconds + addIdleSec;
      const updatedDuration = updatedActive + updatedIdle;
      const initialStart = existingAppUsage.app_start_time || startTimeStr;

      this.db.prepare(`
        UPDATE application_usage
        SET active_seconds = ?, idle_seconds = ?, duration_seconds = ?,
            app_start_time = ?, app_end_time = ?
        WHERE id = ?
      `).run(updatedActive, updatedIdle, updatedDuration, initialStart, nowStr, existingAppUsage.id);
    } else {
      const appUsageId = 'app_live_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      const totalSec = addActiveSec + addIdleSec;

      this.db.prepare(`
        INSERT INTO application_usage (
          id, work_session_id, employee_id, app_name, duration_seconds, active_seconds, idle_seconds, is_demo_seed, app_start_time, app_end_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        appUsageId,
        session.id,
        this.targetEmployeeId,
        canonicalApp,
        totalSec,
        addActiveSec,
        addIdleSec,
        startTimeStr,
        nowStr
      );
    }

    // Recompute work_session overall hours
    const totals = this.db.prepare(`
      SELECT COALESCE(SUM(active_seconds), 0) as total_active_sec,
             COALESCE(SUM(idle_seconds), 0) as total_idle_sec
      FROM application_usage
      WHERE work_session_id = ?
    `).get(session.id);

    const activeHours = Math.round((totals.total_active_sec / 3600.0) * 100) / 100;
    const idleHours = Math.round((totals.total_idle_sec / 3600.0) * 100) / 100;
    const totalWorkingHours = Math.round(((totals.total_active_sec + totals.total_idle_sec) / 3600.0) * 100) / 100;

    this.db.prepare(`
      UPDATE work_sessions
      SET active_hours = ?, idle_hours = ?, total_working_hours = ?
      WHERE id = ?
    `).run(activeHours, idleHours, totalWorkingHours, session.id);
  }

  private finalizeCurrentSegment() {
    if (this.currentPermittedApp && this.currentSegmentStart) {
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      try {
        const session = this.getOrCreateActiveWorkSession(this.targetEmployeeId);
        if (session) {
          this.db.prepare(`
            UPDATE application_usage
            SET app_end_time = ?
            WHERE work_session_id = ? AND app_name = ?
          `).run(nowStr, session.id, this.currentPermittedApp);
        }
      } catch {}
    }
    this.currentPermittedApp = null;
    this.currentSegmentStart = null;
  }

  /**
   * One iteration of live desktop tracking polling.
   */
  public async pollTick() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const isTrusted = await this.checkAccessibilityPermission();
      this.isAccessibilityGranted = isTrusted;

      if (!isTrusted) {
        this.finalizeCurrentSegment();
        return;
      }

      this.source = 'native_daemon';
      this.lastHeartbeatTime = Date.now();

      const rawApp = await this.queryFrontmostApplication();
      this.lastRawApp = rawApp;
      const canonicalApp = normalizePermittedApp(rawApp);
      const idleSec = await this.querySystemIdleSeconds();
      this.lastIdleSeconds = idleSec;
      const isActive = idleSec < 60; // Less than 60s without input = actively focused

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

      if (canonicalApp) {
        if (this.currentPermittedApp !== canonicalApp) {
          // Switched to a new permitted application
          this.finalizeCurrentSegment();
          this.currentPermittedApp = canonicalApp;
          this.currentSegmentStart = nowStr;
        }

        // Record a 2-second tick for this permitted application
        this.recordAppTick(canonicalApp, isActive, 2, this.currentSegmentStart || nowStr, nowStr);
      } else {
        // Active application is unmonitored / non-work — pause recording
        if (this.currentPermittedApp) {
          this.finalizeCurrentSegment();
        }
      }
    } catch (err) {
      console.error('[MacOsTrackerEngine] Poll tick error:', err);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Start native background tracking daemon if running on macOS.
   */
  public startNativePolling(intervalMs: number = 2000) {
    if (process.platform === 'darwin') {
      if (this.intervalTimer) clearInterval(this.intervalTimer);
      this.source = 'native_daemon';
      console.log('[MacOsTrackerEngine] Initialized native macOS application tracking loop.');
      this.intervalTimer = setInterval(() => {
        this.pollTick().catch(() => {});
      }, intervalMs);
    }
  }

  public stopNativePolling() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.finalizeCurrentSegment();
  }

  /**
   * Handle external tracker client reporting in from a remote or standalone macOS node process.
   */
  public handleExternalEvent(payload: {
    app_name: string;
    is_active?: boolean;
    idle_seconds?: number;
    duration_seconds?: number;
    active_seconds?: number;
    start_time?: string;
    end_time?: string;
    employee_id?: string;
    accessibility_granted?: boolean;
  }) {
    this.source = 'external_agent';
    this.lastHeartbeatTime = Date.now();
    this.isAccessibilityGranted = payload.accessibility_granted !== false;

    if (payload.employee_id) {
      this.targetEmployeeId = payload.employee_id;
    }

    if (payload.idle_seconds !== undefined) {
      this.lastIdleSeconds = payload.idle_seconds;
    }

    const canonicalApp = normalizePermittedApp(payload.app_name);
    this.lastRawApp = payload.app_name;

    if (canonicalApp) {
      const nowStr = payload.end_time || new Date().toISOString().replace('T', ' ').substring(0, 19);
      const startStr = payload.start_time || this.currentSegmentStart || nowStr;

      if (this.currentPermittedApp !== canonicalApp) {
        this.finalizeCurrentSegment();
        this.currentPermittedApp = canonicalApp;
        this.currentSegmentStart = startStr;
      }

      const activeSec = payload.active_seconds !== undefined
        ? payload.active_seconds
        : (payload.is_active !== false ? (payload.duration_seconds || 2) : 0);
      const idleSec = payload.idle_seconds !== undefined && payload.idle_seconds >= 60
        ? (payload.duration_seconds || 2)
        : 0;

      this.recordAppTick(canonicalApp, activeSec > 0, activeSec + idleSec, startStr, nowStr);
    } else {
      this.finalizeCurrentSegment();
    }
  }

  /**
   * Return comprehensive, authoritative status for dashboard.
   */
  public getStatus(): MacOsTrackerStatus {
    const isDarwin = process.platform === 'darwin';
    const isAgentActive = Date.now() - this.lastHeartbeatTime < 15000;

    let telemetry_state: 'Live Tracking Active' | 'Tracking Permission Required' | 'Tracking Unavailable' | 'Demo Data' =
      'Tracking Unavailable';

    if (isDarwin || isAgentActive) {
      if (this.isAccessibilityGranted) {
        telemetry_state = 'Live Tracking Active';
      } else {
        telemetry_state = 'Tracking Permission Required';
      }
    } else {
      telemetry_state = 'Tracking Unavailable';
    }

    const instructions =
      'macOS requires explicit authorization in System Settings > Privacy & Security > Accessibility to query active frontmost application names via NSWorkspace. MindWork strictly queries application metadata and never collects keystrokes, URLs, or screen contents.';

    return {
      telemetry_state,
      macos_accessibility_required: true,
      macos_accessibility_granted: this.isAccessibilityGranted,
      active_app: this.currentPermittedApp,
      raw_active_app: this.lastRawApp,
      is_active_input: this.lastIdleSeconds < 60,
      idle_seconds: this.lastIdleSeconds,
      last_check_timestamp: new Date().toISOString(),
      target_employee_id: this.targetEmployeeId,
      source: isDarwin ? 'native_daemon' : isAgentActive ? 'external_agent' : 'none',
      permission_instructions: instructions
    };
  }
}
