import { Toaster } from "@/components/ui/sonner";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminPage from "./pages/AdminPage";
import AgentsPage from "./pages/AgentsPage";
import BookingsPage from "./pages/BookingsPage";
import ClientsPage from "./pages/ClientsPage";
import DashboardPage from "./pages/DashboardPage";
import HotelVouchersPage from "./pages/HotelVouchersPage";
import InvoicesPage from "./pages/InvoicesPage";
import LedgerPage from "./pages/LedgerPage";
import LoginPage from "./pages/LoginPage";
import NotificationsPage from "./pages/NotificationsPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/ProfilePage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import SuppliersPage from "./pages/SuppliersPage";
import VouchersPage from "./pages/VouchersPage";
import { useAuthStore } from "./store/auth";

// ─── Auth guard ───────────────────────────────────────────────────────────────

function AuthSync() {
  const { identity, isInitializing } = useInternetIdentity();
  const { setAuthenticated, setLoading, logout, isAuthenticated } =
    useAuthStore();

  useEffect(() => {
    if (isInitializing) {
      setLoading(true);
      return;
    }
    if (identity) {
      setAuthenticated(identity.getPrincipal().toText());
    } else {
      setLoading(false);
      if (isAuthenticated) logout();
    }
  }, [
    identity,
    isInitializing,
    setAuthenticated,
    setLoading,
    logout,
    isAuthenticated,
  ]);

  return <Outlet />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isOnboarded } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isOnboarded) return <Navigate to="/onboarding" />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSuperAdmin, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.06 0 0)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{
              borderColor: "oklch(0.55 0.22 22 / 0.3)",
              borderTopColor: "oklch(0.55 0.22 22)",
            }}
          />
          <p className="text-sm text-muted-foreground">
            Verifying admin access...
          </p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated || !isSuperAdmin) return <Navigate to="/admin/login" />;
  return <>{children}</>;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

const rootRoute = createRootRoute({ component: AuthSync });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <Navigate to="/dashboard" />,
});

const onboardingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/onboarding",
  component: OnboardingPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

const bookingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bookings",
  component: () => (
    <RequireAuth>
      <BookingsPage />
    </RequireAuth>
  ),
});

const invoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invoices",
  component: () => (
    <RequireAuth>
      <InvoicesPage />
    </RequireAuth>
  ),
});

const vouchersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vouchers",
  component: () => (
    <RequireAuth>
      <VouchersPage />
    </RequireAuth>
  ),
});

const hotelVouchersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/hotel-vouchers",
  component: () => (
    <RequireAuth>
      <HotelVouchersPage />
    </RequireAuth>
  ),
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications",
  component: () => (
    <RequireAuth>
      <NotificationsPage />
    </RequireAuth>
  ),
});

const ledgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ledger",
  component: () => (
    <RequireAuth>
      <LedgerPage />
    </RequireAuth>
  ),
});

const clientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clients",
  component: () => (
    <RequireAuth>
      <ClientsPage />
    </RequireAuth>
  ),
});

const suppliersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/suppliers",
  component: () => (
    <RequireAuth>
      <SuppliersPage />
    </RequireAuth>
  ),
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: () => (
    <RequireAuth>
      <ReportsPage />
    </RequireAuth>
  ),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  ),
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

const agentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/agents",
  component: () => (
    <RequireAuth>
      <AgentsPage />
    </RequireAuth>
  ),
});

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/login",
  component: AdminLoginPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: () => (
    <RequireSuperAdmin>
      <AdminPage />
    </RequireSuperAdmin>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  onboardingRoute,
  adminLoginRoute,
  adminRoute,
  dashboardRoute,
  bookingsRoute,
  invoicesRoute,
  vouchersRoute,
  hotelVouchersRoute,
  notificationsRoute,
  ledgerRoute,
  clientsRoute,
  suppliersRoute,
  reportsRoute,
  settingsRoute,
  profileRoute,
  agentsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  );
}
