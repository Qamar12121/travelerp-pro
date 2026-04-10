import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useNavigate } from "@tanstack/react-router";
import { Globe, Plane, Shield, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useAuthStore } from "../store/auth";

const FEATURES = [
  { icon: Zap, label: "Automated Bookings → Invoices → Ledger" },
  { icon: Shield, label: "Role-based access: Admin, Accountant, Agent" },
  { icon: Globe, label: "Multi-currency, cloud-native accounting" },
];

export default function LoginPage() {
  const { login, identity, isLoggingIn, isInitializing } =
    useInternetIdentity();
  const { setAuthenticated, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (identity) {
      const principal = identity.getPrincipal().toText();
      setAuthenticated(principal);
    }
  }, [identity, setAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "oklch(0.085 0 0)" }}
    >
      {/* Background accent */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, oklch(0.75 0.15 82 / 0.06) 0%, transparent 70%)",
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
              background: "oklch(0.75 0.15 82 / 0.1)",
              border: "1px solid oklch(0.75 0.15 82 / 0.4)",
              boxShadow: "0 0 40px oklch(0.75 0.15 82 / 0.15)",
            }}
          >
            <Plane className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground mb-1">
            TravelERP
          </h1>
          <p className="text-muted-foreground text-sm">
            Enterprise Travel Accounting Platform
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-8 gold-glow"
        >
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">
            Welcome back
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in with Internet Identity to access your accounting dashboard.
          </p>

          <Button
            onClick={login}
            disabled={isLoggingIn || isInitializing}
            className="w-full h-11 font-semibold text-sm transition-smooth"
            style={{
              background: isLoggingIn
                ? "oklch(0.75 0.15 82 / 0.5)"
                : "oklch(0.75 0.15 82)",
              color: "oklch(0.085 0 0)",
              boxShadow: "0 4px 20px oklch(0.75 0.15 82 / 0.25)",
            }}
            data-ocid="login-button"
          >
            {isLoggingIn ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Connecting...
              </span>
            ) : (
              "Sign in with Internet Identity"
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Secured by Internet Computer · No password required
          </p>
        </motion.div>

        {/* Feature list */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-6 space-y-2"
        >
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 text-sm text-muted-foreground px-2"
            >
              <Icon className="w-4 h-4 text-accent flex-shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Footer */}
      <p className="fixed bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          caffeine.ai
        </a>
      </p>
    </div>
  );
}
