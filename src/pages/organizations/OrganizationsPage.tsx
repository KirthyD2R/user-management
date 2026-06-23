import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Pencil,
  Power,
  Plus,
  X,
  Search,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import ThemedSelect from "../../components/ThemedSelect";
import Pagination from "../../components/Pagination";
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  updateOrgStatus,
} from "../../api/organizations";
import { checkAccess } from "../../api/subscriptions";
import { extractArray, extractData } from "../../api/helpers";
import { Organization } from "../../types";
import { toast } from "../../components/Toast";
import { validateEmail, validatePhone } from "../../utils/validators";

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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    inactive: "bg-red-100 text-red-800",
  };
  const cls = colors[status] || "bg-slate-100 text-slate-800";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

const OrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orgId = user?.orgId || "";
  const [allFilteredOrgs, setAllFilteredOrgs] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showNextStepModal, setShowNextStepModal] = useState(false);
  const [createdOrgName, setCreatedOrgName] = useState("");

  const [formData, setFormData] = useState<Partial<Organization>>({ ...emptyForm });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  const LIMIT = 20;

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch organizations";
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "name" && !showEditModal ? { slug: slugify(value) } : {}),
    }));
  };

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    const baseSlug = slugify(formData.name || "");
    try {
      let attempt = 0;
      while (true) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
        try {
          await createOrganization({ ...formData, slug });
          break;
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.toLowerCase().includes("slug") && attempt < 10) {
            attempt++;
          } else {
            throw err;
          }
        }
      }
      setShowCreateModal(false);
      setCreatedOrgName(formData.name || "");
      setFormData({ ...emptyForm });
      setFieldErrors({});
      setShowNextStepModal(true);
      await fetchOrgs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create organization";
      toast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedOrg) return;
    setSaving(true);
    setError(null);
    try {
      await updateOrganization(selectedOrg.id, formData);
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

  const openEdit = (org: Organization) => {
    setSelectedOrg(org);
    setFormData({ ...org });
    setShowEditModal(true);
  };

  const handleToggleStatus = async (org: Organization) => {
    const nextStatus = org.status === "active" ? "inactive" : "active";
    try {
      await updateOrgStatus(org.id, nextStatus);
      await fetchOrgs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      setError(message);
    }
  };

  const validateField = (name: string, value: string) => {
    let err = "";
    if (name === "email") err = validateEmail(value);
    if (name === "phone") err = validatePhone(value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const renderField = (
    label: string,
    name: string,
    type: "text" | "select" = "text",
    options?: string[],
    required?: boolean
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {type === "select" ? (
        <ThemedSelect
          value={(formData as Record<string, string>)[name] || ""}
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
          value={(formData as Record<string, string>)[name] || ""}
          onChange={handleFormChange}
          onBlur={(e) => validateField(name, e.target.value)}
          className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${fieldErrors[name] ? "border-red-400" : "border-slate-300"}`}
          placeholder={label}
        />
      )}
      {fieldErrors[name] && (
        <p className="mt-1 text-xs text-red-500">{fieldErrors[name]}</p>
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-accent-500">Organizations</h1>
        <button
          onClick={() => {
            setFormData({ ...emptyForm });
            setError(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-all duration-200 ease-out"
        >
          <Plus className="w-4 h-4" />
          Create Organization
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
                {["Name", "Email", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {org.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{org.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={org.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(org)}
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200 ease-out"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(org)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 ease-out"
                          title="Toggle Status"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={filteredOrgs.length}
          onPageChange={setPage}
        />
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-medium text-slate-700">Create Organization</h2>
              <button
                onClick={() => setShowCreateModal(false)}
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
                onClick={() => { setShowCreateModal(false); setError(null); }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !mandatoryFilled}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 bg-primary-600 hover:bg-primary-700"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Organization Modal */}
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

      {/* Next Step Modal — shown after org creation */}
      {showNextStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Organization Created</h2>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-medium text-slate-700">{createdOrgName}</span> was created successfully.
                To activate it, assign a Books subscription.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setShowNextStepModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Later
              </button>
              <button
                onClick={() => { setShowNextStepModal(false); navigate("/subscriptions"); }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
              >
                Create Subscription
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationsPage;
