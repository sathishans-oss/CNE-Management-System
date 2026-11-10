import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Award,
  Calendar,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Shield,
  FileText,
  BookOpen,
  Images,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  FileSpreadsheet,
  ClipboardCheck
} from 'lucide-react';
import { SessionUser, ViewMode } from '../types';
import { prefetchRoute } from '../services/routePrefetch';

interface TopToolbarProps {
  user: SessionUser | null;
  activeView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  upcomingCount?: number;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({
  user,
  activeView,
  onSelectView,
  upcomingCount = 0
}) => {
  const isAdmin = user?.role === 'ADMIN';

  const staffTabs = [
    { id: 'dashboard' as ViewMode, label: 'Menu', icon: LayoutDashboard },
    { id: 'calendar' as ViewMode, label: 'CNE Calendar', icon: Calendar },
    {
      id: 'cne-schedule' as ViewMode,
      label: 'CNE Schedule',
      icon: Sparkles,
      badge: upcomingCount > 0 ? upcomingCount : undefined
    },
    { id: 'my-cne-records' as ViewMode, label: 'My CNE Records', icon: Award },
    { id: 'learning-resources' as ViewMode, label: 'Learning Resources', icon: BookOpen },
    { id: 'quiz' as ViewMode, label: 'Quiz', icon: ClipboardCheck },
    { id: 'gallery' as ViewMode, label: 'Class Photos', icon: Images },
    ...(isAdmin
      ? [{ id: 'admin-reports' as ViewMode, label: 'Report and Stats', icon: BarChart3 }]
      : [])
  ];

  // Control Center state & logic for Admins
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [navOverflow, setNavOverflow] = useState({ left: false, right: false });
  const updateNavOverflow = () => {
    const el = navScrollRef.current;
    if (!el) return;
    setNavOverflow({ left: el.scrollLeft > 5, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 5 });
  };
  useEffect(() => {
    const scrollArea = navScrollRef.current;
    if (!scrollArea) return;
    const recalc = () => updateNavOverflow();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recalc) : null;
    observer?.observe(scrollArea);
    if (scrollArea.firstElementChild) observer?.observe(scrollArea.firstElementChild);
    window.addEventListener('resize', recalc);
    scrollArea.addEventListener('scroll', recalc, { passive: true });
    const frame = window.requestAnimationFrame(recalc);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', recalc);
      scrollArea.removeEventListener('scroll', recalc);
    };
  }, [isAdmin]);
  useEffect(() => {
    const scrollArea = navScrollRef.current;
    const activeId = ['admin-content', 'admin-roles', 'admin-ward-level-cne-outcome', 'admin-areas', 'admin-teaching-modes'].includes(activeView)
      ? 'top-tab-control-center' : `top-tab-${activeView}`;
    const target = document.getElementById(activeId);
    if (scrollArea && target) {
      const left = target.getBoundingClientRect().left - scrollArea.getBoundingClientRect().left;
      const right = left + target.getBoundingClientRect().width;
      if (left < 8) scrollArea.scrollBy({ left: left - 16, behavior: 'smooth' });
      else if (right > scrollArea.clientWidth - 8) scrollArea.scrollBy({ left: right - scrollArea.clientWidth + 16, behavior: 'smooth' });
    }
  }, [activeView, isAdmin]);
  const controlCenterRef = useRef<HTMLDivElement>(null);
  const controlCenterBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const isControlCenterActive = (['admin-content', 'admin-roles', 'admin-ward-level-cne-outcome'] as ViewMode[]).includes(activeView);

  const controlCenterItems = [
    { id: 'admin-content' as ViewMode, label: 'Admin Content', icon: FileText, desc: 'Circulars, Desk, Quick Links, Photos, Wards, Modes' },
    { id: 'admin-roles' as ViewMode, label: 'Role', icon: ShieldCheck, desc: 'Staff roles & permissions' },
    { id: 'admin-ward-level-cne-outcome' as ViewMode, label: 'Ward-Level CNE Outcome', icon: FileSpreadsheet, desc: 'Staff coverage & outcome metrics' }
  ];

  const updateDropdownPos = () => {
    if (controlCenterBtnRef.current) {
      const rect = controlCenterBtnRef.current.getBoundingClientRect();
      const dropdownWidth = 210;
      const left = Math.max(8, Math.min(rect.right - dropdownWidth, window.innerWidth - dropdownWidth - 8));
      setDropdownPos({ top: rect.bottom + 6, left });
    }
  };

  const toggleControlCenter = () => {
    if (!isControlCenterOpen) {
      updateDropdownPos();
    }
    setIsControlCenterOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isControlCenterOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        controlCenterRef.current &&
        !controlCenterRef.current.contains(e.target as Node)
      ) {
        setIsControlCenterOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsControlCenterOpen(false);
        controlCenterBtnRef.current?.focus();
      }
    };

    const handleScrollOrResize = () => {
      updateDropdownPos();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isControlCenterOpen]);

  useEffect(() => {
    if (!isControlCenterOpen) return;
    const frame = window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#control-center-dropdown-menu [role="menuitem"]')?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isControlCenterOpen]);

  return (
    <div id="cne-top-toolbar" className="bg-slate-900 border-b border-slate-800 shadow-md sticky top-16 z-20">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div ref={navScrollRef} className="flex items-center justify-between overflow-x-auto no-scrollbar py-1.5 gap-2 sm:gap-4" role="region" aria-label="CNE page navigation" tabIndex={0}>
          {/* Staff Primary Section */}
          <nav className="flex items-center gap-1 sm:gap-1.5 shrink-0" aria-label="Staff Navigation">
            {staffTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`top-tab-${tab.id}`}
                  type="button"
                  onMouseEnter={() => prefetchRoute(tab.id, isAdmin)}
                  onFocus={() => prefetchRoute(tab.id, isAdmin)}
                  onClick={() => {
                    setIsControlCenterOpen(false);
                    onSelectView(tab.id);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-10 items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-teal-800 text-teal-100'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Admin Tools Section */}
          {isAdmin && (
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 pl-2 sm:pl-3 border-l border-slate-700/60">
              <div className="hidden lg:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 mr-1 px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800/40">
                <Shield className="w-3 h-3" />
                <span>Admin</span>
              </div>

              <nav className="flex items-center gap-1 sm:gap-1.5" aria-label="Admin Navigation">
                {/* Control Center Dropdown */}
                <div ref={controlCenterRef} className="relative inline-block text-left">
                  <button
                    ref={controlCenterBtnRef}
                    id="top-tab-control-center"
                    type="button"
                    onClick={toggleControlCenter}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        if (!isControlCenterOpen) { updateDropdownPos(); setIsControlCenterOpen(true); }
                        window.requestAnimationFrame(() => document.querySelector<HTMLElement>('#control-center-dropdown-menu [role="menuitem"]')?.focus());
                      }
                    }}
                    aria-expanded={isControlCenterOpen}
                    aria-haspopup="menu"
                    aria-controls="control-center-dropdown-menu"
                    aria-current={isControlCenterActive ? 'page' : undefined}
                    className={`flex min-h-10 items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isControlCenterActive
                        ? 'bg-purple-700 text-white shadow-sm ring-1 ring-purple-400'
                        : 'text-slate-300 hover:bg-purple-950/50 hover:text-purple-200'
                    }`}
                  >
                    <SlidersHorizontal className={`w-3.5 h-3.5 ${isControlCenterActive ? 'text-purple-200' : 'text-purple-400'}`} />
                    <span>Control Center</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-150 ${
                        isControlCenterOpen ? 'rotate-180' : ''
                      } ${isControlCenterActive ? 'text-purple-200' : 'text-slate-400'}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isControlCenterOpen && dropdownPos && (
                    <div
                      id="control-center-dropdown-menu"
                      style={{
                        position: 'fixed',
                        top: `${dropdownPos.top}px`,
                        left: `${dropdownPos.left}px`,
                        width: '210px',
                        zIndex: 60
                      }}
                      className="bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                      role="menu"
                      aria-orientation="vertical"
                      onKeyDown={(event) => {
                        const buttons = Array.from((event.currentTarget as HTMLDivElement).querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
                        const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
                        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                          event.preventDefault();
                          const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
                            : (current + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
                          buttons[next]?.focus();
                        }
                      }}
                    >
                      <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Control Center
                      </div>
                      {controlCenterItems.map((item) => {
                        const ItemIcon = item.icon;
                        const isItemActive = activeView === item.id;
                        return (
                          <button
                            key={item.id}
                            id={`control-center-item-${item.id}`}
                            type="button"
                            onMouseEnter={() => prefetchRoute(item.id, true)}
                            onFocus={() => prefetchRoute(item.id, true)}
                            onClick={() => {
                              setIsControlCenterOpen(false);
                              onSelectView(item.id);
                            }}
                            className={`w-full flex min-h-10 items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                              isItemActive
                                ? 'bg-purple-50 text-purple-900 font-bold border-l-2 border-purple-600'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                            role="menuitem"
                          >
                            <ItemIcon
                              className={`w-4 h-4 shrink-0 ${
                                isItemActive ? 'text-purple-600' : 'text-slate-400'
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="leading-tight">{item.label}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
        {navOverflow.left && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent pl-0.5 pr-4 lg:hidden" aria-hidden="true"><ChevronLeft className="h-4 w-4 text-teal-300" /></div>}
        {navOverflow.right && <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent pl-4 pr-0.5 lg:hidden" aria-hidden="true"><ChevronRight className="h-4 w-4 text-teal-300" /></div>}
      </div>
    </div>
  );
};
