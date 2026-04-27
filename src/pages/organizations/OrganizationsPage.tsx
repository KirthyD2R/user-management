import React, { useEffect, useState } from "react";
import {
  Pencil,
  Power,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ThemedSelect from "../../components/ThemedSelect";
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  updateOrgStatus,
} from "../../api/organizations";
import { checkAccess } from "../../api/subscriptions";
import { extractArray, extractData } from "../../api/helpers";
import { Organization } from "../../types";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];
const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const FINANCIAL_YEAR_START_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
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
  const [allFilteredOrgs, setAllFilteredOrgs] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [formData, setFormData] = useState<Partial<Organization>>({ ...emptyForm });
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);

  const LIMIT = 10;
  const APP_SLUG = "books";

  const totalPages = Math.max(1, Math.ceil(allFilteredOrgs.length / LIMIT));
  const orgs = allFilteredOrgs.slice((page - 1) * LIMIT, page * LIMIT);

  const fetchOrgs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all organizations
      const res = await listOrganizations(1, 1000);
      const allOrgs = extractArray<Organization>(res);

      // Check which orgs have a books app subscription
      const accessResults = await Promise.all(
        allOrgs.map(async (org) => {
          try {
            const accessRes = await checkAccess(org.id, APP_SLUG);
            const data = extractData<{ hasAccess: boolean }>(accessRes);
            return { org, hasAccess: data?.hasAccess === true };
          } catch {
            return { org, hasAccess: false };
          }
        })
      );

      const filtered = accessResults
        .filter((r) => r.hasAccess)
        .map((r) => r.org);

      setAllFilteredOrgs(filtered);
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
    try {
      await createOrganization(formData);
      setShowCreateModal(false);
      setFormData({ ...emptyForm });
      await fetchOrgs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create organization";
      setError(message);
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
      await fetchOrgs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update organization";
      setError(message);
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

  const renderField = (
    label: string,
    name: string,
    type: "text" | "select" = "text",
    options?: string[]
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
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
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={label}
        />
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
        <button
          onClick={() => {
            setFormData({ ...emptyForm });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-all duration-200 ease-out"
        >
          <Plus className="w-4 h-4" />
          Create Organization
        </button>
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-slate-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Create Organization</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField("Name", "name")}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  readOnly
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                  placeholder="Auto-generated from name"
                />
              </div>
              {renderField("Email", "email")}
              {renderField("Phone", "phone")}
              {renderField("Industry", "industry")}
              {renderField("Company Size", "companySize", "select", COMPANY_SIZES)}
              {renderField("Address", "address")}
              {renderField("City", "city")}
              {renderField("State", "state")}
              {renderField("Country", "country")}
              {renderField("Postal Code", "postalCode")}
              {renderField("GSTIN", "gstin")}
              {renderField("PAN", "pan")}
              {renderField("Currency", "currency", "select", CURRENCIES)}
              {renderField("Financial Year Start", "financialYearStart", "select", FINANCIAL_YEAR_START_MONTHS)}
              {renderField("Timezone", "timezone", "select", TIMEZONES)}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Edit Organization</h2>
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
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField("Name", "name")}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  type="text"
                  value={formData.slug || ''}
                  readOnly
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                  placeholder="Auto-generated from name"
                />
              </div>
              {renderField("Email", "email")}
              {renderField("Phone", "phone")}
              {renderField("Industry", "industry")}
              {renderField("Company Size", "companySize", "select", COMPANY_SIZES)}
              {renderField("Address", "address")}
              {renderField("City", "city")}
              {renderField("State", "state")}
              {renderField("Country", "country")}
              {renderField("Postal Code", "postalCode")}
              {renderField("GSTIN", "gstin")}
              {renderField("PAN", "pan")}
              {renderField("Currency", "currency", "select", CURRENCIES)}
              {renderField("Financial Year Start", "financialYearStart", "select", FINANCIAL_YEAR_START_MONTHS)}
              {renderField("Timezone", "timezone", "select", TIMEZONES)}
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
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
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
              <h2 className="text-lg font-semibold text-slate-900">
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
