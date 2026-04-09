import { useState, useEffect } from 'react';
import { Pencil, X, AppWindow, Globe, Settings, Tag, Users, Shield, Loader2 } from 'lucide-react';
import { getApp, updateApp } from '../../api/apps';
import { listOrgUsers } from '../../api/users';
import { getUserRolesForApp } from '../../api/roles';
import { listOrganizations } from '../../api/organizations';
import { useAuth } from '../../contexts/AuthContext';
import { extractData, extractArray } from '../../api/helpers';

interface App {
  id: string;
  slug: string;
  name: string;
  description: string;
  baseUrl: string;
  limitModel: string;
  isActive: boolean;
}

interface AppFormData {
  name: string;
  description: string;
  baseUrl: string;
  limitModel: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
}

interface UserWithRole extends User {
  roles: { id: string; slug: string; name: string }[];
  rolesLoading: boolean;
}

export default function AppsPage() {
  const { user: authUser } = useAuth();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<AppFormData>({ name: '', description: '', baseUrl: '', limitModel: 'seat' });
  const [saving, setSaving] = useState(false);

  // Orgs state
  const [orgs, setOrgs] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  // Users state
  const [appUsers, setAppUsers] = useState<UserWithRole[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    fetchApp();
    fetchOrgs();
  }, []);

  useEffect(() => {
    const orgId = selectedOrgId || authUser?.orgId;
    if (orgId) {
      fetchAppUsers(orgId);
    }
  }, [selectedOrgId, authUser?.orgId]);

  const fetchOrgs = async () => {
    try {
      const res = await listOrganizations();
      setOrgs(extractArray<{ id: string; name: string; slug: string }>(res));
    } catch {
      setOrgs([]);
    }
  };

  const fetchAppUsers = async (orgId: string) => {
    if (!orgId) return;
    setUsersLoading(true);
    try {
      const res = await listOrgUsers(orgId);
      const users = extractArray<User>(res);
      // For each user, fetch their roles for the books app
      const usersWithRoles: UserWithRole[] = users.map(u => ({
        ...u,
        roles: [],
        rolesLoading: true,
      }));
      setAppUsers(usersWithRoles);

      // Fetch roles in parallel
      const updated = await Promise.all(
        users.map(async (u) => {
          try {
            const rolesRes = await getUserRolesForApp(u.id, 'books');
            const roles = extractArray<{ id: string; slug: string; name: string }>(rolesRes);
            return { ...u, roles, rolesLoading: false };
          } catch {
            return { ...u, roles: [], rolesLoading: false };
          }
        })
      );
      // Only keep users that have roles in the books app
      setAppUsers(updated.filter(u => u.roles.length > 0));
    } catch {
      setAppUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchApp = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getApp('books');
      const data = extractData<App>(response);
      setApp(data);
    } catch {
      setError('Failed to load app details');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!app) return;
    setFormData({
      name: app.name,
      description: app.description,
      baseUrl: app.baseUrl || '',
      limitModel: app.limitModel,
    });
    setEditModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateApp('books', formData);
      setEditModalOpen(false);
      await fetchApp();
    } catch {
      setError('Failed to update app');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="h-6 w-64 bg-gray-200 rounded" />
            <div className="h-4 w-96 bg-gray-200 rounded" />
            <div className="h-4 w-72 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !app) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <AppWindow className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{app?.name}</h1>
            <p className="text-sm text-gray-500">Application details and configuration</p>
          </div>
        </div>
        <button
          onClick={openEditModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Pencil className="h-4 w-4" />
          Edit App
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* App Users */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Users with access to Books</h2>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Current Org</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">{appUsers.length} user{appUsers.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {usersLoading ? (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading users and roles...
          </div>
        ) : appUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No users found with roles in this app.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Roles</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{u.firstName} {u.lastName}</td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                          <Shield className="w-3 h-3" />
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {u.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit App</h2>
              <button onClick={() => setEditModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
                <input
                  type="url"
                  value={formData.baseUrl}
                  onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Limit Model</label>
                <select
                  value={formData.limitModel}
                  onChange={(e) => setFormData({ ...formData, limitModel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="seat">Seat</option>
                  <option value="usage">Usage</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
