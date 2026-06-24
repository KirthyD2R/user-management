import { useState, useEffect } from 'react';
import { XCircle, CheckCircle2, X, Loader2, Search, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOrgSubscriptions,
  changePlan,
  changeStatus,
} from '../../api/subscriptions';
import { getOrganization } from '../../api/organizations';
import { listPlans } from '../../api/plans';
import { extractArray } from '../../api/helpers';
import { Plan } from '../../types';
import ThemedSelect from '../../components/ThemedSelect';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';

const LIMIT = 10;
interface Sub {
  id: string;
  app?: { slug: string; name: string };
  plan?: { slug: string; name: string; maxUsers: number | null };
  status: string;
  startDate: string;
  expiresAt: string | null;
}

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const orgId = user?.orgId || '';

  const [subscriptions, setSubscriptions] = useState<Sub[]>([]);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Change plan modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planTarget, setPlanTarget] = useState<Sub | null>(null);
  const [newPlanId, setNewPlanId] = useState('');
  const [planLoading, setPlanLoading] = useState(false);
  const [planOptions, setPlanOptions] = useState<Plan[]>([]);

  // Change status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Sub | null>(null);
  const [newStatus, setNewStatus] = useState('active');
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    fetchSubscriptions();
    getOrganization(orgId)
      .then((res: any) => setOrgName((res?.data || res)?.name || ''))
      .catch(() => {});
    listPlans('books')
      .then((res) => setPlanOptions(extractArray<Plan>(res)))
      .catch(() => {});
  }, [orgId]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getOrgSubscriptions(orgId);
      const allSubs = extractArray<any>(res);
      setSubscriptions(allSubs.filter((s: any) => s.app?.slug === 'books'));
    } catch {
      setError('Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async () => {
    if (!planTarget) return;
    setPlanLoading(true);
    try {
      await changePlan(planTarget.id, newPlanId);
      setShowPlanModal(false);
      setPlanTarget(null);
      setNewPlanId('');
      await fetchSubscriptions();
    } catch {
      setError('Failed to change plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      await changeStatus(statusTarget.id, newStatus);
      setShowStatusModal(false);
      setStatusTarget(null);
      await fetchSubscriptions();
    } catch (err: any) {
      const issues = err?.response?.data?.error?.issues;
      const msg = issues?.length
        ? issues.map((i: any) => i.message).join('. ')
        : err?.response?.data?.message || 'Failed to change status.';
      setError(msg);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [search]);

  const query = search.trim().toLowerCase();
  const filteredSubs = query
    ? subscriptions.filter((s) =>
        [s.plan?.name, s.status].some((f) => (f || '').toLowerCase().includes(query))
      )
    : subscriptions;
  const totalPages = Math.max(1, Math.ceil(filteredSubs.length / LIMIT));
  const pagedSubs = filteredSubs.slice((page - 1) * LIMIT, page * LIMIT);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      trialing: 'bg-yellow-100 text-yellow-700',
      suspended: 'bg-red-100 text-red-700',
      expired: 'bg-slate-100 text-slate-600',
    };
    return map[status] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-accent-500">Subscriptions</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by plan or status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {search && (
          <button onClick={() => setSearch('')} className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-all duration-200 ease-out">
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filteredSubs.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">No subscriptions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3 text-center">Max Users</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-center">Start Date</th>
                  <th className="px-6 py-3 text-center">Expires</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pagedSubs.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-900">{orgName || '-'}</td>
                    <td className="px-6 py-4 text-slate-700">{sub.plan?.name || '-'}</td>
                    <td className="px-6 py-4 text-slate-700 text-center">{sub.plan?.maxUsers ?? '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 text-center">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-700 text-center">
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setPlanTarget(sub);
                            setNewPlanId('');
                            setShowPlanModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-600 border border-primary-200 hover:bg-primary-50 transition-all duration-200 ease-out"
                          title="Upgrade Plan"
                        >
                          <ArrowUpDown className="h-3.5 w-3.5" />
                          Upgrade
                        </button>
                        <button
                          onClick={() => {
                            setStatusTarget(sub);
                            setNewStatus(sub.status === 'active' ? 'suspended' : 'active');
                            if (sub.status === 'active') { setShowStatusModal(true); return; }
                            // activate directly
                            changeStatus(sub.id, 'active').then(fetchSubscriptions).catch(() => setError('Failed to activate.'));
                          }}
                          className={`p-1.5 rounded-lg transition-all duration-200 ease-out ${sub.status === 'active' ? 'text-slate-500 hover:text-red-600 hover:bg-red-50' : 'text-slate-500 hover:text-green-600 hover:bg-green-50'}`}
                          title={sub.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {sub.status === 'active'
                            ? <XCircle className="h-4 w-4" />
                            : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={filteredSubs.length}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Upgrade Plan Modal */}
      {showPlanModal && planTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-slate-700">Upgrade Plan</h2>
              <button onClick={() => { setShowPlanModal(false); setPlanTarget(null); }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Plan</label>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  {planTarget.plan?.name || '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Plan</label>
                <ThemedSelect
                  value={newPlanId}
                  onChange={(v) => setNewPlanId(v)}
                  options={planOptions
                    .filter((p) => p.id !== planTarget.plan?.slug && p.name !== planTarget.plan?.name)
                    .map((p) => ({ value: p.id, label: `${p.name}${p.price > 0 ? ` — ${p.currency} ${p.price}/${p.interval}` : ''}` }))}
                  placeholder="Select a plan"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowPlanModal(false); setPlanTarget(null); }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={handleChangePlan} disabled={planLoading || !newPlanId}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition">
                {planLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Upgrade
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatusModal && statusTarget && (
        <ConfirmDialog
          title="Deactivate Subscription"
          message={`Are you sure you want to deactivate the ${statusTarget.plan?.name || ''} subscription? Access will be suspended immediately.`}
          confirmLabel="Yes, Deactivate"
          loading={statusLoading}
          onConfirm={handleChangeStatus}
          onCancel={() => { setShowStatusModal(false); setStatusTarget(null); }}
        />
      )}
    </div>
  );
}
