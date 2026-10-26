import React, { useState, useEffect } from 'react';
import { User, WorkSubmission } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, PriorityBadge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import { EmptyState } from '../ui/EmptyState';
import {
  FileCheck2,
  FileArchive,
  Download,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface EmployeeSubmissionsViewProps {
  currentUser: User;
  onNavigateToTasks: () => void;
}

export const EmployeeSubmissionsView: React.FC<EmployeeSubmissionsViewProps> = ({
  currentUser,
  onNavigateToTasks,
}) => {
  const [submissions, setSubmissions] = useState<WorkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMySubmissions = async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/submissions', { headers });
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}: Failed to synchronize work reports.`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.submissions)) {
        setSubmissions(data.submissions);
        setErrorMessage(null);
      } else {
        throw new Error(data.error || 'Failed to retrieve your submissions.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to shared database.');
    } finally {
      setIsRefreshing(false);
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMySubmissions(true);

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.addEventListener('submission_reviewed', () => fetchMySubmissions());
      eventSource.addEventListener('task_updated', () => fetchMySubmissions());
    } catch {}

    const interval = setInterval(() => fetchMySubmissions(), 10000);
    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, []);

  const handleDownloadZip = (submission: WorkSubmission) => {
    window.open(`/api/submissions/${submission.id}/download`, '_blank');
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'ZIP Archive';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Network Error Notification Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchMySubmissions(true)}
            className="px-3 py-1 rounded-xl bg-[#DC2626] text-white text-xs font-bold hover:bg-[#B91C1C] transition cursor-pointer"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E2D5]">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1C1917] tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-[#2D4A36]" />
            My Submitted Work & Deliverables
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1">
            Track your submitted work reports, supervisor review decisions, and download uploaded ZIP files
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<RotateCcw className={`w-3.5 h-3.5 text-[#2D4A36] ${isRefreshing ? 'animate-spin' : ''}`} />}
            onClick={() => fetchMySubmissions(true)}
          >
            {isRefreshing ? 'Syncing...' : 'Refresh'}
          </Button>
          <Button
            variant="forest"
            size="sm"
            onClick={onNavigateToTasks}
          >
            Go to My Assigned Tasks
          </Button>
        </div>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState message="Loading your submitted work deliverables..." />
        </div>
      ) : submissions.length === 0 ? (
        <EmptyState
          title="No Submissions Yet"
          description="When you finish a task and submit your work report with a .zip deliverable, it will appear here."
          actionLabel="View Assigned Tasks"
          onAction={onNavigateToTasks}
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const isPending = sub.status === 'SUBMITTED';
            const isApproved = sub.status === 'APPROVED';
            const isChangesRequested = sub.status === 'CHANGES_REQUESTED';

            return (
              <Card
                key={sub.id}
                padding="md"
                className={`transition-all ${
                  isPending
                    ? 'border-[#FDE68A] bg-[#FFFDF5]'
                    : isChangesRequested
                    ? 'border-[#FECACA] bg-[#FFFBFB] ring-1 ring-[#DC2626]/30'
                    : 'border-[#D1E0D5] bg-white'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left Column: Task & Report Content */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {sub.task_priority && <PriorityBadge priority={sub.task_priority} size="sm" />}
                      <h3 className="font-bold text-base text-[#1C1917]">{sub.task_title || 'Assigned Task'}</h3>
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

                    <div className="p-3 rounded-xl bg-[#FAF8F2] border border-[#E8E2D5] text-xs text-[#292524] leading-relaxed whitespace-pre-wrap">
                      <span className="font-bold text-[#2D4A36] block mb-0.5">Your Work Summary:</span>
                      {sub.work_summary}
                    </div>

                    {sub.challenges_faced && (
                      <div className="p-2.5 rounded-xl bg-white border border-[#E8E2D5] text-xs text-[#57534E]">
                        <span className="font-bold text-[#78716C] block mb-0.5">Challenges Reported:</span>
                        {sub.challenges_faced}
                      </div>
                    )}

                    {/* Manager Feedback */}
                    {sub.manager_feedback && (
                      <div className={`p-3 rounded-xl border text-xs ${
                        isChangesRequested
                          ? 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
                          : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold mb-1">
                          {isChangesRequested ? (
                            <>
                              <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                              <span>Manager Requested Corrections:</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                              <span>Manager Approval Notes:</span>
                            </>
                          )}
                        </div>
                        <p className="leading-relaxed">{sub.manager_feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status & Download */}
                  <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 lg:w-64 border-t lg:border-t-0 lg:border-l border-[#E8E2D5] pt-3 lg:pt-0 lg:pl-4">
                    <div>
                      {isPending && (
                        <Badge variant="peach" size="sm" dot>
                          In Supervisor Review
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge variant="sage" size="sm">
                          Approved & Completed
                        </Badge>
                      )}
                      {isChangesRequested && (
                        <Badge variant="coral" size="sm" dot>
                          Corrections Requested
                        </Badge>
                      )}
                    </div>

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
                        title="Download your submitted ZIP"
                      >
                        Download
                      </Button>
                    </div>

                    {isChangesRequested && (
                      <Button
                        variant="forest"
                        size="sm"
                        className="w-full"
                        onClick={onNavigateToTasks}
                      >
                        Resubmit from Task Board
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
