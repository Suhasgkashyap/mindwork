/**
 * Comprehensive End-to-End Test for Employee Work Submission & Manager Review
 * Validates:
 * 1. Manager assigns task to Alice
 * 2. Alice starts task, finishes, writes report, and uploads a validated ZIP archive
 * 3. Manager queries submissions from another session and sees Alice's report
 * 4. Manager securely downloads ZIP and verifies contents match
 * 5. Manager requests changes with required feedback
 * 6. Alice sees feedback and resubmits updated report with revised ZIP
 * 7. Manager reviews and approves -> Task COMPLETED and rule analysis triggered
 * 8. Security & Isolation: Another employee (David/Priya) cannot view or download Alice's ZIP (HTTP 403)
 * 9. Archive Safety: Non-ZIP file rejected with HTTP 400
 * 10. Persistence: Data persists in database and disk storage across requests
 */

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

// Minimal valid zip archive buffer containing "hello.txt"
function createValidZipBuffer(fileName = 'deliverable.txt', content = 'MindWork feature deliverable code') {
  const contentBuf = Buffer.from(content, 'utf8');
  const nameBuf = Buffer.from(fileName, 'utf8');
  
  // Local file header
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  localHeader.writeUInt16LE(10, 4); // version needed
  localHeader.writeUInt16LE(0, 6); // general purpose bit
  localHeader.writeUInt16LE(0, 8); // compression method (0 = uncompressed)
  localHeader.writeUInt16LE(0, 10); // file time
  localHeader.writeUInt16LE(0, 12); // file date
  
  // CRC-32 (simple computation)
  let crc = 0 ^ (-1);
  for (let i = 0; i < contentBuf.length; i++) {
    crc = (crc >>> 8) ^ [
      0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3,
      0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91
    ][(crc ^ contentBuf[i]) & 0x0f] ^ [
      0x00000000, 0x1db71064, 0x3b6e20c8, 0x26d930ac, 0x76dc4190, 0x6b6b51f4, 0x4db26158, 0x5005713c,
      0xedb88320, 0xf00f9344, 0xd6d6a3e8, 0xcb61b38c, 0x9b64c2b0, 0x86d3d2d4, 0xa00ae278, 0xbdbdf21c
    ][((crc ^ contentBuf[i]) >>> 4) & 0x0f];
  }
  crc = (crc ^ (-1)) >>> 0;
  
  localHeader.writeUInt32LE(crc, 14); // crc-32
  localHeader.writeUInt32LE(contentBuf.length, 18); // compressed size
  localHeader.writeUInt32LE(contentBuf.length, 22); // uncompressed size
  localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
  localHeader.writeUInt16LE(0, 28); // extra field length
  
  const localRecord = Buffer.concat([localHeader, nameBuf, contentBuf]);
  
  // Central directory header
  const cdHeader = Buffer.alloc(46);
  cdHeader.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
  cdHeader.writeUInt16LE(20, 4); // version made by
  cdHeader.writeUInt16LE(10, 6); // version needed
  cdHeader.writeUInt16LE(0, 8); // bit flag
  cdHeader.writeUInt16LE(0, 10); // compression
  cdHeader.writeUInt16LE(0, 12); // time
  cdHeader.writeUInt16LE(0, 14); // date
  cdHeader.writeUInt32LE(crc, 16);
  cdHeader.writeUInt32LE(contentBuf.length, 20);
  cdHeader.writeUInt32LE(contentBuf.length, 24);
  cdHeader.writeUInt16LE(nameBuf.length, 28);
  cdHeader.writeUInt16LE(0, 30); // extra length
  cdHeader.writeUInt16LE(0, 32); // comment length
  cdHeader.writeUInt16LE(0, 34); // disk start
  cdHeader.writeUInt16LE(0, 36); // internal attr
  cdHeader.writeUInt32LE(0, 38); // external attr
  cdHeader.writeUInt32LE(0, 42); // offset of local header
  
  const cdRecord = Buffer.concat([cdHeader, nameBuf]);
  
  // End of central directory record (EOCD)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(1, 8); // total entries on disk
  eocd.writeUInt16LE(1, 10); // total entries
  eocd.writeUInt32LE(cdRecord.length, 12); // size of central dir
  eocd.writeUInt32LE(localRecord.length, 16); // offset of central dir
  eocd.writeUInt16LE(0, 20); // comment length
  
  return Buffer.concat([localRecord, cdRecord, eocd]);
}

async function run() {
  console.log('================================================================');
  console.log('   MINDWORK: EMPLOYEE WORK SUBMISSION & MANAGER REVIEW TEST     ');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, description: string) {
    if (cond) {
      console.log(`  ✅ [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${description}`);
      failed++;
    }
  }

  // --- Step 1: Authentication ---
  console.log('\n[Phase 1] Authenticating Personas...');
  
  // Bob Manager
  const mgrAuthRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bob.manager@mindwork.io', password: 'Password123!' }),
  });
  const mgrAuthData = await mgrAuthRes.json() as any;
  assert(mgrAuthRes.ok && mgrAuthData.token, 'Bob Manager logged in successfully');
  const mgrToken = mgrAuthData.token;

  // Alice Employee
  const aliceAuthRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alice@mindwork.io', password: 'Password123!' }),
  });
  const aliceAuthData = await aliceAuthRes.json() as any;
  assert(aliceAuthRes.ok && aliceAuthData.token, 'Alice Employee logged in successfully');
  const aliceToken = aliceAuthData.token;
  const aliceEmpId = aliceAuthData.user?.employee_id || 'emp_alice';

  // David Cole (Second Employee)
  const davidAuthRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'david.cole@mindwork.io', password: 'Password123!' }),
  });
  const davidAuthData = await davidAuthRes.json() as any;
  assert(davidAuthRes.ok && davidAuthData.token, 'David Cole (Second Employee) logged in successfully');
  const davidToken = davidAuthData.token;

  // --- Step 2: Manager Assigns Task to Alice ---
  console.log('\n[Phase 2] Manager Assigns Task to Alice...');
  const taskTitle = `Work Submission Test Deliverable ${Date.now()}`;
  const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgrToken}`,
    },
    body: JSON.stringify({
      employee_id: aliceEmpId,
      title: taskTitle,
      description: 'Implement secure ZIP deliverables upload and review flow',
      priority: 'High',
      deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      acceptance_criteria: 'Provide complete ZIP source code deliverable with tests and written summary.',
    }),
  });
  const createTaskData = await createTaskRes.json() as any;
  assert(createTaskRes.status === 201 && createTaskData.task?.id, `Task created with ID: ${createTaskData.task?.id}`);
  const taskId = createTaskData.task.id;

  // Alice starts the task
  const startTaskRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aliceToken}`,
    },
    body: JSON.stringify({ employee_id: aliceEmpId }),
  });
  const startTaskData = await startTaskRes.json() as any;
  assert(startTaskRes.ok && startTaskData.success, 'Alice started task; stopwatch initialized');

  // --- Step 3: Archive Safety Test: Reject Non-ZIP File ---
  console.log('\n[Phase 3] Testing Archive Safety & File Validation...');
  const fakeZipBuffer = Buffer.from('THIS IS NOT A VALID ZIP FILE HEADER');
  const fakeFormData = new FormData();
  fakeFormData.append('work_file', new Blob([fakeZipBuffer], { type: 'application/zip' }), 'fake.zip');
  fakeFormData.append('work_summary', 'Malicious attempt with invalid zip bytes');
  fakeFormData.append('completion_status', '100% Completed');

  const rejectRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}` },
    body: fakeFormData,
  });
  const rejectData = await rejectRes.json() as any;
  assert(rejectRes.status === 400, `Server rejected non-ZIP file with HTTP 400 (got ${rejectRes.status})`);
  assert(rejectData.error && rejectData.error.includes('ZIP'), `Error message indicates invalid archive: "${rejectData.error}"`);

  // --- Step 4: Alice Submits Work Report with Valid ZIP Deliverable ---
  console.log('\n[Phase 4] Alice Submits Work Report with Valid ZIP Archive...');
  const validZipBuf = createValidZipBuffer('alice_feature_source.ts', 'export const submissionFeature = true;');
  const submitFormData = new FormData();
  submitFormData.append('work_file', new Blob([validZipBuf], { type: 'application/zip' }), 'alice_feature_deliverable_v1.zip');
  submitFormData.append('work_summary', 'Implemented the employee deliverable upload and manager audit views. Complete test coverage added.');
  submitFormData.append('challenges_faced', 'Ensuring binary stream byte verification for PK headers across Node and browser.');
  submitFormData.append('completion_status', '100% Completed');
  submitFormData.append('optional_remarks', 'Ready for supervisor signoff.');
  submitFormData.append('deliverable_url', 'https://github.com/mindwork/pull/101');

  const submitRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}` },
    body: submitFormData,
  });
  const submitData = await submitRes.json() as any;
  assert(submitRes.status === 201 && submitData.success, 'Alice successfully submitted work report with ZIP deliverable');
  assert(submitData.submission?.id, `Submission record created with ID: ${submitData.submission?.id}`);
  const submissionId = submitData.submission.id;

  // Verify task status is SUBMITTED
  const aliceTaskRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const aliceTaskData = await aliceTaskRes.json() as any;
  assert(aliceTaskData.task?.status === 'SUBMITTED', `Task status transitioned to SUBMITTED (got ${aliceTaskData.task?.status})`);
  assert(aliceTaskData.task?.submission_original_file_name === 'alice_feature_deliverable_v1.zip', 'Task holds original file name reference');

  // --- Step 5: Manager Inspects Submissions from Separate Session ---
  console.log('\n[Phase 5] Manager Views Submitted Work Dashboard...');
  const mgrSubmissionsRes = await fetch(`${BASE_URL}/api/submissions`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  const mgrSubmissionsData = await mgrSubmissionsRes.json() as any;
  assert(mgrSubmissionsRes.ok && Array.isArray(mgrSubmissionsData.submissions), 'Manager retrieved submissions list');
  const foundSubmission = mgrSubmissionsData.submissions.find((s: any) => s.id === submissionId);
  assert(!!foundSubmission, 'Alice submission is visible in Manager Submitted Work roster');
  assert(foundSubmission?.employee_name === 'Alice', `Employee name displayed as Alice (got ${foundSubmission?.employee_name})`);
  assert(foundSubmission?.status === 'PENDING_REVIEW', `Submission status shows PENDING_REVIEW (got ${foundSubmission?.status})`);
  assert(Boolean(foundSubmission?.work_summary?.includes('Implemented the employee deliverable')), 'Work summary correctly rendered');

  // --- Step 6: Manager Securely Downloads and Verifies ZIP Deliverable ---
  console.log('\n[Phase 6] Manager Downloads ZIP File and Verifies Integrity...');
  const downloadRes = await fetch(`${BASE_URL}/api/submissions/${submissionId}/download`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  assert(downloadRes.status === 200, `Manager download returned HTTP 200 (got ${downloadRes.status})`);
  assert(Boolean(downloadRes.headers.get('content-type')?.includes('zip')), `Content-Type is application/zip (got ${downloadRes.headers.get('content-type')})`);
  const downloadedBuf = Buffer.from(await downloadRes.arrayBuffer());
  assert(downloadedBuf.length === validZipBuf.length, `Downloaded ZIP size (${downloadedBuf.length} bytes) matches uploaded size (${validZipBuf.length} bytes)`);
  assert(downloadedBuf[0] === 0x50 && downloadedBuf[1] === 0x4B, 'Downloaded file has valid PK zip magic header');

  // --- Step 7: Manager Requests Changes with Required Feedback ---
  console.log('\n[Phase 7] Manager Requests Changes with Mandatory Feedback...');
  
  // First test: omitting feedback should fail or be rejected
  const emptyFeedbackRes = await fetch(`${BASE_URL}/api/submissions/${submissionId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgrToken}`,
    },
    body: JSON.stringify({ action: 'REQUEST_CHANGES', manager_feedback: '' }),
  });
  assert(emptyFeedbackRes.status === 400, `Manager requesting changes with empty feedback is rejected with HTTP 400 (got ${emptyFeedbackRes.status})`);

  // Proper feedback
  const requestChangesRes = await fetch(`${BASE_URL}/api/submissions/${submissionId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgrToken}`,
    },
    body: JSON.stringify({
      action: 'REQUEST_CHANGES',
      manager_feedback: 'Please add documentation in README and include an end-to-end integration test before approval.',
    }),
  });
  const requestChangesData = await requestChangesRes.json() as any;
  assert(requestChangesRes.ok && requestChangesData.success, 'Manager successfully requested changes with detailed feedback');

  // Verify task status is CHANGES_REQUESTED
  const taskAfterChangesRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const taskAfterChangesData = await taskAfterChangesRes.json() as any;
  assert(taskAfterChangesData.task?.status === 'CHANGES_REQUESTED', 'Task status transitioned to CHANGES_REQUESTED');
  assert(Boolean(taskAfterChangesData.task?.manager_feedback?.includes('Please add documentation')), 'Alice sees manager feedback in task details');

  // --- Step 8: Alice Resubmits Revised Deliverable ---
  console.log('\n[Phase 8] Alice Resubmits Revised Work & Deliverable ZIP...');
  const revisedZipBuf = createValidZipBuffer('alice_feature_source_v2.ts', 'export const submissionFeatureV2 = true; // with tests & docs');
  const resubmitFormData = new FormData();
  resubmitFormData.append('work_file', new Blob([revisedZipBuf], { type: 'application/zip' }), 'alice_feature_deliverable_v2.zip');
  resubmitFormData.append('work_summary', 'Added comprehensive README documentation and end-to-end test verification script.');
  resubmitFormData.append('challenges_faced', 'All feedback items resolved cleanly.');
  resubmitFormData.append('completion_status', '100% Completed');
  resubmitFormData.append('optional_remarks', 'Revised version ready for final approval.');

  const resubmitRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceToken}` },
    body: resubmitFormData,
  });
  const resubmitData = await resubmitRes.json() as any;
  assert(resubmitRes.status === 201 && resubmitData.success, 'Alice successfully resubmitted revised work report');
  assert(resubmitData.submission?.version === 2, `Submission incremented to version 2 (got v${resubmitData.submission?.version})`);
  const v2SubmissionId = resubmitData.submission.id;

  // --- Step 9: Manager Approves Final Deliverable ---
  console.log('\n[Phase 9] Manager Approves Final Deliverable...');
  const approveRes = await fetch(`${BASE_URL}/api/submissions/${v2SubmissionId}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mgrToken}`,
    },
    body: JSON.stringify({
      action: 'APPROVE',
      manager_feedback: 'All feedback addressed. Excellent work on the ZIP deliverable and documentation.',
    }),
  });
  const approveData = await approveRes.json() as any;
  assert(approveRes.ok && approveData.success, 'Manager approved submission');

  // Verify task status is COMPLETED and Rule-Based Evaluation Analysis Report is generated
  const completedTaskRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const completedTaskData = await completedTaskRes.json() as any;
  assert(completedTaskData.task?.status === 'COMPLETED', `Task status finalized to COMPLETED (got ${completedTaskData.task?.status})`);
  assert(completedTaskData.task?.analysis_report, 'Rule-Based Task Evaluation Engine generated post-completion audit report');

  // --- Step 10: Security & Cross-Employee Authorization Isolation ---
  console.log('\n[Phase 10] Testing Authorization & Cross-Employee Isolation...');

  // 1. David Cole attempts to access Alice's submission directly via GET /api/submissions/:id
  const davidAccessRes = await fetch(`${BASE_URL}/api/submissions/${v2SubmissionId}`, {
    headers: { Authorization: `Bearer ${davidToken}` },
  });
  assert(davidAccessRes.status === 403, `David Cole accessing Alice's submission returns HTTP 403 Forbidden (got ${davidAccessRes.status})`);

  // 2. David Cole attempts to download Alice's ZIP deliverable via GET /api/submissions/:id/download
  const davidDownloadRes = await fetch(`${BASE_URL}/api/submissions/${v2SubmissionId}/download`, {
    headers: { Authorization: `Bearer ${davidToken}` },
  });
  assert(davidDownloadRes.status === 403, `David Cole downloading Alice's ZIP deliverable returns HTTP 403 Forbidden (got ${davidDownloadRes.status})`);

  // 3. David Cole attempts to submit a report for Alice's task via POST /api/tasks/:id/submit
  const davidSubmitForm = new FormData();
  davidSubmitForm.append('work_file', new Blob([validZipBuf], { type: 'application/zip' }), 'david_tamper.zip');
  davidSubmitForm.append('work_summary', 'Unauthorized submission attempt');
  const davidSubmitRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${davidToken}` },
    body: davidSubmitForm,
  });
  assert(davidSubmitRes.status === 403, `David Cole submitting report for Alice's task returns HTTP 403 Forbidden (got ${davidSubmitRes.status})`);

  // 4. Anonymous unauthenticated download returns HTTP 401
  const anonDownloadRes = await fetch(`${BASE_URL}/api/submissions/${v2SubmissionId}/download`);
  assert(anonDownloadRes.status === 401, `Anonymous download attempt returns HTTP 401 Unauthorized (got ${anonDownloadRes.status})`);

  // 5. David Cole query GET /api/submissions should only return David's submissions, not Alice's
  const davidListRes = await fetch(`${BASE_URL}/api/submissions`, {
    headers: { Authorization: `Bearer ${davidToken}` },
  });
  const davidListData = await davidListRes.json() as any;
  const davidSeesAlice = davidListData.submissions?.some((s: any) => s.id === v2SubmissionId || s.employee_id === aliceEmpId);
  assert(!davidSeesAlice, "David's GET /api/submissions roster DOES NOT contain Alice's reports");

  // --- Step 11: Persistence Across Reopen / Refresh ---
  console.log('\n[Phase 11] Verifying Data & File Persistence...');
  const storageFilePath = resubmitData.submission?.file_storage_path;
  assert(!!storageFilePath && fs.existsSync(storageFilePath), `Uploaded ZIP file verified permanently stored on disk at: ${storageFilePath}`);
  const diskFileStats = fs.statSync(storageFilePath);
  assert(diskFileStats.size === revisedZipBuf.length, `Stored file size (${diskFileStats.size} bytes) matches uploaded archive size (${revisedZipBuf.length} bytes)`);

  // Verify Alice's my submissions list
  const aliceListRes = await fetch(`${BASE_URL}/api/submissions`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  });
  const aliceListData = await aliceListRes.json() as any;
  assert(aliceListData.submissions?.some((s: any) => s.id === v2SubmissionId), "Alice's submissions roster persistently contains her approved report");

  console.log('\n================================================================');
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED                 `);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
