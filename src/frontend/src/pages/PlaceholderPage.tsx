import { Construction } from "lucide-react";
import { motion } from "motion/react";
import { Layout } from "../components/Layout";

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Layout title={title}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center min-h-64 gap-4"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "oklch(0.75 0.15 82 / 0.1)",
            border: "1px solid oklch(0.75 0.15 82 / 0.3)",
          }}
        >
          <Construction className="w-7 h-7 text-accent" />
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          This module is being built. Check back soon for the full{" "}
          <span className="text-accent">{title}</span> functionality.
        </p>
      </motion.div>
    </Layout>
  );
}
