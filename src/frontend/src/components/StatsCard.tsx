import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "gold" | "green" | "red" | "blue";
  prefix?: string;
  index?: number;
}

const COLOR_MAP = {
  gold: {
    icon: "text-accent",
    iconBg: "bg-accent/10 border-accent/20",
    trend: "text-accent",
  },
  green: {
    icon: "text-emerald-400",
    iconBg: "bg-emerald-400/10 border-emerald-400/20",
    trend: "text-emerald-400",
  },
  red: {
    icon: "text-red-400",
    iconBg: "bg-red-400/10 border-red-400/20",
    trend: "text-red-400",
  },
  blue: {
    icon: "text-blue-400",
    iconBg: "bg-blue-400/10 border-blue-400/20",
    trend: "text-blue-400",
  },
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend = "neutral",
  trendValue,
  color = "gold",
  prefix = "",
  index = 0,
}: StatsCardProps) {
  const colors = COLOR_MAP[color];
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
        ? "text-red-400"
        : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="stat-card group"
      data-ocid={`stats-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
            {title}
          </p>
        </div>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colors.iconBg}`}
        >
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
      </div>

      <motion.p
        className="text-2xl font-display font-semibold text-foreground mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: index * 0.08 + 0.2 }}
      >
        {prefix}
        {typeof value === "number"
          ? value.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })
          : value}
      </motion.p>

      {trendValue && (
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  );
}
