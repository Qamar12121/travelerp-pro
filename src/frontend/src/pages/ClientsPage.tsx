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
import { PlusCircle, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DataTable } from "../components/DataTable";
import { Layout } from "../components/Layout";
import {
  useAddClient,
  useClients,
  useDeleteClient,
  useRunningBalance,
  useUpdateClient,
} from "../hooks/useBackend";
import type { Client, ClientFormData } from "../types";
import type { Column } from "../types";

// ─── Balance cell (fetches per-client balance) ────────────────────────────────

function BalanceCell({ clientId }: { clientId: string }) {
  const { data, isLoading } = useRunningBalance(clientId);
  if (isLoading) return <Skeleton className="h-4 w-16 bg-muted/30" />;
  const val = typeof data === "bigint" ? Number(data) : (data ?? 0);
  const formatted = Math.abs(val).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
  return (
    <span
      style={{
        color: val >= 0 ? "oklch(0.7 0.18 150)" : "oklch(0.65 0.22 22)",
      }}
      className="font-mono text-xs"
    >
      {val >= 0 ? "+" : "-"}
      {formatted}
    </span>
  );
}

// ─── Client Form Modal ────────────────────────────────────────────────────────

interface ClientModalProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
}

function ClientModal({ open, onClose, client }: ClientModalProps) {
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    defaultValues: {
      name: client?.name ?? "",
      phone: client?.phone ?? "",
      email: client?.email?.[0] ?? "",
      openingBalance: client?.openingBalance ?? 0,
      clientType: "client",
    },
  });

  // Reset when client changes
  useState(() => {
    reset({
      name: client?.name ?? "",
      phone: client?.phone ?? "",
      email: client?.email?.[0] ?? "",
      openingBalance: client?.openingBalance ?? 0,
      clientType: "client",
    });
  });

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEdit && client) {
        await updateClient.mutateAsync({ ...data, id: client.id });
        toast.success("Client updated successfully");
      } else {
        await addClient.mutateAsync({ ...data, clientType: "client" });
        toast.success("Client added successfully");
      }
      reset();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save client");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent
        className="max-w-md border"
        style={{
          background: "oklch(0.12 0 0)",
          borderColor: "oklch(0.75 0.15 82 / 0.3)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">
            {isEdit ? "Edit Client" : "Add Client"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Full name"
              {...register("name", { required: "Name is required" })}
              data-ocid="client-name-input"
              className="bg-secondary border-border/40"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              placeholder="+1 234 567 8900"
              {...register("phone", { required: "Phone is required" })}
              data-ocid="client-phone-input"
              className="bg-secondary border-border/40"
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="client@example.com"
              {...register("email")}
              data-ocid="client-email-input"
              className="bg-secondary border-border/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="openingBalance">Opening Balance</Label>
            <Input
              id="openingBalance"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("openingBalance", { valueAsNumber: true })}
              data-ocid="client-balance-input"
              className="bg-secondary border-border/40"
            />
            <p className="text-xs text-muted-foreground">
              Positive = client owes agency
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-accent text-accent-foreground hover:brightness-110"
              data-ocid="client-save-btn"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Update" : "Add Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalReceivable = clients.reduce(
    (sum, c) => sum + (c.openingBalance > 0 ? c.openingBalance : 0),
    0,
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteClient.mutateAsync(deleteId);
      toast.success("Client deleted");
    } catch {
      toast.error("Failed to delete client");
    } finally {
      setDeleteId(null);
    }
  };

  type ClientRow = Record<string, unknown> & Client;

  const columns: Column<ClientRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "phone", header: "Phone" },
    {
      key: "email",
      header: "Email",
      render: (val) => {
        const arr = val as string[] | null;
        return arr?.[0] ? (
          <span className="text-muted-foreground">{arr[0]}</span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        );
      },
    },
    {
      key: "openingBalance",
      header: "Opening Bal.",
      sortable: true,
      render: (val) => (
        <span className="font-mono text-xs text-muted-foreground">
          {Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "id",
      header: "Current Balance",
      render: (_, row) => <BalanceCell clientId={row.id} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs border-border/40 hover:border-accent/60"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(row as Client);
              setModalOpen(true);
            }}
            data-ocid="client-edit-btn"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteId(row.id);
            }}
            data-ocid="client-delete-btn"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Clients
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage your agency clients
            </p>
          </div>
          <Button
            className="bg-accent text-accent-foreground hover:brightness-110 gap-2"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            data-ocid="add-client-btn"
          >
            <PlusCircle className="w-4 h-4" />
            Add Client
          </Button>
        </motion.div>

        {/* Summary cards */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-4 max-w-md"
        >
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                Total
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-12 bg-muted/30" />
            ) : (
              <p className="text-2xl font-display font-semibold text-foreground">
                {clients.length}
              </p>
            )}
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                Receivable
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-24 bg-muted/30" />
            ) : (
              <p className="text-2xl font-display font-semibold text-accent">
                {totalReceivable.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            )}
          </div>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <DataTable
            columns={columns}
            data={clients as ClientRow[]}
            isLoading={isLoading}
            emptyMessage="No clients yet. Add your first client."
            emptyIcon={<Users className="w-8 h-8 opacity-30" />}
          />
        </motion.div>
      </div>

      {/* Add/Edit modal */}
      <ClientModal
        open={modalOpen}
        client={editing}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent
          style={{
            background: "oklch(0.12 0 0)",
            borderColor: "oklch(0.75 0.15 82 / 0.2)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All associated records will remain
              but the client will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              data-ocid="client-delete-confirm-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
