/**
 * End-to-End Automated Test for Task Stopwatch Functionality
 * Validates:
 * 1. Manager authenticates and assigns task to Alice
 * 2. Alice authenticates and starts stopwatch on assigned task
 * 3. Elapsed time increments and session starts successfully
 * 4. Alice stops stopwatch (pause action) and verifies time is saved and preserved
 * 5. Page reload / session fetch confirms duration is accurately restored from SQLite database
 * 6. Authorization isolation: David Cole cannot control or manipulate Alice's stopwatch session
 */

import fetch from 'node-fetch';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const BASE_URL = 'http://localhost:3000';

async function runStopwatchTest() {
  console.log('================================================================');
  console.log('   MINDWORK: TASK STOPWATCH END-TO-END AUTOMATED TEST           ');
  console.log('================================================================');

  try {
    const db = new DatabaseSync(path.resolve(process.cwd(), 'data', 'mindwork.db'));
    db.exec("DELETE FROM task_sessions; DELETE FROM tasks WHERE is_demo_seed = 0;");
  } catch {}

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Authenticate Manager & Employees
  const mgrRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bob.manager@mindwork.io', password: 'Password123!' }),
  });
  const mgrData = await mgrRes.json() as any;
  assert(mgrRes.ok && mgrData.token, 'Manager Bob authenticated successfully');
  const mgrToken = mgrData.token;

  const aliceRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@mindwork.io', password: 'Password123!' }),
  });
  const aliceData = await aliceRes.json() as any;
  assert(aliceRes.ok && aliceData.token, 'Alice authenticated successfully');
  const aliceToken = aliceData.token;
  const aliceEmpId = aliceData.user.employee_id || 'emp_alice';

  const davidRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'david.cole@mindwork.io', password: 'Password123!' }),
  });
  const davidData = await davidRes.json() as any;
  assert(davidRes.ok && davidData.token, 'David Cole authenticated successfully');
  const davidToken = davidData.token;

  // Clean up any existing active tasks for Alice first
  const activeTasksRes = await fetch(`${BASE_URL}/api/tasks?employee_id=${aliceEmpId}`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const activeTasksData = await activeTasksRes.json() as any;
  if (activeTasksData.success && activeTasksData.tasks) {
    for (const at of activeTasksData.tasks) {
      if (at.status === 'IN_PROGRESS') {
        await fetch(`${BASE_URL}/api/tasks/${at.id}/pause`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aliceToken}` },
        });
      }
    }
  }

  // 2. Manager assigns task to Alice
  const title = `Stopwatch Test Task ${Date.now()}`;
  const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgrToken}`,
    },
    body: JSON.stringify({
      employee_id: aliceEmpId,
      title,
      description: 'Test stopwatch timing and persistence',
      priority: 'High',
      deadline: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  const createTaskData = await createTaskRes.json() as any;
  assert(createTaskRes.status === 201 && createTaskData.task?.id, 'Manager assigned task to Alice');
  const taskId = createTaskData.task.id;

  // 3. Alice starts stopwatch (with auto-pause retry if single active task conflict occurs)
  let startRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aliceToken}`,
    },
    body: JSON.stringify({ employee_id: aliceEmpId }),
  });
  let startData = await startRes.json() as any;
  if (!startRes.ok && startRes.status === 409 && startData.active_task_id) {
    await fetch(`${BASE_URL}/api/tasks/${startData.active_task_id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${aliceToken}` },
    });
    startRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aliceToken}`,
      },
      body: JSON.stringify({ employee_id: aliceEmpId }),
    });
    startData = await startRes.json() as any;
  }
  if (!startRes.ok) {
    console.error('Start failed with:', startData);
  }
  assert(startRes.ok && startData.success, 'Alice successfully started task stopwatch');
  assert(startData.session?.id, 'Stopwatch session created in database');

  // 4. Verify session status endpoint reports running = true
  const sessionRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/session`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const sessionData = await sessionRes.json() as any;
  assert(sessionRes.ok && sessionData.is_running === true, 'Session status confirms timer is actively running');

  // 5. David Cole attempts to start or pause Alice's task (Authorization Isolation)
  const davidTamperRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/pause`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${davidToken}`,
    },
  });
  assert(davidTamperRes.status === 403, 'David Cole unauthorized attempt to stop/pause Alice task returns HTTP 403 Forbidden');

  // 6. Alice stops stopwatch (pause action)
  await new Promise((r) => setTimeout(r, 2000)); // wait 2 seconds to accumulate time
  const pauseRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/pause`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aliceToken}`,
    },
  });
  const pauseData = await pauseRes.json() as any;
  assert(pauseRes.ok && pauseData.success, 'Alice successfully stopped/paused stopwatch');

  // 7. Verify session reload / refresh persistence
  const reloadRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const reloadData = await reloadRes.json() as any;
  assert(reloadRes.ok && reloadData.task.total_active_seconds >= 1, `Refetching task after refresh successfully restores saved duration (${reloadData.task.total_active_seconds}s)`);

  console.log('================================================================');
  console.log(`   STOPWATCH TEST RESULTS: ${passed} PASSED, ${failed} FAILED     `);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runStopwatchTest().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
