import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Edit2,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import ThemedSelect from "../../components/ThemedSelect";
import Pagination from "../../components/Pagination";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
  listOrganizations,
  getOrganization,
  updateOrganization,
  updateOrgStatus,
} from "../../api/organizations";
import { checkAccess, getOrgSubscriptions } from "../../api/subscriptions";
import { listPlans } from "../../api/plans";
import { listOrgUsers } from "../../api/users";
import { extractArray, extractData } from "../../api/helpers";
import { Organization, Plan, Subscription } from "../../types";
import { toast } from "../../components/Toast";
import { validateEmail, validatePhone, validateGstin, validatePan } from "../../utils/validators";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix"
];
const CURRENCIES = ["INR", "USD"];
const FINANCIAL_YEAR_START_MONTHS = [
  "January",
  "March",
  "April"
];

const emptyForm: Partial<Organization> = {
  name: "",
  slug: "",
  email: "",
  phone: "",
  industry: "",
  companySize: "",
  address: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  gstin: "",
  pan: "",
  timezone: "",
  currency: "",
  financialYearStart: "",
};


function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    deactivated: "bg-red-100 text-red-800",
  };
  const cls = colors[status] || "bg-slate-100 text-slate-800";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

const OrganizationsPage: React.FC = () => {
  const { user } = useAuth();
  const orgId = user?.orgId || "";
  const [allFilteredOrgs, setAllFilteredOrgs] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [formData, setFormData] = useState<Partial<Organization>>({ ...emptyForm });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [orgPlanName, setOrgPlanName] = useState<string>("");
  const [confirmOrg, setConfirmOrg] = useState<Organization | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);

  const LIMIT = 10;

  const mandatoryFilled = Boolean(
    formData.name?.trim() &&
    formData.email?.trim() &&
    formData.gstin?.trim() &&
    formData.pan?.trim() &&
    formData.currency &&
    formData.financialYearStart &&
    formData.timezone
  );

  // Client-side partial search (case-insensitive) across the main org fields.
  const query = searchQuery.trim().toLowerCase();
  const filteredOrgs = query
    ? allFilteredOrgs.filter((o) =>
        [o.name, o.email, o.city, o.state, o.country, o.industry]
          .some((f) => (f || "").toLowerCase().includes(query))
      )
    : allFilteredOrgs;
  const totalPages = Math.max(1, Math.ceil(filteredOrgs.length / LIMIT));
  const orgs = filteredOrgs.slice((page - 1) * LIMIT, page * LIMIT);

  const fetchOrgs = async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listOrganizations(1, 1000);
      const allOrgs = extractArray<Organization>(res);
      const myOrg = allOrgs.filter((o) => o.id === orgId);
      const hasAccess = myOrg.length > 0
        ? await checkAccess(orgId, "books")
            .then((r) => extractData<{ hasAccess: boolean }>(r)?.hasAccess === true)
            .catch(() => false)
        : false;
      setAllFilteredOrgs(hasAccess ? myOrg : []);
      setPage(1);

      // Fetch plan name + member count
      if (hasAccess) {
        listOrgUsers(orgId, 1, 1000)
          .then((r) => setMemberCount(extractArray(r).length))
          .catch(() => setMemberCount(null));

        try {
          const [subsRes, plansRes] = await Promise.all([
            getOrgSubscriptions(orgId),
            listPlans("books"),
          ]);
          const subs = extractArray<Subscription>(subsRes);
          const plans = extractArray<Plan>(plansRes);
          const activeSub = subs.find((s) => s.status === "active");
          const plan = activeSub
            ? plans.find((p) => p.id === activeSub.planId || p.slug === activeSub.planId)
              ?? ((activeSub as any).plan?.name ? null : null)
            : null;
          const planName = plan?.name
            || (activeSub as any)?.plan?.name
            || (activeSub as any)?.planName
            || (activeSub as any)?.planSlug
            || (activeSub ? "Active" : "—");
          setOrgPlanName(planName);
        } catch {
          setOrgPlanName("—");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch organization";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  // Reset to the first page whenever the search term changes.
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const handleEdit = async () => {
    if (!selectedOrg) return;
    setSaving(true);
    setError(null);
    try {
      const { id: _id, status: _status, createdAt: _ca, updatedAt: _ua, logo: _logo, slug: _slug, ...editableFields } = formData as Organization;
      await updateOrganization(selectedOrg.id, editableFields);
      setShowEditModal(false);
      setSelectedOrg(null);
      setFormData({ ...emptyForm });
      toast("Organization updated successfully", "success");
      await fetchOrgs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update organization";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (org: Organization) => {
    setSelectedOrg(org);
    setShowEditModal(true);
    try {
      const res = await getOrganization(org.id);
      const full = (res as any)?.data || res;
      setFormData({
        ...full,
        companySize: full.companySize || full.company_size || '',
        financialYearStart: full.financialYearStart || full.financial_year_start || '',
        postalCode: full.postalCode || full.postal_code || '',
      });
    } catch {
      // fallback to list data if full fetch fails
      const raw = org as any;
      setFormData({
        ...org,
        companySize: org.companySize || raw.company_size || '',
        financialYearStart: org.financialYearStart || raw.financial_year_start || '',
        postalCode: org.postalCode || raw.postal_code || '',
      });
    }
    setFieldErrors({});
  };

  const handleToggleStatus = async (org: Organization) => {
    if (org.status === "active") { setConfirmOrg(org); return; }
    // activate directly — no confirmation needed
    try {
      await updateOrgStatus(org.id, "active");
      await fetchOrgs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!confirmOrg) return;
    setToggleLoading(true);
    try {
      await updateOrgStatus(confirmOrg.id, "deactivated");
      await fetchOrgs();
      setConfirmOrg(null);
    } catch (err: any) {
      const issues = err?.response?.data?.error?.issues;
      const message = issues?.length
        ? issues.map((i: any) => i.message).join('. ')
        : err?.response?.data?.message || "Failed to deactivate organization";
      setError(message);
    } finally {
      setToggleLoading(false);
    }
  };

  const FIELD_LIMITS: Record<string, number> = { gstin: 15, pan: 10 };

  const validateField = (name: string, value: string) => {
    let err = "";
    if (name === "email") err = validateEmail(value);
    if (name === "phone") err = validatePhone(value);
    if (name === "gstin") err = validateGstin(value);
    if (name === "pan") err = validatePan(value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const renderField = (
    label: string,
    name: string,
    type: "text" | "select" = "text",
    options?: string[],
    required?: boolean
  ) => {
    const maxLen = FIELD_LIMITS[name];
    const currentVal = (formData as Record<string, string>)[name] || "";
    return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === "select" ? (
        <ThemedSelect
          value={currentVal}
          onChange={(v) =>
            setFormData((prev) => ({ ...prev, [name]: v } as Partial<Organization>))
          }
          options={(options || []).map((o) => ({ value: o, label: o }))}
          placeholder={`Select ${label}`}
        />
      ) : (
        <input
          type="text"
          name={name}
          maxLength={maxLen}
          value={currentVal}
          onChange={(e) => {
            const val = (name === "gstin" || name === "pan")
              ? e.target.value.toUpperCase()
              : e.target.value;
            setFormData((prev) => ({ ...prev, [name]: val } as Partial<Organization>));
          }}
          onBlur={(e) => validateField(name, e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${fieldErrors[name] ? "border-red-400" : "border-slate-300"}`}
          placeholder={label}
        />
      )}
      {maxLen && (
        <div className="flex justify-between mt-1">
          {fieldErrors[name]
            ? <p className="text-xs text-red-500">{fieldErrors[name]}</p>
            : <span />}
          <p className="text-xs text-slate-400">{currentVal.length}/{maxLen}</p>
        </div>
      )}
      {!maxLen && fieldErrors[name] && (
        <p className="mt-1 text-xs text-red-500">{fieldErrors[name]}</p>
      )}
    </div>
    );
  };

  const handleExport = () => {
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (...cols: any[]) => cols.map(escape).join(',');
    const lines = [
      row('Name', 'Email', 'GSTIN', 'Status', 'Plan', 'Members', 'Created'),
      ...allFilteredOrgs.map((o) =>
        row(
          o.name, o.email, o.gstin || '', o.status, orgPlanName,
          memberCount ?? '',
          o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '',
        )
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Organization_Export.csv';
    a.click();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-accent-500">Organization</h1>
        <button
          onClick={handleExport}
          disabled={allFilteredOrgs.length === 0}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-all duration-200 ease-out"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {["Name", "Email", "GSTIN", "Members", "Created", "Plan", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${h === "Name" || h === "Email" ? "text-left" : "text-center"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No organization found.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/organizations/${org.id}`}
                        className="text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{org.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono text-center">
                      {org.gstin || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 text-center">
                      {memberCount ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 text-center">
                      {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700">
                        {orgPlanName || "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={org.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(org)}
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 ease-out"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(org)}
                          className={`p-1.5 rounded-lg transition-all duration-200 ease-out ${org.status === "active" ? "text-slate-500 hover:text-red-600 hover:bg-red-50" : "text-slate-500 hover:text-green-600 hover:bg-green-50"}`}
                          title={org.status === "active" ? "Deactivate" : "Activate"}
                        >
                          {org.status === "active"
                            ? <XCircle className="w-4 h-4" />
                            : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Edit Organization Modal */}
      {confirmOrg && (
        <ConfirmDialog
          title="Deactivate Organization"
          message={`Are you sure you want to deactivate "${confirmOrg.name}"? This will suspend access for all users in this organization.`}
          confirmLabel="Yes, Deactivate"
          loading={toggleLoading}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setConfirmOrg(null)}
        />
      )}

      {showEditModal && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-medium text-slate-700">Edit Organization</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedOrg(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderField("Name", "name", "text", undefined, true)}
              {renderField("Email", "email", "text", undefined, true)}
              {renderField("Phone", "phone")}
              {renderField("Industry", "industry")}
              {renderField("Company Size", "companySize", "select", COMPANY_SIZES)}
              {renderField("Address", "address")}
              {renderField("City", "city")}
              {renderField("State", "state")}
              {renderField("Country", "country")}
              {renderField("Postal Code", "postalCode")}
              {renderField("GSTIN", "gstin", "text", undefined, true)}
              {renderField("PAN", "pan", "text", undefined, true)}
              {renderField("Currency", "currency", "select", CURRENCIES, true)}
              {renderField("Financial Year Start", "financialYearStart", "select", FINANCIAL_YEAR_START_MONTHS, true)}
              {renderField("Timezone", "timezone", "select", TIMEZONES, true)}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedOrg(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={saving || !mandatoryFilled}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 bg-primary-600 hover:bg-primary-700"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Stats Modal */}
      {showStatsModal && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-medium text-slate-700">
                Stats - {selectedOrg.name}
              </h2>
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setSelectedOrg(null);
                  setStats(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {!stats ? (
                <p className="text-center text-slate-500 py-8">Loading stats...</p>
              ) : Object.keys(stats).length === 0 ? (
                <p className="text-center text-slate-500 py-8">No stats available.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(stats).map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                    >
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                      </p>
                      <p className="text-xl font-semibold text-slate-900">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setSelectedOrg(null);
                  setStats(null);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrganizationsPage;
