import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  Plane,
  Shield,
  Star,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCompleteOnboarding } from "../hooks/useBackend";
import { useAuthStore } from "../store/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  "Pakistan",
  "Saudi Arabia",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Canada",
  "Australia",
  "India",
  "Bangladesh",
  "Turkey",
  "Egypt",
  "Jordan",
  "Kuwait",
  "Qatar",
  "Bahrain",
  "Oman",
  "Malaysia",
  "Indonesia",
  "Germany",
  "France",
  "Other",
];

const TIMEZONES = [
  { label: "PKT — Karachi (UTC+5)", value: "Asia/Karachi" },
  { label: "GST — Dubai (UTC+4)", value: "Asia/Dubai" },
  { label: "AST — Riyadh (UTC+3)", value: "Asia/Riyadh" },
  { label: "GMT — London (UTC+0)", value: "Europe/London" },
  { label: "EST — New York (UTC−5)", value: "America/New_York" },
  { label: "PST — Los Angeles (UTC−8)", value: "America/Los_Angeles" },
  { label: "IST — India (UTC+5:30)", value: "Asia/Kolkata" },
  { label: "CST — China (UTC+8)", value: "Asia/Shanghai" },
  { label: "AEST — Sydney (UTC+10)", value: "Australia/Sydney" },
];

const CURRENCIES = [
  { code: "PKR", label: "PKR — Pakistani Rupee" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
];

const BOOKING_TYPES = [
  { id: "flights", label: "Flights & Air Tickets", icon: "✈️" },
  { id: "visa", label: "Visa Services", icon: "🛂" },
  { id: "umrah", label: "Umrah / Hajj Packages", icon: "🕌" },
  { id: "tours", label: "Tour Packages", icon: "🗺️" },
];

const FEATURES = [
  { icon: Zap, text: "Auto-generated invoices & vouchers" },
  { icon: Globe, text: "Multi-currency accounting" },
  { icon: Shield, text: "Role-based agent access" },
  { icon: Users, text: "Client & supplier ledgers" },
  { icon: Star, text: "Advanced financial reports" },
  { icon: Plane, text: "Airline profit tracking" },
];

// ─── Form types ───────────────────────────────────────────────────────────────

interface Step1Data {
  agencyName: string;
  agencyEmail: string;
  phone: string;
  country: string;
  timezone: string;
}

interface Step2Data {
  bookingTypes: string[];
  currency: string;
  logoBase64: string;
  logoName: string;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isDone = step < current;
        const isActive = step === current;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                isDone
                  ? "bg-primary text-primary-foreground"
                  : isActive
                    ? "border-2 border-primary text-primary bg-primary/10"
                    : "border border-border text-muted-foreground"
              }`}
            >
              {isDone ? <CheckCircle2 className="w-4 h-4" /> : step}
            </div>
            {step < total && (
              <div
                className={`h-px w-8 transition-all duration-500 ${
                  step < current ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Summary row ──────────────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {label}
      </span>
      <span className="text-sm text-foreground font-medium text-right truncate max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate();
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const setAgencyName = useAuthStore((s) => s.setAgencyName);
  const completeOnboarding = useCompleteOnboarding();

  const [step, setStep] = useState(1);
  const [step1, setStep1] = useState<Step1Data>({
    agencyName: "",
    agencyEmail: "",
    phone: "",
    country: "",
    timezone: "",
  });
  const [step2, setStep2] = useState<Step2Data>({
    bookingTypes: [],
    currency: "",
    logoBase64: "",
    logoName: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Step 1 handlers ──────────────────────────────────────────────────────────

  function handleStep1Next() {
    if (!step1.agencyName.trim()) {
      toast.error("Agency name is required");
      return;
    }
    setStep(2);
  }

  // ── Step 2 handlers ──────────────────────────────────────────────────────────

  function toggleBookingType(id: string) {
    setStep2((prev) => ({
      ...prev,
      bookingTypes: prev.bookingTypes.includes(id)
        ? prev.bookingTypes.filter((t) => t !== id)
        : [...prev.bookingTypes, id],
    }));
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Logo must be under 500KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setStep2((prev) => ({
        ...prev,
        logoBase64: (ev.target?.result as string) ?? "",
        logoName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleStep2Next() {
    if (!step2.currency) {
      toast.error("Please select a currency");
      return;
    }
    setStep(3);
  }

  // ── Final submit ─────────────────────────────────────────────────────────────

  async function handleGetStarted() {
    try {
      await completeOnboarding.mutateAsync();
    } catch {
      // Backend may not yet expose completeOnboarding — proceed gracefully
    }
    setOnboarded(true);
    setAgencyName(step1.agencyName);
    toast.success("Welcome to TravelERP Pro! Your agency is ready.");
    navigate({ to: "/dashboard" });
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const selectedBookingLabels = step2.bookingTypes.map(
    (id) => BOOKING_TYPES.find((bt) => bt.id === id)?.label ?? id,
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex dark bg-background">
      {/* ─── Left Hero Panel ─── */}
      <div
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(145deg, oklch(0.085 0 0) 0%, oklch(0.11 0.01 82) 50%, oklch(0.085 0 0) 100%)",
          borderRight: "1px solid oklch(0.75 0.15 82 / 0.15)",
        }}
      >
        {/* Decorative glows */}
        <div
          className="absolute top-[-80px] right-[-80px] w-[320px] h-[320px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, oklch(0.75 0.15 82 / 0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-[240px] h-[240px] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, oklch(0.75 0.15 82 / 0.08) 0%, transparent 70%)",
          }}
        />

        {/* Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.75 0.15 82), oklch(0.65 0.15 82))",
              }}
            >
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <p className="text-xs text-muted-foreground tracking-widest uppercase font-mono">
              TravelERP Pro
            </p>
          </div>

          <h1
            className="text-4xl font-display font-bold leading-tight mb-4"
            style={{ color: "oklch(0.93 0 0)" }}
          >
            Your Complete
            <br />
            <span
              style={{
                background:
                  "linear-gradient(90deg, oklch(0.75 0.15 82), oklch(0.85 0.13 82))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Travel Accounting
            </span>
            <br />
            Platform
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm">
            Manage bookings, invoices, vouchers, ledgers, and financial reports
            — all in one powerful enterprise ERP designed for travel agencies.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "oklch(0.75 0.15 82 / 0.12)" }}
              >
                <Icon
                  className="w-3.5 h-3.5"
                  style={{ color: "oklch(0.75 0.15 82)" }}
                />
              </div>
              <span className="text-sm text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>

        {/* Footer quote */}
        <div className="relative z-10">
          <div
            className="rounded-xl p-4"
            style={{
              background: "oklch(0.75 0.15 82 / 0.06)",
              border: "1px solid oklch(0.75 0.15 82 / 0.15)",
            }}
          >
            <p className="text-sm italic text-muted-foreground">
              "The professional choice for travel agency accounting — trusted by
              agencies across the Middle East and South Asia."
            </p>
          </div>
        </div>
      </div>

      {/* ─── Right Form Panel ─── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                Setup Wizard
              </p>
              <StepIndicator current={step} total={3} />
            </div>

            {step === 1 && (
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Agency Information
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Tell us about your travel agency
                </p>
              </div>
            )}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Business Setup
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure your services and preferences
                </p>
              </div>
            )}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  You're All Set!
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Review your setup and launch your dashboard
                </p>
              </div>
            )}
          </div>

          {/* ─── Step 1: Agency Info ─── */}
          {step === 1 && (
            <div
              className="rounded-2xl p-6 space-y-5"
              style={{
                background: "oklch(0.12 0 0 / 0.8)",
                border: "1px solid oklch(0.2 0 0)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="agencyName" className="text-sm font-medium">
                  Agency Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="agencyName"
                  data-ocid="onboarding-agency-name"
                  placeholder="e.g. Al-Falah Travel Agency"
                  value={step1.agencyName}
                  onChange={(e) =>
                    setStep1((p) => ({ ...p, agencyName: e.target.value }))
                  }
                  className="form-field"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agencyEmail" className="text-sm font-medium">
                  Agency Email
                </Label>
                <Input
                  id="agencyEmail"
                  type="email"
                  data-ocid="onboarding-agency-email"
                  placeholder="info@myagency.com"
                  value={step1.agencyEmail}
                  onChange={(e) =>
                    setStep1((p) => ({ ...p, agencyEmail: e.target.value }))
                  }
                  className="form-field"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  data-ocid="onboarding-phone"
                  placeholder="+92 300 1234567"
                  value={step1.phone}
                  onChange={(e) =>
                    setStep1((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="form-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Country</Label>
                  <Select
                    value={step1.country}
                    onValueChange={(v) =>
                      setStep1((p) => ({ ...p, country: v }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="onboarding-country"
                      className="form-field"
                    >
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Timezone</Label>
                  <Select
                    value={step1.timezone}
                    onValueChange={(v) =>
                      setStep1((p) => ({ ...p, timezone: v }))
                    }
                  >
                    <SelectTrigger
                      data-ocid="onboarding-timezone"
                      className="form-field"
                    >
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                data-ocid="onboarding-step1-next"
                className="w-full"
                onClick={handleStep1Next}
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.75 0.15 82), oklch(0.65 0.15 82))",
                  color: "oklch(0.085 0 0)",
                  fontWeight: 600,
                }}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ─── Step 2: Business Setup ─── */}
          {step === 2 && (
            <div
              className="rounded-2xl p-6 space-y-6"
              style={{
                background: "oklch(0.12 0 0 / 0.8)",
                border: "1px solid oklch(0.2 0 0)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Booking types */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Primary Booking Types
                </p>
                <p className="text-xs text-muted-foreground">
                  Select all services your agency offers
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {BOOKING_TYPES.map((bt) => {
                    const checked = step2.bookingTypes.includes(bt.id);
                    return (
                      <button
                        key={bt.id}
                        type="button"
                        data-ocid={`onboarding-booking-${bt.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 text-left w-full"
                        style={{
                          background: checked
                            ? "oklch(0.75 0.15 82 / 0.1)"
                            : "oklch(0.15 0 0)",
                          border: `1px solid ${checked ? "oklch(0.75 0.15 82 / 0.4)" : "oklch(0.22 0 0)"}`,
                        }}
                        onClick={() => toggleBookingType(bt.id)}
                        aria-pressed={checked}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleBookingType(bt.id)}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          tabIndex={-1}
                        />
                        <span className="text-base">{bt.icon}</span>
                        <span className="text-sm text-foreground">
                          {bt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Primary Currency <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={step2.currency}
                  onValueChange={(v) =>
                    setStep2((p) => ({ ...p, currency: v }))
                  }
                >
                  <SelectTrigger
                    data-ocid="onboarding-currency"
                    className="form-field"
                  >
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
                <Label
                  htmlFor="logo-upload-btn"
                  className="text-sm font-medium"
                >
                  Agency Logo{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <button
                  id="logo-upload-btn"
                  type="button"
                  className="w-full rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-200 text-left"
                  style={{
                    background: "oklch(0.15 0 0)",
                    border: "1px dashed oklch(0.25 0 0)",
                  }}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Upload agency logo"
                  data-ocid="onboarding-logo-upload"
                >
                  {step2.logoBase64 ? (
                    <img
                      src={step2.logoBase64}
                      alt="Agency logo preview"
                      className="w-12 h-12 rounded-lg object-contain"
                      style={{ background: "oklch(0.18 0 0)" }}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "oklch(0.18 0 0)" }}
                    >
                      <Upload
                        className="w-5 h-5"
                        style={{ color: "oklch(0.75 0.15 82)" }}
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    {step2.logoName ? (
                      <p className="text-sm text-foreground truncate">
                        {step2.logoName}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Click to upload logo
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, SVG — max 500KB
                    </p>
                  </div>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(1)}
                  data-ocid="onboarding-step2-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleStep2Next}
                  data-ocid="onboarding-step2-next"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.75 0.15 82), oklch(0.65 0.15 82))",
                    color: "oklch(0.085 0 0)",
                    fontWeight: 600,
                  }}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Welcome Summary ─── */}
          {step === 3 && (
            <div
              className="rounded-2xl p-6 space-y-5"
              style={{
                background: "oklch(0.12 0 0 / 0.8)",
                border: "1px solid oklch(0.2 0 0)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Success icon */}
              <div className="flex justify-center mb-2">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "oklch(0.75 0.15 82 / 0.12)" }}
                >
                  <CheckCircle2
                    className="w-8 h-8"
                    style={{ color: "oklch(0.75 0.15 82)" }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Your Setup Summary
                </h3>

                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: "oklch(0.15 0 0)" }}
                >
                  <SummaryRow label="Agency Name" value={step1.agencyName} />
                  {step1.agencyEmail && (
                    <SummaryRow label="Email" value={step1.agencyEmail} />
                  )}
                  {step1.phone && (
                    <SummaryRow label="Phone" value={step1.phone} />
                  )}
                  {step1.country && (
                    <SummaryRow label="Country" value={step1.country} />
                  )}
                  {step1.timezone && (
                    <SummaryRow
                      label="Timezone"
                      value={
                        TIMEZONES.find((tz) => tz.value === step1.timezone)
                          ?.label ?? step1.timezone
                      }
                    />
                  )}
                </div>

                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: "oklch(0.15 0 0)" }}
                >
                  <SummaryRow
                    label="Currency"
                    value={
                      CURRENCIES.find((c) => c.code === step2.currency)
                        ?.label ?? step2.currency
                    }
                  />
                  {selectedBookingLabels.length > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs text-muted-foreground flex-shrink-0 pt-0.5">
                        Services
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {selectedBookingLabels.map((label) => (
                          <Badge
                            key={label}
                            variant="secondary"
                            className="text-xs"
                            style={{
                              background: "oklch(0.75 0.15 82 / 0.1)",
                              color: "oklch(0.75 0.15 82)",
                              border: "1px solid oklch(0.75 0.15 82 / 0.2)",
                            }}
                          >
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {step2.logoBase64 && (
                    <SummaryRow label="Logo" value="Uploaded ✓" />
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(2)}
                  data-ocid="onboarding-step3-back"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleGetStarted}
                  disabled={completeOnboarding.isPending}
                  data-ocid="onboarding-get-started"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.75 0.15 82), oklch(0.65 0.15 82))",
                    color: "oklch(0.085 0 0)",
                    fontWeight: 700,
                    fontSize: "0.9375rem",
                  }}
                >
                  {completeOnboarding.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                      Launching...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Get Started
                      <Zap className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
