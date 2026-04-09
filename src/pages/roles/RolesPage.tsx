import { useState, useEffect } from "react";
import {
  Shield,
  Search,
  X,
  Eye,
  UserPlus,
  Users,
  List,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  listRoles,
  getRolePermissions,
  assignRole,
  getUserRolesForApp,
  listAllPermissions,
} from "../../api/roles";
import { listOrganizations } from "../../api/organizations";
import { listOrgUsers } from "../../api/users";
import { getApp } from "../../api/apps";
import { useAuth } from "../../contexts/AuthContext";
import { extractArray, extractData } from "../../api/helpers";
import { useToast } from "../../components/Toast";
import { Role, Permission } from "../../types";

type ActiveTab = "roles" | "assign" | "lookup" | "permissions";

export default function RolesPage() {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const APP_PREFIX = "books";
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");

  // Dropdown data
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [booksAppId, setBooksAppId] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<Role | null>(null);
  const [modalPermissions, setModalPermissions] = useState<Permission[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [assignForm, setAssignForm] = useState({
    userId: "",
    orgId: "",
    appId: "",
    roleId: "",
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const [assignError, setAssignError] = useState("");

  const [lookupUserId, setLookupUserId] = useState("");
  const lookupAppSlug = "books";
  const [lookupRoles, setLookupRoles] = useState<Role[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupDone, setLookupDone] = useState(false);

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [permModule, setPermModule] = useState("");
  const [permLoading, setPermLoading] = useState(false);
  const [permError, setPermError] = useState("");

  const [activeTab, setActiveTab] = useState<ActiveTab>("roles");

  const fetchRoles = async () => {
    setRolesLoading(true);
    setRolesError("");
    try {
      const res = await listRoles(APP_PREFIX);
      setRoles(extractArray<Role>(res));
    } catch {
      setRolesError("Failed to load roles.");
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [orgsRes, appRes] = await Promise.all([
        listOrganizations(),
        getApp('books'),
      ]);
      setOrgs(extractArray<{ id: string; name: string }>(orgsRes));
      const appData = extractData<any>(appRes);
      if (appData?.id) setBooksAppId(appData.id);

      // Load users from current org
      if (authUser?.orgId) {
        fetchOrgUsers(authUser.orgId);
      }
    } catch { /* ignore */ }
  };

  // Fetch users when org changes in assign form
  const fetchOrgUsers = async (orgId: string) => {
    if (!orgId) { setUsers([]); return; }
    try {
      const res = await listOrgUsers(orgId, 1, 100);
      setUsers(extractArray<any>(res));
    } catch { setUsers([]); }
  };

  const openPermissionsModal = async (role: Role) => {
    setModalRole(role);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const res = await getRolePermissions(role.id);
      setModalPermissions(extractArray<Permission>(res));
    } catch {
      setModalPermissions([]);
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalRole(null);
    setModalPermissions([]);
  };

  const groupByModule = (perms: Permission[]) => {
    return perms.reduce<Record<string, Permission[]>>((acc, p) => {
      const mod = p.module || "Other";
      if (!acc[mod]) acc[mod] = [];
      acc[mod].push(p);
      return acc;
    }, {});
  };

  const handleAssign = async () => {
    if (!assignForm.userId || !assignForm.orgId || !assignForm.appId || !assignForm.roleId) {
      setAssignError("All fields are required.");
      return;
    }
    setAssignLoading(true);
    setAssignError("");
    setAssignMessage("");
    try {
      await assignRole(assignForm);
      showToast("Role assigned successfully!", "success");
      setAssignForm({ userId: "", orgId: "", appId: booksAppId, roleId: "" });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to assign role.";
      showToast(msg, "error");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupUserId) {
      showToast("Please select a user.", "error");
      return;
    }
    setLookupLoading(true);
    setLookupError("");
    setLookupDone(false);
    try {
      const res: any = await getUserRolesForApp(lookupUserId, lookupAppSlug);
      const rolesArr = res?.data?.roles ?? extractArray<any>(res);
      setLookupRoles(rolesArr);
      setLookupDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to look up user roles.";
      showToast(msg, "error");
    } finally {
      setLookupLoading(false);
    }
  };

  const fetchAllPermissions = async (mod?: string) => {
    setPermLoading(true);
    setPermError("");
    try {
      const res = await listAllPermissions(mod || undefined);
      const perms = extractArray<Permission>(res);
      // Only show books-related permissions
      setAllPermissions(perms.filter(p => p.slug?.startsWith('books.')));
    } catch {
      setPermError("Failed to load permissions.");
    } finally {
      setPermLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "permissions") {
      fetchAllPermissions();
    }
  }, [activeTab]);

  const handlePermModuleSearch = () => {
    fetchAllPermissions(permModule || undefined);
  };

  const actionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-700";
      case "read":
        return "bg-blue-100 text-blue-700";
      case "update":
        return "bg-yellow-100 text-yellow-700";
      case "delete":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: "roles", label: "Roles", icon: <Shield className="w-4 h-4" /> },
    { key: "assign", label: "Assign Role", icon: <UserPlus className="w-4 h-4" /> },
    { key: "lookup", label: "User Lookup", icon: <Users className="w-4 h-4" /> },
    { key: "permissions", label: "All Permissions", icon: <List className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-10">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-7 h-7 text-indigo-600" />
          Roles &amp; Permissions
        </h1>
        <p className="text-gray-500 mt-1">Manage roles, permissions, and user assignments.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-indigo-600 border border-b-0 border-gray-200 shadow-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== ROLES TAB ===== */}
      {activeTab === "roles" && (
        <div>
          {/* Roles are filtered to books app via API: /api/roles?prefix=books */}

          {rolesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="ml-2 text-gray-500">Loading roles...</span>
            </div>
          )}
          {rolesError && (
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{rolesError}</span>
            </div>
          )}

          {!rolesLoading && !rolesError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-1">{role.slug}</p>
                    <p className="text-sm text-gray-500 mt-2">{role.description}</p>
                  </div>
                  <button
                    onClick={() => openPermissionsModal(role)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors self-start"
                  >
                    <Eye className="w-4 h-4" />
                    View Permissions
                  </button>
                </div>
              ))}
              {roles.length === 0 && (
                <p className="text-gray-400 col-span-full text-center py-8">No roles found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== ASSIGN ROLE TAB ===== */}
      {activeTab === "assign" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            Assign Role
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
              <select
                value={assignForm.orgId}
                onChange={(e) => {
                  const orgId = e.target.value;
                  setAssignForm({ ...assignForm, orgId, userId: '', appId: booksAppId });
                  fetchOrgUsers(orgId);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Select an organization</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
              <select
                value={assignForm.userId}
                onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                disabled={!assignForm.orgId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">{assignForm.orgId ? 'Select a user' : 'Select an org first'}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={assignForm.roleId}
                onChange={(e) => setAssignForm({ ...assignForm, roleId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Select a role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {assignError && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{assignError}</span>
              </div>
            )}
            {assignMessage && (
              <p className="text-sm text-green-600 font-medium">{assignMessage}</p>
            )}

            <button
              onClick={handleAssign}
              disabled={assignLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {assignLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Assign Role
            </button>
          </div>
        </div>
      )}

      {/* ===== USER LOOKUP TAB ===== */}
      {activeTab === "lookup" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-lg">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            User Role Lookup
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
              <select
                value={lookupUserId}
                onChange={(e) => setLookupUserId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
              >
                <option value="">Select a user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
                ))}
              </select>
            </div>

            {lookupError && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{lookupError}</span>
              </div>
            )}

            <button
              onClick={handleLookup}
              disabled={lookupLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {lookupLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Look Up
            </button>

            {lookupDone && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Roles ({lookupRoles.length})
                </p>
                {lookupRoles.length === 0 ? (
                  <p className="text-sm text-gray-400">No roles found for this user/app.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {lookupRoles.map((r: any) => (
                      <span
                        key={r.roleId || r.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-700"
                      >
                        {r.roleName || r.name || r.roleSlug || r.slug}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== ALL PERMISSIONS TAB ===== */}
      {activeTab === "permissions" && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by module"
                value={permModule}
                onChange={(e) => setPermModule(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePermModuleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handlePermModuleSearch}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Filter
            </button>
          </div>

          {permLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="ml-2 text-gray-500">Loading permissions...</span>
            </div>
          )}
          {permError && (
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{permError}</span>
            </div>
          )}

          {!permLoading && !permError && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-600">Name</th>
                    <th className="px-6 py-3 font-medium text-gray-600">Slug</th>
                    <th className="px-6 py-3 font-medium text-gray-600">Module</th>
                    <th className="px-6 py-3 font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allPermissions.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-900">{p.name}</td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs">{p.slug}</td>
                      <td className="px-6 py-3 text-gray-500">{p.module}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor(p.action)}`}
                        >
                          {p.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {allPermissions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                        No permissions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== PERMISSIONS MODAL ===== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalRole?.name} — Permissions
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                  <span className="ml-2 text-gray-500">Loading permissions...</span>
                </div>
              ) : modalPermissions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No permissions assigned to this role.
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupByModule(modalPermissions)).map(([mod, perms]) => (
                    <div key={mod}>
                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
                        {mod}
                      </h4>
                      <div className="bg-gray-50 rounded-lg divide-y divide-gray-200">
                        {perms.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{p.slug}</p>
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor(p.action)}`}
                            >
                              {p.action}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
