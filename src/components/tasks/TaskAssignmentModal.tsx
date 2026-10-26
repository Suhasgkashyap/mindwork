import React, { useState, useEffect } from 'react';
import { Priority, Employee, CreateTaskInput } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { PriorityBadge } from '../ui/Badge';
import { CheckSquare, AlertCircle, Info, Calendar, User, FileText, Sparkles } from 'lucide-react';

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onTaskCreated: () => void;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  isOpen,
  onClose,
  employees,
  onTaskCreated,
}) => {
  const [employeeId, setEmployeeId] = useState<string>(() => employees[0]?.id || 'emp_alice');

  useEffect(() => {
    if (isOpen && employees && employees.length > 0) {
      if (!employees.some((e) => e.id === employeeId)) {
        setEmployeeId(employees[0].id);
      }
    }
  }, [isOpen, employees, employeeId]);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('Medium');
  const [deadline, setDeadline] = useState<string>(() => {
    // Default deadline: tomorrow at 17:00
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().split('T')[0];
    return `${dateStr}T17:00`;
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Please enter a task title.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('Please provide task description and instructions.');
      return;
    }
    if (!deadline) {
      setErrorMessage('Please specify a deadline date and time.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateTaskInput = {
        employee_id: employeeId,
        title: title.trim(),
        description: description.trim(),
        priority,
        deadline: deadline.replace('T', ' ') + (deadline.length === 16 ? ':00' : ''),
        acceptance_criteria: acceptanceCriteria.trim() || undefined,
      };

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to assign task');
      }

      // Success
      setTitle('');
      setDescription('');
      setAcceptanceCriteria('');
      setPriority('Medium');
      onTaskCreated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error assigning task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorityOptions: Priority[] = ['Low', 'Medium', 'High', 'Urgent'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Sprint Task"
      subtitle="Bob Manager • Team Task Delegation"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Protocol Disclaimer Banner */}
        <div className="p-3.5 rounded-2xl bg-[#F4EFE6] border border-[#DDD5C5] flex items-start gap-3 text-xs text-[#57534E]">
          <Info className="w-4 h-4 text-[#588157] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#1C1917]">MindWork Objective Protocol:</strong> Task complexity and expected completion time are intentionally omitted from this form. They are objectively evaluated by the system upon completion.
          </p>
        </div>

        {/* 1. Employee Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#588157]" />
            1. Assign To Employee <span className="text-[#DC2626]">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {employees.map((emp) => {
              const isSelected = employeeId === emp.id;
              return (
                <button
                  type="button"
                  key={emp.id}
                  onClick={() => setEmployeeId(emp.id)}
                  className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF1ED] border-[#2D4A36] text-[#2D4A36] shadow-sm ring-1 ring-[#2D4A36]'
                      : 'bg-white border-[#E0D9C8] text-[#57534E] hover:border-[#588157] hover:bg-[#FAF6ED]'
                  }`}
                >
                  <Avatar name={emp.name} size="sm" department={emp.department} />
                  <span className="font-bold text-xs mt-1.5 leading-tight">{emp.name}</span>
                  <span className="text-[10px] text-[#78716C]">{emp.department}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Task Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-[#588157]" />
            2. Task Title <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Develop Token Refresh Webhook Endpoint"
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD5C5] bg-white text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:border-transparent transition-all"
          />
        </div>

        {/* 3. Description / Instructions */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#588157]" />
            3. Description & Detailed Instructions <span className="text-[#DC2626]">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Outline concrete requirements, expected endpoints, checklist items..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD5C5] bg-white text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:border-transparent transition-all leading-relaxed"
          />
        </div>

        {/* 4. Acceptance Criteria */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-[#588157]" />
            4. Acceptance Criteria & Required Deliverables (Optional)
          </label>
          <textarea
            rows={2}
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            placeholder="e.g., Code reviewed, unit tests passing, PR link provided..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD5C5] bg-white text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:border-transparent transition-all leading-relaxed"
          />
        </div>

        {/* 5. Priority Selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#588157]" />
            5. Priority Tier <span className="text-[#DC2626]">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {priorityOptions.map((p) => {
              const isSelected = priority === p;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-[#F4EFE6] border-[#2D4A36] ring-1 ring-[#2D4A36] shadow-sm'
                      : 'bg-white border-[#E0D9C8] hover:border-[#DDD5C5]'
                  }`}
                >
                  <PriorityBadge priority={p} size="sm" />
                </button>
              );
            })}
          </div>
        </div>

        {/* 6. Deadline Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#588157]" />
            6. Delivery Deadline <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="datetime-local"
            required
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#DDD5C5] bg-white text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:border-transparent transition-all"
          />
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-[#EFE9DC] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            icon={<CheckSquare className="w-4 h-4" />}
          >
            Assign Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
