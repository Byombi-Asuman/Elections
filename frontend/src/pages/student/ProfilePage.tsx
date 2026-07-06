import React, { useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Input } from '../../components/ui/FormControls';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../components/ui/Icons';
import { authService } from '../../services/authService';
import { getErrorMessage } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

export const StudentProfilePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const student = user?.student;

  return (
    <DashboardLayout title="My Profile">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">View your account details and manage your password</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 max-w-4xl">
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{user?.firstName} {user?.lastName}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">Admission Number</dt>
              <dd className="font-medium text-slate-900">{student?.admissionNumber}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">Class</dt>
              <dd className="font-medium text-slate-900">{student?.class}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">Stream</dt>
              <dd className="font-medium text-slate-900">{student?.stream || '—'}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <dt className="text-slate-500">House</dt>
              <dd className="font-medium text-slate-900">{student?.house || '—'}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Voting Eligibility</dt>
              <dd>
                <span className={student?.isEligible ? 'badge-green' : 'badge-red'}>
                  {student?.isEligible ? 'Eligible' : 'Not Eligible'}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
            <Icons.Lock className="w-4 h-4 text-slate-400" /> Change Password
          </h3>
          <p className="text-xs text-slate-500 mb-4">Choose a strong password you haven't used before</p>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input label="Current Password" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            <Input label="New Password" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} hint="At least 8 characters" />
            <Input label="Confirm New Password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <Button type="submit" isLoading={saving}>Update Password</Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfilePage;
