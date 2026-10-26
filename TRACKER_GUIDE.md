# MindWork – Standalone Desktop Tracker Guide

The MindWork Standalone Desktop Tracker is a lightweight, cross-platform client (macOS, Windows, Linux) that runs locally on employee laptops to objectively record permitted workplace application telemetry without invasive surveillance.

---

## 1. Quick Start

### Step 1: Open Tracker Directory
```bash
cd tracker
```

### Step 2: Launch the Tracker
```bash
node desktop-tracker.js
```
*Or using npm:*
```bash
npm start
```

### Step 3: Access the Local Control Dashboard
Open your browser to:
```
http://localhost:3100
```

---

## 2. Configuration & UI Controls

| Control | Function |
|---|---|
| **Shared Server URL** | URL of the central MindWork backend (e.g. `http://192.168.1.150:3000` or `https://mindwork.onrender.com`) |
| **Employee ID** | Canonical employee identifier (`emp_alice`, `emp_priya`, `emp_rahul`, `emp_sneha`, or your registered ID) |
| **Start Tracking** | Initiates frontmost application polling and idle timer monitoring |
| **Pause** | Temporarily halts telemetry transmission (e.g. during breaks or personal errands) |
| **Resume** | Resumes telemetry polling |
| **Stop** | Fully halts tracking process |

---

## 3. Offline Buffer Queue

When an employee laptop disconnects from the internet or local Wi-Fi:
1. The tracker detects backend unreachability.
2. Events are automatically serialized into the local buffer queue (`tracker/offline_queue.json`).
3. As soon as the network connection is restored, the tracker flushes queued batches via `POST /api/telemetry/tracker-event` with `{ events: [...] }`.
4. No work activity duration is lost due to transient network drops.

---

## 4. Operating System Permissions Setup

### macOS
1. Open **System Settings** > **Privacy & Security** > **Accessibility**.
2. Click **+** and add your Terminal application (e.g., `Terminal`, `iTerm`, `VS Code`, or `Node`).
3. Toggle the permission switch to **ON**.
4. MindWork uses `NSWorkspace.frontmostApplication` and `IOHIDSystem` to read localized process names and hardware idle seconds.

### Windows
- No special administrator privileges required.
- Uses standard PowerShell window handle queries (`Get-Process | Where-Object {$_.MainWindowHandle -ne 0}`).

### Linux
- Ensure `xdotool` or `wmctrl` is installed for window name resolution:
  ```bash
  sudo apt-get install xdotool
  ```

---

## 5. Privacy-Preserving Architecture Guarantee

MindWork strictly collects application-level metadata only. Surveillance and invasive monitoring are cryptographically and architecturally blocked:

### Permitted Application Whitelist
- **VS Code / IDEs** (`VS Code`, `IntelliJ`, `Sublime`)
- **Web Browsers** (`Chrome`, `Safari`) – *Process name only*
- **Terminal & Shells** (`Terminal`, `iTerm`, `Warp`, `PowerShell`, `bash`)
- **Database Tools** (`MySQL Workbench`)
- **Design & Collaboration** (`Figma`, `Slack`)
- **File System** (`Finder`, `Explorer`)

### Strictly Prohibited & Blocked
- ❌ **ZERO Keystroke Logging** (no keystroke counts, keyloggers, or typing cadence)
- ❌ **ZERO Browser URLs** (domains, queries, and web history are never inspected)
- ❌ **ZERO Screenshots & Screen Recordings**
- ❌ **ZERO Clipboard Inspection**
- ❌ **ZERO Private Messages & Email Inspection**
- ❌ **ZERO Microphone & Webcam Access**
- ❌ **ZERO Document / File Body Reading**
