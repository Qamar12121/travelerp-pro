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
import { Building2, PlusCircle } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DataTable } from "../components/DataTable";
import { Layout } from "../components/Layout";
import {
  useAddClient,
  useDeleteClient,
  useRunningBalance,
  useSuppliers,
  useUpdateClient,
} from "../hooks/useBackend";
import type { Client, ClientFormData } from "../types";
import type { Column } from "../types";

// ─── Supplier balance cell (negative = agency owes) ───────────────────────────

function SupplierBalanceCell({ clientId }: { clientId: string }) {
  const { data, isLoading } = useRunningBalance(clientId);
  if (isLoading) return <Skeleton className="h-4 w-16 bg-muted/30" />;
  const val = typeof data === "bigint" ? Number(data) : (data ?? 0);
  const formatted = Math.abs(val).toLocaleString("en-US", {
    minimumFractionDigits: 2,
  });
  // For suppliers: positive = supplier owes agency (green), negative = agency owes supplier (red)
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

// ─── Supplier Form Modal ──────────────────────────────────────────────────────

interface SupplierModalProps {
  open: boolean;
  onClose: () => void;
  supplier?: Client | null;
}

function SupplierModal({ open, onClose, supplier }: SupplierModalProps) {
  const addClient = useAddClient();
  const updateClient = useUpdateClient();
  const isEdit = !!supplier;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    defaultValues: {
      name: supplier?.name ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email?.[0] ?? "",
      openingBalance: supplier?.openingBalance ?? 0,
      clientType: "supplier",
    },
  });

  useState(() => {
    reset({
      name: supplier?.name ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email?.[0] ?? "",
      openingBalance: supplier?.openingBalance ?? 0,
      clientType: "supplier",
    });
  });

  const onSubmit = async (data: ClientFormData) => {
    try {
      if (isEdit && supplier) {
        await updateClient.mutateAsync({
          ...data,
          id: supplier.id,
          clientType: "supplier",
        });
        toast.success("Supplier updated successfully");
      } else {
        await addClient.mutateAsync({ ...data, clientType: "supplier" });
        toast.success("Supplier added successfully");
      }
      reset();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save supplier",
      );
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
            {isEdit ? "Edit Supplier" : "Add Supplier"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="sup-name">Name *</Label>
            <Input
              id="sup-name"
              placeholder="Supplier / airline name"
              {...register("name", { required: "Name is required" })}
              data-ocid="supplier-name-input"
              className="bg-secondary border-border/40"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-phone">Phone *</Label>
            <Input
              id="sup-phone"
              placeholder="+1 234 567 8900"
              {...register("phone", { required: "Phone is required" })}
              data-ocid="supplier-phone-input"
              className="bg-secondary border-border/40"
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-email">Email</Label>
            <Input
              id="sup-email"
              type="email"
              placeholder="supplier@example.com"
              {...register("email")}
              data-ocid="supplier-email-input"
              className="bg-secondary border-border/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-balance">Opening Balance</Label>
            <Input
              id="sup-balance"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("openingBalance", { valueAsNumber: true })}
              data-ocid="supplier-balance-input"
              className="bg-secondary border-border/40"
            />
            <p className="text-xs text-muted-foreground">
              Negative = agency owes supplier
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
              data-ocid="supplier-save-btn"
            >
              {isSubmitting ? "Saving..." : isEdit ? "Update" : "Add Supplier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading } = useSuppliers();
  const deleteClient = useDeleteClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalPayable = suppliers.reduce(
    (sum, s) => sum + (s.openingBalance < 0 ? Math.abs(s.openingBalance) : 0),
    0,
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteClient.mutateAsync(deleteId);
      toast.success("Supplier deleted");
    } catch {
      toast.error("Failed to delete supplier");
    } finally {
      setDeleteId(null);
    }
  };

  type SupplierRow = Record<string, unknown> & Client;

  const columns: Column<SupplierRow>[] = [
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
      render: (_, row) => <SupplierBalanceCell clientId={row.id} />,
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
            data-ocid="supplier-edit-btn"
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
            data-ocid="supplier-delete-btn"
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
              Suppliers
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Airlines, visa companies, and other suppliers
            </p>
          </div>
          <Button
            className="bg-accent text-accent-foreground hover:brightness-110 gap-2"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            data-ocid="add-supplier-btn"
          >
            <PlusCircle className="w-4 h-4" />
            Add Supplier
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
              <Building2 className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                Total
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-12 bg-muted/30" />
            ) : (
              <p className="text-2xl font-display font-semibold text-foreground">
                {suppliers.length}
              </p>
            )}
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                Payable
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-24 bg-muted/30" />
            ) : (
              <p
                className="text-2xl font-display font-semibold"
                style={{ color: "oklch(0.65 0.22 22)" }}
              >
                {totalPayable.toLocaleString("en-US", {
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
            data={suppliers as SupplierRow[]}
            isLoading={isLoading}
            emptyMessage="No suppliers yet. Add your first supplier."
            emptyIcon={<Building2 className="w-8 h-8 opacity-30" />}
          />
        </motion.div>
      </div>

      {/* Add/Edit modal */}
      <SupplierModal
        open={modalOpen}
        supplier={editing}
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
            <AlertDialogTitle>Delete Supplier?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All associated records will remain
              but the supplier will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              data-ocid="supplier-delete-confirm-btn"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
