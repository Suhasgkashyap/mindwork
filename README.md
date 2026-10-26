# MindWork – Burnout Early Detection System & Real-Time Desktop Monitoring

MindWork is a production-grade, privacy-preserving employee performance, wellness, task tracking, and desktop application monitoring system. It combines secure multi-laptop synchronization, authoritative task stopwatches, ZIP work delivery submissions, rule-based task evaluation, and a frozen Random Forest burnout prediction model.

---

## Architecture & Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS (hosted by Express in production, or via Vite dev server).
- **Backend**: Node.js + Express + TypeScript (`server.ts`).
- **Database**: Persistent SQLite (`data/mindwork.db`) using native `node:sqlite`.
- **Desktop Monitoring Agent**: Standalone Node.js client (`tracker/desktop_agent.js`) for capturing permitted workplace application usage across macOS, Windows, and Linux.

---

## 1. Project Inspection & Capabilities

| Component | Status | Description |
|---|---|---|
| **Standalone Backend (`server.ts`)** | ✅ Fully Operational | Express server running on port 3000 with SQLite persistence, CORS, SSE real-time sync, and auth. |
| **Desktop Monitoring Agent (`tracker/desktop_agent.js`)** | ✅ Fully Operational | Multi-OS foreground app & idle detector with offline buffer queue (`offline_queue.json`) and auto-reconnect sync. |
| **Manager Dashboard** | ✅ Fully Operational | Live telemetry vs. 7-day demo baseline, team application usage distribution, deliverable review, and burnout risk metrics. |
| **Employee Portal** | ✅ Fully Operational | Task queue, authoritative task stopwatch (start, pause, resume, auto-pause conflicting tasks), ZIP work report submission, and burnout analytics. |
| **Privacy Compliance** | ✅ Enforced | Strictly collects permitted app names (VS Code, Chrome, Safari, Terminal, MySQL, Figma, Slack, Finder) and duration metadata. **Zero keystrokes, screenshots, URLs, or private messages.** |

---

## 2. Local Setup in VS Code (Outside AI Studio)

### Prerequisites
- Node.js v18 or later
- npm or yarn

### Step 1: Clone / Open Project in VS Code
Open the root project directory in VS Code.

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Backend & Frontend Dev Server
```bash
npm run dev
```
The server starts on `http://localhost:3000`. Open your browser to view the application.

---

## 3. Environment Variables

Create a `.env` file in the root directory (optional, defaults are provided):

```env
PORT=3000
DATABASE_PATH=data/mindwork.db
NODE_ENV=development
```

---

## 4. Standalone Desktop Monitoring Agent Setup (Employee Laptop)

To capture objective background application usage from an employee's laptop:

### Step 1: Navigate to Tracker Directory
```bash
cd tracker
npm install
```

### Step 2: Configure Environment Variables
Set the shared backend server URL and employee ID:
```bash
# On macOS / Linux:
export MINDWORK_SERVER_URL="http://192.168.1.150:3000"
export MINDWORK_EMPLOYEE_ID="emp_alice"

# On Windows (PowerShell):
$env:MINDWORK_SERVER_URL="http://192.168.1.150:3000"
$env:MINDWORK_EMPLOYEE_ID="emp_alice"
```

### Step 3: Start the Desktop Agent
```bash
npm start
```

---

## 5. Operating System Permissions Setup

### macOS
1. Open **System Settings > Privacy & Security > Accessibility**.
2. Click **+** and add your **Terminal** or **Node** process.
3. Toggle permission to **ON**. (MindWork uses `NSWorkspace` and `IOHIDSystem` to read frontmost process names and hardware idle seconds).

### Windows
- No special administrator privileges required. Uses standard PowerShell foreground window handle queries (`Get-Process`).

### Linux
- Ensure `xdotool` or `wmctrl` is installed for window name resolution:
  ```bash
  sudo apt-get install xdotool
  ```

---

## 6. Multi-Laptop Testing Procedure (Same Wi-Fi)

1. **Host Server (Manager Laptop)**:
   - Run `npm run dev` or `npm start` on Laptop A (Manager).
   - Find Laptop A's local IP address (e.g., `192.168.1.150`).
2. **Manager Dashboard**:
   - On Laptop A, open `http://192.168.1.150:3000` and log in as **Bob Manager** (`bob.manager@mindwork.io` / `mindwork123`).
3. **Employee Desktop Agent (Friend's Laptop)**:
   - On Laptop B (Friend / Employee), open the `tracker/` folder.
   - Set `MINDWORK_SERVER_URL="http://192.168.1.150:3000"` and `MINDWORK_EMPLOYEE_ID="emp_alice"`.
   - Run `npm start`.
4. **Verify Telemetry**:
   - Open VS Code, Terminal, and Chrome on Laptop B.
   - Observe the Manager Dashboard on Laptop A update in real time to show **Tracker Connected** and active application usage durations.

---

## 7. Cloud Deployment (Different Networks)

To connect laptops across different networks:
1. Deploy the repository to Render, Railway, or Fly.io with build command `npm run build` and start command `npm start`.
2. Ensure persistent disk storage is enabled for `data/mindwork.db`.
3. Set `MINDWORK_SERVER_URL` on employee laptops to your public deployment URL (e.g., `https://mindwork.onrender.com`).

---

## 8. Honest Platform Limitations
- **Browser Sandbox Limitation**: The web browser preview environment cannot inspect native OS foreground windows without running the local companion desktop agent (`tracker/desktop_agent.js`) on the physical employee laptop.
- **Experimental SQLite**: Node.js native SQLite (`node:sqlite`) logs an experimental warning harmlessly in development.
