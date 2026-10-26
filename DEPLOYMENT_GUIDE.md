# MindWork – Multi-Laptop Deployment & Operations Guide

This guide details how to deploy and operate the **MindWork – Burnout Early Detection System** across multiple laptops (Manager and Employee laptops connecting over the internet or local area network to the shared backend and SQLite database).

---

## 1. Multi-Laptop Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │        Hosted Backend Server           │
                      │       Node.js + Express + Vite         │
                      │  - CORS enabled (origin: true)         │
                      │  - Server-Sent Events (/api/events)    │
                      │  - SQLite Database (mindwork.db)       │
                      │  - ML Engine (burnout_random_forest)   │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │ (Internet / LAN via HTTPS or HTTP)            │
                 ▼                                               ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│         Manager Laptop          │             │        Employee Laptop(s)       │
│ - Bob Manager Web Dashboard     │             │ - Alice / Priya / Rahul / Sneha │
│ - Task Assignment & Criteria    │             │ - My Tasks & Active Stopwatch   │
│ - Supervised Team Directory     │             │ - Submit Report & Deliverables  │
│ - Deliverable Review & Approval │             │ - Desktop Activity Tracker      │
│ - Real-Time SSE Notifications   │             │ - Individual Burnout Analytics  │
└─────────────────────────────────┘             └─────────────────────────────────┘
```

---

## 2. Shared Backend Setup (Host Laptop or Cloud Server)

### Prerequisites
- Node.js v18 or later
- npm or yarn
- Python 3.9+ (optional for re-seeding script)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build Application
```bash
npm run build
```

### Step 3: Launch Host Server
```bash
npm start
```
The server binds to port `3000` (e.g. `http://0.0.0.0:3000` or `http://localhost:3000`).

---

## 3. Remote Laptop Network Access (Internet / LAN)

### Option A: Local Area Network (Same Wi-Fi / Office Network)
1. Find the host laptop's local IP address:
   - macOS / Linux: `ifconfig | grep "inet "` (e.g., `192.168.1.150`)
   - Windows: `ipconfig` (IPv4 Address)
2. On the **Manager Laptop** and **Employee Laptops**, open Chrome/Safari/Edge:
   ```
   http://192.168.1.150:3000
   ```

### Option B: Cloud Hosting (Render, Railway, Fly.io, AWS, DigitalOcean)
1. Push this repository to GitHub.
2. Deploy to Render or Railway with build command `npm run build` and start command `npm start`.
3. Set environment variable:
   ```
   NODE_ENV=production
   PORT=3000
   ```
4. Access the public URL (e.g., `https://mindwork.onrender.com`). Both Manager and Employee laptops connect to this same URL.

### Option C: Instant Cloudflare Tunnel or Ngrok (Zero-Config Public URL)
If running from your host laptop and connecting over mobile internet / separate networks:
```bash
# Using Cloudflare Tunnel:
npx cloudflared tunnel --url http://localhost:3000

# Or using ngrok:
ngrok http 3000
```
Share the resulting HTTPS URL with your team or friends.

---

## 4. Manager Laptop Workflow

1. Navigate to the app URL.
2. Log in as **Bob Manager** (`bob.manager@mindwork.io` / `mindwork123`).
3. Click **Sprint Tasks** -> **Assign New Task**:
   - Select the target employee (e.g., Alice).
   - Enter title, detailed instructions, priority, delivery deadline, and acceptance criteria.
   - Click **Assign Task**.
4. The employee is instantly notified on their laptop via real-time Server-Sent Events (SSE).
5. When an employee completes work and submits deliverables, Bob's dashboard displays a gold **Awaiting Review** counter and notification badge.
6. Open the task in **Supervised Team Directory** or **Sprint Tasks**, review the submission report, and click **Approve Deliverable** or **Request Corrections**.

---

## 5. Employee Laptop Workflow

1. Navigate to the app URL on the employee's laptop.
2. Log in as the assigned employee (e.g., **Alice** `alice@mindwork.io` / `mindwork123` or register a new user).
3. Access **My Tasks**:
   - View newly assigned tasks, priorities, deadlines, and acceptance criteria.
   - Click **Start Working** or **Start Stopwatch** to begin authoritative active work timing.
   - When finished, click **Submit Report & Deliverables**:
     - Enter deliverable summary and GitHub/Figma/PR links.
     - Click **Submit for Manager Review**.
4. Access **Work Activity** and **Burnout Analytics** to view personalized well-being recommendations and objective metrics.

---

## 6. Standalone Desktop Tracker Setup (Employee Laptop)

To capture objective background application usage without manual logging:
1. Open terminal on employee laptop:
   ```bash
   cd tracker
   npm start
   ```
2. Open the local control UI at `http://localhost:3100`.
3. Set `Shared Server URL` (e.g., `http://192.168.1.150:3000` or your cloud URL) and `Employee ID` (e.g., `emp_alice`).
4. Click **Start Tracking**. Permitted applications (VS Code, Chrome, Terminal, Safari, MySQL Workbench, Figma, Slack) are automatically detected and synchronized.
5. If the laptop disconnects from Wi-Fi, the built-in offline buffer queues events locally and flushes automatically once reconnected.

---

## 7. Database Backups & Persistence

- The application uses persistent SQLite stored in `data/mindwork.db`.
- **Automated Backup Endpoint**:
  ```bash
  curl http://localhost:3000/api/system/backup
  ```
  Creates a timestamped snapshot in `data/backups/mindwork_backup_<timestamp>.db`.
- **Scaling Path**: To migrate from SQLite to Cloud SQL PostgreSQL, the table schemas and migrations are fully normalized in `db/init_db.py` and `server.ts`.
