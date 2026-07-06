import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { PageLoader, EmptyState, Modal } from '../../components/ui';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../components/ui/Icons';
import { dashboardService } from '../../services/dashboardService';
import { voteService } from '../../services/voteService';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

const UPLOADS_URL = process.env.REACT_APP_UPLOADS_URL || 'http://localhost:5000';

interface CandidateOption {
  id: string;
  status: string;
  manifesto?: string | null;
  photo?: string | null;
  student: { user: { firstName: string; lastName: string } };
}

interface PositionBallot {
  id: string;
  title: string;
  description?: string | null;
  maxWinners: number;
  candidates: CandidateOption[];
  hasVoted: boolean;
}

export const VotingPage: React.FC = () => {
  const [elections, setElections] = useState<any[]>([]);
  const [activeElection, setActiveElection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'ballot' | 'success'>('ballot');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    dashboardService.getStudentDashboard()
      .then((data) => {
        const pending = data.openElections.filter((e: any) => e.positions.some((p: any) => !p.hasVoted));
        setElections(pending);
        setActiveElection(pending[0] || null);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const positionsToVote: PositionBallot[] = activeElection
    ? activeElection.positions.filter((p: PositionBallot) => !p.hasVoted)
    : [];

  const allSelected = positionsToVote.every((p) => selections[p.id]);
  const selectedCount = positionsToVote.filter((p) => selections[p.id]).length;

  const handleSelect = (positionId: string, candidateId: string) => {
    setSelections((prev) => ({ ...prev, [positionId]: candidateId }));
  };

  const handleSubmit = async () => {
    if (!activeElection) return;
    setSubmitting(true);
    try {
      const votes = positionsToVote.map((p) => ({ positionId: p.id, candidateId: selections[p.id] }));
      await voteService.cast(activeElection.id, votes);
      setConfirmOpen(false);
      setStep('success');
      toast.success('Your vote has been recorded!');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getCandidateName = (positionId: string) => {
    const pos = positionsToVote.find((p) => p.id === positionId);
    const cand = pos?.candidates.find((c) => c.id === selections[positionId]);
    return cand ? `${cand.student.user.firstName} ${cand.student.user.lastName}` : '';
  };

  if (loading) return <DashboardLayout title="Vote"><PageLoader /></DashboardLayout>;

  if (step === 'success') {
    return (
      <DashboardLayout title="Vote">
        <div className="card p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Icons.Check className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900">Vote Submitted Successfully!</h2>
          <p className="text-sm text-slate-500 mt-2">
            Thank you for participating in the democratic process. Your vote has been securely recorded and is completely confidential.
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button variant="secondary" onClick={() => navigate('/student/dashboard')}>Go to Dashboard</Button>
            {elections.length > 1 && (
              <Button onClick={() => { setStep('ballot'); setSelections({}); load(); }}>Vote in Next Election</Button>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!activeElection || positionsToVote.length === 0) {
    return (
      <DashboardLayout title="Vote">
        <div className="card">
          <EmptyState
            title="No pending votes"
            description="You've either voted in all open elections or there are none currently open."
            icon={<Icons.Vote className="w-12 h-12" />}
            action={<Button onClick={() => navigate('/student/dashboard')}>Back to Dashboard</Button>}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Vote">
      <div className="page-header">
        <div>
          <h1 className="page-title">{activeElection.title}</h1>
          <p className="page-subtitle">Cast your secret ballot below. Your choices are confidential.</p>
        </div>
      </div>

      <div className="sticky top-16 z-20 mb-6 p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
            {selectedCount}/{positionsToVote.length}
          </div>
          <p className="text-sm font-medium text-slate-700">Positions selected</p>
        </div>
        <Button onClick={() => setConfirmOpen(true)} disabled={!allSelected}>
          Review & Submit
        </Button>
      </div>

      <div className="space-y-6">
        {positionsToVote.map((position) => (
          <div key={position.id} className="card">
            <div className="card-header">
              <h3 className="font-semibold text-slate-900">{position.title}</h3>
              {position.description && <p className="text-xs text-slate-500 mt-0.5">{position.description}</p>}
            </div>
            <div className="card-body grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {position.candidates.length === 0 && (
                <p className="text-sm text-slate-400 col-span-full">No approved candidates for this position.</p>
              )}
              {position.candidates.map((candidate) => {
                const isSelected = selections[position.id] === candidate.id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => handleSelect(position.id, candidate.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {candidate.photo ? (
                          <img src={`${UPLOADS_URL}${candidate.photo}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Icons.User className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 text-sm truncate">
                          {candidate.student.user.firstName} {candidate.student.user.lastName}
                        </p>
                        {candidate.manifesto && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-3">{candidate.manifesto}</p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-300'
                      }`}>
                        {isSelected && <Icons.Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={() => setConfirmOpen(true)} disabled={!allSelected} size="lg">
          Review & Submit Ballot
        </Button>
      </div>

      {/* Confirmation modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Your Vote"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmOpen(false)}>Go Back & Edit</button>
            <Button onClick={handleSubmit} isLoading={submitting} variant="success">
              Confirm & Submit Vote
            </Button>
          </>
        }
      >
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
          <Icons.Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Once submitted, your vote cannot be changed. Please review your selections carefully.
          </p>
        </div>
        <div className="space-y-3">
          {positionsToVote.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-500">{p.title}</span>
              <span className="text-sm font-semibold text-slate-900">{getCandidateName(p.id)}</span>
            </div>
          ))}
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default VotingPage;
