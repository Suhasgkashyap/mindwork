/**
 * Multi-Laptop Multi-User Verification Script for MindWork
 * Tests authentication, authorization, role separation, and task isolation across:
 * - Manager (Bob Manager)
 * - Friend 1 (Alice)
 * - Friend 2 (David Cole)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Starting Multi-Laptop MindWork Auth & Isolation Verification ---');
  let failures = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      failures++;
    } else {
      console.log(`✅ PASSED: ${msg}`);
    }
  }

  // 1. Test unauthenticated endpoint protection (HTTP 401)
  console.log('\n[1] Testing Unauthenticated Endpoint Rejection:');
  const resNoAuthTasks = await fetch(`${BASE_URL}/api/tasks`);
  assert(resNoAuthTasks.status === 401, `GET /api/tasks without token returns 401 (got ${resNoAuthTasks.status})`);

  const resNoAuthReports = await fetch(`${BASE_URL}/api/reports/eod`);
  assert(resNoAuthReports.status === 401, `GET /api/reports/eod without token returns 401 (got ${resNoAuthReports.status})`);

  const resNoAuthBurnout = await fetch(`${BASE_URL}/api/burnout/predictions`);
  assert(resNoAuthBurnout.status === 401, `GET /api/burnout/predictions without token returns 401 (got ${resNoAuthBurnout.status})`);

  // 2. Authenticate Manager (Bob Manager)
  console.log('\n[2] Authenticating Manager (Bob Manager):');
  const mgrLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bob.manager@mindwork.io', password: 'Password123!' }),
  });
  const mgrData = await mgrLoginRes.json() as any;
  assert(mgrLoginRes.status === 200 && mgrData.token, 'Manager logged in with valid token');
  const mgrToken = mgrData.token;
  assert(mgrData.user.role === 'MANAGER', `Manager role verified as MANAGER (got ${mgrData.user.role})`);

  // 3. Authenticate Friend 1 (Alice)
  console.log('\n[3] Authenticating Friend 1 (Alice):');
  const aliceLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@mindwork.io', password: 'Password123!' }),
  });
  const aliceData = await aliceLoginRes.json() as any;
  assert(aliceLoginRes.status === 200 && aliceData.token, 'Alice logged in with valid token');
  const aliceToken = aliceData.token;
  assert(aliceData.user.role === 'EMPLOYEE', `Alice role verified as EMPLOYEE (got ${aliceData.user.role})`);
  const aliceEmpId = aliceData.user.employee_id;
  assert(aliceEmpId === 'emp_alice', `Alice employee_id is emp_alice (got ${aliceEmpId})`);

  // 4. Authenticate Friend 2 (David Cole)
  console.log('\n[4] Authenticating Friend 2 (David Cole):');
  const davidLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'david.cole@mindwork.io', password: 'Password123!' }),
  });
  const davidData = await davidLoginRes.json() as any;
  assert(davidLoginRes.status === 200 && davidData.token, 'David Cole logged in with valid token');
  const davidToken = davidData.token;
  assert(davidData.user.role === 'EMPLOYEE', `David Cole role verified as EMPLOYEE (got ${davidData.user.role})`);
  const davidEmpId = davidData.user.employee_id;
  assert(davidEmpId === 'emp_davidcole', `David Cole employee_id is emp_davidcole (got ${davidEmpId})`);

  // 5. Manager assigns a unique task to Alice
  console.log('\n[5] Manager assigns task to Alice:');
  const taskTitleAlice = `Alice Q3 System Audit - ${Date.now()}`;
  const assignAliceRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgrToken}`,
    },
    body: JSON.stringify({
      title: taskTitleAlice,
      description: 'Audit system components for multi-laptop readiness',
      employee_id: aliceEmpId,
      priority: 'High',
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      acceptance_criteria: 'All services must respond cleanly without 500 errors',
    }),
  });
  const assignAliceData = await assignAliceRes.json() as any;
  assert((assignAliceRes.status === 200 || assignAliceRes.status === 201) && assignAliceData.success, 'Task created successfully by Manager for Alice');
  const aliceTaskId = assignAliceData.task?.id;

  // 6. Alice fetches tasks -> verifies task appears
  console.log('\n[6] Alice retrieves tasks:');
  const aliceTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const aliceTasksData = await aliceTasksRes.json() as any;
  const aliceHasTask = aliceTasksData.tasks?.some((t: any) => t.id === aliceTaskId || t.title === taskTitleAlice);
  assert(aliceHasTask, `Alice sees assigned task "${taskTitleAlice}"`);

  // 7. David Cole fetches tasks -> verifies Alice's task is NOT visible
  console.log('\n[7] David Cole retrieves tasks (Isolation Check):');
  const davidTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${davidToken}` },
  });
  const davidTasksData = await davidTasksRes.json() as any;
  const davidHasAliceTask = davidTasksData.tasks?.some((t: any) => t.id === aliceTaskId || t.title === taskTitleAlice);
  assert(!davidHasAliceTask, `David Cole does NOT see Alice's private task`);

  // 8. Manager assigns a unique task to David Cole
  console.log('\n[8] Manager assigns task to David Cole:');
  const taskTitleDavid = `David Cole Performance Tune - ${Date.now()}`;
  const assignDavidRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgrToken}`,
    },
    body: JSON.stringify({
      title: taskTitleDavid,
      description: 'Validate database throughput for multi-laptop queries',
      employee_id: davidEmpId,
      priority: 'Medium',
      deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      acceptance_criteria: 'Zero timeouts on concurrent employee logins',
    }),
  });
  const assignDavidData = await assignDavidRes.json() as any;
  assert((assignDavidRes.status === 200 || assignDavidRes.status === 201) && assignDavidData.success, 'Task created successfully by Manager for David Cole');
  const davidTaskId = assignDavidData.task?.id;

  // 9. David fetches tasks -> verifies his task appears, Alice does not see it
  const davidTasksRes2 = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${davidToken}` },
  });
  const davidTasksData2 = await davidTasksRes2.json() as any;
  const davidHasDavidTask = davidTasksData2.tasks?.some((t: any) => t.id === davidTaskId || t.title === taskTitleDavid);
  assert(davidHasDavidTask, `David Cole sees assigned task "${taskTitleDavid}"`);

  const aliceTasksRes2 = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const aliceTasksData2 = await aliceTasksRes2.json() as any;
  const aliceHasDavidTask = aliceTasksData2.tasks?.some((t: any) => t.id === davidTaskId || t.title === taskTitleDavid);
  assert(!aliceHasDavidTask, `Alice does NOT see David Cole's private task`);

  // 10. Access Control & Authorization (HTTP 403 checks)
  console.log('\n[10] Testing Authorization & Role Enforcement:');
  
  // Alice tries to access David's tasks by query param
  const crossQueryRes = await fetch(`${BASE_URL}/api/tasks?employee_id=${davidEmpId}`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  assert(crossQueryRes.status === 403, `Alice querying David's employee_id returns 403 Forbidden (got ${crossQueryRes.status})`);

  // Alice tries to directly view David's task details by ID
  const directTaskRes = await fetch(`${BASE_URL}/api/tasks/${davidTaskId}`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  assert(directTaskRes.status === 403, `Alice fetching David's task by ID returns 403 Forbidden (got ${directTaskRes.status})`);

  // Employee tries to create a task (Manager-only)
  const employeeCreateTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${davidToken}`,
    },
    body: JSON.stringify({
      title: 'Illegal Employee Created Task',
      description: 'Employee attempting manager function',
      employee_id: davidEmpId,
      priority: 'LOW',
    }),
  });
  assert(employeeCreateTaskRes.status === 403, `Employee creating task returns 403 Forbidden (got ${employeeCreateTaskRes.status})`);

  // Employee tries to access Manager EOD Report
  const employeeReportRes = await fetch(`${BASE_URL}/api/reports/eod`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  assert(employeeReportRes.status === 403, `Employee accessing /api/reports/eod returns 403 Forbidden (got ${employeeReportRes.status})`);

  // Public registration cannot escalate to MANAGER
  const illegalRegisterRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Rogue Manager Attempt',
      email: 'rogue.manager@mindwork.io',
      password: 'Password123!',
      role: 'MANAGER',
    }),
  });
  assert(illegalRegisterRes.status === 403, `Self-registering as MANAGER returns 403 Forbidden (got ${illegalRegisterRes.status})`);

  // 11. Manager can access EOD report
  const mgrReportRes = await fetch(`${BASE_URL}/api/reports/eod`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(mgrReportRes.status === 200, `Manager accessing /api/reports/eod returns 200 OK (got ${mgrReportRes.status})`);

  // 12. Session Logout Test
  console.log('\n[12] Testing Logout & Session Invalidation:');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  assert(logoutRes.status === 200, `Logout returns 200 OK`);

  const afterLogoutRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  assert(afterLogoutRes.status === 401, `Invalidated session token returns 401 Unauthorized (got ${afterLogoutRes.status})`);

  console.log(`\n--- Verification Completed: ${failures === 0 ? 'ALL TESTS PASSED ✨' : `${failures} TEST(S) FAILED ❌`} ---`);
  if (failures > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
