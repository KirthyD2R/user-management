import { useState, useEffect, useCallback } from 'react';
import { Pencil, Power, AppWindow, Search, X, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listOrgUsers, lookupUser, inviteUser, updateUser, toggleUserStatus, getUserApps, deleteUser } from '../../api/users';
import { getUserRolesForApp, listRoles } from '../../api/roles';
import { listOrganizations } from '../../api/organizations';
import { checkAccess } from '../../api/subscriptions';
import { extractArray, extractData, extractPagination } from '../../api/helpers';
import { User, App, Role } from '../../types';
import ThemedSelect from '../../components/ThemedSelect';

const LIMIT = 10;

export default function UsersPage() {
  const { user: authUser } = useAuth();
  const orgId = authUser?.orgId;

  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const [showAppsModal, setShowAppsModal] = useState(false);
  const [userApps, setUserApps] = useState<App[]>([]);

  // Dropdowns data
  const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ slug: string; name: string }[]>([]);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [orgsRes, rolesRes] = await Promise.all([
          listOrganizations(),
          listRoles('books'),
        ]);
        const allOrgs = extractArray<{ id: string; name: string }>(orgsRes);
        const accessChecks = await Promise.all(
          allOrgs.map(async (org) => {
            try {
              const accessRes = await checkAccess(org.id, 'books');
              const data = extractData<{ hasAccess: boolean }>(accessRes);
              return data?.hasAccess === true;
            } catch {
              return false;
            }
          })
        );
        setOrgs(allOrgs.filter((_, i) => accessChecks[i]));
        setRoles(extractArray<{ slug: string; name: string }>(rolesRes));
      } catch { /* ignore */ }
    };
    fetchDropdownData();
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError('');
    try {
      const res = await listOrgUsers(orgId, 1, 100);
      const allUsers = extractArray<User>(res);

      // Filter to only users that have roles in the books app
      const usersWithAccess = await Promise.all(
        allUsers.map(async (u) => {
          try {
            const rolesRes = await getUserRolesForApp(u.id, 'books');
            const roles = extractArray(rolesRes);
            return roles.length > 0 ? u : null;
          } catch {
            return null;
          }
        })
      );
      const booksUsers = usersWithAccess.filter((u): u is User => u !== null);

      // Client-side pagination
      const start = (page - 1) * LIMIT;
      setUsers(booksUsers.slice(start, start + LIMIT));
      setTotalPages(Math.max(1, Math.ceil(booksUsers.length / LIMIT)));
    } catch {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [orgId, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchUsers();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await lookupUser(searchQuery.trim());
      const found = extractData<User>(res);
      setUsers(found ? [found] : []);
      setTotalPages(1);
      setPage(1);
    } catch {
      setError('User not found.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    setError('');
    try {
      await inviteUser({ ...inviteForm, orgId: inviteForm.orgId || orgId || '' });
      setShowInviteModal(false);
      setInviteForm({ email: '', firstName: '', lastName: '', orgId: '', appSlug: 'books', roleSlug: '' });
      fetchUsers();
    } catch {
      setError('Failed to send invite.');
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
    setError('');
    try {
      await toggleUserStatus(u.id, !u.isActive);
      fetchUsers();
    } catch {
      setError('Failed to toggle user status.');
    }
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
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-all duration-200 ease-out"
        >
          <Plus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all duration-200 ease-out"
        >
          Search
        </button>
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); fetchUsers(); }}
            className="px-4 py-2 text-slate-500 hover:text-slate-700 transition-all duration-200 ease-out"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
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
                        <Pencil className="w-4 h-4" />
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
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-t border-slate-200">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Invite User</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization</label>
                <ThemedSelect
                  value={inviteForm.orgId || orgId || ''}
                  onChange={(v) => setInviteForm({ ...inviteForm, orgId: v })}
                  options={orgs.map((o) => ({ value: o.id, label: o.name }))}
                  placeholder="Select an organization"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <ThemedSelect
                  value={inviteForm.roleSlug}
                  onChange={(v) => setInviteForm({ ...inviteForm, roleSlug: v })}
                  options={roles.map((r) => ({ value: r.slug, label: r.name }))}
                  placeholder="Select a role"
                />
              </div>
              <button
                onClick={handleInvite}
                className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition-all duration-200 ease-out"
              >
                Send Invite
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
              <h2 className="text-lg font-semibold text-slate-900">Edit User</h2>
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
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

      {/* View User Apps Modal */}
      {showAppsModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
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
