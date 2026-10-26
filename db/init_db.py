"""
MindWork – Database Schema & 7-Day Demo Seed Script
Phase 1: Foundation, Schema & Demo History

Initializes SQLite database with all 10 normalized tables,
foreign keys, and seeds exactly 7 days of realistic historical
demonstration data (Sept 30 - Oct 6, 2026) for Alice, Priya, Rahul, Sneha,
and Bob Manager. All seeded records have is_demo_seed = 1.
"""

import os
import sqlite3
import hashlib
import json
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "mindwork.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def init_database():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    # 1. Users Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('MANAGER', 'EMPLOYEE')),
        created_at TEXT NOT NULL
    );
    """)

    # 2. Employees Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        age INTEGER NOT NULL,
        experience_years INTEGER NOT NULL,
        avatar_color TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    """)

    # 3. Tasks Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')),
        deadline TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('ASSIGNED', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED', 'COMPLETED')),
        created_at TEXT NOT NULL,
        is_demo_seed INTEGER NOT NULL DEFAULT 0,
        acceptance_criteria TEXT,
        submission_notes TEXT,
        deliverable_url TEXT,
        deliverable_files TEXT,
        submitted_at TEXT,
        manager_feedback TEXT,
        reviewed_at TEXT,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
    """)

    # 4. Task Sessions Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS task_sessions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        start_time TEXT NOT NULL,
        pause_time TEXT,
        resume_time TEXT,
        end_time TEXT,
        total_active_seconds INTEGER NOT NULL DEFAULT 0,
        total_paused_seconds INTEGER NOT NULL DEFAULT 0,
        is_demo_seed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    """)

    # 5. Task Analysis Reports Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS task_analysis_reports (
        id TEXT PRIMARY KEY,
        task_id TEXT UNIQUE NOT NULL,
        complexity TEXT NOT NULL CHECK(complexity IN ('Low', 'Medium', 'High')),
        benchmark_min_hours REAL NOT NULL,
        benchmark_max_hours REAL NOT NULL,
        actual_hours REAL NOT NULL,
        variance_hours REAL NOT NULL,
        is_on_time INTEGER NOT NULL,
        evaluation_engine_ver TEXT NOT NULL DEFAULT 'v1.0-rule-based',
        analyzed_at TEXT NOT NULL,
        is_demo_seed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    """)

    # 6. Work Sessions Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS work_sessions (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        date TEXT NOT NULL,
        login_time TEXT NOT NULL,
        logout_time TEXT NOT NULL,
        total_working_hours REAL NOT NULL,
        active_hours REAL NOT NULL,
        idle_hours REAL NOT NULL,
        is_demo_seed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
    """)

    # 7. Application Usage Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS application_usage (
        id TEXT PRIMARY KEY,
        work_session_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        app_name TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        active_seconds INTEGER NOT NULL,
        idle_seconds INTEGER NOT NULL,
        is_demo_seed INTEGER NOT NULL DEFAULT 0,
        app_start_time TEXT,
        app_end_time TEXT,
        FOREIGN KEY (work_session_id) REFERENCES work_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
    """)

    # 8. Daily Metrics Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS daily_metrics (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        date TEXT NOT NULL,
        working_hours REAL NOT NULL,
        active_hours REAL NOT NULL,
        idle_hours REAL NOT NULL,
        overtime_hours REAL NOT NULL,
        task_completion_rate REAL NOT NULL,
        productivity_score REAL NOT NULL,
        leave_days_taken INTEGER NOT NULL DEFAULT 0,
        is_demo_seed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        UNIQUE (employee_id, date)
    );
    """)

    # 9. Weekly Metrics Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS weekly_metrics (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        week_start_date TEXT NOT NULL,
        avg_working_hours REAL NOT NULL,
        total_overtime REAL NOT NULL,
        task_completion_rate REAL NOT NULL,
        avg_productivity REAL NOT NULL,
        is_demo_seed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        UNIQUE (employee_id, week_start_date)
    );
    """)

    # 10. Burnout Predictions Table
    cur.execute("""
    CREATE TABLE IF NOT EXISTS burnout_predictions (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        calculation_date TEXT NOT NULL,
        predicted_risk TEXT NOT NULL CHECK(predicted_risk IN ('Low', 'Medium', 'High')),
        prob_low REAL NOT NULL,
        prob_med REAL NOT NULL,
        prob_high REAL NOT NULL,
        continuous_risk_score REAL NOT NULL,
        top_contributing_factors TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        is_demo_seed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
    """)

    # 11. Notifications Table (Multi-Laptop Collaboration)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL,
        link TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    # 12. Audit Logs Table (Security & Sensitive Actions)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
    );
    """)

    conn.commit()
    print("Database schema successfully verified and created.")
    conn.close()


def seed_demo_data():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = ON;")

    # Clean existing seed records if any
    cur.execute("DELETE FROM burnout_predictions WHERE is_demo_seed = 1;")
    cur.execute("DELETE FROM weekly_metrics WHERE is_demo_seed = 1;")
    cur.execute("DELETE FROM daily_metrics WHERE is_demo_seed = 1;")
    cur.execute("DELETE FROM application_usage WHERE is_demo_seed = 1;")
    cur.execute("DELETE FROM work_sessions WHERE is_demo_seed = 1;")
    cur.execute("DELETE FROM task_analysis_reports WHERE is_demo_seed = 1;")
    cur.execute("DELETE FROM task_sessions WHERE is_demo_seed = 1;")
    cur.execute("DELETE FROM tasks WHERE is_demo_seed = 1;")
    cur.execute("DELETE FROM employees;")
    cur.execute("DELETE FROM users;")

    default_pw_hash = hash_pw("mindwork123")
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Seed Exactly 1 Manager
    cur.execute("""
    INSERT INTO users (id, email, password_hash, name, role, created_at)
    VALUES ('usr_mgr_bob', 'bob.manager@mindwork.io', ?, 'Bob Manager', 'MANAGER', ?);
    """, (default_pw_hash, now_str))

    # 2. Seed Exactly 5 Employees (including David Cole for cross-employee testing)
    employees_data = [
        ("emp_alice", "usr_emp_alice", "alice@mindwork.io", "Alice", "IT", 28, 4, "#2563eb"),
        ("emp_priya", "usr_emp_priya", "priya@mindwork.io", "Priya", "HR", 31, 6, "#16a34a"),
        ("emp_rahul", "usr_emp_rahul", "rahul@mindwork.io", "Rahul", "Sales", 26, 2, "#d97706"),
        ("emp_sneha", "usr_emp_sneha", "sneha@mindwork.io", "Sneha", "Operations", 35, 8, "#7c3aed"),
        ("emp_davidcole", "usr_emp_davidcole", "david.cole@mindwork.io", "David Cole", "Backend", 28, 3, "#ec4899")
    ]

    for emp_id, user_id, email, name, dept, age, exp, color in employees_data:
        cur.execute("""
        INSERT INTO users (id, email, password_hash, name, role, created_at)
        VALUES (?, ?, ?, ?, 'EMPLOYEE', ?);
        """, (user_id, email, default_pw_hash, name, now_str))

        cur.execute("""
        INSERT INTO employees (id, user_id, name, department, age, experience_years, avatar_color, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (emp_id, user_id, name, dept, age, exp, color, now_str))

    # 3. Seed Exactly 7 Days of Historical Baseline Telemetry (Sept 30, 2026 to Oct 6, 2026)
    base_dates = [
        "2026-09-30", # Day 1 (Wed)
        "2026-10-01", # Day 2 (Thu)
        "2026-10-02", # Day 3 (Fri)
        "2026-10-03", # Day 4 (Sat) - minimal/weekend
        "2026-10-04", # Day 5 (Sun) - minimal/weekend
        "2026-10-05", # Day 6 (Mon)
        "2026-10-06"  # Day 7 (Tue - yesterday)
    ]

    # Archetype profiles over the 7 days:
    # Alice: IT -> High overtime & workload, heavy VS Code/Terminal
    # Priya: HR -> Balanced hours, high productivity, Chrome/Figma
    # Rahul: Sales -> Variable hours, moderate overtime, Chrome/Slack/Finder
    # Sneha: Operations -> Stable 8h shifts, strong completion rate, MySQL/Excel/Safari

    emp_telemetry_profiles = {
        "emp_alice": {
            "work_hrs": [10.2, 10.8, 11.4, 0.0, 0.0, 11.2, 10.9],
            "active_hrs": [7.4, 7.9, 8.1, 0.0, 0.0, 8.0, 7.8],
            "idle_hrs": [2.8, 2.9, 3.3, 0.0, 0.0, 3.2, 3.1],
            "prod_score": [72, 70, 68, 0, 0, 66, 65],
            "apps": [("VS Code", 16200), ("Terminal", 6300), ("Chrome", 4500), ("MySQL Workbench", 2700)],
            "tasks": [
                ("Optimize DB Connection Pool", "Configure pool limits and retry backoff for auth service", "High", "2026-10-01 17:00", 6.5, "High", 5.0, 7.0),
                ("Refactor OAuth Gateway", "Implement token refresh middleware with exponential backoff", "Urgent", "2026-10-02 18:00", 8.2, "High", 6.0, 8.0),
                ("Write Unit Tests for Auth", "Add test cases covering edge-case token expiration", "Medium", "2026-10-06 17:00", 4.1, "Medium", 3.5, 5.0)
            ],
            "risk": "High",
            "probs": (0.02, 0.43, 0.55),
            "factors": ["High sustained overtime (+22.5h/week)", "Elevated deadline pressure (9/10)", "Prolonged active shift length (>10.5h/day)"],
            "recs": ["Redistribute secondary backlog tasks to another developer", "Enforce strict cutoff on after-hours deployments"]
        },
        "emp_priya": {
            "work_hrs": [8.0, 8.2, 7.9, 0.0, 0.0, 8.1, 8.0],
            "active_hrs": [6.7, 6.8, 6.5, 0.0, 0.0, 6.9, 6.8],
            "idle_hrs": [1.3, 1.4, 1.4, 0.0, 0.0, 1.2, 1.2],
            "prod_score": [88, 89, 87, 0, 0, 90, 89],
            "apps": [("Chrome", 15300), ("Figma", 7200), ("Slack", 3600), ("Finder", 1800)],
            "tasks": [
                ("Q3 Benefit Policy Review", "Update handbook policies and communicate with insurance broker", "Medium", "2026-10-01 16:00", 4.5, "Medium", 4.0, 6.0),
                ("Conduct Onboarding Orientation", "Facilitate orientation for 3 new engineering hires", "Low", "2026-10-05 14:00", 3.0, "Low", 2.5, 4.0),
                ("Draft Ergonomic Guidelines", "Compile workspace well-being checklist for hybrid employees", "Medium", "2026-10-06 17:00", 4.0, "Medium", 3.0, 5.0)
            ],
            "risk": "Low",
            "probs": (0.72, 0.25, 0.03),
            "factors": ["Healthy shift duration (8.0h avg)", "Zero unbudgeted overtime", "Balanced task delivery rate (92%)"],
            "recs": ["Maintain existing balanced schedule and cadence", "Continue regular check-ins"]
        },
        "emp_rahul": {
            "work_hrs": [9.5, 9.8, 10.0, 0.0, 0.0, 9.6, 9.7],
            "active_hrs": [6.2, 6.4, 6.5, 0.0, 0.0, 6.3, 6.4],
            "idle_hrs": [3.3, 3.4, 3.5, 0.0, 0.0, 3.3, 3.3],
            "prod_score": [68, 67, 65, 0, 0, 66, 64],
            "apps": [("Chrome", 14400), ("Slack", 7200), ("Terminal", 3600), ("Finder", 2700)],
            "tasks": [
                ("Enterprise Client Renewal Audit", "Review renewal terms for top 10 Q4 accounts", "High", "2026-10-02 17:00", 5.8, "High", 4.5, 6.5),
                ("Prepare Sales Demo Environment", "Configure sandbox tenant for upcoming prospect meeting", "Medium", "2026-10-06 15:00", 4.2, "Medium", 3.0, 5.0)
            ],
            "risk": "Medium",
            "probs": (0.15, 0.65, 0.20),
            "factors": ["Moderate overtime accumulation (+8.6h/week)", "Higher idle-to-active ratio (34% idle)", "Task completion velocity variance"],
            "recs": ["Clarify client pipeline bottlenecks", "Schedule 1-on-1 to review idle time causes"]
        },
        "emp_sneha": {
            "work_hrs": [8.2, 8.4, 8.3, 0.0, 0.0, 8.5, 8.4],
            "active_hrs": [7.0, 7.1, 7.0, 0.0, 0.0, 7.2, 7.1],
            "idle_hrs": [1.2, 1.3, 1.3, 0.0, 0.0, 1.3, 1.3],
            "prod_score": [82, 83, 81, 0, 0, 84, 83],
            "apps": [("MySQL Workbench", 12600), ("Safari", 8100), ("Terminal", 5400), ("Finder", 1800)],
            "tasks": [
                ("Vendor SLA Compliance Audit", "Inspect vendor delivery records against contractual SLAs", "Medium", "2026-10-01 17:00", 4.8, "Medium", 4.0, 6.0),
                ("Weekly Infrastructure Cost Report", "Aggregate AWS and Cloud Run monthly spending logs", "Low", "2026-10-05 16:00", 3.2, "Low", 2.5, 4.0),
                ("Update Asset Inventory Registry", "Log serials and assigned equipment for distributed staff", "Medium", "2026-10-06 17:00", 3.8, "Medium", 3.0, 5.0)
            ],
            "risk": "Low",
            "probs": (0.68, 0.28, 0.04),
            "factors": ["Consistent operational hours", "Low idle ratio (<15%)", "Stable sprint completion rate (88%)"],
            "recs": ["Current workflow operating in healthy equilibrium", "No immediate operational intervention required"]
        },
        "emp_davidcole": {
            "work_hrs": [8.5, 8.7, 8.3, 0.0, 0.0, 8.4, 8.6],
            "active_hrs": [7.1, 7.2, 6.9, 0.0, 0.0, 7.0, 7.1],
            "idle_hrs": [1.4, 1.5, 1.4, 0.0, 0.0, 1.4, 1.5],
            "prod_score": [79, 80, 78, 0, 0, 81, 79],
            "apps": [("VS Code", 14400), ("GitHub Desktop", 5400), ("Terminal", 3600), ("Chrome", 2700)],
            "tasks": [
                ("Refactor API Response Layer", "Optimize REST endpoint response serialization and caching", "High", "2026-10-02 17:00", 5.2, "High", 4.0, 6.0),
                ("Implement Error Logging System", "Add centralized error tracking and alerting infrastructure", "Medium", "2026-10-06 17:00", 3.8, "Medium", 3.0, 5.0)
            ],
            "risk": "Low",
            "probs": (0.65, 0.30, 0.05),
            "factors": ["Stable working hours (8.5h avg)", "Minimal idle time (16%)", "Consistent task delivery (82%)"],
            "recs": ["Maintain current backend development pace", "Consider mentoring junior developers"]
        }
    }

    # Populate 7 days of records per employee
    task_counter = 1
    session_counter = 1

    for emp_id, prof in emp_telemetry_profiles.items():
        total_ot = 0.0
        work_hr_sum = 0.0
        active_days = 0

        for day_idx, d_str in enumerate(base_dates):
            w_hrs = prof["work_hrs"][day_idx]
            act_hrs = prof["active_hrs"][day_idx]
            idl_hrs = prof["idle_hrs"][day_idx]
            prod = prof["prod_score"][day_idx]

            if w_hrs > 0:
                active_days += 1
                work_hr_sum += w_hrs
                ot_hrs = max(0.0, round(w_hrs - 8.0, 2))
                total_ot += ot_hrs
                login_time = f"{d_str} 08:30:00"
                logout_time = f"{d_str} {int(8.5 + w_hrs):02d}:{(int((w_hrs % 1) * 60)):02d}:00"

                ws_id = f"ws_seed_{emp_id}_{day_idx}"
                cur.execute("""
                INSERT INTO work_sessions (id, employee_id, date, login_time, logout_time, total_working_hours, active_hours, idle_hours, is_demo_seed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1);
                """, (ws_id, emp_id, d_str, login_time, logout_time, w_hrs, act_hrs, idl_hrs))

                # Insert application breakdown for active days
                for app_name, dur_sec in prof["apps"]:
                    app_id = f"app_seed_{emp_id}_{day_idx}_{app_name.replace(' ', '_')}"
                    app_act_sec = int(dur_sec * (act_hrs / w_hrs)) if w_hrs > 0 else dur_sec
                    app_idl_sec = dur_sec - app_act_sec
                    cur.execute("""
                    INSERT INTO application_usage (id, work_session_id, employee_id, app_name, duration_seconds, active_seconds, idle_seconds, is_demo_seed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1);
                    """, (app_id, ws_id, emp_id, app_name, dur_sec, app_act_sec, app_idl_sec))
            else:
                ot_hrs = 0.0

            # Daily metric row
            dm_id = f"dm_seed_{emp_id}_{day_idx}"
            cur.execute("""
            INSERT INTO daily_metrics (id, employee_id, date, working_hours, active_hours, idle_hours, overtime_hours, task_completion_rate, productivity_score, leave_days_taken, is_demo_seed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1);
            """, (dm_id, emp_id, d_str, w_hrs, act_hrs, idl_hrs, ot_hrs, 80.0 if w_hrs > 0 else 0.0, prod))

        # Insert Completed Historical Tasks for employee
        for t_title, t_desc, t_prio, t_dead, t_act_h, t_comp, b_min, b_max in prof["tasks"]:
            t_id = f"task_seed_{task_counter}"
            task_counter += 1
            cur.execute("""
            INSERT INTO tasks (id, employee_id, title, description, priority, deadline, status, created_at, is_demo_seed)
            VALUES (?, ?, ?, ?, ?, ?, 'COMPLETED', ?, 1);
            """, (t_id, emp_id, t_title, t_desc, t_prio, t_dead, f"2026-09-30 09:00:00"))

            # Task Session
            ts_id = f"ts_seed_{session_counter}"
            session_counter += 1
            act_sec = int(t_act_h * 3600 * 0.85)
            pause_sec = int(t_act_h * 3600 * 0.15)
            cur.execute("""
            INSERT INTO task_sessions (id, task_id, start_time, end_time, total_active_seconds, total_paused_seconds, is_demo_seed)
            VALUES (?, ?, ?, ?, ?, ?, 1);
            """, (ts_id, t_id, f"2026-10-01 09:30:00", f"2026-10-01 {9+int(t_act_h)}:00:00", act_sec, pause_sec))

            # Task Analysis Report (Rule-based evaluation result)
            var_h = round(t_act_h - ((b_min + b_max) / 2.0), 2)
            cur.execute("""
            INSERT INTO task_analysis_reports (id, task_id, complexity, benchmark_min_hours, benchmark_max_hours, actual_hours, variance_hours, is_on_time, evaluation_engine_ver, analyzed_at, is_demo_seed)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'v1.0-rule-based', ?, 1);
            """, (f"tar_seed_{t_id}", t_id, t_comp, b_min, b_max, t_act_h, var_h, now_str))

        # Insert 7-Day Weekly Metrics
        avg_w = round(work_hr_sum / max(1, active_days), 2)
        cur.execute("""
        INSERT INTO weekly_metrics (id, employee_id, week_start_date, avg_working_hours, total_overtime, task_completion_rate, avg_productivity, is_demo_seed)
        VALUES (?, ?, '2026-09-30', ?, ?, ?, ?, 1);
        """, (f"wm_seed_{emp_id}", emp_id, avg_w, round(total_ot, 2), 85.0, round(sum(prof['prod_score']) / max(1, active_days), 1)))

        # Insert Burnout Prediction (Reflecting audited model output)
        p_low, p_med, p_high = prof["probs"]
        comp_score = round(p_low * 15.0 + p_med * 55.0 + p_high * 95.0, 1)
        cur.execute("""
        INSERT INTO burnout_predictions (id, employee_id, calculation_date, predicted_risk, prob_low, prob_med, prob_high, continuous_risk_score, top_contributing_factors, recommendations, is_demo_seed)
        VALUES (?, ?, '2026-10-06', ?, ?, ?, ?, ?, ?, ?, 1);
        """, (f"bp_seed_{emp_id}", emp_id, prof["risk"], p_low, p_med, p_high, comp_score, json.dumps(prof["factors"]), json.dumps(prof["recs"])))

    # Also add 1 pending live task per employee for immediate demonstration
    pending_tasks = [
        ("emp_alice", "Implement Refresh Token Cache in Redis", "Add Redis cache layer to store invalid tokens upon user logout", "High", "2026-10-08 17:00:00"),
        ("emp_priya", "Finalize Q4 Health & Wellness Workshop", "Coordinate with external mindfulness consultant for dates", "Medium", "2026-10-09 16:00:00"),
        ("emp_rahul", "Prepare Enterprise Sales Pitch Deck", "Review client value propositions for fintech prospects", "Urgent", "2026-10-07 15:00:00"),
        ("emp_sneha", "Automate Weekly Database Backup Audit", "Write cron check verifying S3 archive integrity", "Low", "2026-10-10 17:00:00"),
        ("emp_davidcole", "Setup Backend Monitoring & Alerting", "Configure Prometheus and Grafana dashboards for API health", "Medium", "2026-10-09 17:00:00")
    ]

    for p_emp, p_title, p_desc, p_prio, p_dead in pending_tasks:
        cur.execute("""
        INSERT INTO tasks (id, employee_id, title, description, priority, deadline, status, created_at, is_demo_seed)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, 1);
        """, (f"task_pending_{p_emp}", p_emp, p_title, p_desc, p_prio, p_dead, now_str))

    conn.commit()
    print("Seeded exactly 7 days of historical demo records (Sept 30 - Oct 6, 2026) across all 5 employees.")
    print("Seeded Bob Manager account and 5 active pending tasks.")
    conn.close()

if __name__ == "__main__":
    init_database()
    seed_demo_data()
