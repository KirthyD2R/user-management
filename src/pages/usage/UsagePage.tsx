import { useState, useEffect } from 'react';
import { BarChart3, Plus, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgUsage, incrementUsage, checkAndIncrement, resetUsage } from '../../api/usage';
import { extractArray } from '../../api/helpers';

interface UsageRecord {
  id: string;
  orgId: string;
  appSlug: string;
  usageKey: string;
  count: number;
  period: string;
  createdAt: string;
}

export default function UsagePage() {
  const { user } = useAuth();
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [appSlug, setAppSlug] = useState('books');
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [showIncrementModal, setShowIncrementModal] = useState(false);
  const [incrementForm, setIncrementForm] = useState({
    orgId: '', appSlug: 'books', usageKey: '', incrementBy: 1,
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetForm, setResetForm] = useState({
    orgId: '', appSlug: 'books', usageKey: '',
  });

  const [showCheckIncrementModal, setShowCheckIncrementModal] = useState(false);
  const [checkIncrementForm, setCheckIncrementForm] = useState({
    orgId: '', appSlug: 'books', usageKey: '', incrementBy: 1,
  });
  const [checkIncrementResult, setCheckIncrementResult] = useState<any>(null);

  const orgId = user?.orgId || '';

  const fetchUsage = async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getOrgUsage(orgId, appSlug, period);
      setUsageRecords(extractArray<UsageRecord>(res));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch usage data');
      setUsageRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [orgId, appSlug, period]);

  const handleIncrement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await incrementUsage({ ...incrementForm, orgId: incrementForm.orgId || orgId });
      setSuccess('Usage incremented successfully');
      setShowIncrementModal(false);
      setIncrementForm({ orgId: '', appSlug: 'books', usageKey: '', incrementBy: 1 });
      fetchUsage();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to increment usage');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await resetUsage({ ...resetForm, orgId: resetForm.orgId || orgId });
      setSuccess('Usage reset successfully');
      setShowResetModal(false);
      setResetForm({ orgId: '', appSlug: 'books', usageKey: '' });
      fetchUsage();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset usage');
    }
  };

  const handleCheckAndIncrement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setCheckIncrementResult(null);
    try {
      const res = await checkAndIncrement({ ...checkIncrementForm, orgId: checkIncrementForm.orgId || orgId });
      setCheckIncrementResult(res.data || res);
      fetchUsage();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check and increment');
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-slate-500">Track and manage your app usage and quotas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setIncrementForm({ orgId: '', appSlug: 'books', usageKey: '', incrementBy: 1 }); setShowIncrementModal(true); }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-all duration-200 ease-out">
            <Plus className="w-4 h-4" /> Increment
          </button>
          <button onClick={() => { setCheckIncrementForm({ orgId: '', appSlug: 'books', usageKey: '', incrementBy: 1 }); setCheckIncrementResult(null); setShowCheckIncrementModal(true); }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 text-sm font-medium shadow-sm transition-all duration-200 ease-out">
            <CheckCircle className="w-4 h-4" /> Check & Increment
          </button>
          <button onClick={() => { setResetForm({ orgId: '', appSlug: 'books', usageKey: '' }); setShowResetModal(true); }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50 text-sm font-medium shadow-sm transition-all duration-200 ease-out">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-card border border-slate-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">App Slug</label>
            <input type="text" value={appSlug} onChange={(e) => setAppSlug(e.target.value)}
              className="field" placeholder="e.g. books" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
              className="field" />
          </div>
          <button onClick={fetchUsage} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium transition-all duration-200 ease-out">
            Refresh
          </button>
        </div>
      </div>

      {/* Usage Table */}
      <div className="bg-white rounded-xl shadow-card border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading usage data...</div>
        ) : usageRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No usage records found for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Usage Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">App</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {usageRecords.map((record, idx) => (
                <tr key={record.id || idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.usageKey}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{record.appSlug}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-primary-100 text-primary-800">
                      {record.count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{record.period}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(record.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Increment Modal */}
      {showIncrementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Increment Usage</h2>
            <form onSubmit={handleIncrement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Org ID</label>
                <input type="text" value={incrementForm.orgId} onChange={(e) => setIncrementForm({ ...incrementForm, orgId: e.target.value })}
                  placeholder={orgId || 'Organization ID'} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">App Slug</label>
                <input type="text" value={incrementForm.appSlug} onChange={(e) => setIncrementForm({ ...incrementForm, appSlug: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usage Key</label>
                <input type="text" value={incrementForm.usageKey} onChange={(e) => setIncrementForm({ ...incrementForm, usageKey: e.target.value })}
                  placeholder="e.g. invoices-created" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Increment By</label>
                <input type="number" min="1" value={incrementForm.incrementBy} onChange={(e) => setIncrementForm({ ...incrementForm, incrementBy: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowIncrementModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Increment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check & Increment Modal */}
      {showCheckIncrementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Check & Increment</h2>
            <form onSubmit={handleCheckAndIncrement} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Org ID</label>
                <input type="text" value={checkIncrementForm.orgId} onChange={(e) => setCheckIncrementForm({ ...checkIncrementForm, orgId: e.target.value })}
                  placeholder={orgId || 'Organization ID'} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">App Slug</label>
                <input type="text" value={checkIncrementForm.appSlug} onChange={(e) => setCheckIncrementForm({ ...checkIncrementForm, appSlug: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usage Key</label>
                <input type="text" value={checkIncrementForm.usageKey} onChange={(e) => setCheckIncrementForm({ ...checkIncrementForm, usageKey: e.target.value })}
                  placeholder="e.g. invoices-created" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Increment By</label>
                <input type="number" min="1" value={checkIncrementForm.incrementBy} onChange={(e) => setCheckIncrementForm({ ...checkIncrementForm, incrementBy: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              {checkIncrementResult && (
                <div className={`p-3 rounded-lg text-sm ${checkIncrementResult.allowed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  <p className="font-medium">{checkIncrementResult.allowed ? 'Allowed & Incremented' : 'Quota Exceeded'}</p>
                  {checkIncrementResult.current !== undefined && <p>Current: {checkIncrementResult.current}</p>}
                  {checkIncrementResult.limit !== undefined && <p>Limit: {checkIncrementResult.limit}</p>}
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCheckIncrementModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Close</button>
                <button type="submit" className="px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600">Check & Increment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-red-600">Reset Usage</h2>
            <p className="text-sm text-slate-600 mb-4">This will reset the usage counter to zero. This action cannot be undone.</p>
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Org ID</label>
                <input type="text" value={resetForm.orgId} onChange={(e) => setResetForm({ ...resetForm, orgId: e.target.value })}
                  placeholder={orgId || 'Organization ID'} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">App Slug</label>
                <input type="text" value={resetForm.appSlug} onChange={(e) => setResetForm({ ...resetForm, appSlug: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usage Key</label>
                <input type="text" value={resetForm.usageKey} onChange={(e) => setResetForm({ ...resetForm, usageKey: e.target.value })}
                  placeholder="e.g. invoices-created" required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowResetModal(false)} className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
