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
import BookingsPage from "./pages/BookingsPage";
import ClientsPage from "./pages/ClientsPage";
import DashboardPage from "./pages/DashboardPage";
import InvoicesPage from "./pages/InvoicesPage";
import LedgerPage from "./pages/LedgerPage";
import LoginPage from "./pages/LoginPage";
import PlaceholderPage from "./pages/PlaceholderPage";
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
  const { isAuthenticated, isLoading } = useAuthStore();
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

const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  dashboardRoute,
  bookingsRoute,
  invoicesRoute,
  vouchersRoute,
  ledgerRoute,
  clientsRoute,
  suppliersRoute,
  reportsRoute,
  settingsRoute,
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
