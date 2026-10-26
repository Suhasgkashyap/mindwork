import React, { useState, useEffect } from 'react';
import { User, WorkSubmission } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, PriorityBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import {
  FileCheck2,
  FileArchive,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Search,
  Check,
  X,
  FileText,
  Calendar,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface ManagerSubmittedWorkViewProps {
  currentUser: User;
  onNavigateToTask?: (taskId: string) => void;
}

export const ManagerSubmittedWorkView: React.FC<ManagerSubmittedWorkViewProps> = ({
  currentUser,
  onNavigateToTask,
}) => {
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedSubmission, setSelectedSubmission] = useState<WorkSubmission | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED'>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REQUEST_CHANGES'>('APPROVE');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const fetchSubmissions = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const headers: Record<string, string> = {};
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/submissions', { headers });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: Failed to synchronize work reports.`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions);
        setErrorMessage(null);
      } else {
        throw new Error(data.error || 'Failed to retrieve submitted reports.');
      }
    } catch (err: any) {
      console.error('[Submitted Work Fetch Error]:', err);
      setErrorMessage(err.message || 'Error connecting to shared database.');
    } finally {
      setIsRefreshing(false);
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions(true);

    // Real-time synchronization for multi-laptop submissions
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('submission_created', () => fetchSubmissions());
      eventSource.addEventListener('submission_reviewed', () => fetchSubmissions());
      eventSource.addEventListener('task_updated', () => fetchSubmissions());
    } catch {}

    const interval = setInterval(() => fetchSubmissions(), 10000);
    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleDownloadZip = (submission: WorkSubmission) => {
    // Authenticated download endpoint
    const downloadUrl = `/api/submissions/${submission.id}/download`;
    window.open(downloadUrl, '_blank');
  };

  const handleOpenReviewModal = (submission: WorkSubmission, defaultAction: 'APPROVE' | 'REQUEST_CHANGES' = 'APPROVE') => {
    setSelectedSubmission(submission);
    setReviewAction(defaultAction);
    setReviewFeedback(submission.manager_feedback || '');
    setReviewError(null);
    setReviewSuccess(null);
    setIsReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!selectedSubmission) return;

    if (reviewAction === 'REQUEST_CHANGES' && !reviewFeedback.trim()) {
      setReviewError('Supervisor feedback is required when requesting corrections so the employee knows what to fix.');
      return;
    }

    setIsReviewSubmitting(true);
    setReviewError(null);
    setReviewSuccess(null);

    try {
      const res = await fetch(`/api/submissions/${selectedSubmission.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: reviewAction,
          manager_feedback: reviewFeedback.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review.');
      }

      setReviewSuccess(
        reviewAction === 'APPROVE'
          ? 'Work approved! Task marked as completed and evaluation score calculated.'
          : 'Corrections requested. The employee has been notified with your feedback.'
      );

      setTimeout(() => {
        setIsReviewModalOpen(false);
        fetchSubmissions();
      }, 1000);
    } catch (err: any) {
      setReviewError(err.message || 'Error saving review.');
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  // Extract distinct employee list for filter dropdown
  const uniqueEmployees = Array.from(
    new Map(submissions.map((s) => [s.employee_id, { id: s.employee_id, name: s.employee_name || s.employee_id }])).values()
  );

  const pendingCount = submissions.filter((s) => s.status === 'PENDING_REVIEW' || s.status === 'SUBMITTED').length;
  const approvedCount = submissions.filter((s) => s.status === 'APPROVED').length;
  const changesCount = submissions.filter((s) => s.status === 'CHANGES_REQUESTED').length;

  const filteredSubmissions = submissions.filter((s) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'SUBMITTED') {
        if (s.status !== 'SUBMITTED' && s.status !== 'PENDING_REVIEW') return false;
      } else if (s.status !== statusFilter) {
        return false;
      }
    }
    if (employeeFilter !== 'ALL' && s.employee_id !== employeeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.task_title?.toLowerCase().includes(q) ||
        s.employee_name?.toLowerCase().includes(q) ||
        s.work_summary?.toLowerCase().includes(q) ||
        s.original_file_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'ZIP Archive';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Error notification banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchSubmissions(true)}
            className="px-3 py-1 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E2D5]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-[#2D4A36]" />
            Submitted Work & Employee Deliverables
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Authoritative multi-laptop review portal • Inspect employee reports, download source archives, and approve deliverables
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className={`w-3.5 h-3.5 text-[#2D4A36] ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={() => fetchSubmissions(true)}
          >
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Card padding="sm" className="bg-[#FAF8F2] border-[#E8E2D5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] block">Total Reports</span>
          <span className="text-2xl font-extrabold text-[#1C1917] mt-1 block">{submissions.length}</span>
        </Card>

        <Card padding="sm" className={`border-[#FDE68A] bg-[#FFFBF0] ${pendingCount > 0 ? 'ring-2 ring-[#D97706]/40' : ''}`}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] block flex items-center justify-between">
            <span>Needs Review</span>
            {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />}
          </span>
          <span className="text-2xl font-extrabold text-[#D97706] mt-1 block">{pendingCount}</span>
        </Card>

        <Card padding="sm" className="bg-[#F7FAF8] border-[#D1E0D5]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2D4A36] block">Approved</span>
          <span className="text-2xl font-extrabold text-[#16A34A] mt-1 block">{approvedCount}</span>
        </Card>

        <Card padding="sm" className="bg-[#FEF2F2] border-[#FECACA]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#DC2626] block">Needs Fixes</span>
          <span className="text-2xl font-extrabold text-[#DC2626] mt-1 block">{changesCount}</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#FBF9F4] border border-[#E8E2D5]">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          {(['ALL', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#2D4A36] text-white shadow-xs'
                  : 'bg-white border border-[#DDD5C5] text-[#57534E] hover:bg-[#F3EFE6]'
              }`}
            >
              {st === 'ALL'
                ? `All (${submissions.length})`
                : st === 'SUBMITTED'
                ? `In Review (${pendingCount})`
                : st === 'APPROVED'
                ? `Approved (${approvedCount})`
                : `Needs Fixes (${changesCount})`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Employee Filter */}
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#DDD5C5] text-xs font-semibold text-[#1C1917] focus:outline-none"
          >
            <option value="ALL">All Team Members</option>
            {uniqueEmployees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#DDD5C5] text-xs text-[#1C1917] placeholder-[#A8A29E] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Loading employee work submissions & deliverables..." />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <EmptyState
          title="No Submitted Work Reports"
          description={
            statusFilter === 'SUBMITTED'
              ? 'No work reports currently awaiting supervisor review.'
              : 'No employee deliverables matched your selected filters.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((sub) => {
            const isPending = sub.status === 'SUBMITTED';
            const isApproved = sub.status === 'APPROVED';
            const isChangesRequested = sub.status === 'CHANGES_REQUESTED';

            return (
              <Card
                key={sub.id}
                padding="md"
                className={`transition-all hover:border-[#588157] ${
                  isPending
                    ? 'border-[#FDE68A] bg-[#FFFDF5] shadow-xs ring-1 ring-[#D97706]/20'
                    : isChangesRequested
                    ? 'border-[#FECACA] bg-[#FFFBFB]'
                    : 'border-[#D1E0D5] bg-white'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Employee & Task Info */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar
                        name={sub.employee_name || 'Employee'}
                        color={sub.employee_avatar_color || '#2563eb'}
                        size="sm"
                      />
                      <div>
                        <span className="font-bold text-xs text-[#1C1917]">{sub.employee_name}</span>
                        <span className="text-[11px] text-[#78716C] ml-1.5 font-medium">({sub.employee_department})</span>
                      </div>
                      <span className="text-[#A8A29E]">•</span>
                      <div className="text-[11px] text-[#78716C] font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#588157]" />
                        <span>Submitted {sub.submitted_at?.replace('T', ' ').substring(0, 16)}</span>
                      </div>
                      {sub.version > 1 && (
                        <Badge variant="neutral" size="sm">
                          Revision #{sub.version}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {sub.task_priority && <PriorityBadge priority={sub.task_priority} size="sm" />}
                        <h3 className="text-base font-bold text-[#1C1917] hover:text-[#2D4A36] transition-colors">
                          {sub.task_title || 'Assigned Task'}
                        </h3>
                      </div>
                    </div>

                    {/* Work Summary Snippet */}
                    <div className="p-3 rounded-xl bg-[#FAF8F2] border border-[#E8E2D5] text-xs text-[#292524] leading-relaxed whitespace-pre-wrap">
                      <span className="font-bold text-[#2D4A36] block mb-0.5">Work Summary:</span>
                      {sub.work_summary}
                    </div>

                    {/* Challenges Faced (if any) */}
                    {sub.challenges_faced && (
                      <div className="p-2.5 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#57534E]">
                        <span className="font-bold text-[#78716C] block mb-0.5">Challenges & Solutions:</span>
                        {sub.challenges_faced}
                      </div>
                    )}

                    {/* Manager Feedback Banner (if changes requested or approved with notes) */}
                    {sub.manager_feedback && (
                      <div className={`p-2.5 rounded-xl border text-xs ${
                        isChangesRequested
                          ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                          : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                      }`}>
                        <span className="font-bold block mb-0.5">
                          {isChangesRequested ? 'Requested Corrections:' : 'Supervisor Feedback:'}
                        </span>
                        {sub.manager_feedback}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status, ZIP File Box & Review Actions */}
                  <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 lg:w-72 border-t lg:border-t-0 lg:border-l border-[#E8E2D5] pt-3 lg:pt-0 lg:pl-4">
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <Badge variant="peach" size="sm" dot>
                          In Review
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge variant="sage" size="sm">
                          Approved
                        </Badge>
                      )}
                      {isChangesRequested && (
                        <Badge variant="coral" size="sm" dot>
                          Needs Fixes
                        </Badge>
                      )}
                    </div>

                    {/* ZIP Deliverable Card with Secure Download */}
                    <div className="w-full p-2.5 rounded-xl bg-white border border-[#D1E0D5] flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-[#2D4A36] text-white flex items-center justify-center shrink-0">
                          <FileArchive className="w-4 h-4" />
                        </div>
                        <div className="overflow-hidden">
                          <span className="font-bold text-xs text-[#1C1917] block truncate" title={sub.original_file_name || 'deliverable.zip'}>
                            {sub.original_file_name || 'deliverable.zip'}
                          </span>
                          <span className="text-[10px] text-[#78716C] font-mono">
                            {formatFileSize(sub.file_size_bytes)}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Download className="w-3.5 h-3.5 text-[#2D4A36]" />}
                        onClick={() => handleDownloadZip(sub)}
                        title="Download verified ZIP archive to your laptop"
                      >
                        Download
                      </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="w-full flex items-center gap-2 pt-1">
                      {isPending ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-[#F87171] text-[#DC2626] hover:bg-[#FEF2F2]"
                            onClick={() => handleOpenReviewModal(sub, 'REQUEST_CHANGES')}
                          >
                            Request Changes
                          </Button>
                          <Button
                            variant="forest"
                            size="sm"
                            className="flex-1"
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenReviewModal(sub, 'APPROVE')}
                          >
                            Approve
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs text-[#57534E]"
                          onClick={() => handleOpenReviewModal(sub, isApproved ? 'APPROVE' : 'REQUEST_CHANGES')}
                        >
                          View Review Details
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {selectedSubmission && (
        <Modal
          isOpen={isReviewModalOpen}
          onClose={() => {
            if (!isReviewSubmitting) setIsReviewModalOpen(false);
          }}
          title={reviewAction === 'APPROVE' ? 'Approve Work Submission' : 'Request Work Corrections'}
          subtitle={`Task: "${selectedSubmission.task_title}" • Submitted by ${selectedSubmission.employee_name}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-3.5 h-3.5 text-[#2D4A36]" />}
                onClick={() => handleDownloadZip(selectedSubmission)}
              >
                Download ZIP
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsReviewModalOpen(false)}
                  disabled={isReviewSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant={reviewAction === 'APPROVE' ? 'forest' : 'coral'}
                  size="sm"
                  isLoading={isReviewSubmitting}
                  icon={reviewAction === 'APPROVE' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  onClick={submitReview}
                >
                  {reviewAction === 'APPROVE' ? 'Confirm Approval' : 'Send Corrections to Employee'}
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Status Selector */}
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#F3EFE6] border border-[#DDD5C5]">
              <button
                type="button"
                onClick={() => setReviewAction('APPROVE')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  reviewAction === 'APPROVE'
                    ? 'bg-[#2D4A36] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Approve Deliverable</span>
              </button>
              <button
                type="button"
                onClick={() => setReviewAction('REQUEST_CHANGES')}
                className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  reviewAction === 'REQUEST_CHANGES'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Request Corrections</span>
              </button>
            </div>

            {/* Success Message */}
            {reviewSuccess && (
              <div className="p-3 rounded-xl bg-[#EBF1ED] border border-[#588157] text-[#2D4A36] flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{reviewSuccess}</span>
              </div>
            )}

            {/* Error Message */}
            {reviewError && (
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Submission Details Summary Box */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F2] border border-[#E8E2D5] space-y-2">
              <div>
                <span className="font-bold text-[#78716C] uppercase text-[10px] block">Completed Work Summary:</span>
                <p className="text-[#1C1917] mt-0.5 whitespace-pre-wrap">{selectedSubmission.work_summary}</p>
              </div>

              {selectedSubmission.challenges_faced && (
                <div className="pt-1.5 border-t border-[#E8E2D5]">
                  <span className="font-bold text-[#78716C] uppercase text-[10px] block">Reported Challenges:</span>
                  <p className="text-[#57534E] mt-0.5">{selectedSubmission.challenges_faced}</p>
                </div>
              )}

              <div className="pt-1.5 border-t border-[#E8E2D5] flex items-center justify-between text-[11px]">
                <span className="text-[#78716C]">
                  Deliverable: <strong className="text-[#1C1917]">{selectedSubmission.original_file_name}</strong>
                </span>
                <span className="font-mono text-[#588157]">{formatFileSize(selectedSubmission.file_size_bytes)}</span>
              </div>
            </div>

            {/* ZIP Requirement Verification Report Panel */}
            {selectedSubmission.verification_report && selectedSubmission.verification_report.checks && (
              <div className="p-3.5 rounded-xl bg-[#F7FAF8] border border-[#D1E0D5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#2D4A36] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#2D4A36]" />
                    ZIP Requirement Verification Report
                  </span>
                  <Badge variant={selectedSubmission.verification_report.failed_count === 0 ? 'sage' : 'coral'} size="sm">
                    {selectedSubmission.verification_report.passed_count} / {selectedSubmission.verification_report.checks.length} Passed
                  </Badge>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedSubmission.verification_report.checks.map((check: any, idx: number) => (
                    <div key={idx} className={`p-2 rounded-lg text-[11px] border flex items-start justify-between gap-2 ${
                      check.status === 'PASS' ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]' : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                    }`}>
                      <div className="space-y-0.5">
                        <span className="font-bold block">{check.requirement}</span>
                        <span className="text-[10px] text-[#57534E] block">Actual: {check.actual}</span>
                        {check.feedback && <span className="text-[10px] italic block font-semibold text-[#DC2626]">{check.feedback}</span>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                        check.status === 'PASS' ? 'bg-[#16A34A] text-white' : 'bg-[#DC2626] text-white'
                      }`}>
                        {check.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback / Instructions Form */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C]">
                {reviewAction === 'APPROVE' ? 'Manager Praise & Notes (Optional)' : 'Required Correction Details & Feedback *'}
              </label>
              <textarea
                rows={3}
                required={reviewAction === 'REQUEST_CHANGES'}
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder={
                  reviewAction === 'APPROVE'
                    ? 'Excellent job meeting all sprint requirements...'
                    : 'Detail specific bugs, missing requirements, or formatting changes needed before approval...'
                }
                className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
