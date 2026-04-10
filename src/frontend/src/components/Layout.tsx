import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Building2,
  ChevronDown,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plane,
  Receipt,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../store/auth";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Bookings", path: "/bookings", icon: BookOpen },
  { label: "Invoices", path: "/invoices", icon: FileText },
  { label: "Vouchers", path: "/vouchers", icon: Receipt },
  { label: "Ledger", path: "/ledger", icon: BookMarked },
  { label: "Clients", path: "/clients", icon: Users },
  { label: "Suppliers", path: "/suppliers", icon: Building2 },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Settings", path: "/settings", icon: Settings },
];

const ROLE_COLORS: Record<string, string> = {
  admin: "text-accent",
  accountant: "text-blue-400",
  agent: "text-green-400",
};

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function Layout({ children, title }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { clear } = useInternetIdentity();
  const { role, principal, logout } = useAuthStore();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const handleLogout = () => {
    clear();
    logout();
  };

  const shortPrincipal = principal
    ? `${principal.slice(0, 5)}...${principal.slice(-3)}`
    : "Anonymous";

  const pageTitle =
    title ??
    NAV_ITEMS.find((n) => currentPath.startsWith(n.path))?.label ??
    "Dashboard";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed left-0 top-0 z-30 h-full w-60 flex-shrink-0
          flex flex-col border-r border-border/50
          transition-smooth lg:relative lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ background: "oklch(0.095 0 0)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border/30">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: "oklch(0.75 0.15 82 / 0.15)",
              border: "1px solid oklch(0.75 0.15 82 / 0.4)",
            }}
          >
            <Plane className="w-4 h-4 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-foreground truncate">
              TravelERP
            </p>
            <p className="text-xs text-muted-foreground">Accounting Suite</p>
          </div>
          <button
            type="button"
            className="ml-auto lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="text-xs text-muted-foreground uppercase tracking-widest px-3 mb-2 font-mono">
            Main Menu
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
              const isActive =
                currentPath === path || currentPath.startsWith(`${path}/`);
              return (
                <li key={path}>
                  <Link
                    to={path}
                    className={`sidebar-item ${isActive ? "active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                    data-ocid={`nav-${label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info at bottom */}
        <div className="px-3 py-4 border-t border-border/30">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0"
              style={{ background: "oklch(0.75 0.15 82)" }}
            >
              {shortPrincipal.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">
                {shortPrincipal}
              </p>
              {role && (
                <p
                  className={`text-xs capitalize ${ROLE_COLORS[role] ?? "text-muted-foreground"}`}
                >
                  {role}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground transition-smooth"
              aria-label="Log out"
              data-ocid="sidebar-logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center gap-4 px-4 lg:px-6 border-b border-border/50 flex-shrink-0"
          style={{ height: 64, background: "oklch(0.11 0 0)" }}
        >
          <button
            type="button"
            className="lg:hidden text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="font-display font-semibold text-lg text-foreground">
            {pageTitle}
          </h1>

          <div className="flex-1 max-w-sm ml-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9 text-sm glass border-border/30 bg-transparent focus-visible:ring-accent/50"
                data-ocid="topbar-search"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Notifications */}
            <button
              type="button"
              className="relative w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-smooth"
              aria-label="Notifications"
              data-ocid="topbar-notifications"
            >
              <Bell className="w-4 h-4" />
              <span
                className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
                style={{ background: "oklch(0.75 0.15 82)" }}
              />
            </button>

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-9 px-3 text-sm hover:bg-muted/30"
                  data-ocid="topbar-profile"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
                    style={{ background: "oklch(0.75 0.15 82)" }}
                  >
                    {shortPrincipal.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-foreground truncate max-w-20">
                    {shortPrincipal}
                  </span>
                  {role && (
                    <Badge
                      variant="outline"
                      className={`hidden sm:inline-flex text-xs border-current ${ROLE_COLORS[role] ?? ""}`}
                    >
                      {role}
                    </Badge>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-popover border-border/50"
              >
                <DropdownMenuItem
                  className="text-sm text-muted-foreground"
                  disabled
                >
                  {shortPrincipal}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-sm cursor-pointer"
                  data-ocid="profile-logout"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
