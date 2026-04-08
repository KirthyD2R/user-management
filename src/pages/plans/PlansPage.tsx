import { useState, useEffect } from 'react';
import { Check, Eye, BarChart3, Search, X, Loader2 } from 'lucide-react';
import {
  listPlans,
  getPlanLimits,
  getFeatureComparison,
  checkFeatureAccess,
  checkQuota,
  checkSeatLimit,
} from '../../api/plans';
import { Plan, PlanLimit } from '../../types';

export default function PlansPage() {
  const [appSlug, setAppSlug] = useState('books');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Limits modal
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [limitsTarget, setLimitsTarget] = useState<Plan | null>(null);
  const [limits, setLimits] = useState<PlanLimit[]>([]);
  const [limitsLoading, setLimitsLoading] = useState(false);

  // Feature comparison
  const [showComparison, setShowComparison] = useState(false);
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Check feature access
  const [featureOrgId, setFeatureOrgId] = useState('');
  const [featureAppSlug, setFeatureAppSlug] = useState('');
  const [featureName, setFeatureName] = useState('');
  const [featureResult, setFeatureResult] = useState<{ hasAccess: boolean } | null>(null);
  const [featureLoading, setFeatureLoading] = useState(false);

  // Check quota
  const [quotaOrgId, setQuotaOrgId] = useState('');
  const [quotaAppSlug, setQuotaAppSlug] = useState('');
  const [quotaLimitKey, setQuotaLimitKey] = useState('');
  const [quotaResult, setQuotaResult] = useState<{ withinQuota: boolean } | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  // Check seat limit
  const [seatOrgId, setSeatOrgId] = useState('');
  const [seatAppSlug, setSeatAppSlug] = useState('');
  const [seatResult, setSeatResult] = useState<{ withinLimit: boolean } | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, [appSlug]);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listPlans(appSlug);
      if (res.success) {
        setPlans(res.data);
      }
    } catch {
      setError('Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLimits = async (plan: Plan) => {
    setLimitsTarget(plan);
    setShowLimitsModal(true);
    setLimitsLoading(true);
    try {
      const res = await getPlanLimits(plan.slug, appSlug);
      if (res.success) {
        setLimits(res.data);
      }
    } catch {
      setError('Failed to load plan limits.');
    } finally {
      setLimitsLoading(false);
    }
  };

  const handleCompareFeatures = async () => {
    setComparisonLoading(true);
    setShowComparison(true);
    try {
      const res = await getFeatureComparison(appSlug);
      if (res.success) {
        setComparison(res.data);
      }
    } catch {
      setError('Failed to load feature comparison.');
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleCheckFeature = async () => {
    setFeatureLoading(true);
    setFeatureResult(null);
    try {
      const res = await checkFeatureAccess(featureOrgId, featureAppSlug, featureName);
      if (res.success) {
        setFeatureResult(res.data);
      }
    } catch {
      setError('Failed to check feature access.');
    } finally {
      setFeatureLoading(false);
    }
  };

  const handleCheckQuota = async () => {
    setQuotaLoading(true);
    setQuotaResult(null);
    try {
      const res = await checkQuota(quotaOrgId, quotaAppSlug, quotaLimitKey);
      if (res.success) {
        setQuotaResult(res.data);
      }
    } catch {
      setError('Failed to check quota.');
    } finally {
      setQuotaLoading(false);
    }
  };

  const handleCheckSeat = async () => {
    setSeatLoading(true);
    setSeatResult(null);
    try {
      const res = await checkSeatLimit(seatOrgId, seatAppSlug);
      if (res.success) {
        setSeatResult(res.data);
      }
    } catch {
      setError('Failed to check seat limit.');
    } finally {
      setSeatLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plans &amp; Limits</h1>
        <button
          onClick={handleCompareFeatures}
          disabled={comparisonLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {comparisonLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          Compare Features
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Filter by App Slug</label>
        <input
          type="text"
          value={appSlug}
          onChange={(e) => setAppSlug(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
          placeholder="e.g. books"
        />
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">No plans found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    plan.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {plan.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-500 ml-1">
                  {plan.currency} / {plan.interval}
                </span>
              </div>
              {plan.features && plan.features.length > 0 && (
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => handleViewLimits(plan)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition mt-auto"
              >
                <Eye className="h-4 w-4" />
                View Limits
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Feature Comparison Table */}
      {showComparison && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Feature Comparison</h2>
            <button
              onClick={() => setShowComparison(false)}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {comparisonLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : comparison ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Feature</th>
                    {Object.keys(
                      (Object.values(comparison)[0] as Record<string, unknown>) || {}
                    ).map((planName) => (
                      <th key={planName} className="px-6 py-3">
                        {planName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(comparison).map(([feature, planValues]) => (
                    <tr key={feature} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-900">{feature}</td>
                      {Object.values(planValues as Record<string, unknown>).map(
                        (val, idx) => (
                          <td key={idx} className="px-6 py-3 text-gray-700">
                            {typeof val === 'boolean' ? (
                              val ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-400" />
                              )
                            ) : (
                              String(val)
                            )}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No comparison data available.</p>
          )}
        </div>
      )}

      {/* Check Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check Feature Access */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Check Feature Access</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={featureOrgId}
              onChange={(e) => setFeatureOrgId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Org ID"
            />
            <input
              type="text"
              value={featureAppSlug}
              onChange={(e) => setFeatureAppSlug(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="App Slug"
            />
            <input
              type="text"
              value={featureName}
              onChange={(e) => setFeatureName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Feature"
            />
            <button
              onClick={handleCheckFeature}
              disabled={featureLoading || !featureOrgId || !featureAppSlug || !featureName}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {featureLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Check
            </button>
            {featureResult && (
              <div
                className={`rounded-lg p-3 text-sm font-medium ${
                  featureResult.hasAccess
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {featureResult.hasAccess ? 'Allowed' : 'Denied'}
              </div>
            )}
          </div>
        </div>

        {/* Check Quota */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Check Quota</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={quotaOrgId}
              onChange={(e) => setQuotaOrgId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Org ID"
            />
            <input
              type="text"
              value={quotaAppSlug}
              onChange={(e) => setQuotaAppSlug(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="App Slug"
            />
            <input
              type="text"
              value={quotaLimitKey}
              onChange={(e) => setQuotaLimitKey(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Limit Key"
            />
            <button
              onClick={handleCheckQuota}
              disabled={quotaLoading || !quotaOrgId || !quotaAppSlug || !quotaLimitKey}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {quotaLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Check Quota
            </button>
            {quotaResult && (
              <div
                className={`rounded-lg p-3 text-sm font-medium ${
                  quotaResult.withinQuota
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {quotaResult.withinQuota ? 'Within Quota' : 'Quota Exceeded'}
              </div>
            )}
          </div>
        </div>

        {/* Check Seat Limit */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Check Seat Limit</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={seatOrgId}
              onChange={(e) => setSeatOrgId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Org ID"
            />
            <input
              type="text"
              value={seatAppSlug}
              onChange={(e) => setSeatAppSlug(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="App Slug"
            />
            <button
              onClick={handleCheckSeat}
              disabled={seatLoading || !seatOrgId || !seatAppSlug}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {seatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Check Seat Limit
            </button>
            {seatResult && (
              <div
                className={`rounded-lg p-3 text-sm font-medium ${
                  seatResult.withinLimit
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {seatResult.withinLimit ? 'Within Seat Limit' : 'Seat Limit Exceeded'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Limits Modal */}
      {showLimitsModal && limitsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Limits - {limitsTarget.name}
              </h2>
              <button
                onClick={() => { setShowLimitsModal(false); setLimitsTarget(null); setLimits([]); }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {limitsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : limits.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No limits defined.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Limit Key</th>
                      <th className="px-4 py-3">Limit Value</th>
                      <th className="px-4 py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {limits.map((lim, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-900">{lim.key}</td>
                        <td className="px-4 py-3 text-gray-700">{lim.limit}</td>
                        <td className="px-4 py-3 text-gray-500">{lim.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
