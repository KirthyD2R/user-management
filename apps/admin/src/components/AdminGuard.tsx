import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Loader2, ShieldOff } from 'lucide-react';
import { useAuth } from '@shared/contexts/AuthContext';
import { getUserRolesForApp } from '@shared/api/roles';
import { extractArray } from '@shared/api/helpers';

export default function AdminGuard() {
  const { user, logout } = useAuth();
  const [status, setStatus] = useState<'checking' | 'authorized' | 'denied'>('checking');

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const res: any = await getUserRolesForApp(user.id, 'books');
        const roles: any[] = res?.data?.roles ?? extractArray<any>(res);
        const isAdmin = roles.some((r) => (r.slug || r.roleSlug) === 'books_super_admin');
        setStatus(isAdmin ? 'authorized' : 'denied');
      } catch {
        setStatus('denied');
      }
    })();
  }, [user?.id]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
        <span className="ml-2 text-slate-500">Verifying access...</span>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <ShieldOff className="w-12 h-12 text-red-400" />
        <h1 className="text-xl font-semibold text-slate-700">Access Denied</h1>
        <p className="text-slate-500 text-sm">You do not have permission to access the Admin Console.</p>
        <button
          onClick={logout}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-200 ease-out"
        >
          Log Out
        </button>
      </div>
    );
  }

  return <Outlet />;
}
