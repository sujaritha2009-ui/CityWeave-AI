import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Building2,
  ChevronDown,
  GitCompareArrows,
  LayoutDashboard,
  Map,
  Menu,
  RefreshCw,
  Settings,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import { BrandLogo } from "../components/common/BrandLogo";
import { Button, Spinner } from "../components/common/ui";
import { cx } from "../lib/cx";
import { useStore } from "../data/useStore";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/map", label: "Traffic Map", icon: Map },
  { to: "/app/institutions", label: "Institutions", icon: Building2 },
  { to: "/app/recommendations", label: "Recommendations", icon: Sparkles, badgeKey: "drafts" as const },
  { to: "/app/compare", label: "Compare Schedules", icon: GitCompareArrows },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/settings", label: "Settings", icon: Settings },
];

export function AppLayout() {
  const { recommendations, junctions, status, error, reload } = useStore();
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const drafts = recommendations.filter((r) => r.status === "draft").length;
  const hasData = junctions.length > 0;

  const retry = async () => {
    setRetrying(true);
    await reload();
    setRetrying(false);
  };

  const sidebar = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map(({ to, label, icon: Icon, end, badgeKey }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-primary-soft text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-brand",
            )
          }
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1">{label}</span>
          {badgeKey && drafts > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">{drafts}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <BrandLogo to="/" />
          <span
            className={cx(
              "hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline",
              status === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700",
            )}
          >
            {status === "error" ? "API offline" : "Sample data · API"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">AD</span>
          <span className="hidden sm:inline">Admin</span>
          <ChevronDown className="h-4 w-4 text-muted" />
        </div>
      </header>

      <div className="flex">
        <aside className="no-print sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 border-r border-line bg-white lg:block">
          {sidebar}
        </aside>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-brand/30" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
              <div className="flex h-16 items-center justify-between border-b border-line px-4">
                <BrandLogo to="/" />
                <button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {sidebar}
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {status === "error" && (
            <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <WifiOff className="h-5 w-5 shrink-0" />
              <span className="flex-1">{error}</span>
              <Button variant="danger" onClick={retry} disabled={retrying}>
                {retrying ? <Spinner /> : <RefreshCw className="h-4 w-4" />} Retry
              </Button>
            </div>
          )}
          {status === "loading" ? (
            <div className="flex items-center justify-center gap-3 py-24 text-muted">
              <Spinner /> Loading data from the API…
            </div>
          ) : (
            (status === "ready" || hasData) && <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
