import { Button } from "@/components/ui/button";
import { useActor, useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ChevronRight, Plane, Shield } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { createActor } from "../backend";
import { useAuthStore } from "../store/auth";

// Crimson admin accent color
const CRIMSON = "oklch(0.55 0.22 22)";
const CRIMSON_DIM = "oklch(0.55 0.22 22 / 0.12)";
const CRIMSON_BORDER = "oklch(0.55 0.22 22 / 0.4)";
const CRIMSON_GLOW = "oklch(0.55 0.22 22 / 0.25)";

export default function AdminLoginPage() {
  const { login, clear, identity, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { actor } = useActor(createActor);
  const { setSuperAdmin, setAuthenticated, isAuthenticated, isSuperAdmin } =
    useAuthStore();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapMode, setBootstrapMode] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapSuccess, setBootstrapSuccess] = useState(false);

  // After II login, check if caller is super-admin
  useEffect(() => {
    if (!identity || !actor || checking) return;

    async function checkAdmin() {
      setChecking(true);
      setError(null);
      try {
        const principal = identity!.getPrincipal().toText();
        setAuthenticated(principal);
        const ok = await actor!.isSuperAdmin();
        if (ok) {
          setSuperAdmin(true);
          navigate({ to: "/admin" });
        } else {
          setSuperAdmin(false);
          setError(
            "This account is not authorized as Super Admin. Use the agency login instead.",
          );
        }
      } catch {
        setError("Failed to verify super-admin status. Please try again.");
      } finally {
        setChecking(false);
      }
    }

    checkAdmin();
  }, [identity, actor, checking, setAuthenticated, navigate, setSuperAdmin]);

  // Redirect if already authenticated super-admin
  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) {
      navigate({ to: "/admin" });
    }
  }, [isAuthenticated, isSuperAdmin, navigate]);

  async function handleBootstrap() {
    if (!actor) return;
    setBootstrapping(true);
    try {
      const result = await actor.setSuperAdminPrincipal();
      if (result.__kind__ === "err") {
        setError(result.err);
      } else {
        setBootstrapSuccess(true);
        setSuperAdmin(true);
        setTimeout(() => navigate({ to: "/admin" }), 1200);
      }
    } catch {
      setError("Bootstrap failed. This principal may already be registered.");
    } finally {
      setBootstrapping(false);
    }
  }

  function handleRetry() {
    setError(null);
    clear();
  }

  const isLoading = isLoggingIn || isInitializing || checking || bootstrapping;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "oklch(0.06 0 0)" }}
    >
      {/* Crimson radial background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 35% at 50% 0%, ${CRIMSON_DIM} 0%, transparent 70%)`,
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo + brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: CRIMSON_DIM,
              border: `1px solid ${CRIMSON_BORDER}`,
              boxShadow: `0 0 40px ${CRIMSON_DIM}`,
            }}
          >
            <Plane className="w-7 h-7" style={{ color: CRIMSON }} />
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="font-display text-3xl font-semibold text-foreground">
              TravelERP
            </h1>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full tracking-widest uppercase"
              style={{
                color: CRIMSON,
                background: CRIMSON_DIM,
                border: `1px solid ${CRIMSON_BORDER}`,
              }}
            >
              Super Admin
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Platform Administration
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-xl p-8 transition-smooth"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${CRIMSON_BORDER}`,
            backdropFilter: "blur(16px)",
            boxShadow: `0 0 40px ${CRIMSON_DIM}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5" style={{ color: CRIMSON }} />
            <h2 className="font-display text-xl font-semibold text-foreground">
              Super Admin Panel
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Authenticate with Internet Identity to access platform
            administration.
          </p>

          {/* Error banner */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-start gap-3 rounded-lg p-3"
              style={{
                background: "oklch(0.55 0.22 22 / 0.08)",
                border: "1px solid oklch(0.55 0.22 22 / 0.3)",
              }}
            >
              <AlertCircle
                className="w-4 h-4 mt-0.5 flex-shrink-0"
                style={{ color: CRIMSON }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{error}</p>
                {error.includes("not authorized") && (
                  <a
                    href="/login"
                    className="text-xs mt-1 block hover:underline"
                    style={{ color: CRIMSON }}
                  >
                    Go to Agency Login →
                  </a>
                )}
              </div>
            </motion.div>
          )}

          {/* Bootstrap success */}
          {bootstrapSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 rounded-lg p-3 text-sm text-center"
              style={{
                background: "oklch(0.6 0.18 150 / 0.1)",
                border: "1px solid oklch(0.6 0.18 150 / 0.3)",
                color: "oklch(0.7 0.18 150)",
              }}
            >
              ✓ Super Admin registered. Redirecting...
            </motion.div>
          )}

          {/* Login button */}
          {!error ? (
            <Button
              onClick={login}
              disabled={isLoading}
              className="w-full h-11 font-semibold text-sm transition-smooth"
              style={{
                background: isLoading ? `${CRIMSON}80` : CRIMSON,
                color: "#fff",
                boxShadow: `0 4px 20px ${CRIMSON_GLOW}`,
              }}
              data-ocid="admin-login-button"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{
                      borderColor: "rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                    }}
                  />
                  {checking ? "Verifying access..." : "Connecting..."}
                </span>
              ) : (
                "Login with Internet Identity"
              )}
            </Button>
          ) : (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full h-11 font-semibold text-sm transition-smooth"
              style={{
                borderColor: CRIMSON_BORDER,
                color: CRIMSON,
              }}
              data-ocid="admin-login-retry-button"
            >
              Try a Different Account
            </Button>
          )}

          <p className="text-xs text-muted-foreground text-center mt-4">
            Restricted access · Super Admins only
          </p>

          {/* Bootstrap link */}
          {!error && !bootstrapSuccess && identity && !checking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 pt-5"
              style={{ borderTop: "1px solid oklch(0.2 0 0)" }}
            >
              {!bootstrapMode ? (
                <button
                  type="button"
                  onClick={() => setBootstrapMode(true)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-smooth mx-auto"
                  data-ocid="admin-bootstrap-toggle"
                >
                  First time setup? Click here
                  <ChevronRight className="w-3 h-3" />
                </button>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Register your current Internet Identity as super-admin. Only
                    works once.
                  </p>
                  <Button
                    onClick={handleBootstrap}
                    disabled={bootstrapping}
                    size="sm"
                    className="text-xs h-8 px-4"
                    style={{
                      background: CRIMSON_DIM,
                      border: `1px solid ${CRIMSON_BORDER}`,
                      color: CRIMSON,
                    }}
                    data-ocid="admin-bootstrap-button"
                  >
                    {bootstrapping
                      ? "Registering..."
                      : "Register as Super Admin"}
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        {/* Back link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-5"
        >
          <a
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground transition-smooth"
          >
            ← Back to Agency Login
          </a>
        </motion.div>
      </div>

      {/* Footer */}
      <p className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: CRIMSON }}
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
