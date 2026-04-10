import { useState, useEffect } from 'react';
import { Users, Building2, CreditCard, BarChart3, Shield, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { extractArray } from '../../api/helpers';
import { listOrganizations } from '../../api/organizations';
import { getOrgSubscriptions, checkAccess } from '../../api/subscriptions';
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

      // Count only orgs with books app access
      let booksOrgCount = 0;
      if (results[0].status === 'fulfilled' && results[0].value) {
        const allOrgs = extractArray<any>(results[0].value);
        const accessChecks = await Promise.all(
          allOrgs.map(async (org: any) => {
            try {
              const accessRes = await checkAccess(org.id, 'books');
              const data = accessRes?.data;
              return data?.hasAccess === true;
            } catch {
              return false;
            }
          })
        );
        booksOrgCount = accessChecks.filter(Boolean).length;
      }

      setStats({
        orgs: booksOrgCount,
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
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      path: '/organizations',
    },
    {
      label: 'Total Users',
      count: stats.users,
      icon: <Users className="w-6 h-6" />,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      path: '/users',
    },
    {
      label: 'Roles',
      count: stats.roles,
      icon: <Shield className="w-6 h-6" />,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      path: '/roles',
    },
    {
      label: 'Subscriptions',
      count: stats.subscriptions,
      icon: <CreditCard className="w-6 h-6" />,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      path: '/subscriptions',
    },
    {
      label: 'Plans',
      count: stats.plans,
      icon: <Package className="w-6 h-6" />,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      path: '/plans',
    },
    {
      label: 'Usage Records',
      count: stats.usage,
      icon: <BarChart3 className="w-6 h-6" />,
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
      path: '/usage',
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-slate-500 mt-1">Here's an overview of your platform.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5 mb-8">
        {cards.map((card) => (
          <Link
            to={card.path}
            key={card.label}
            className="group bg-white rounded-xl border border-slate-200 shadow-card p-5 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-soft hover:border-primary-200"
          >
            {loading ? (
              <div className="flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-12 h-6 bg-slate-200 rounded" />
                  <div className="w-20 h-3 bg-slate-200 rounded" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${card.bgColor} ${card.color} shrink-0 transition-transform duration-300 ease-out group-hover:scale-110`}>
                  {card.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none">{card.count}</p>
                  <p className="text-sm text-slate-500 mt-1.5 truncate">{card.label}</p>
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary-500" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to: '/users', icon: Users, title: 'Manage Users', desc: 'Invite and manage members' },
            { to: '/organizations', icon: Building2, title: 'Organizations', desc: 'View and manage orgs' },
            { to: '/roles', icon: Shield, title: 'Roles & Permissions', desc: 'Manage access control' },
            { to: '/subscriptions', icon: CreditCard, title: 'Subscriptions', desc: 'Manage plans and billing' },
          ].map(({ to, icon: Icon, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="group flex items-center gap-3 p-4 rounded-lg border border-slate-200 transition-all duration-200 ease-out hover:bg-primary-50 hover:border-primary-200"
            >
              <div className="p-2 rounded-lg bg-primary-50 text-primary-600 transition-transform duration-200 ease-out group-hover:scale-110">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-slate-900">{title}</p>
                <p className="text-sm text-slate-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
