import { useState, useEffect } from 'react';
import { Plus, ArrowUpDown, Power, Search, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  createSubscription,
  getOrgSubscriptions,
  changePlan,
  changeStatus,
  checkAccess,
} from '../../api/subscriptions';
import { extractArray, extractData } from '../../api/helpers';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ orgId, appId: '', planId: '', startDate: '' });
  const [createLoading, setCreateLoading] = useState(false);

  // Change plan modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planTarget, setPlanTarget] = useState<Sub | null>(null);
  const [newPlanId, setNewPlanId] = useState('');
  const [planLoading, setPlanLoading] = useState(false);

  // Change status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Sub | null>(null);
  const [newStatus, setNewStatus] = useState('active');
  const [statusLoading, setStatusLoading] = useState(false);

  // Check access
  const [accessOrgId, setAccessOrgId] = useState(orgId);
  const [accessAppSlug, setAccessAppSlug] = useState('');
  const [accessResult, setAccessResult] = useState<{ hasAccess: boolean } | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);

  useEffect(() => {
    if (orgId) {
      fetchSubscriptions();
    }
  }, [orgId]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getOrgSubscriptions(orgId);
      const allSubs = extractArray<any>(res);
      const booksSubs = allSubs.filter((s: any) => s.app?.slug === 'books');
      setSubscriptions(booksSubs);
    } catch {
      setError('Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreateLoading(true);
    try {
      await createSubscription(createForm);
      setShowCreateModal(false);
      setCreateForm({ orgId, appId: '', planId: '', startDate: '' });
      await fetchSubscriptions();
    } catch {
      setError('Failed to create subscription.');
    } finally {
      setCreateLoading(false);
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
    } catch {
      setError('Failed to change status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCheckAccess = async () => {
    setAccessLoading(true);
    setAccessResult(null);
    try {
      const res = await checkAccess(accessOrgId, accessAppSlug);
      setAccessResult(extractData<{ hasAccess: boolean }>(res));
    } catch {
      setError('Failed to check access.');
    } finally {
      setAccessLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      trialing: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-600',
    };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Create Subscription
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No subscriptions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3">App</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Max Users</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Start Date</th>
                  <th className="px-6 py-3">Expires</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{sub.app?.name || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{sub.plan?.name || '-'}</td>
                    <td className="px-6 py-4 text-gray-700">{sub.plan?.maxUsers ?? '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(sub.status)}`}
                      >
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setPlanTarget(sub);
                            setNewPlanId(sub.plan?.slug || '');
                            setShowPlanModal(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition"
                          title="Change Plan"
                        >
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setStatusTarget(sub);
                            setNewStatus(sub.status);
                            setShowStatusModal(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-amber-600 transition"
                          title="Change Status"
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create Subscription</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Org ID</label>
                <input
                  type="text"
                  value={createForm.orgId}
                  onChange={(e) => setCreateForm({ ...createForm, orgId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App ID</label>
                <input
                  type="text"
                  value={createForm.appId}
                  onChange={(e) => setCreateForm({ ...createForm, appId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter app ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan ID</label>
                <input
                  type="text"
                  value={createForm.planId}
                  onChange={(e) => setCreateForm({ ...createForm, planId: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter plan ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {createLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {showPlanModal && planTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Change Plan</h2>
              <button
                onClick={() => { setShowPlanModal(false); setPlanTarget(null); }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Plan</label>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{planTarget.plan?.name || planTarget.plan?.slug || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Plan ID</label>
                <input
                  type="text"
                  value={newPlanId}
                  onChange={(e) => setNewPlanId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter new plan ID"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowPlanModal(false); setPlanTarget(null); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePlan}
                disabled={planLoading || !newPlanId}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {planLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {showStatusModal && statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Change Status</h2>
              <button
                onClick={() => { setShowStatusModal(false); setStatusTarget(null); }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="suspended">Suspended</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowStatusModal(false); setStatusTarget(null); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeStatus}
                disabled={statusLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {statusLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
