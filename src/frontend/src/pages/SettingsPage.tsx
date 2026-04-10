import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building, FileText, Receipt, Settings2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Layout } from "../components/Layout";
import { useSettings, useUpdateSettings } from "../hooks/useBackend";
import type { SettingsFormData } from "../types";

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SettingsCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2.5 mb-1">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "oklch(0.75 0.15 82 / 0.12)" }}
        >
          <Icon className="w-4 h-4 text-accent" />
        </div>
        <h2 className="font-display font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── Numbering preview ────────────────────────────────────────────────────────

function NumberPreview({ prefix, nextNo }: { prefix: string; nextNo: number }) {
  const padded = String(nextNo).padStart(4, "0");
  return (
    <div
      className="mt-1.5 px-3 py-2 rounded-lg font-mono text-sm"
      style={{
        background: "oklch(0.75 0.15 82 / 0.06)",
        border: "1px solid oklch(0.75 0.15 82 / 0.2)",
        color: "oklch(0.75 0.15 82)",
      }}
    >
      Preview: {prefix || "—"}
      {padded}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CURRENCIES = ["USD", "PKR", "AED", "SAR", "EUR", "GBP"] as const;

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormData>({
    defaultValues: {
      agencyName: "",
      currency: "USD",
      invoicePrefix: "INV-",
      invoiceNextNo: 1,
      voucherPrefix: "VCH-",
      voucherNextNo: 1,
    },
  });

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      reset({
        agencyName: settings.agencyName,
        currency: settings.currency,
        invoicePrefix: settings.invoicePrefix,
        invoiceNextNo: Number(settings.invoiceNextNo),
        voucherPrefix: settings.voucherPrefix,
        voucherNextNo: Number(settings.voucherNextNo),
      });
    }
  }, [settings, reset]);

  const invoicePrefix = useWatch({ control, name: "invoicePrefix" });
  const invoiceNextNo = useWatch({ control, name: "invoiceNextNo" });
  const voucherPrefix = useWatch({ control, name: "voucherPrefix" });
  const voucherNextNo = useWatch({ control, name: "voucherNextNo" });

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await updateSettings.mutateAsync(data);
      toast.success("Settings saved successfully");
      reset(data); // clear dirty state
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings",
      );
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32 bg-muted/30" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className="h-40 w-full bg-muted/20 rounded-xl"
              />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure your agency preferences
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Agency Settings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <SettingsCard icon={Building} title="Agency Settings">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="agencyName">Agency Name</Label>
                  <Input
                    id="agencyName"
                    placeholder="My Travel Agency"
                    {...register("agencyName")}
                    data-ocid="settings-agency-name"
                    className="bg-secondary border-border/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="currency"
                          className="bg-secondary border-border/40"
                          data-ocid="settings-currency-select"
                        >
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent
                          style={{
                            background: "oklch(0.14 0 0)",
                            borderColor: "oklch(0.75 0.15 82 / 0.2)",
                          }}
                        >
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c} className="font-mono">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </SettingsCard>
          </motion.div>

          {/* Invoice Settings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <SettingsCard icon={FileText} title="Invoice Settings">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                  <Input
                    id="invoicePrefix"
                    placeholder="INV-"
                    {...register("invoicePrefix")}
                    data-ocid="settings-invoice-prefix"
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceNextNo">Next Invoice Number</Label>
                  <Input
                    id="invoiceNextNo"
                    type="number"
                    min={1}
                    {...register("invoiceNextNo", {
                      valueAsNumber: true,
                      min: { value: 1, message: "Must be at least 1" },
                    })}
                    data-ocid="settings-invoice-next-no"
                    className="bg-secondary border-border/40 font-mono"
                  />
                  {errors.invoiceNextNo && (
                    <p className="text-xs text-destructive">
                      {errors.invoiceNextNo.message}
                    </p>
                  )}
                </div>
              </div>
              <NumberPreview
                prefix={invoicePrefix}
                nextNo={invoiceNextNo || 1}
              />
            </SettingsCard>
          </motion.div>

          {/* Voucher Settings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <SettingsCard icon={Receipt} title="Voucher Settings">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="voucherPrefix">Voucher Prefix</Label>
                  <Input
                    id="voucherPrefix"
                    placeholder="VCH-"
                    {...register("voucherPrefix")}
                    data-ocid="settings-voucher-prefix"
                    className="bg-secondary border-border/40 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="voucherNextNo">Next Voucher Number</Label>
                  <Input
                    id="voucherNextNo"
                    type="number"
                    min={1}
                    {...register("voucherNextNo", {
                      valueAsNumber: true,
                      min: { value: 1, message: "Must be at least 1" },
                    })}
                    data-ocid="settings-voucher-next-no"
                    className="bg-secondary border-border/40 font-mono"
                  />
                  {errors.voucherNextNo && (
                    <p className="text-xs text-destructive">
                      {errors.voucherNextNo.message}
                    </p>
                  )}
                </div>
              </div>
              <NumberPreview
                prefix={voucherPrefix}
                nextNo={voucherNextNo || 1}
              />
            </SettingsCard>
          </motion.div>

          {/* Save button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-end pt-2"
          >
            <Button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="px-8 bg-accent text-accent-foreground hover:brightness-110 disabled:opacity-50"
              data-ocid="settings-save-btn"
            >
              {isSubmitting ? "Saving..." : "Save All Settings"}
            </Button>
          </motion.div>
        </form>
      </div>
    </Layout>
  );
}
