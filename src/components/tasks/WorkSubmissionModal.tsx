import React, { useState, useRef } from 'react';
import { TaskItem } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge, PriorityBadge } from '../ui/Badge';
import {
  Upload,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Calendar,
  Sparkles,
  HelpCircle,
  Check
} from 'lucide-react';

interface WorkSubmissionModalProps {
  task: TaskItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
}

export const WorkSubmissionModal: React.FC<WorkSubmissionModalProps> = ({
  task,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [workSummary, setWorkSummary] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');
  const [completionStatus, setCompletionStatus] = useState('100% Completed');
  const [optionalRemarks, setOptionalRemarks] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!task) return null;

  const validateAndSetFile = (file: File) => {
    setFileError(null);
    setErrorMessage(null);

    // Validate .zip extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.zip')) {
      setFileError('Invalid file format. Please upload a .zip archive containing your project work or code.');
      setSelectedFile(null);
      return false;
    }

    // Validate size (max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed ZIP size is 50MB.`);
      setSelectedFile(null);
      return false;
    }

    if (file.size === 0) {
      setFileError('The selected ZIP file is empty (0 bytes). Please upload a valid archive.');
      setSelectedFile(null);
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!workSummary.trim()) {
      setErrorMessage('Please provide a work summary describing what was done.');
      return;
    }

    // Require ZIP file unless task already has an existing uploaded ZIP file on server
    if (!selectedFile && !task.submission_file_path) {
      setErrorMessage('Please select a .zip file containing your completed deliverables or source code.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('work_summary', workSummary.trim());
      formData.append('challenges_faced', challengesFaced.trim());
      formData.append('completion_status', completionStatus);
      formData.append('optional_remarks', optionalRemarks.trim());
      if (deliverableUrl.trim()) {
        formData.append('deliverable_url', deliverableUrl.trim());
      }
      if (selectedFile) {
        formData.append('work_file', selectedFile);
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Progress animation
      const progressTimer = setInterval(() => {
        setUploadProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 120);

      const res = await fetch(`/api/tasks/${task.id}/submit`, {
        method: 'POST',
        headers,
        body: formData,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit work report.');
      }

      setSuccessMessage('Work report and ZIP deliverable submitted successfully! Ready for supervisor review.');
      setTimeout(() => {
        onSubmitted();
        onClose();
        // Reset state
        setWorkSummary('');
        setChallengesFaced('');
        setOptionalRemarks('');
        setSelectedFile(null);
        setUploadProgress(0);
        setSuccessMessage(null);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading submission. Please check your network and try again.');
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title="Submit Work & Project Deliverable"
      subtitle={`Task: "${task.title}"`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] text-[#78716C]">
            <span className="text-[#DC2626] font-bold">*</span> Required fields must be completed.
          </span>
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="forest"
              size="sm"
              isLoading={isSubmitting}
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={handleSubmit}
            >
              {task.status === 'CHANGES_REQUESTED' ? 'Submit Revised Work' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Task Summary Banner */}
        <div className="p-3.5 rounded-2xl bg-[#F7FAF8] border border-[#D1E0D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <PriorityBadge priority={task.priority} size="sm" />
              <span className="font-bold text-sm text-[#1C1917]">{task.title}</span>
            </div>
            <p className="text-[#57534E] line-clamp-2 text-[11px]">{task.description}</p>
          </div>
          <div className="shrink-0 text-[11px] text-[#78716C] font-mono flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#DDD5C5]">
            <Calendar className="w-3.5 h-3.5 text-[#588157]" />
            <span>Due {task.deadline.split(' ')[0]}</span>
          </div>
        </div>

        {/* Existing Corrections Notice (if resubmitting) */}
        {task.status === 'CHANGES_REQUESTED' && task.manager_feedback && (
          <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Supervisor Feedback / Requested Corrections:</span>
            </div>
            <p className="text-[#7F1D1D] pl-6 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-[#FCA5A5]/40">
              {task.manager_feedback}
            </p>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-[#EBF1ED] border border-[#588157] text-[#2D4A36] flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2D4A36]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Field 1: Work Summary (Required) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C]">
            Work Summary & Completed Description <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={workSummary}
            onChange={(e) => setWorkSummary(e.target.value)}
            placeholder="Describe what was built, refactored, or accomplished. Detail components created, test coverage, and outcomes..."
            className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
          />
        </div>

        {/* Field 2 & 3: Challenges Faced & Completion Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C]">
              Challenges Faced (Optional)
            </label>
            <textarea
              rows={2}
              value={challengesFaced}
              onChange={(e) => setChallengesFaced(e.target.value)}
              placeholder="Any technical blockers, environment snags, or workarounds applied..."
              className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C]">
              Completion Status <span className="text-[#DC2626]">*</span>
            </label>
            <select
              value={completionStatus}
              onChange={(e) => setCompletionStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
            >
              <option value="100% Completed">100% Fully Completed</option>
              <option value="Ready for Quality Review">Ready for Quality Review</option>
              <option value="Completed with Known Limitations">Completed with Known Limitations</option>
              <option value="Substantially Completed (Follow-up Planned)">Substantially Completed (Follow-up Planned)</option>
            </select>

            <div className="pt-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#78716C] mb-1">
                Optional Remarks
              </label>
              <input
                type="text"
                value={optionalRemarks}
                onChange={(e) => setOptionalRemarks(e.target.value)}
                placeholder="e.g., Deployed to staging, ready for QA check..."
                className="w-full px-3 py-1.5 rounded-xl border border-[#DDD5C5] bg-white text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
              />
            </div>
          </div>
        </div>

        {/* Field 4: Deliverable ZIP File Upload (Required) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
              <FileArchive className="w-4 h-4 text-[#2D4A36]" />
              Completed Work / Project Source Code ZIP Archive <span className="text-[#DC2626]">*</span>
            </label>
            <span className="text-[11px] text-[#78716C]">Only .zip archives up to 50MB</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-[#2D4A36] bg-[#EBF1ED]'
                  : fileError
                  ? 'border-[#FCA5A5] bg-[#FEF2F2]'
                  : 'border-[#D1E0D5] bg-[#FAF8F2] hover:bg-[#F3EFE6] hover:border-[#588157]'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-[#EBF1ED] text-[#2D4A36] flex items-center justify-center shadow-xs">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1C1917]">
                  Click to browse from your laptop or drag & drop .zip here
                </p>
                <p className="text-[11px] text-[#78716C] mt-0.5">
                  Package your source files, build artifacts, or documentation in a .zip archive
                </p>
              </div>
              {task.submission_file_name && !selectedFile && (
                <div className="mt-1 px-3 py-1 rounded-xl bg-white border border-[#DDD5C5] text-[11px] text-[#588157] font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>Existing server upload: {task.submission_original_file_name || task.submission_file_name}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-white border border-[#2D4A36] flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-[#2D4A36] text-[#FAF7F0] flex items-center justify-center shrink-0">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <span className="font-bold text-xs text-[#1C1917] block truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <span className="text-[11px] text-[#78716C] font-mono">
                    {formatFileSize(selectedFile.size)} • ZIP Archive
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="sage" size="sm">
                  Ready
                </Badge>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setFileError(null);
                  }}
                  className="p-1 rounded-lg text-[#78716C] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition cursor-pointer"
                  title="Remove selected file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {fileError && (
            <p className="text-[11px] text-[#DC2626] font-semibold flex items-center gap-1.5 mt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{fileError}</span>
            </p>
          )}
        </div>

        {/* Field 5: Deliverable URL (Optional) */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
            Deliverable Link / URL (Optional)
          </label>
          <input
            type="text"
            value={deliverableUrl}
            onChange={(e) => setDeliverableUrl(e.target.value)}
            placeholder="e.g., Pull request URL, staging preview link, or Figma prototype..."
            className="w-full px-3 py-1.5 rounded-xl border border-[#DDD5C5] bg-white text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
          />
        </div>

        {/* Upload Progress Bar */}
        {isSubmitting && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#2D4A36]">
              <span>Uploading ZIP deliverable to secure storage...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#EBF1ED] overflow-hidden">
              <div
                className="h-full bg-[#2D4A36] transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
