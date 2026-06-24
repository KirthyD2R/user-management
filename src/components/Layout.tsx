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
  ChevronDown,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Desktop: collapsed (icons-only) vs expanded
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Mobile: drawer open/closed
  const [mobileOpen, setMobileOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const sidebarWidth = collapsed ? 'lg:w-20' : 'lg:w-64';
  const mainMargin = collapsed ? 'lg:ml-20' : 'lg:ml-64';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-brand-rail text-white flex flex-col shadow-xl
          transition-all duration-300 ease-out
          w-64 ${sidebarWidth}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-white/10 ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Shield size={18} className="text-white" />
          </div>
          <span className={`text-lg font-medium tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${collapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'}`}>
            User Management
          </span>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto p-1.5 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors duration-200 lg:hidden"
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

                {/* Themed hover tooltip — only when sidebar is collapsed (desktop) */}
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

      {/* Main Content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-out ${mainMargin}`}>
        {/* Top Header */}
        <header className="h-16 bg-brand-header flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-all duration-200 ease-out lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg sm:text-xl font-medium text-white tracking-tight truncate">Dream Books</h1>
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/15 transition-all duration-200 ease-out"
            >
              <span className="hidden sm:block text-sm text-white/90 font-normal truncate max-w-[160px]">
                {user?.firstName} {user?.lastName}
              </span>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white/40"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-medium shadow-sm ring-1 ring-white/30">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </div>
              )}
              <ChevronDown size={16} className={`hidden sm:block text-white/70 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-soft border border-slate-200 py-2 z-50 animate-dropdown">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
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
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
