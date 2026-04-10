import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Info, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { createActor } from "../backend";
import { Layout } from "../components/Layout";
import type { Agency, AgentProfile } from "../types";

// ─── Actor helper ─────────────────────────────────────────────────────────────

function useBackendActor() {
  return useActor(createActor);
}

function unwrapResult<T>(
  result: { __kind__: "ok"; ok: T } | { __kind__: "err"; err: string },
): T {
  if (result.__kind__ === "err") throw new Error(result.err);
  return result.ok;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useMyAgents() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<AgentProfile[]>({
    queryKey: ["myAgents"],
    queryFn: async () => {
      if (!actor) return [];
      const result = await actor.getMyAgents();
      return unwrapResult(result);
    },
    enabled: !!actor && !isFetching,
  });
}

function useMyAgency() {
  const { actor, isFetching } = useBackendActor();
  return useQuery<Agency | null>({
    queryKey: ["myAgency"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMyAgency();
    },
    enabled: !!actor && !isFetching,
  });
}

function useAddAgent() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, email }: { name: string; email: string }) => {
      const result = await actor!.addAgent(name, email);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgents"] });
      qc.invalidateQueries({ queryKey: ["myAgency"] });
    },
  });
}

function useRemoveAgent() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      const result = await actor!.removeAgent(agentId);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgents"] });
      qc.invalidateQueries({ queryKey: ["myAgency"] });
    },
  });
}

function useToggleAgentAccess() {
  const { actor } = useBackendActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      agentId,
      isActive,
    }: {
      agentId: string;
      isActive: boolean;
    }) => {
      const result = await actor!.toggleAgentAccess(agentId, isActive);
      return unwrapResult(result);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myAgents"] });
    },
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const MAX_AGENTS = 4;

function AgencyBanner({
  agency,
  agentCount,
  loading,
}: {
  agency: Agency | null | undefined;
  agentCount: number;
  loading: boolean;
}) {
  const slots = agentCount;
  const pct = Math.round((slots / MAX_AGENTS) * 100);

  return (
    <div className="glass-card p-5 gold-glow mb-6" data-ocid="agency-banner">
      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-5 w-48 bg-muted/30" />
          <Skeleton className="h-3 w-32 bg-muted/30" />
          <Skeleton className="h-2 w-full bg-muted/30 rounded-full" />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "oklch(0.75 0.15 82 / 0.12)",
                border: "1px solid oklch(0.75 0.15 82 / 0.35)",
              }}
            >
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-foreground">
                {agency?.agencyName ?? "My Agency"}
              </p>
              <p className="text-sm text-muted-foreground">
                Owner since{" "}
                {agency?.createdAt
                  ? new Date(
                      Number(agency.createdAt) / 1_000_000,
                    ).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                    })
                  : "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[200px]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Agent Slots Used</span>
              <span className="font-mono font-semibold text-accent">
                {slots} / {MAX_AGENTS}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full transition-smooth"
                style={{
                  width: `${pct}%`,
                  background:
                    pct >= 100 ? "oklch(0.65 0.22 22)" : "oklch(0.75 0.15 82)",
                  boxShadow:
                    pct > 0 ? "0 0 8px oklch(0.75 0.15 82 / 0.5)" : undefined,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({
  agent,
  onRemove,
  onToggle,
}: {
  agent: AgentProfile;
  onRemove: (agent: AgentProfile) => void;
  onToggle: (agent: AgentProfile, isActive: boolean) => void;
}) {
  const initials = agent.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const joinDate = new Date(Number(agent.createdAt) / 1_000_000);

  return (
    <div
      className="glass-card p-5 flex flex-col gap-4"
      data-ocid={`agent-card-${agent.id}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-black flex-shrink-0"
          style={{
            background: "oklch(0.75 0.15 82)",
            boxShadow: "0 0 12px oklch(0.75 0.15 82 / 0.3)",
          }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{agent.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {agent.email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              color: "oklch(0.75 0.15 82)",
              background: "oklch(0.75 0.15 82 / 0.12)",
              border: "1px solid oklch(0.75 0.15 82 / 0.3)",
            }}
          >
            Agent
          </span>
          <Badge
            variant="outline"
            className={`text-xs border-current ${
              agent.isActive
                ? "text-emerald-400 border-emerald-400/30"
                : "text-red-400 border-red-400/30"
            }`}
          >
            {agent.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Meta */}
      <p className="text-xs text-muted-foreground">
        Joined{" "}
        {joinDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <div className="flex items-center gap-2.5">
          <Switch
            checked={agent.isActive}
            onCheckedChange={(val) => onToggle(agent, val)}
            className="data-[state=checked]:bg-accent"
            aria-label={`${agent.isActive ? "Disable" : "Enable"} ${agent.name}`}
            data-ocid={`agent-toggle-${agent.id}`}
          />
          <span className="text-xs text-muted-foreground">
            {agent.isActive ? "Enabled" : "Disabled"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-smooth"
          onClick={() => onRemove(agent)}
          aria-label={`Remove ${agent.name}`}
          data-ocid={`agent-remove-${agent.id}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function AgentCardSkeleton() {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-11 h-11 rounded-full bg-muted/30 flex-shrink-0" />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-32 bg-muted/30" />
          <Skeleton className="h-3 w-48 bg-muted/30" />
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Skeleton className="h-5 w-14 bg-muted/30 rounded-full" />
          <Skeleton className="h-4 w-16 bg-muted/30 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-3 w-24 bg-muted/30" />
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        <Skeleton className="h-5 w-28 bg-muted/30 rounded-full" />
        <Skeleton className="h-8 w-8 bg-muted/30 rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center py-16 text-center"
      data-ocid="agents-empty-state"
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
        style={{
          background: "oklch(0.75 0.15 82 / 0.08)",
          border: "1px solid oklch(0.75 0.15 82 / 0.2)",
        }}
      >
        <Users className="w-8 h-8 text-accent/60" />
      </div>
      <h3 className="font-display font-semibold text-foreground text-lg mb-2">
        No agents yet
      </h3>
      <p className="text-muted-foreground text-sm max-w-xs">
        Add your first agent to get started. They will use Internet Identity to
        log in to your agency.
      </p>
    </div>
  );
}

// ─── Add Agent Modal ──────────────────────────────────────────────────────────

interface AddAgentModalProps {
  open: boolean;
  onClose: () => void;
  agentCount: number;
}

function AddAgentModal({ open, onClose, agentCount }: AddAgentModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const addAgent = useAddAgent();

  const validate = () => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (agentCount >= MAX_AGENTS) {
      toast.warning("Maximum 4 agents reached for your agency");
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    addAgent.mutate(
      { name: name.trim(), email: email.trim() },
      {
        onSuccess: () => {
          toast.success(`Agent "${name.trim()}" added successfully`);
          setName("");
          setEmail("");
          onClose();
        },
        onError: (err: Error) => {
          toast.error(err.message ?? "Failed to add agent");
        },
      },
    );
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="sm:max-w-md border-border/50"
        style={{ background: "oklch(0.13 0 0)" }}
        data-ocid="add-agent-modal"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-accent" />
            Add New Agent
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-name" className="text-sm text-foreground">
              Full Name
            </Label>
            <Input
              id="agent-name"
              placeholder="e.g. Ahmed Al-Rashid"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((p) => ({ ...p, name: undefined }));
              }}
              className="bg-muted/20 border-border/40 focus-visible:ring-accent/50"
              data-ocid="add-agent-name"
            />
            {errors.name && (
              <p
                className="text-xs text-destructive-foreground"
                style={{ color: "oklch(0.65 0.22 22)" }}
              >
                {errors.name}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="agent-email" className="text-sm text-foreground">
              Email
            </Label>
            <Input
              id="agent-email"
              type="text"
              placeholder="e.g. ahmed@agency.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email)
                  setErrors((p) => ({ ...p, email: undefined }));
              }}
              className="bg-muted/20 border-border/40 focus-visible:ring-accent/50"
              data-ocid="add-agent-email"
            />
            {errors.email && (
              <p className="text-xs" style={{ color: "oklch(0.65 0.22 22)" }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Info note */}
          <div
            className="flex gap-2.5 p-3 rounded-lg text-sm"
            style={{
              background: "oklch(0.75 0.15 82 / 0.06)",
              border: "1px solid oklch(0.75 0.15 82 / 0.2)",
            }}
          >
            <Info className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              Agent will use{" "}
              <span className="text-accent font-medium">Internet Identity</span>{" "}
              to log in. Their principal will be linked on first login.
            </p>
          </div>

          {agentCount >= MAX_AGENTS && (
            <div
              className="flex gap-2.5 p-3 rounded-lg text-sm"
              style={{
                background: "oklch(0.65 0.22 22 / 0.08)",
                border: "1px solid oklch(0.65 0.22 22 / 0.3)",
              }}
            >
              <AlertTriangle
                className="w-4 h-4 flex-shrink-0 mt-0.5"
                style={{ color: "oklch(0.65 0.22 22)" }}
              />
              <p style={{ color: "oklch(0.75 0.22 22)" }}>
                Maximum 4 agents reached. Remove an existing agent to add a new
                one.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border/50 text-foreground hover:bg-muted/30"
              onClick={handleClose}
              data-ocid="add-agent-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 font-semibold text-black transition-smooth"
              style={{ background: "oklch(0.75 0.15 82)" }}
              disabled={addAgent.isPending || agentCount >= MAX_AGENTS}
              data-ocid="add-agent-submit"
            >
              {addAgent.isPending ? "Adding..." : "Add Agent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<AgentProfile | null>(null);

  const { data: agents = [], isLoading: agentsLoading } = useMyAgents();
  const { data: agency, isLoading: agencyLoading } = useMyAgency();
  const removeAgent = useRemoveAgent();
  const toggleAccess = useToggleAgentAccess();

  const handleToggle = (agent: AgentProfile, isActive: boolean) => {
    toggleAccess.mutate(
      { agentId: agent.id, isActive },
      {
        onSuccess: () => {
          toast.success(
            `${agent.name} has been ${isActive ? "enabled" : "disabled"}`,
          );
        },
        onError: (err: Error) => {
          toast.error(err.message ?? "Failed to update agent access");
        },
      },
    );
  };

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    removeAgent.mutate(removeTarget.id, {
      onSuccess: () => {
        toast.success(`Agent "${removeTarget.name}" removed`);
        setRemoveTarget(null);
      },
      onError: (err: Error) => {
        toast.error(err.message ?? "Failed to remove agent");
        setRemoveTarget(null);
      },
    });
  };

  return (
    <Layout title="Manage Agents">
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Manage Agents
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Add and manage agents in your agency
            </p>
          </div>
          <Button
            onClick={() => {
              if (agents.length >= MAX_AGENTS) {
                toast.warning("Maximum 4 agents reached for your agency");
                return;
              }
              setAddOpen(true);
            }}
            className="flex items-center gap-2 font-semibold text-black flex-shrink-0"
            style={{ background: "oklch(0.75 0.15 82)" }}
            data-ocid="add-agent-btn"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Agent</span>
          </Button>
        </div>

        {/* Agency info banner */}
        <AgencyBanner
          agency={agency}
          agentCount={agents.length}
          loading={agencyLoading}
        />

        {/* Agents grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          data-ocid="agents-grid"
        >
          {agentsLoading ? (
            ["sk-1", "sk-2", "sk-3", "sk-4"].map((k) => (
              <AgentCardSkeleton key={k} />
            ))
          ) : agents.length === 0 ? (
            <EmptyState />
          ) : (
            agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onRemove={setRemoveTarget}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>
      </div>

      {/* Add Agent Modal */}
      <AddAgentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        agentCount={agents.length}
      />

      {/* Confirm Remove Dialog */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
      >
        <AlertDialogContent
          className="border-border/50"
          style={{ background: "oklch(0.13 0 0)" }}
          data-ocid="remove-agent-dialog"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-foreground flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Remove Agent
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to remove{" "}
              <span className="text-foreground font-medium">
                {removeTarget?.name}
              </span>
              ? They will lose access to the agency immediately. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-border/50 text-foreground hover:bg-muted/30"
              data-ocid="remove-agent-cancel"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
              onClick={handleConfirmRemove}
              disabled={removeAgent.isPending}
              data-ocid="remove-agent-confirm"
            >
              {removeAgent.isPending ? "Removing..." : "Remove Agent"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
