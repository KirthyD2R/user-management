import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Building2, Globe, Calendar, CreditCard, Users, Loader2 } from 'lucide-react';
import { getOrganization } from '../../api/organizations';
import { getOrgSubscriptions } from '../../api/subscriptions';
import { listPlans } from '../../api/plans';
import { listOrgUsers } from '../../api/users';
import { extractArray } from '../../api/helpers';
import { Organization, Plan, Subscription } from '../../types';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  );
}

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<Organization | null>(null);
  const [planName, setPlanName] = useState('—');
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      getOrganization(id),
      getOrgSubscriptions(id).catch(() => null),
      listPlans('books').catch(() => null),
      listOrgUsers(id, 1, 1000).catch(() => null),
    ])
      .then(([orgRes, subsRes, plansRes, usersRes]) => {
        const full = (orgRes as any)?.data || orgRes;
        setOrg(full as Organization);

        if (usersRes) setMemberCount(extractArray(usersRes).length);

        if (subsRes && plansRes) {
          const subs = extractArray<Subscription>(subsRes);
          const plans = extractArray<Plan>(plansRes);
          const activeSub = subs.find((s) => s.status === 'active');
          const plan = activeSub
            ? plans.find((p) => p.id === activeSub.planId || p.slug === activeSub.planId)
            : null;
          setPlanName(
            plan?.name ||
            (activeSub as any)?.plan?.name ||
            (activeSub ? 'Active' : '—')
          );
        }
      })
      .catch((err: any) => setError(err?.message || 'Failed to load organization.'))
      .finally(() => setLoading(false));
  }, [id]);

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-yellow-100 text-yellow-700',
    deactivated: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/organizations')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-primary-600 mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Organizations
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      ) : org ? (
        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{org.name}</h1>
                <p className="text-sm text-slate-500">{org.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[org.status] || 'bg-slate-100 text-slate-600'}`}>
                {org.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                {planName}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Users, label: 'Members', value: memberCount != null ? String(memberCount) : '—' },
              { icon: CreditCard, label: 'Plan', value: planName },
              { icon: Calendar, label: 'Created', value: org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—' },
              { icon: Globe, label: 'Timezone', value: org.timezone || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="text-sm font-semibold text-slate-800">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Contact & Identity</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Email" value={org.email} />
              <Field label="Phone" value={org.phone} />
              <Field label="Industry" value={org.industry} />
              <Field label="Company Size" value={org.companySize} />
              <Field label="GSTIN" value={org.gstin} />
              <Field label="PAN" value={org.pan} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Address" value={org.address} />
              <Field label="City" value={org.city} />
              <Field label="State" value={org.state} />
              <Field label="Country" value={org.country} />
              <Field label="Postal Code" value={org.postalCode} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Financial</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <Field label="Currency" value={org.currency} />
              <Field label="Financial Year Start" value={org.financialYearStart} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
