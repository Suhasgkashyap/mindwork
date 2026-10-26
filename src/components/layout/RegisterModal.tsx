import React, { useState } from 'react';
import { User, Role } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { UserPlus, AlertCircle, CheckCircle2, Shield, Laptop } from 'lucide-react';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onUserRegistered: (newUser: User) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserRegistered,
}) => {
  const isManager = currentUser?.role === 'MANAGER';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [department, setDepartment] = useState('IT');
  const [age, setAge] = useState('28');
  const [experienceYears, setExperienceYears] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill out all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isManager ? '/api/manager/create-employee' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: isManager ? role : 'EMPLOYEE',
          department: role === 'EMPLOYEE' ? department : undefined,
          age: Number(age) || 28,
          experience_years: Number(experienceYears) || 3,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create account');
      }

      setSuccessMsg(`Account created for ${data.user.name} (${data.user.role})!`);
      setTimeout(() => {
        onUserRegistered(data.user);
        onClose();
        setName('');
        setEmail('');
        setPassword('');
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isManager ? "Provision Employee Account" : "Register Employee Account"}
      subtitle="Multi-Laptop MindWork • Shared Database Sync"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-semibold text-[#16A34A] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="p-3 rounded-xl bg-[#F4EFE6] border border-[#DDD5C5] text-xs text-[#57534E] flex items-start gap-2.5">
          <Laptop className="w-4 h-4 text-[#588157] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {isManager
              ? "Managers can provision authorized employee accounts linked to team records. Passwords are securely hashed."
              : "Register an employee account to access your personal dashboard and execute tasks on your laptop."}
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1">
            Full Name <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., David Cole"
            className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1">
            Email Address <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="david.cole@mindwork.io"
            className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1">
            Password <span className="text-[#DC2626]">*</span>
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 characters (e.g. Password123!)"
            className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1">
              Account Role
            </label>
            <select
              value={role}
              disabled={!isManager}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] disabled:opacity-75 disabled:bg-gray-100"
            >
              <option value="EMPLOYEE">Employee (Task Execution)</option>
              {isManager && <option value="MANAGER">Manager (Oversight & Delegation)</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1">
              Department
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#DDD5C5] bg-white text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36]"
            >
              <option value="IT">IT & Engineering</option>
              <option value="HR">Human Resources</option>
              <option value="Sales">Sales & Marketing</option>
              <option value="Operations">Operations</option>
              <option value="Backend">Backend Engineering</option>
            </select>
          </div>
        </div>

        <div className="pt-3 border-t border-[#EFE9DC] flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="forest"
            size="sm"
            isLoading={isLoading}
            icon={<UserPlus className="w-4 h-4" />}
          >
            {isManager ? "Create Account" : "Register Account"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
