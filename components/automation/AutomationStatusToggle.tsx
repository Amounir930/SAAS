"use client";

import * as React from "react";
import { CheckCircle2, Loader2, PauseCircle, PlayCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type Locale = "en" | "ar";

interface AutomationStatusToggleLabels {
  active: string;
  inactive: string;
  activating: string;
  deactivating: string;
  srLabel: string;
}

interface AutomationStatusToggleProps {
  initialEnabled: boolean;
  onToggle?: (nextEnabled: boolean) => Promise<void> | void;
  disabled?: boolean;
  showStatusBadge?: boolean;
  locale?: Locale;
  labels?: Partial<AutomationStatusToggleLabels>;
  className?: string;
  id?: string | number;
}

const DEFAULT_LABELS: Record<Locale, AutomationStatusToggleLabels> = {
  en: {
    active: "Active",
    inactive: "Inactive",
    activating: "Activating...",
    deactivating: "Deactivating...",
    srLabel: "Toggle automation status",
  },
  ar: {
    active: "مفعّل",
    inactive: "متوقف",
    activating: "جارٍ التفعيل...",
    deactivating: "جارٍ الإيقاف...",
    srLabel: "تبديل حالة الأتمتة",
  },
};

export default function AutomationStatusToggle({
  initialEnabled,
  onToggle,
  disabled = false,
  showStatusBadge = true,
  locale = "en",
  labels,
  className,
  id,
}: AutomationStatusToggleProps) {
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  const t = { ...DEFAULT_LABELS[locale], ...labels };

  const handleChange = (nextEnabled: boolean) => {
    if (disabled || isPending) return;

    const prev = enabled;
    setEnabled(nextEnabled);

    startTransition(async () => {
      try {
        await onToggle?.(nextEnabled);
      } catch (error) {
        setEnabled(prev);
        console.error("Failed to update automation status:", error);
      }
    });
  };

  const statusLabel = isPending
    ? enabled
      ? t.activating
      : t.deactivating
    : enabled
      ? t.active
      : t.inactive;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-2 backdrop-blur-sm",
        className,
      )}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <div className="relative">
        <Switch
          id={id?.toString()}
          checked={enabled}
          onCheckedChange={handleChange}
          disabled={disabled || isPending}
          aria-label={t.srLabel}
          className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted-foreground/40"
        />
        <span className="sr-only">{t.srLabel}</span>
      </div>

      {showStatusBadge && (
        <Badge
          variant={enabled ? "default" : "secondary"}
          className={cn(
            "min-w-[110px] justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium",
            enabled
              ? "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400"
              : "bg-muted text-muted-foreground ring-1 ring-border",
          )}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : enabled ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <PauseCircle className="h-3.5 w-3.5" />
          )}
          <span>{statusLabel}</span>
        </Badge>
      )}

      {!showStatusBadge && (
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : enabled ? (
            <PlayCircle className="h-4 w-4 text-emerald-500" />
          ) : (
            <PauseCircle className="h-4 w-4" />
          )}
          {statusLabel}
        </span>
      )}
    </div>
  );
}