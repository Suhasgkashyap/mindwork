import React, { useState } from 'react';
import { User } from '../../types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LeafIcon } from '../ui/BotanicalDecor';
import {
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  Laptop,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Users,
  Briefcase
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('IT');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid email or password.');
      }

      localStorage.setItem('mindwork_token', data.token);
      localStorage.setItem('mindwork_active_user_id', data.user.id);
      try {
        document.cookie = `mindwork_token=${encodeURIComponent(data.token)}; path=/; SameSite=Lax`;
      } catch {}
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required registration fields.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: 'EMPLOYEE', // strictly enforce employee on public self-registration
          department,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Registration failed.');
      }

      setSuccessMessage(`Account created for ${data.user.name}! Signing in...`);
      localStorage.setItem('mindwork_token', data.token);
      localStorage.setItem('mindwork_active_user_id', data.user.id);
      try {
        document.cookie = `mindwork_token=${encodeURIComponent(data.token)}; path=/; SameSite=Lax`;
      } catch {}
      setTimeout(() => {
        onLoginSuccess(data.user, data.token);
      }, 600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (userEmail: string, userPass = 'Password123!') => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 selection:bg-[#2D4A36] selection:text-[#FAF7F0]">
      {/* Brand Header */}
      <div className="w-full max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-[#2D4A36] text-[#FAF7F0] shadow-lg mb-3">
          <LeafIcon size={30} className="text-[#A3B18A]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1C1917] tracking-tight">
          MindWork
        </h1>
        <p className="text-xs sm:text-sm text-[#57534E] mt-1">
          Burnout Early Detection & Team Resilience System
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-[#EBF1ED] border border-[#D1E0D5] text-xs text-[#2D4A36] font-medium">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-ping" />
          <span>Multi-Laptop Network Authenticated</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E8E2D5] shadow-xl p-6 sm:p-8 space-y-5">
        {/* Sign In vs Register Toggle */}
        <div className="flex rounded-2xl bg-[#F4EFE6] p-1 border border-[#E0D9C8]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('signin');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'signin'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-[#1C1917] shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917]'
            }`}
          >
            Join as Employee
          </button>
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#DC2626] flex items-start gap-2.5 shadow-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs font-semibold text-[#16A34A] flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        {activeTab === 'signin' ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mindwork.io"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-[#DDD5C5] bg-[#FAF8F5] text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-[#DDD5C5] bg-[#FAF8F5] text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="forest"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Workspace
            </Button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., David Cole"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-[#DDD5C5] bg-[#FAF8F5] text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="employee@mindwork.io"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-[#DDD5C5] bg-[#FAF8F5] text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1.5">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-[#DDD5C5] bg-[#FAF8F5] text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:bg-white"
              >
                <option value="IT">IT & Engineering</option>
                <option value="HR">Human Resources</option>
                <option value="Sales">Sales & Marketing</option>
                <option value="Operations">Operations</option>
                <option value="Backend">Backend Engineering</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#44403C] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#78716C] absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border border-[#DDD5C5] bg-[#FAF8F5] text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#2D4A36] focus:bg-white"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="forest"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Join Team as Employee
            </Button>
          </form>
        )}

        {/* Quick Testing Accounts Section */}
        <div className="pt-4 border-t border-[#F0EBE1] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
              Demo Quick-Fill Accounts
            </span>
            <span className="text-[11px] font-semibold text-[#588157]">
              Password: Password123!
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillQuickCredentials('bob.manager@mindwork.io')}
              className="p-2.5 rounded-xl border border-[#DDD5C5] hover:border-[#2D4A36] hover:bg-[#FAF8F5] text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917] group-hover:text-[#2D4A36]">
                  Bob Manager
                </span>
                <Badge variant="forest" size="sm">MGR</Badge>
              </div>
              <p className="text-[10px] text-[#78716C] mt-0.5 truncate">
                Manager Laptop
              </p>
            </button>

            <button
              type="button"
              onClick={() => fillQuickCredentials('alice@mindwork.io')}
              className="p-2.5 rounded-xl border border-[#DDD5C5] hover:border-[#2D4A36] hover:bg-[#FAF8F5] text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917] group-hover:text-[#2D4A36]">
                  Alice
                </span>
                <Badge variant="sage" size="sm">EMP</Badge>
              </div>
              <p className="text-[10px] text-[#78716C] mt-0.5 truncate">
                Friend 1 Laptop
              </p>
            </button>

            <button
              type="button"
              onClick={() => fillQuickCredentials('friend1@mindwork.io')}
              className="p-2.5 rounded-xl border border-[#DDD5C5] hover:border-[#2D4A36] hover:bg-[#FAF8F5] text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917] group-hover:text-[#2D4A36]">
                  David Cole
                </span>
                <Badge variant="sage" size="sm">EMP</Badge>
              </div>
              <p className="text-[10px] text-[#78716C] mt-0.5 truncate">
                Friend 2 Laptop
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Academic Disclaimer */}
      <div className="max-w-md text-center mt-6 text-xs text-[#78716C] leading-relaxed">
        <p>
          Role-Based Access Control • Server-enforced authorization • SQLite persistent shared state
        </p>
      </div>
    </div>
  );
};
