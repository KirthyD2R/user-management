import { useState, useEffect } from 'react';
import { Eye, BarChart3, X, Loader2, Users, Check } from 'lucide-react';
import {
  listPlans,
  getPlanLimits,
  getFeatureComparison,
} from '../../api/plans';
import { extractArray, extractData } from '../../api/helpers';

const APP_SLUG = 'books';

interface PlanData {
  slug: string;
  name: string;
  maxUsers: number | null;
  pricing: {
    monthly: number;
    yearly: number;
  };
}

interface PlanLimit {
  limitKey: string;
  limitValue: number;
  limitType: string;
  resetPeriod: string;
}

function formatPrice(amount: number): string {
  if (amount === 0) return 'Free';
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // Limits modal
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [limitsTarget, setLimitsTarget] = useState<PlanData | null>(null);
  const [limits, setLimits] = useState<PlanLimit[]>([]);
  const [limitsLoading, setLimitsLoading] = useState(false);

  // Feature comparison
  const [showComparison, setShowComparison] = useState(false);
  const [comparison, setComparison] = useState<Record<string, unknown> | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listPlans(APP_SLUG);
      setPlans(extractArray<PlanData>(res));
    } catch {
      setError('Failed to load plans.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLimits = async (plan: PlanData) => {
    setLimitsTarget(plan);
    setShowLimitsModal(true);
    setLimitsLoading(true);
    try {
      const res: any = await getPlanLimits(plan.slug, APP_SLUG);
      // Response: {success, data: {plan, app, limits: [...]}}
      const limitsArr = res?.data?.limits ?? res?.limits ?? extractArray<PlanLimit>(res);
      setLimits(Array.isArray(limitsArr) ? limitsArr : []);
    } catch {
      setLimits([]);
    } finally {
      setLimitsLoading(false);
    }
  };

  const handleCompareFeatures = async () => {
    setComparisonLoading(true);
    setShowComparison(true);
    try {
      const res = await getFeatureComparison(APP_SLUG);
      setComparison(extractData<Record<string, unknown>>(res));
    } catch {
      setError('Failed to load feature comparison.');
    } finally {
      setComparisonLoading(false);
    }
  };

  const highlightPlan = (slug: string) => {
    if (slug === 'pro') return 'border-blue-500 ring-2 ring-blue-100';
    return 'border-gray-200';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plans & Limits</h1>
          <p className="text-sm text-gray-500 mt-1">Dream Books pricing plans</p>
        </div>
        {/* <button
          onClick={handleCompareFeatures}
          disabled={comparisonLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {comparisonLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
          Compare Features
        </button> */}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center mb-8">
        <div className="bg-gray-100 rounded-lg p-1 inline-flex">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              billingCycle === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              billingCycle === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs text-green-600 font-semibold">Save ~20%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">No plans found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.pricing.monthly : plan.pricing.yearly;
            const perMonth = billingCycle === 'yearly' ? Math.round(plan.pricing.yearly / 12) : plan.pricing.monthly;

            return (
              <div
                key={plan.slug}
                className={`bg-white rounded-xl shadow-sm border-2 p-6 flex flex-col ${highlightPlan(plan.slug)}`}
              >
                {plan.slug === 'pro' && (
                  <span className="inline-flex self-start items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-3">
                    Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">{formatPrice(perMonth)}</span>
                  {price > 0 && <span className="text-sm text-gray-500 ml-1">/month</span>}
                  {billingCycle === 'yearly' && price > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {formatPrice(price)} billed yearly
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{plan.maxUsers ? `Up to ${plan.maxUsers} users` : 'Unlimited users'}</span>
                </div>

                <button
                  onClick={() => handleViewLimits(plan)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition mt-auto"
                >
                  <Eye className="h-4 w-4" />
                  View Limits
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Feature Comparison Table */}
      {showComparison && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Feature Comparison</h2>
            <button onClick={() => setShowComparison(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition">
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
                    {Object.keys((Object.values(comparison)[0] as Record<string, unknown>) || {}).map((planName) => (
                      <th key={planName} className="px-6 py-3">{planName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Object.entries(comparison).map(([feature, planValues]) => (
                    <tr key={feature} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-900">{feature}</td>
                      {Object.values(planValues as Record<string, unknown>).map((val, idx) => (
                        <td key={idx} className="px-6 py-3 text-gray-700">
                          {typeof val === 'boolean' ? (
                            val ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-red-400" />
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
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

      {/* View Limits Modal */}
      {showLimitsModal && limitsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Limits - {limitsTarget.name}</h2>
              <button onClick={() => { setShowLimitsModal(false); setLimitsTarget(null); setLimits([]); }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            {limitsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : limits.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No limits defined for this plan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Limit Key</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Reset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {limits.map((lim, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 font-medium text-gray-900">{lim.limitKey}</td>
                        <td className="px-4 py-3">
                          {lim.limitType === 'feature' ? (
                            lim.limitValue ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Enabled</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Disabled</span>
                            )
                          ) : (
                            <span className="font-semibold text-gray-900">{lim.limitValue}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            lim.limitType === 'feature' ? 'bg-purple-100 text-purple-700' :
                            lim.limitType === 'quota' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {lim.limitType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 capitalize">{lim.resetPeriod}</td>
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
