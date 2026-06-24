import { useState, useEffect, useCallback, useRef } from 'react';
import { Edit2, XCircle, CheckCircle2, AppWindow, Search, X, Plus, Download, Upload, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listOrgUsers, inviteUser, notifyUserInvite, updateUser, toggleUserStatus, getUserApps, deleteUser } from '../../api/users';
import { getUserRolesForApp, listRoles } from '../../api/roles';
import { getOrganization } from '../../api/organizations';
import { extractArray, extractData, normalizeUser } from '../../api/helpers';
import { validateEmail, validatePhone } from '../../utils/validators';
import { User, App } from '../../types';
import ThemedSelect from '../../components/ThemedSelect';
import Pagination from '../../components/Pagination';
import ConfirmDialog from '../../components/ConfirmDialog';

const LIMIT = 10;

export default function UsersPage() {
  const { user: authUser } = useAuth();
  const orgId = authUser?.orgId;

  const [allUsers, setAllUsers] = useState<(User & { roleNames: string[] })[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    orgId: '',
    appSlug: 'books',
    roleSlug: '',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [editPhoneError, setEditPhoneError] = useState('');

  const [showAppsModal, setShowAppsModal] = useState(false);
  const [userApps, setUserApps] = useState<App[]>([]);

  // Dropdowns data
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    if (!orgId) return;
    const fetchDropdownData = async () => {
      try {
        const [orgRes, rolesRes] = await Promise.all([
          getOrganization(orgId),
          listRoles('books'),
        ]);
        const myOrg = extractData<{ id: string; name: string }>(orgRes);
        setOrgs(myOrg ? [myOrg] : []);
        setRoles(extractArray<{ slug: string; name: string }>(rolesRes));
      } catch { /* ignore */ }
    };
    fetchDropdownData();
  }, [orgId]);

  const fetchUsers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const res = await listOrgUsers(orgId, 1, 100);
      const allUsers = extractArray<User>(res).map(normalizeUser);

      // Filter to only users that have roles in the books app, store role names
      const usersWithAccess = await Promise.all(
        allUsers.map(async (u) => {
          try {
            const rolesRes = await getUserRolesForApp(u.id, 'books');
            const userRoles = extractArray<any>(rolesRes);
            if (userRoles.length === 0) return null;
            const roleNames = userRoles.map((r: any) => r.name || r.slug || r.roleSlug || '').filter(Boolean);
            return { ...u, roleNames };
          } catch {
            return null;
          }
        })
      );
      const booksUsers = usersWithAccess.filter((u): u is (User & { roleNames: string[] }) => u !== null);
      setAllUsers(booksUsers);
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset to the first page whenever the search term changes.
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  // Client-side partial search (case-insensitive) across name and email.
  const query = searchQuery.trim().toLowerCase();
  const filteredUsers = query
    ? allUsers.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
          (u.email || '').toLowerCase().includes(query)
      )
    : allUsers;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / LIMIT));
  const users = filteredUsers.slice((page - 1) * LIMIT, page * LIMIT);

  const handleInvite = async () => {
    setError('');
    try {
      await inviteUser({ ...inviteForm, orgId: inviteForm.orgId || orgId || '' });
      setShowInviteModal(false);
      setInviteForm({ email: '', firstName: '', lastName: '', orgId: '', appSlug: 'books', roleSlug: '' });
      fetchUsers();
      // Send notification and report result
      const roleName = roles.find((r) => r.slug === inviteForm.roleSlug)?.name || inviteForm.roleSlug;
      const orgName = orgs[0]?.name || '';
      const { ok } = await notifyUserInvite({ email: inviteForm.email, firstName: inviteForm.firstName, orgName, roleName });
      if (ok) {
        showToast('User added and invitation email sent successfully!', 'success');
      } else {
        showToast('User added, but the invitation email could not be sent.', 'error');
      }
    } catch {
      setError('Failed to send invite. Please try again.');
    }
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, phone: u.phone });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setError('');
    try {
      await updateUser(selectedUser.id, editForm);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch {
      setError('Failed to update user.');
    }
  };

  const handleToggleStatus = async (u: User) => {
    if (u.isActive) { setConfirmUser(u); return; }
    // activate directly — no confirmation needed
    setError('');
    try {
      await toggleUserStatus(u.id, true);
      fetchUsers();
    } catch {
      setError('Failed to activate user.');
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!confirmUser) return;
    setToggleLoading(true);
    setError('');
    try {
      await toggleUserStatus(confirmUser.id, false);
      fetchUsers();
      setConfirmUser(null);
    } catch {
      setError('Failed to deactivate user.');
    } finally {
      setToggleLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allPageSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));
  const someSelected = selectedIds.size > 0;
  const selectedUsers = allUsers.filter((u) => selectedIds.has(u.id));
  const allSelectedActive = selectedUsers.length > 0 && selectedUsers.every((u) => u.isActive);
  const allSelectedInactive = selectedUsers.length > 0 && selectedUsers.every((u) => !u.isActive);

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        users.forEach((u) => next.delete(u.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        users.forEach((u) => next.add(u.id));
        return next;
      });
    }
  };

  const handleBulkActivate = async () => {
    setBulkLoading(true);
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map((id) => toggleUserStatus(id, true)));
    setSelectedIds(new Set());
    setBulkLoading(false);
    fetchUsers();
  };

  const handleBulkDeactivate = async () => {
    setBulkLoading(true);
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map((id) => toggleUserStatus(id, false)));
    setSelectedIds(new Set());
    setShowBulkConfirm(false);
    setBulkLoading(false);
    fetchUsers();
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Delete user ${u.firstName} ${u.lastName}? This cannot be undone.`)) return;
    setError('');
    try {
      await deleteUser(u.id);
      fetchUsers();
    } catch {
      setError('Failed to delete user.');
    }
  };

  // ── Export ──────────────────────────────────────────────
  const handleExport = () => {
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const row = (...cols: any[]) => cols.map(escape).join(',');
    const lines = [
      row('First Name', 'Last Name', 'Email', 'Phone', 'Status', 'Roles', 'Created'),
      ...allUsers.map((u) =>
        row(
          u.firstName, u.lastName, u.email, u.phone || '',
          u.isActive ? 'Active' : 'Inactive',
          (u.roleNames || []).join('; '),
          u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
        )
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Users_Export.csv';
    a.click();
  };

  // ── Import ──────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<{ firstName: string; lastName: string; email: string }[]>([]);
  const [importRoleSlug, setImportRoleSlug] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);

  const downloadTemplate = () => {
    const csv = 'firstName,lastName,email\nJohn,Doe,john@example.com\nJane,Smith,jane@example.com';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'Users_Import_Template.csv';
    a.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split('\n').filter(Boolean);
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const rows: typeof importRows = [];
      const errs: string[] = [];
      lines.slice(1).forEach((line, i) => {
        const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const get = (key: string) => vals[headers.indexOf(key)] || '';
        const email = get('email');
        const firstName = get('firstname');
        if (!email || !firstName) {
          errs.push(`Row ${i + 2}: missing required field (firstName or email)`);
        } else {
          rows.push({ firstName, lastName: get('lastname'), email });
        }
      });
      setImportRows(rows);
      setImportErrors(errs);
      setImportResult(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importRows.length || !orgId || !importRoleSlug) return;
    setImporting(true);
    const roleName = roles.find((r) => r.slug === importRoleSlug)?.name || importRoleSlug;
    const orgName = orgs[0]?.name || '';
    let success = 0, failed = 0, emailFailed = 0;
    for (const row of importRows) {
      try {
        await inviteUser({ ...row, orgId, appSlug: 'books', roleSlug: importRoleSlug });
        success++;
        const { ok } = await notifyUserInvite({ email: row.email, firstName: row.firstName, orgName, roleName });
        if (!ok) emailFailed++;
      } catch {
        failed++;
      }
    }
    setImportResult({ success, failed });
    setImporting(false);
    if (success > 0) {
      fetchUsers();
      if (emailFailed === 0) {
        showToast(`${success} user(s) added and invitation emails sent successfully!`, 'success');
      } else {
        showToast(`${success} user(s) added, but ${emailFailed} invitation email(s) could not be sent.`, 'error');
      }
    }
    if (failed > 0) {
      showToast(`${failed} user(s) could not be added.`, 'error');
    }
  };

  const openApps = async (u: User) => {
    setSelectedUser(u);
    setError('');
    try {
      const res = await getUserApps(u.id);
      setUserApps(extractArray<App>(res));
      setShowAppsModal(true);
    } catch {
      setError('Failed to load user apps.');
    }
  };

  if (!orgId) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 text-lg">Please select an organization to manage users.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-accent-500">Users</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={allUsers.length === 0}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ease-out text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => { setShowImportModal(true); setImportRows([]); setImportErrors([]); setImportResult(null); setImportRoleSlug(''); }}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all duration-200 ease-out text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-all duration-200 ease-out text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-all duration-200 ease-out"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-lg bg-primary-50 border border-primary-200">
          <span className="text-sm font-medium text-primary-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            {!allSelectedActive && (
              <button
                onClick={handleBulkActivate}
                disabled={bulkLoading || allSelectedActive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-700 border border-green-300 bg-white hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Activate
              </button>
            )}
            {!allSelectedInactive && (
              <button
                onClick={() => setShowBulkConfirm(true)}
                disabled={bulkLoading || allSelectedInactive}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 border border-red-300 bg-white hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <XCircle className="w-3.5 h-3.5" /> Deactivate
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className={`hover:bg-slate-50 ${selectedIds.has(u.id) ? 'bg-primary-50/50' : ''}`}>
                  <td className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        u.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-all duration-200 ease-out"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`p-1.5 rounded transition-all duration-200 ease-out ${
                          u.isActive
                            ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                            : 'text-slate-500 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={u.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {u.isActive
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

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={filteredUsers.length}
          onPageChange={setPage}
        />
      </div>

      {showBulkConfirm && (
        <ConfirmDialog
          title={`Deactivate ${selectedIds.size} User${selectedIds.size !== 1 ? 's' : ''}`}
          message={`Are you sure you want to deactivate ${selectedIds.size} selected user${selectedIds.size !== 1 ? 's' : ''}? They will lose access immediately.`}
          confirmLabel="Yes, Deactivate All"
          loading={bulkLoading}
          onConfirm={handleBulkDeactivate}
          onCancel={() => setShowBulkConfirm(false)}
        />
      )}

      {confirmUser && (
        <ConfirmDialog
          title="Deactivate User"
          message={`Are you sure you want to deactivate ${confirmUser.firstName} ${confirmUser.lastName}? They will lose access immediately.`}
          confirmLabel="Yes, Deactivate"
          loading={toggleLoading}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setConfirmUser(null)}
        />
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-slate-700">Create User</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteForm.firstName}
                    onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={inviteForm.lastName}
                    onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  onBlur={(e) => setInviteEmailError(validateEmail(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${inviteEmailError ? "border-red-400" : "border-slate-300"}`}
                />
                {inviteEmailError && <p className="mt-1 text-xs text-red-500">{inviteEmailError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <ThemedSelect
                  value={inviteForm.roleSlug}
                  onChange={(v) => setInviteForm({ ...inviteForm, roleSlug: v })}
                  options={roles.map((r) => ({ value: r.slug, label: r.name }))}
                  placeholder="Select a role"
                  searchable
                />
              </div>
              <button
                onClick={handleInvite}
                disabled={!inviteForm.email.trim() || !inviteForm.firstName.trim() || !inviteForm.roleSlug || !!inviteEmailError}
                className="w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 bg-primary-600 text-white hover:bg-primary-700"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-slate-700">Edit User</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  onBlur={(e) => setEditPhoneError(validatePhone(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${editPhoneError ? "border-red-400" : "border-slate-300"}`}
                />
                {editPhoneError && <p className="mt-1 text-xs text-red-500">{editPhoneError}</p>}
              </div>
              <button
                onClick={handleUpdate}
                className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-all duration-200 ease-out"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Bulk Import Users</h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Template download */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Download Sample CSV template to get started</span>
                </div>
                <button onClick={downloadTemplate} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assign Role <span className="text-red-500">*</span></label>
                <ThemedSelect
                  value={importRoleSlug}
                  onChange={(v) => setImportRoleSlug(v)}
                  options={roles.map((r) => ({ value: r.slug, label: r.name }))}
                  placeholder="Select a role for all imported users"
                />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload CSV <span className="text-red-500">*</span></label>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-500 hover:border-primary-400 hover:text-primary-600 transition-colors"
                >
                  Click to select CSV file
                </button>
              </div>

              {/* Errors */}
              {importErrors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 space-y-0.5">
                  {importErrors.map((e, i) => <p key={i}>{e}</p>)}
                </div>
              )}

              {/* Preview */}
              {importRows.length > 0 && !importResult && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">{importRows.length} user{importRows.length !== 1 ? 's' : ''} ready to import</p>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 text-xs">
                    <table className="w-full">
                      <thead className="bg-slate-50 text-slate-500 uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">Name</th>
                          <th className="px-3 py-2 text-left">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importRows.map((r, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 text-slate-700">{r.firstName} {r.lastName}</td>
                            <td className="px-3 py-1.5 text-slate-600">{r.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result */}
              {importResult && (
                <div className={`p-3 rounded-lg text-sm font-medium ${importResult.failed === 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                  {importResult.success} imported successfully{importResult.failed > 0 ? `, ${importResult.failed} failed` : ''}.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition">Cancel</button>
                <button
                  onClick={handleImport}
                  disabled={importing || importRows.length === 0 || !importRoleSlug || !!importResult}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition"
                >
                  {importing && <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {importing ? 'Importing…' : `Import ${importRows.length} User${importRows.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View User Apps Modal */}
      {showAppsModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-slate-700">
                Apps for {selectedUser.firstName} {selectedUser.lastName}
              </h2>
              <button
                onClick={() => { setShowAppsModal(false); setUserApps([]); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {userApps.length === 0 ? (
              <p className="text-slate-500 text-sm">No apps assigned to this user.</p>
            ) : (
              <ul className="space-y-2">
                {userApps.map((app) => (
                  <li
                    key={app.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                  >
                    <AppWindow className="w-5 h-5 text-primary-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{app.name}</p>
                      <p className="text-xs text-slate-500">{app.slug}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
