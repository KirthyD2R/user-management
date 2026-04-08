import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Pencil,
  Power,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  listOrganizations,
  createOrganization,
  updateOrganization,
  getOrgStats,
  updateOrgStatus,
} from "../../api/organizations";
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
  const cls = colors[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

const OrganizationsPage: React.FC = () => {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const fetchOrgs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOrganizations(page, LIMIT);
      setOrgs(res.data);
      if (res.pagination) {
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch organizations";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, [page]);

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

  const openStats = async (org: Organization) => {
    setSelectedOrg(org);
    setStats(null);
    setShowStatsModal(true);
    try {
      const res = await getOrgStats(org.id);
      setStats(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch stats";
      setError(message);
      setShowStatsModal(false);
    }
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
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {type === "select" ? (
        <select
          name={name}
          value={(formData as Record<string, string>)[name] || ""}
          onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select {label}</option>
          {options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          name={name}
          value={(formData as Record<string, string>)[name] || ""}
          onChange={handleFormChange}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={label}
        />
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <button
          onClick={() => {
            setFormData({ ...emptyForm });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
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
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Name", "Slug", "Email", "Industry", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : orgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {org.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.slug}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.industry}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={org.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openStats(org)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Stats"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(org)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(org)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Organization</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField("Name", "name")}
              {renderField("Slug", "slug")}
              {renderField("Email", "email")}
              {renderField("Phone", "phone")}
              {renderField("Industry", "industry")}
              {renderField("Company Size", "companySize", "select", COMPANY_SIZES)}
              {renderField("Address", "address")}
              {renderField("City", "city")}
              {renderField("State", "state")}
              {renderField("Country", "country")}
              {renderField("Postal Code", "postalCode")}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Edit Organization</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedOrg(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {renderField("Name", "name")}
              {renderField("Slug", "slug")}
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
              {renderField("Timezone", "timezone", "select", TIMEZONES)}
              {renderField("Currency", "currency", "select", CURRENCIES)}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedOrg(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Stats - {selectedOrg.name}
              </h2>
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setSelectedOrg(null);
                  setStats(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {!stats ? (
                <p className="text-center text-gray-500 py-8">Loading stats...</p>
              ) : Object.keys(stats).length === 0 ? (
                <p className="text-center text-gray-500 py-8">No stats available.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(stats).map(([key, value]) => (
                    <div
                      key={key}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                        {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                      </p>
                      <p className="text-xl font-semibold text-gray-900">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  setSelectedOrg(null);
                  setStats(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
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
