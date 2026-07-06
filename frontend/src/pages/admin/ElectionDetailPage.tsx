import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, StatusBadge, EmptyState, Modal, ConfirmDialog } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/FormControls';
import { Icons } from '../../components/ui/Icons';
import { electionService } from '../../services/electionService';
import { positionService } from '../../services/positionService';
import { adminService, ElectionAdmin } from '../../services/adminService';
import { Select } from '../../components/ui/FormControls';
import { useAuthStore } from '../../store/authStore';
import { Election, Position } from '../../types';
import { getErrorMessage } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const emptyForm = { title: '', description: '', maxWinners: 1 };

export const ElectionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [admins, setAdmins] = useState<ElectionAdmin[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    electionService.getOne(id)
      .then(setElection)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    adminService.getAll()
      .then((res) => setAdmins(res.admins.filter((a) => a.isActive)))
      .catch(() => {});
  }, [isSuperAdmin]);

  const openAssign = () => { setSelectedAdminId(election?.admin?.id || ''); setAssignModalOpen(true); };

  const handleAssign = async () => {
    if (!id) return;
    setAssigning(true);
    try {
      await electionService.update(id, { adminId: selectedAdminId || null } as any);
      toast.success('Election admin updated');
      setAssignModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAssigning(false);
    }
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (p: Position) => {
    setEditing(p);
    setForm({ title: p.title, description: p.description || '', maxWinners: p.maxWinners });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !form.title) return toast.error('Position title is required');
    setSubmitting(true);
    try {
      if (editing) {
        await positionService.update(editing.id, form);
        toast.success('Position updated');
      } else {
        await positionService.create({ electionId: id, ...form, order: election?.positions?.length || 0 });
        toast.success('Position created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await positionService.remove(deleteTarget.id);
      toast.success('Position removed');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <DashboardLayout title="Election Details"><PageLoader /></DashboardLayout>;
  if (!election) return <DashboardLayout title="Election Details"><EmptyState title="Election not found" /></DashboardLayout>;

  return (
    <DashboardLayout title="Election Details">
      <div className="mb-4">
        <Link to="/admin/elections" className="text-sm text-slate-500 hover:text-primary-600 flex items-center gap-1">
          ← Back to Elections
        </Link>
      </div>

      <div className="page-header items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{election.title}</h1>
            <StatusBadge status={election.status} />
          </div>
          <p className="page-subtitle">{election.description}</p>
          <p className="text-xs text-slate-400 mt-1">
            {format(new Date(election.startDate), 'MMM d, yyyy h:mm a')} → {format(new Date(election.endDate), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/admin/results/${election.id}`} className="btn-secondary">
            <Icons.Results className="w-4 h-4" /> View Results
          </Link>
          <Link to={`/admin/candidates?electionId=${election.id}`} className="btn-secondary">
            <Icons.Candidate className="w-4 h-4" /> Candidates
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-icon bg-primary-100 text-primary-700"><Icons.Position className="w-5 h-5" /></div>
          <div><p className="text-sm text-slate-500">Positions</p><p className="text-xl font-bold">{election.positions?.length || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-purple-100 text-purple-700"><Icons.Candidate className="w-5 h-5" /></div>
          <div><p className="text-sm text-slate-500">Candidates</p><p className="text-xl font-bold">{election._count?.candidates || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-emerald-100 text-emerald-700"><Icons.Vote className="w-5 h-5" /></div>
          <div><p className="text-sm text-slate-500">Votes Cast</p><p className="text-xl font-bold">{election._count?.votes || 0}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon bg-amber-100 text-amber-700"><Icons.User className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm text-slate-500">Admin</p>
              <p className="text-sm font-semibold truncate">{election.admin ? `${election.admin.firstName} ${election.admin.lastName}` : 'Unassigned'}</p>
            </div>
            {isSuperAdmin && (
              <button onClick={openAssign} className="btn-ghost btn-sm shrink-0" title="Assign election admin">
                <Icons.Edit className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Positions</h3>
            <p className="text-xs text-slate-500">Manage electable positions for this election</p>
          </div>
          <Button size="sm" onClick={openCreate} icon={<Icons.Plus className="w-4 h-4" />}>Add Position</Button>
        </div>

        {!election.positions || election.positions.length === 0 ? (
          <div className="card-body">
            <EmptyState
              title="No positions yet"
              description="Add positions like Head Prefect, Sports Captain, etc."
              icon={<Icons.Position className="w-10 h-10" />}
              action={<Button size="sm" onClick={openCreate}>Add Position</Button>}
            />
          </div>
        ) : (
          <div className="table-container border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>Position</th>
                  <th>Max Winners</th>
                  <th>Candidates</th>
                  <th>Votes</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {election.positions.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <p className="font-medium text-slate-900">{p.title}</p>
                      {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
                    </td>
                    <td>{p.maxWinners}</td>
                    <td>{p._count?.candidates ?? 0}</td>
                    <td>{p._count?.votes ?? 0}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="btn-ghost btn-sm"><Icons.Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteTarget(p)} className="btn-ghost btn-sm text-red-600 hover:bg-red-50"><Icons.Trash className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Position' : 'Add Position'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <Button onClick={handleSubmit as any} isLoading={submitting}>{editing ? 'Save Changes' : 'Add Position'}</Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Position Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Head Prefect" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this role" />
          <Input
            label="Maximum Winners"
            type="number"
            min={1}
            required
            value={form.maxWinners}
            onChange={(e) => setForm({ ...form, maxWinners: parseInt(e.target.value) || 1 })}
            hint="Number of candidates elected for this position"
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Position"
        message={`Delete "${deleteTarget?.title}"? All associated candidates and votes will be removed.`}
        confirmLabel="Delete"
        danger
      />

      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Election Admin"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAssignModalOpen(false)}>Cancel</button>
            <Button onClick={handleAssign} isLoading={assigning}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            The assigned admin can manage this election's positions, candidates, and results. Only active
            Election Admin accounts are shown — create one first from the{' '}
            <Link to="/admin/admins" className="text-primary-600 hover:underline">Election Admins</Link> page if
            the person you need isn't listed.
          </p>
          <Select
            label="Election Admin"
            value={selectedAdminId}
            onChange={(e) => setSelectedAdminId(e.target.value)}
            options={[
              { value: '', label: 'Unassigned' },
              ...admins.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName} (${a.email})` })),
            ]}
          />
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default ElectionDetailPage;
