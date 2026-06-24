import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  CreditCard,
  Package,
  BarChart3,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getOrganization } from '../api/organizations';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/organizations', label: 'Organization', icon: Building2 },
  { path: '/users', label: 'Users', icon: Users },
  { path: '/roles', label: 'Roles & Permissions', icon: Shield },
  { path: '/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { path: '/plans', label: 'Plans', icon: Package },
  { path: '/usage', label: 'Usage', icon: BarChart3 },
];

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

function formatLoginAt(iso: string) {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString('en', { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  return `${day} ${month} ${year}, ${time}`;
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgName, setOrgName] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);

  // Fetch org name
  useEffect(() => {
    if (!user?.orgId) return;
    getOrganization(user.orgId)
      .then((res: any) => {
        const org = res?.data || res;
        setOrgName(org?.name || '');
      })
      .catch(() => {});
  }, [user?.orgId]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
  };

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch { /* ignore */ }
      return next;
    });
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const sidebarW = collapsed ? 'lg:w-20' : 'lg:w-64';
  const mainML = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();
  const loginAt = localStorage.getItem('loginAt');

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Full-width top header ── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-brand-header flex items-center justify-between px-4 sm:px-6 z-40 shadow-sm">

        {/* Left: mobile hamburger + app title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-all duration-200 ease-out lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-white tracking-tight truncate">
            User Management
          </h1>
        </div>

        {/* Right: org info (static) + user avatar (clickable) */}
        <div className="flex items-center gap-3">

          {/* Org name + last login — static, no click */}
          <div className="hidden sm:block text-left min-w-0 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5">
            <p className="text-sm font-semibold text-white leading-tight truncate max-w-[200px]">
              {orgName}
            </p>
            {loginAt && (
              <p className="text-[11px] text-white/60 leading-tight mt-0.5">
                Last Login: {formatLoginAt(loginAt)}
              </p>
            )}
          </div>

          {/* User initials avatar — click to open dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-emerald-400 hover:bg-emerald-300 text-white flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors duration-200 ring-2 ring-white/30"
              aria-label="Profile"
            >
              {initials}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-soft border border-slate-200 py-2 z-50 animate-dropdown">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors duration-200"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar — starts below header ── */}
      <aside
        className={`fixed top-16 left-0 bottom-0 z-30 bg-brand-rail text-white flex flex-col shadow-xl
          transition-all duration-300 ease-out
          w-64 ${sidebarW}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-end px-3 pt-3 lg:hidden">
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors duration-200"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 px-3 py-4 space-y-1 overflow-y-auto ${collapsed ? 'lg:overflow-visible' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-label={item.label}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out ${collapsed ? 'lg:justify-center lg:px-2' : ''} ${
                  isActive
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} className={`shrink-0 transition-transform duration-200 ease-out ${isActive ? '' : 'group-hover:scale-110'}`} />
                <span className={`whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>
                  {item.label}
                </span>

                {collapsed && (
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 translate-x-1 z-50 hidden lg:flex items-center whitespace-nowrap rounded-md bg-accent-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg opacity-0 transition-all duration-200 ease-out group-hover:translate-x-0 group-hover:opacity-100"
                  >
                    {item.label}
                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-accent-600" />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block border-t border-white/10 p-3">
          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200 ease-out"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              Collapse
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className={`flex flex-col min-h-screen pt-16 transition-all duration-300 ease-out ${mainML}`}>
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
