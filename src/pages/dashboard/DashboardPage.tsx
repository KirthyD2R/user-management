import { useState, useEffect } from 'react';
import { Users, Building2, CreditCard, BarChart3, TrendingUp, Shield, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { extractArray } from '../../api/helpers';
import { listOrganizations } from '../../api/organizations';
import { getOrgSubscriptions } from '../../api/subscriptions';
import { listOrgUsers } from '../../api/users';
import { listRoles, getUserRolesForApp } from '../../api/roles';
import { listPlans } from '../../api/plans';
import { getOrgUsage } from '../../api/usage';

interface StatCard {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  path: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    orgs: 0,
    users: 0,
    roles: 0,
    subscriptions: 0,
    plans: 0,
    usage: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const orgId = user?.orgId;
      const now = new Date();
      const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const results = await Promise.allSettled([
        listOrganizations(),
        orgId ? listOrgUsers(orgId) : Promise.resolve(null),
        listRoles('books'),
        orgId ? getOrgSubscriptions(orgId) : Promise.resolve(null),
        listPlans('books'),
        orgId ? getOrgUsage(orgId, 'books', period) : Promise.resolve(null),
      ]);

      const getCount = (result: PromiseSettledResult<any>) => {
        if (result.status === 'fulfilled' && result.value) {
          const val = result.value;
          if (val?.pagination?.total) return val.pagination.total;
          if (val?.data?.pagination?.total) return val.data.pagination.total;
          const arr = extractArray(val);
          if (arr.length > 0) return arr.length;
          if (typeof val?.total === 'number') return val.total;
          if (typeof val?.count === 'number') return val.count;
        }
        return 0;
      };

      // Count users with books roles
      let booksUserCount = 0;
      if (results[1].status === 'fulfilled' && results[1].value) {
        const allUsers = extractArray<any>(results[1].value);
        const roleChecks = await Promise.all(
          allUsers.map(async (u: any) => {
            try {
              const rolesRes = await getUserRolesForApp(u.id, 'books');
              return extractArray(rolesRes).length > 0;
            } catch {
              return false;
            }
          })
        );
        booksUserCount = roleChecks.filter(Boolean).length;
      }

      // Count subscriptions for books only
      let booksSubsCount = 0;
      if (results[3].status === 'fulfilled' && results[3].value) {
        const allSubs = extractArray<any>(results[3].value);
        booksSubsCount = allSubs.filter((s: any) =>
          s.appSlug === 'books' || s.app?.slug === 'books'
        ).length;
      }

      setStats({
        orgs: getCount(results[0]),
        users: booksUserCount,
        roles: getCount(results[2]),
        subscriptions: booksSubsCount,
        plans: getCount(results[4]),
        usage: getCount(results[5]),
      });
      setLoading(false);
    };

    fetchData();
  }, [user?.orgId]);

  const cards: StatCard[] = [
    {
      label: 'Organizations',
      count: stats.orgs,
      icon: <Building2 className="w-6 h-6" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      path: '/organizations',
    },
    {
      label: 'Total Users',
      count: stats.users,
      icon: <Users className="w-6 h-6" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      path: '/users',
    },
    {
      label: 'Roles',
      count: stats.roles,
      icon: <Shield className="w-6 h-6" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      path: '/roles',
    },
    {
      label: 'Subscriptions',
      count: stats.subscriptions,
      icon: <CreditCard className="w-6 h-6" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      path: '/subscriptions',
    },
    {
      label: 'Plans',
      count: stats.plans,
      icon: <Package className="w-6 h-6" />,
      color: 'text-teal-600',
      bgColor: 'bg-teal-100',
      path: '/plans',
    },
    {
      label: 'Usage Records',
      count: stats.usage,
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'text-rose-600',
      bgColor: 'bg-rose-100',
      path: '/usage',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {/* Welcome back, {user?.firstName || 'User'}! */}
          Welcome back
        </h1>
        <p className="text-gray-500 mt-1">Here's an overview of your platform.</p>
      </div>

      {/* Stats Cards - 4 columns on large, 2 on medium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <Link
            to={card.path}
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {loading ? (
              <div className="animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="w-16 h-4 bg-gray-200 rounded" />
                </div>
                <div className="w-20 h-8 bg-gray-200 rounded" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                    {card.icon}
                  </div>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{card.count}</p>
                <p className="text-sm text-gray-500 mt-1">{card.label}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/users" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Users className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-500">Invite and manage members</p>
            </div>
          </Link>
          <Link to="/organizations" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium text-gray-900">Organizations</p>
              <p className="text-sm text-gray-500">View and manage orgs</p>
            </div>
          </Link>
          <Link to="/roles" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <Shield className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="font-medium text-gray-900">Roles & Permissions</p>
              <p className="text-sm text-gray-500">Manage access control</p>
            </div>
          </Link>
          <Link to="/subscriptions" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <CreditCard className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-gray-900">Subscriptions</p>
              <p className="text-sm text-gray-500">Manage plans and billing</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
