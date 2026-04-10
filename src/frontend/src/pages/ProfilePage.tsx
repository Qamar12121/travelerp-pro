import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Globe,
  Info,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import type { Agency, AgentProfile } from "../backend";
import { Layout } from "../components/Layout";
import { useAuthStore } from "../store/auth";

// ─── Backend actor ─────────────────────────────────────────────────────────────

function useBackendActor() {
  return useActor(createActor);
}

// ─── Queries & Mutations ──────────────────────────────────────────────────────

function useMyAgency() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Agency | null>({
    queryKey: ["myAgency"],
    queryFn: () => actor!.getMyAgency(),
    enabled: !!actor && !isFetching,
  });
}

function useAgentProfile() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<AgentProfile | null>({
    queryKey: ["agentProfile"],
    queryFn: () => actor!.getAgentProfile(),
    enabled: !!actor && !isFetching,
  });
}

function useUpdateAgencyProfile() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      logoUrl,
    }: {
      name: string | null;
      logoUrl: string | null;
    }) => {
      const result = await actor!.updateAgencyProfile(name, logoUrl);
      if (result.__kind__ === "err") throw new Error(result.err);
      return result.ok;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgency"] });
    },
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ReadonlyField({
  value,
  icon: Icon,
}: { value: string; icon?: React.ElementType }) {
  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground"
      style={{
        background: "oklch(0.14 0 0)",
        border: "1px solid oklch(0.22 0 0)",
      }}
    >
      {Icon && (
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      )}
      <span className="truncate">{value || "—"}</span>
    </div>
  );
}

// ─── Onboarding Status Banner ─────────────────────────────────────────────────

function OnboardingBanner({ isOnboarded }: { isOnboarded: boolean }) {
  if (isOnboarded) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: "oklch(0.75 0.18 150 / 0.07)",
          border: "1px solid oklch(0.75 0.18 150 / 0.25)",
        }}
      >
        <CheckCircle2
          className="w-4 h-4 flex-shrink-0"
          style={{ color: "oklch(0.75 0.18 150)" }}
        />
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "oklch(0.75 0.18 150)" }}
          >
            Agency Configured
          </p>
          <p className="text-xs text-muted-foreground">
            Your agency setup is complete and ready to use.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: "oklch(0.75 0.15 82 / 0.07)",
        border: "1px solid oklch(0.75 0.15 82 / 0.3)",
      }}
    >
      <AlertCircle
        className="w-4 h-4 flex-shrink-0"
        style={{ color: "oklch(0.75 0.15 82)" }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold"
          style={{ color: "oklch(0.75 0.15 82)" }}
        >
          Setup Incomplete
        </p>
        <p className="text-xs text-muted-foreground">
          Complete your agency onboarding to unlock all features.
        </p>
      </div>
      <a
        href="/onboarding"
        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-smooth hover:opacity-80 flex-shrink-0"
        style={{
          background: "oklch(0.75 0.15 82 / 0.15)",
          color: "oklch(0.75 0.15 82)",
          border: "1px solid oklch(0.75 0.15 82 / 0.4)",
        }}
      >
        Complete Setup →
      </a>
    </div>
  );
}

// ─── Agency Owner Profile Card ────────────────────────────────────────────────

function AgencyOwnerCard({
  agency,
  principal,
}: {
  agency: Agency;
  principal: string | null;
}) {
  const [agencyName, setAgencyName] = useState(agency.agencyName);
  const [logoUrl, setLogoUrl] = useState<string | null>(agency.logoUrl ?? null);
  const [phone, setPhone] = useState(agency.phone ?? "");
  const [country, setCountry] = useState(agency.country ?? "");
  const [timezone, setTimezone] = useState(agency.timezone ?? "");
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateAgencyProfile();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Image too large. Maximum size is 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({ name: agencyName, logoUrl });
      toast.success("Agency profile saved successfully.");
      setIsDirty(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile.",
      );
    }
  };

  const initials = agency.agencyName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const shortPrincipal = principal
    ? `${principal.slice(0, 8)}...${principal.slice(-4)}`
    : "—";

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Card header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border/40">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "oklch(0.75 0.15 82 / 0.12)",
            border: "1px solid oklch(0.75 0.15 82 / 0.35)",
          }}
        >
          <Building2 className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base text-foreground">
            Agency Profile
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage your agency information
          </p>
        </div>
        <Badge
          className="ml-auto text-xs font-semibold"
          style={{
            background: "oklch(0.75 0.15 82 / 0.15)",
            color: "oklch(0.75 0.15 82)",
            border: "1px solid oklch(0.75 0.15 82 / 0.4)",
          }}
        >
          Owner
        </Badge>
      </div>

      {/* Logo upload */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          <div
            className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold transition-smooth"
            style={{
              background: logoUrl
                ? "transparent"
                : "oklch(0.75 0.15 82 / 0.12)",
              border: "2px solid oklch(0.75 0.15 82 / 0.4)",
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Agency logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="font-display font-bold text-xl"
                style={{ color: "oklch(0.75 0.15 82)" }}
              >
                {initials}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-smooth"
            style={{ background: "rgba(0,0,0,0.6)" }}
            aria-label="Upload agency logo"
            data-ocid="profile-logo-upload"
          >
            <Camera className="w-5 h-5 text-accent" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoChange}
            data-ocid="profile-logo-input"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Click to upload agency logo · Max 500 KB
        </p>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <FieldRow label="Agency Name">
          <Input
            value={agencyName}
            onChange={(e) => {
              setAgencyName(e.target.value);
              setIsDirty(true);
            }}
            className="h-10 rounded-xl bg-transparent focus-visible:ring-accent/50"
            style={{ borderColor: "oklch(0.25 0 0)" }}
            placeholder="Your agency name"
            data-ocid="profile-agency-name"
          />
        </FieldRow>

        <FieldRow label="Phone Number">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setIsDirty(true);
              }}
              className="h-10 rounded-xl bg-transparent focus-visible:ring-accent/50 pl-9"
              style={{ borderColor: "oklch(0.25 0 0)" }}
              placeholder="+1 234 567 8900"
              data-ocid="profile-phone"
            />
          </div>
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Country">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setIsDirty(true);
                }}
                className="h-10 rounded-xl bg-transparent focus-visible:ring-accent/50 pl-9"
                style={{ borderColor: "oklch(0.25 0 0)" }}
                placeholder="e.g. Pakistan"
                data-ocid="profile-country"
              />
            </div>
          </FieldRow>

          <FieldRow label="Timezone">
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  setIsDirty(true);
                }}
                className="h-10 rounded-xl bg-transparent focus-visible:ring-accent/50 pl-9"
                style={{ borderColor: "oklch(0.25 0 0)" }}
                placeholder="e.g. Asia/Karachi"
                data-ocid="profile-timezone"
              />
            </div>
          </FieldRow>
        </div>

        <FieldRow label="Owner Principal (Internet Identity)">
          <ReadonlyField value={shortPrincipal} icon={User} />
        </FieldRow>

        {/* Internet Identity note */}
        <div
          className="flex gap-3 p-4 rounded-xl"
          style={{
            background: "oklch(0.75 0.15 82 / 0.05)",
            border: "1px solid oklch(0.75 0.15 82 / 0.2)",
          }}
        >
          <Lock className="w-4 h-4 text-accent/70 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground mb-0.5">
              Password managed via Internet Identity
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your account is secured by Internet Identity. To change
              credentials, visit{" "}
              <a
                href="https://identity.ic0.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                identity.ic0.app
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending || !isDirty}
        className="w-full h-11 rounded-xl font-semibold text-sm transition-smooth"
        style={{
          background: isDirty
            ? "oklch(0.75 0.15 82)"
            : "oklch(0.75 0.15 82 / 0.4)",
          color: "oklch(0.085 0 0)",
        }}
        data-ocid="profile-save-agency"
      >
        {updateMutation.isPending ? "Saving…" : "Save Agency Profile"}
      </Button>
    </div>
  );
}

// ─── Agency Security Card ─────────────────────────────────────────────────────

function AgencySecurityCard({
  agency,
  principal,
}: {
  agency: Agency;
  principal: string | null;
}) {
  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border/40">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "oklch(0.75 0.15 82 / 0.12)",
            border: "1px solid oklch(0.75 0.15 82 / 0.35)",
          }}
        >
          <ShieldCheck className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base text-foreground">
            Account Security
          </h2>
          <p className="text-xs text-muted-foreground">
            Identity &amp; access management
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <FieldRow label="Authentication Method">
          <ReadonlyField
            value="Internet Identity (Blockchain)"
            icon={ShieldCheck}
          />
        </FieldRow>

        <FieldRow label="Principal ID">
          <ReadonlyField
            value={
              principal
                ? `${principal.slice(0, 14)}...${principal.slice(-6)}`
                : "—"
            }
            icon={User}
          />
        </FieldRow>

        <FieldRow label="Agency Status">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{
              background: agency.isActive
                ? "oklch(0.75 0.18 150 / 0.08)"
                : "oklch(0.65 0.22 22 / 0.08)",
              border: `1px solid ${agency.isActive ? "oklch(0.75 0.18 150 / 0.3)" : "oklch(0.65 0.22 22 / 0.3)"}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: agency.isActive
                  ? "oklch(0.75 0.18 150)"
                  : "oklch(0.65 0.22 22)",
              }}
            />
            <span
              className="font-medium"
              style={{
                color: agency.isActive
                  ? "oklch(0.75 0.18 150)"
                  : "oklch(0.65 0.22 22)",
              }}
            >
              {agency.isActive ? "Active" : "Suspended"}
            </span>
          </div>
        </FieldRow>

        <FieldRow label="Total Agents">
          <ReadonlyField value={String(agency.totalAgents)} icon={User} />
        </FieldRow>
      </div>

      <div
        className="p-4 rounded-xl space-y-3"
        style={{
          background: "oklch(0.75 0.15 82 / 0.04)",
          border: "1px solid oklch(0.75 0.15 82 / 0.15)",
        }}
      >
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-accent" />
          Security Notes
        </p>
        <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
          <li>Passwords are managed entirely via Internet Identity</li>
          <li>Your principal ID is your unique blockchain identity</li>
          <li>Never share your recovery phrase with anyone</li>
          <li>
            Manage devices at{" "}
            <a
              href="https://identity.ic0.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              identity.ic0.app
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Agent Read-Only Card ─────────────────────────────────────────────────────

function AgentCard({ profile }: { profile: AgentProfile }) {
  const createdDate = profile.createdAt
    ? new Date(Number(profile.createdAt / 1_000_000n)).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      )
    : "—";

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border/40">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "oklch(0.6 0.17 240 / 0.12)",
            border: "1px solid oklch(0.6 0.17 240 / 0.35)",
          }}
        >
          <User className="w-4 h-4" style={{ color: "oklch(0.7 0.15 240)" }} />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base text-foreground">
            Agent Profile
          </h2>
          <p className="text-xs text-muted-foreground">
            Your account information
          </p>
        </div>
        <Badge
          className="ml-auto text-xs font-semibold"
          style={{
            background: "oklch(0.6 0.17 240 / 0.15)",
            color: "oklch(0.7 0.15 240)",
            border: "1px solid oklch(0.6 0.17 240 / 0.4)",
          }}
        >
          Agent
        </Badge>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold"
          style={{
            background: "oklch(0.6 0.17 240 / 0.12)",
            border: "2px solid oklch(0.6 0.17 240 / 0.4)",
            color: "oklch(0.7 0.15 240)",
          }}
        >
          {profile.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-foreground">
            {profile.name}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile.email}
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <FieldRow label="Full Name">
          <ReadonlyField value={profile.name} icon={User} />
        </FieldRow>

        <FieldRow label="Email Address">
          <ReadonlyField value={profile.email} icon={Mail} />
        </FieldRow>

        <FieldRow label="Agency ID">
          <ReadonlyField value={profile.agencyId} icon={Building2} />
        </FieldRow>

        <FieldRow label="Agent Role">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{
              background: "oklch(0.75 0.15 82 / 0.08)",
              border: "1px solid oklch(0.75 0.15 82 / 0.25)",
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="font-medium text-accent capitalize">
              {profile.role}
            </span>
          </div>
        </FieldRow>

        <FieldRow label="Account Created">
          <ReadonlyField value={createdDate} icon={Calendar} />
        </FieldRow>

        <FieldRow label="Account Status">
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
            style={{
              background: profile.isActive
                ? "oklch(0.75 0.18 150 / 0.08)"
                : "oklch(0.65 0.22 22 / 0.08)",
              border: `1px solid ${profile.isActive ? "oklch(0.75 0.18 150 / 0.3)" : "oklch(0.65 0.22 22 / 0.3)"}`,
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: profile.isActive
                  ? "oklch(0.75 0.18 150)"
                  : "oklch(0.65 0.22 22)",
              }}
            />
            <span
              className="font-medium"
              style={{
                color: profile.isActive
                  ? "oklch(0.75 0.18 150)"
                  : "oklch(0.65 0.22 22)",
              }}
            >
              {profile.isActive ? "Active" : "Suspended"}
            </span>
          </div>
        </FieldRow>
      </div>

      <div
        className="flex gap-3 p-4 rounded-xl"
        style={{
          background: "oklch(0.14 0 0)",
          border: "1px solid oklch(0.22 0 0)",
        }}
      >
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Agent profiles are managed by your agency owner. Contact your agency
          owner to update your name, email, or access permissions.
        </p>
      </div>
    </div>
  );
}

// ─── Agent Agency Info Card ───────────────────────────────────────────────────

function AgentAgencyInfoCard({ agencyId }: { agencyId: string }) {
  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border/40">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "oklch(0.75 0.15 82 / 0.12)",
            border: "1px solid oklch(0.75 0.15 82 / 0.35)",
          }}
        >
          <Building2 className="w-4 h-4 text-accent" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base text-foreground">
            Your Agency
          </h2>
          <p className="text-xs text-muted-foreground">Agency you belong to</p>
        </div>
      </div>

      <div className="space-y-4">
        <FieldRow label="Agency ID">
          <ReadonlyField value={agencyId} icon={Building2} />
        </FieldRow>

        <FieldRow label="Role">
          <div
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm"
            style={{
              background: "oklch(0.75 0.15 82 / 0.08)",
              border: "1px solid oklch(0.75 0.15 82 / 0.25)",
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="font-medium text-accent">Agent</span>
          </div>
        </FieldRow>
      </div>

      <div
        className="flex gap-3 p-4 rounded-xl"
        style={{
          background: "oklch(0.75 0.15 82 / 0.04)",
          border: "1px solid oklch(0.75 0.15 82 / 0.15)",
        }}
      >
        <Lock className="w-4 h-4 text-accent/60 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground mb-0.5">
            Read-Only Access
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Profile information is read-only for agents. Only agency owners can
            modify agency settings and agent details.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Super Admin Profile Card ─────────────────────────────────────────────────

function SuperAdminProfileCard({ principal }: { principal: string | null }) {
  const [displayName, setDisplayName] = useState("Super Administrator");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(displayName);

  const handleSaveName = () => {
    if (tempName.trim()) {
      setDisplayName(tempName.trim());
      toast.success("Display name updated.");
    }
    setEditingName(false);
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border/40">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "oklch(0.55 0.22 22 / 0.12)",
            border: "1px solid oklch(0.55 0.22 22 / 0.35)",
          }}
        >
          <ShieldCheck
            className="w-4 h-4"
            style={{ color: "oklch(0.55 0.22 22)" }}
          />
        </div>
        <div>
          <h2 className="font-display font-semibold text-base text-foreground">
            Super Admin
          </h2>
          <p className="text-xs text-muted-foreground">
            Platform administrator account
          </p>
        </div>
        <Badge
          className="ml-auto text-xs font-semibold"
          style={{
            background: "oklch(0.55 0.22 22 / 0.15)",
            color: "oklch(0.65 0.22 22)",
            border: "1px solid oklch(0.55 0.22 22 / 0.4)",
          }}
        >
          Super Admin
        </Badge>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold"
          style={{
            background: "oklch(0.55 0.22 22 / 0.12)",
            border: "2px solid oklch(0.55 0.22 22 / 0.4)",
            color: "oklch(0.65 0.22 22)",
          }}
        >
          SA
        </div>
        <p className="font-display font-semibold text-foreground">
          {displayName}
        </p>
      </div>

      <div className="space-y-4">
        <FieldRow label="Display Name">
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="h-10 rounded-xl bg-transparent focus-visible:ring-accent/50 flex-1"
                style={{ borderColor: "oklch(0.25 0 0)" }}
                autoFocus
                data-ocid="admin-profile-name-input"
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                className="h-10 px-3 text-xs font-semibold"
                style={{ background: "oklch(0.55 0.22 22)", color: "#fff" }}
                data-ocid="admin-profile-name-save"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTempName(displayName);
                  setEditingName(false);
                }}
                className="h-10 px-3 text-xs"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <ReadonlyField value={displayName} icon={User} />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingName(true)}
                className="h-10 px-3 text-xs flex-shrink-0"
                style={{
                  borderColor: "oklch(0.25 0 0)",
                  border: "1px solid oklch(0.25 0 0)",
                }}
                data-ocid="admin-profile-name-edit"
              >
                Edit
              </Button>
            </div>
          )}
        </FieldRow>

        <FieldRow label="Account Type">
          <ReadonlyField
            value="Platform Super Administrator"
            icon={ShieldCheck}
          />
        </FieldRow>

        <FieldRow label="Principal ID">
          <ReadonlyField
            value={
              principal
                ? `${principal.slice(0, 14)}...${principal.slice(-6)}`
                : "—"
            }
            icon={User}
          />
        </FieldRow>
      </div>

      <div
        className="p-4 rounded-xl"
        style={{
          background: "oklch(0.55 0.22 22 / 0.05)",
          border: "1px solid oklch(0.55 0.22 22 / 0.2)",
        }}
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          Super admin accounts have full platform access. Manage agencies, view
          activity logs, and monitor platform health from the Admin Panel.
        </p>
      </div>
    </div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="glass-card p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border/40">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="space-y-4">
              {[0, 1, 2].map((j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { isAgencyOwner, isSuperAdmin, isOnboarded, principal } =
    useAuthStore();

  const agencyQuery = useMyAgency();
  const agentQuery = useAgentProfile();

  const isLoading = isSuperAdmin
    ? false
    : isAgencyOwner
      ? agencyQuery.isLoading
      : agentQuery.isLoading;

  return (
    <Layout title="Profile">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            My Profile
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin
              ? "Your super admin account details and settings."
              : isAgencyOwner
                ? "Manage your agency profile, logo, and account settings."
                : "View your agent profile and agency information."}
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <ProfileSkeleton />
        ) : isSuperAdmin ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SuperAdminProfileCard principal={principal} />
            <div className="glass-card p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-border/40">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "oklch(0.55 0.22 22 / 0.12)",
                    border: "1px solid oklch(0.55 0.22 22 / 0.35)",
                  }}
                >
                  <ShieldCheck
                    className="w-4 h-4"
                    style={{ color: "oklch(0.55 0.22 22)" }}
                  />
                </div>
                <h2 className="font-display font-semibold text-base text-foreground">
                  Admin Capabilities
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  "View and manage all registered agencies",
                  "Activate or suspend any agency account",
                  "Access full agency activity logs",
                  "Monitor platform-wide revenue and stats",
                  "Manage agent access across all agencies",
                ].map((cap) => (
                  <div key={cap} className="flex items-start gap-2.5">
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "oklch(0.55 0.22 22)" }}
                    />
                    <span className="text-sm text-muted-foreground">{cap}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : isAgencyOwner ? (
          agencyQuery.data ? (
            <div className="space-y-4">
              <OnboardingBanner isOnboarded={isOnboarded} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AgencyOwnerCard
                  agency={agencyQuery.data}
                  principal={principal}
                />
                <AgencySecurityCard
                  agency={agencyQuery.data}
                  principal={principal}
                />
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 text-center space-y-3">
              <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-medium text-foreground">No agency found</p>
              <p className="text-sm text-muted-foreground">
                Your agency profile could not be loaded. Please try refreshing
                the page.
              </p>
            </div>
          )
        ) : agentQuery.data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AgentCard profile={agentQuery.data} />
            <AgentAgencyInfoCard agencyId={agentQuery.data.agencyId} />
          </div>
        ) : (
          <div className="glass-card p-8 text-center space-y-3">
            <User className="w-10 h-10 text-muted-foreground mx-auto" />
            <p className="font-medium text-foreground">Profile not available</p>
            <p className="text-sm text-muted-foreground">
              Your agent profile could not be loaded. Please contact your agency
              owner.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
