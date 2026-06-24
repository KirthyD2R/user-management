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
  Trash2,
} from "lucide-react";
import {
  listRoles,
  getRolePermissions,
  assignRole,
  getUserRolesForApp,
  listAllPermissions,
  removeRoleAssignment,
} from "../../api/roles";
import { getOrganization } from "../../api/organizations";
import { listOrgUsers } from "../../api/users";
import { getApp } from "../../api/apps";
import { useAuth } from "../../contexts/AuthContext";
import { extractArray, extractData } from "../../api/helpers";
import { useToast } from "../../components/Toast";
import ThemedSelect from "../../components/ThemedSelect";
import MultiSelect from "../../components/MultiSelect";
import Pagination from "../../components/Pagination";
import { Role, Permission, User } from "../../types";

const LIST_LIMIT = 10;

type ActiveTab = "roles" | "assign" | "lookup" | "rolelookup" | "permissions";

export default function RolesPage() {
  const { user: authUser } = useAuth();
  const { showToast } = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const APP_PREFIX = "books";
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [rolePage, setRolePage] = useState(1);

  // Dropdown data
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [booksAppId, setBooksAppId] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<Role | null>(null);
  const [modalPermissions, setModalPermissions] = useState<Permission[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSearch, setModalSearch] = useState("");

  // "user-roles": 1 user + multi roles  |  "users-role": multi users + 1 role
  const [assignMode, setAssignMode] = useState<"user-roles" | "users-role">("user-roles");
  const [assignForm, setAssignForm] = useState({
    userId: "",
    orgId: "",
    appId: "",
    roleId: "",
  });
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);
  const [assignRoleIds, setAssignRoleIds] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignMessage, setAssignMessage] = useState("");
  const [assignError, setAssignError] = useState("");

  const [lookupUserId, setLookupUserId] = useState("");
  const lookupAppSlug = "books";
  const [lookupRoles, setLookupRoles] = useState<Role[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupDone, setLookupDone] = useState(false);

  // "Users by Role" tab state.
  const [lookupRoleId, setLookupRoleId] = useState("");
  const [roleUsers, setRoleUsers] = useState<User[]>([]);
  const [roleUsersLoading, setRoleUsersLoading] = useState(false);
  const [roleUsersDone, setRoleUsersDone] = useState(false);

  // user -> assigned roles map for the current org (lazy-built, cached). Powers
  // "users by role" lookup and the per-permission "View Users" popup.
  const [userRolesMap, setUserRolesMap] = useState<Record<string, { roleId: string; roleName: string }[]>>({});
  const [userRolesLoaded, setUserRolesLoaded] = useState(false);

  // Ids of users who actually belong to the books app (have ≥1 books role).
  // Used to scope the "User Lookup" dropdown to books users only.
  const [booksUserIds, setBooksUserIds] = useState<Set<string>>(new Set());
  const [booksUsersLoading, setBooksUsersLoading] = useState(false);

  // permission slug -> roles that grant it (lazy-built when Permissions tab opens).
  const [permRolesMap, setPermRolesMap] = useState<Record<string, { id: string; name: string }[]>>({});
  const [permIndexLoading, setPermIndexLoading] = useState(false);

  // Per-permission "View Users" popup.
  const [permUsersModal, setPermUsersModal] = useState<Permission | null>(null);
  const [permUsersLoading, setPermUsersLoading] = useState(false);
  const [permUsers, setPermUsers] = useState<User[]>([]);

  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [permModule, setPermModule] = useState("");
  const [permSearch, setPermSearch] = useState("");
  const [permPage, setPermPage] = useState(1);
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
    if (!authUser?.orgId) return;
    try {
      const [orgRes, appRes] = await Promise.all([
        getOrganization(authUser.orgId),
        getApp('books'),
      ]);
      const myOrg = extractData<{ id: string; name: string }>(orgRes);
      if (myOrg) setOrgs([myOrg]);

      const appData = extractData<any>(appRes);
      if (appData?.id) {
        setBooksAppId(appData.id);
        setAssignForm((prev) => ({ ...prev, orgId: authUser.orgId!, appId: appData.id }));
      }

      fetchOrgUsers(authUser.orgId);
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
    setModalSearch("");
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
    setAssignError("");
    setAssignMessage("");

    if (assignMode === "user-roles") {
      if (!assignForm.userId || assignRoleIds.length === 0) {
        setAssignError("Select a user and at least one role.");
        return;
      }
      setAssignLoading(true);
      const results = await Promise.allSettled(
        assignRoleIds.map((roleId) =>
          assignRole({ userId: assignForm.userId, orgId: assignForm.orgId, appId: assignForm.appId, roleId })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        showToast(`${assignRoleIds.length} role(s) assigned successfully!`, "success");
        setAssignRoleIds([]);
        setAssignForm((p) => ({ ...p, userId: "" }));
      } else {
        showToast(`${results.length - failed} assigned, ${failed} failed.`, "error");
      }
    } else {
      if (assignUserIds.length === 0 || !assignForm.roleId) {
        setAssignError("Select at least one user and a role.");
        return;
      }
      setAssignLoading(true);
      const results = await Promise.allSettled(
        assignUserIds.map((userId) =>
          assignRole({ userId, orgId: assignForm.orgId, appId: assignForm.appId, roleId: assignForm.roleId })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        showToast(`Role assigned to ${assignUserIds.length} user(s) successfully!`, "success");
        setAssignUserIds([]);
        setAssignForm((p) => ({ ...p, roleId: "" }));
      } else {
        showToast(`${results.length - failed} assigned, ${failed} failed.`, "error");
      }
    }

    setAssignLoading(false);
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
      console.log("[User Role Lookup] response roles:", rolesArr);
      setLookupRoles(rolesArr);
      setLookupDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to look up user roles.";
      showToast(msg, "error");
    } finally {
      setLookupLoading(false);
    }
  };

  const [removingId, setRemovingId] = useState<string>("");
  const [confirmRemove, setConfirmRemove] = useState<{ assignmentId: string; roleName: string } | null>(null);

  const requestRemoveRole = (assignmentId: string, roleName: string) => {
    setConfirmRemove({ assignmentId, roleName });
  };

  const handleRemoveRole = async () => {
    if (!confirmRemove) return;
    const { assignmentId } = confirmRemove;
    if (!assignmentId) {
      showToast("Missing assignment id; cannot remove.", "error");
      setConfirmRemove(null);
      return;
    }
    setRemovingId(assignmentId);
    try {
      await removeRoleAssignment(assignmentId);
      showToast("Role removed successfully!", "success");
      setLookupRoles((prev) =>
        prev.filter((r: any) => (r.assignmentId || r.assignment_id || r.userRoleId || r.user_role_id || r.uraId || r.id) !== assignmentId)
      );
      setConfirmRemove(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || "Failed to remove role.";
      showToast(msg, "error");
    } finally {
      setRemovingId("");
    }
  };

  const fetchAllPermissions = async () => {
    setPermLoading(true);
    setPermError("");
    try {
      const res = await listAllPermissions();
      const perms = extractArray<Permission>(res);
      // Only show books-related permissions
      setAllPermissions(perms.filter(p => p.slug?.startsWith('books.')));
    } catch {
      setPermError("Failed to load permissions.");
    } finally {
      setPermLoading(false);
    }
  };

  // Stable key for a permission across the different endpoints that return it.
  const permKey = (p: Permission) => p.slug || p.id;

  // Build permission -> roles index by reading each role's permissions once.
  const fetchPermRolesIndex = async () => {
    setPermIndexLoading(true);
    try {
      const rolesList = roles.length ? roles : extractArray<Role>(await listRoles(APP_PREFIX));
      const map: Record<string, { id: string; name: string }[]> = {};
      await Promise.all(
        rolesList.map(async (role) => {
          try {
            const res = await getRolePermissions(role.id);
            extractArray<Permission>(res).forEach((p) => {
              const key = permKey(p);
              if (!map[key]) map[key] = [];
              map[key].push({ id: role.id, name: role.name });
            });
          } catch { /* skip role on error */ }
        })
      );
      setPermRolesMap(map);
    } finally {
      setPermIndexLoading(false);
    }
  };

  // Lazily build (and cache) the user -> roles map for the current org's users.
  const ensureUserRolesMap = async (): Promise<Record<string, { roleId: string; roleName: string }[]>> => {
    if (userRolesLoaded) return userRolesMap;
    const map: Record<string, { roleId: string; roleName: string }[]> = {};
    await Promise.all(
      users.map(async (u) => {
        try {
          const res: any = await getUserRolesForApp(u.id, lookupAppSlug);
          const arr = res?.data?.roles ?? extractArray<any>(res);
          map[u.id] = (arr || []).map((r: any) => ({
            roleId: r.roleId || r.id,
            roleName: r.roleName || r.name || r.roleSlug || r.slug,
          }));
        } catch {
          map[u.id] = [];
        }
      })
    );
    setUserRolesMap(map);
    setUserRolesLoaded(true);
    return map;
  };

  // When the User Lookup tab opens, scope the dropdown to books users only:
  // i.e. users that have at least one role in the books app.
  useEffect(() => {
    if (activeTab !== "lookup" || users.length === 0) return;
    let cancelled = false;
    (async () => {
      setBooksUsersLoading(true);
      try {
        const map = await ensureUserRolesMap();
        if (cancelled) return;
        setBooksUserIds(new Set(users.filter((u) => (map[u.id] || []).length > 0).map((u) => u.id)));
      } finally {
        if (!cancelled) setBooksUsersLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, users]);

  const handleRoleLookup = async () => {
    if (!lookupRoleId) {
      showToast("Please select a role.", "error");
      return;
    }
    setRoleUsersLoading(true);
    setRoleUsersDone(false);
    try {
      const map = await ensureUserRolesMap();
      const matched = users.filter((u) =>
        (map[u.id] || []).some((r) => r.roleId === lookupRoleId)
      );
      setRoleUsers(matched as User[]);
      setRoleUsersDone(true);
    } catch {
      showToast("Failed to look up users for this role.", "error");
    } finally {
      setRoleUsersLoading(false);
    }
  };

  const openPermUsersModal = async (perm: Permission) => {
    setPermUsersModal(perm);
    setPermUsers([]);
    setPermUsersLoading(true);
    try {
      const map = await ensureUserRolesMap();
      const roleIds = (permRolesMap[permKey(perm)] || []).map((r) => r.id);
      const matched = users.filter((u) =>
        (map[u.id] || []).some((r) => roleIds.includes(r.roleId))
      );
      setPermUsers(matched as User[]);
    } catch {
      showToast("Failed to load users for this permission.", "error");
    } finally {
      setPermUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "permissions") {
      fetchAllPermissions();
      fetchPermRolesIndex();
    }
  }, [activeTab]);

  // Reset to the first page whenever a filter/search term changes.
  useEffect(() => {
    setRolePage(1);
  }, [roleSearch]);

  useEffect(() => {
    setPermPage(1);
  }, [permSearch, permModule]);

  const moduleOptions = Array.from(
    new Set(allPermissions.map((p) => p.module).filter(Boolean))
  ).sort();

  // ----- Roles tab: client-side partial search + pagination -----
  const roleQuery = roleSearch.trim().toLowerCase();
  const filteredRoles = roleQuery
    ? roles.filter((r) =>
        [r.name, r.slug, r.description].some((f) => (f || "").toLowerCase().includes(roleQuery))
      )
    : roles;
  const roleTotalPages = Math.max(1, Math.ceil(filteredRoles.length / LIST_LIMIT));
  const pagedRoles = filteredRoles.slice((rolePage - 1) * LIST_LIMIT, rolePage * LIST_LIMIT);

  // ----- Permissions tab: module filter + partial search + pagination -----
  const permQuery = permSearch.trim().toLowerCase();
  const filteredPermissions = allPermissions.filter((p) => {
    if (permModule && p.module !== permModule) return false;
    if (!permQuery) return true;
    return [p.description, p.name, p.slug, p.module, p.action].some((f) =>
      (f || "").toLowerCase().includes(permQuery)
    );
  });
  const permTotalPages = Math.max(1, Math.ceil(filteredPermissions.length / LIST_LIMIT));
  const pagedPermissions = filteredPermissions.slice(
    (permPage - 1) * LIST_LIMIT,
    permPage * LIST_LIMIT
  );

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
        return "bg-slate-100 text-slate-700";
    }
  };

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: "roles", label: "Roles", icon: <Shield className="w-4 h-4" /> },
    { key: "assign", label: "Assign Role", icon: <UserPlus className="w-4 h-4" /> },
    { key: "lookup", label: "User Lookup", icon: <Users className="w-4 h-4" /> },
    { key: "rolelookup", label: "Users by Role", icon: <Users className="w-4 h-4" /> },
    { key: "permissions", label: "All Permissions", icon: <List className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-accent-500 flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary-600" />
          Roles &amp; Permissions
        </h1>
        <p className="text-slate-500 mt-1">Manage roles, permissions, and user assignments.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all duration-200 ease-out ${
              activeTab === tab.key
                ? "bg-white text-primary-600 border border-b-0 border-slate-200 shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
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

          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search roles by name, slug, description..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {roleSearch && (
              <button
                onClick={() => setRoleSearch("")}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all duration-200 ease-out"
              >
                Clear
              </button>
            )}
          </div>

          {rolesLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              <span className="ml-2 text-slate-500">Loading roles...</span>
            </div>
          )}
          {rolesError && (
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{rolesError}</span>
            </div>
          )}

          {!rolesLoading && !rolesError && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-medium text-slate-600">Name</th>
                    <th className="px-6 py-3 font-medium text-slate-600">Description</th>
                    <th className="px-6 py-3 font-medium text-slate-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-slate-50 transition-all duration-200 ease-out">
                      <td className="px-6 py-3 text-slate-900 font-medium">{role.name}</td>
                      <td className="px-6 py-3 text-slate-500">{role.description}</td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => openPermissionsModal(role)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all duration-200 ease-out"
                        >
                          <Eye className="w-4 h-4" />
                          View Permissions
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRoles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        No roles found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination
                page={rolePage}
                totalPages={roleTotalPages}
                total={filteredRoles.length}
                onPageChange={setRolePage}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== ASSIGN ROLE TAB ===== */}
      {activeTab === "assign" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-lg">
          <h2 className="text-base font-medium text-slate-700 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary-600" />
            Assign Role
          </h2>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-5 text-sm font-medium">
            <button
              type="button"
              onClick={() => { setAssignMode("user-roles"); setAssignError(""); }}
              className={`flex-1 py-2 transition-colors duration-150 ${
                assignMode === "user-roles"
                  ? "bg-primary-600 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              1 User → Multiple Roles
            </button>
            <button
              type="button"
              onClick={() => { setAssignMode("users-role"); setAssignError(""); }}
              className={`flex-1 py-2 border-l border-slate-200 transition-colors duration-150 ${
                assignMode === "users-role"
                  ? "bg-primary-600 text-white"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              Multiple Users → 1 Role
            </button>
          </div>

          <div className="space-y-4">
            {assignMode === "user-roles" ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
                  <ThemedSelect
                    value={assignForm.userId}
                    onChange={(v) => setAssignForm({ ...assignForm, userId: v })}
                    options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.email})` }))}
                    placeholder="Select a user"
                    searchable
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Roles <span className="text-slate-400 font-normal">(select multiple)</span>
                  </label>
                  <MultiSelect
                    values={assignRoleIds}
                    onChange={setAssignRoleIds}
                    options={roles.map((r) => ({ value: r.id, label: r.name }))}
                    placeholder="Select roles"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Users <span className="text-slate-400 font-normal">(select multiple)</span>
                  </label>
                  <MultiSelect
                    values={assignUserIds}
                    onChange={setAssignUserIds}
                    options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.email})` }))}
                    placeholder="Select users"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <ThemedSelect
                    value={assignForm.roleId}
                    onChange={(v) => setAssignForm({ ...assignForm, roleId: v })}
                    options={roles.map((r) => ({ value: r.id, label: r.name }))}
                    placeholder="Select a role"
                    searchable
                  />
                </div>
              </>
            )}

            {assignError && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{assignError}</span>
              </div>
            )}

            <button
              onClick={handleAssign}
              disabled={assignLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-all duration-200 ease-out disabled:opacity-50"
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-lg">
          <h2 className="text-base font-medium text-slate-700 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            User Role Lookup
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
              <ThemedSelect
                value={lookupUserId}
                onChange={(v) => setLookupUserId(v)}
                options={users
                  .filter((u) => booksUserIds.has(u.id))
                  .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName} (${u.email})` }))}
                placeholder={booksUsersLoading ? "Loading books users..." : "Select a user"}
                searchable
              />
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
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-all duration-200 ease-out disabled:opacity-50"
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
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Roles ({lookupRoles.length})
                </p>
                {lookupRoles.length === 0 ? (
                  <p className="text-sm text-slate-400">No roles found for this user/app.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {lookupRoles.map((r: any) => {
                      const assignmentId = r.assignmentId || r.assignment_id || r.userRoleId || r.user_role_id || r.uraId || r.id;
                      const label = r.roleName || r.name || r.roleSlug || r.slug;
                      const isRemoving = removingId === assignmentId;
                      return (
                        <span
                          key={assignmentId || r.roleId}
                          className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-700"
                        >
                          {label}
                          <button
                            onClick={() => requestRemoveRole(assignmentId, label)}
                            disabled={isRemoving}
                            title="Remove role"
                            className="p-1 rounded-full hover:bg-red-100 hover:text-red-600 transition-all duration-200 ease-out disabled:opacity-50"
                          >
                            {isRemoving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== USERS BY ROLE TAB ===== */}
      {activeTab === "rolelookup" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-lg">
          <h2 className="text-base font-medium text-slate-700 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            Users by Role
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <ThemedSelect
                value={lookupRoleId}
                onChange={(v) => setLookupRoleId(v)}
                options={roles.map((r) => ({ value: r.id, label: r.name }))}
                placeholder="Select a role"
                searchable
              />
            </div>

            <button
              onClick={handleRoleLookup}
              disabled={roleUsersLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-all duration-200 ease-out disabled:opacity-50"
            >
              {roleUsersLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Look Up
            </button>

            {roleUsersDone && (
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Users ({roleUsers.length})
                </p>
                {roleUsers.length === 0 ? (
                  <p className="text-sm text-slate-400">No users in this organization have this role.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {roleUsers.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                          {(u.firstName?.[0] || "") + (u.lastName?.[0] || "")}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
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
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search permissions..."
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="w-48">
              <ThemedSelect
                value={permModule}
                onChange={(v) => setPermModule(v)}
                options={[
                  { value: "", label: "All modules" },
                  ...moduleOptions.map((m) => ({ value: m, label: m })),
                ]}
                placeholder="Filter by module"
                searchable
              />
            </div>
            {(permModule || permSearch) && (
              <button
                onClick={() => { setPermModule(""); setPermSearch(""); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all duration-200 ease-out"
              >
                Clear
              </button>
            )}
          </div>

          {permLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
              <span className="ml-2 text-slate-500">Loading permissions...</span>
            </div>
          )}
          {permError && (
            <div className="flex items-center gap-2 text-red-600 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{permError}</span>
            </div>
          )}

          {!permLoading && !permError && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 font-medium text-slate-600">Description</th>
                    <th className="px-6 py-3 font-medium text-slate-600">Module</th>
                    <th className="px-6 py-3 font-medium text-slate-600">Action</th>
                    <th className="px-6 py-3 font-medium text-slate-600">Roles</th>
                    <th className="px-6 py-3 font-medium text-slate-600 text-right">Users</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedPermissions.map((p) => {
                    const permRoles = permRolesMap[permKey(p)] || [];
                    return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-all duration-200 ease-out">
                      <td className="px-6 py-3 text-slate-900">{p.description}</td>
                      <td className="px-6 py-3 text-slate-500">{p.module}</td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${actionColor(p.action)}`}
                        >
                          {p.action}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {permIndexLoading ? (
                          <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
                        ) : permRoles.length === 0 ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {permRoles.map((r) => (
                              <span
                                key={r.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600"
                              >
                                {r.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => openPermUsersModal(p)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-all duration-200 ease-out"
                        >
                          <Users className="w-4 h-4" />
                          View Users
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                  {filteredPermissions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No permissions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination
                page={permPage}
                totalPages={permTotalPages}
                total={filteredPermissions.length}
                onPageChange={setPermPage}
              />
            </div>
          )}
        </div>
      )}

      {/* ===== REMOVE ROLE CONFIRM MODAL ===== */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-medium text-slate-700">Remove Role</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600">
                Are you sure you want to remove the role{" "}
                <span className="font-semibold text-slate-900">"{confirmRemove.roleName}"</span> from this user?
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setConfirmRemove(null)}
                disabled={!!removingId}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-all duration-200 ease-out disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveRole}
                disabled={!!removingId}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 ease-out disabled:opacity-50"
              >
                {removingId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== PERMISSION USERS MODAL ===== */}
      {permUsersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-medium text-slate-700">
                  Users with permission
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {permUsersModal.description || permUsersModal.name || permUsersModal.slug}
                </p>
              </div>
              <button
                onClick={() => setPermUsersModal(null)}
                className="p-1 rounded hover:bg-slate-100 transition-all duration-200 ease-out"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {permUsersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                  <span className="ml-2 text-slate-500">Loading users...</span>
                </div>
              ) : permUsers.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  No users in this organization have this permission.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {permUsers.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                        {(u.firstName?.[0] || "") + (u.lastName?.[0] || "")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== PERMISSIONS MODAL ===== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-medium text-slate-700">
                {modalRole?.name} — Permissions
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded hover:bg-slate-100 transition-all duration-200 ease-out"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Modal search bar */}
            {!modalLoading && modalPermissions.length > 0 && (
              <div className="px-6 py-3 border-b border-slate-100 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search permissions…"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            <div className="overflow-y-auto p-6">
              {modalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                  <span className="ml-2 text-slate-500">Loading permissions...</span>
                </div>
              ) : modalPermissions.length === 0 ? (
                <p className="text-slate-400 text-center py-8">
                  No permissions assigned to this role.
                </p>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const q = modalSearch.trim().toLowerCase();
                    const filtered = q
                      ? modalPermissions.filter((p) =>
                          [p.description, p.name, p.slug, p.module, p.action].some((f) =>
                            (f || "").toLowerCase().includes(q)
                          )
                        )
                      : modalPermissions;
                    if (filtered.length === 0)
                      return <p className="text-slate-400 text-center py-8">No matching permissions.</p>;
                    return Object.entries(groupByModule(filtered)).map(([mod, perms]) => (
                    <div key={mod}>
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                        {mod}
                      </h4>
                      <div className="bg-slate-50 rounded-lg divide-y divide-slate-200">
                        {perms.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-slate-900">{p.description || p.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{p.slug}</p>
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
                  ));
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
