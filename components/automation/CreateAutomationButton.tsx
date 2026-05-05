"use client";

import * as React from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TriggerType =
  | "new_lead"
  | "new_order"
  | "payment_failed"
  | "subscription_canceled"
  | "custom_webhook";

type ActionType =
  | "send_email"
  | "send_whatsapp"
  | "create_task"
  | "assign_owner"
  | "run_webhook";

export type CreateAutomationPayload = {
  name: string;
  description?: string;
  triggerType: TriggerType;
  actionType: ActionType;
  isActive: boolean;
};

type Dictionary = {
  button: string;
  title: string;
  description: string;
  name: string;
  namePlaceholder: string;
  details: string;
  detailsPlaceholder: string;
  trigger: string;
  action: string;
  active: string;
  cancel: string;
  create: string;
  creating: string;
  triggerOptions: Record<TriggerType, string>;
  actionOptions: Record<ActionType, string>;
};

const en: Dictionary = {
  button: "Create automation",
  title: "Create a new automation",
  description:
    "Define a trigger and action to automate recurring workflows in your workspace.",
  name: "Automation name",
  namePlaceholder: "e.g. Follow up failed payment",
  details: "Details (optional)",
  detailsPlaceholder: "Add context for your team…",
  trigger: "Trigger",
  action: "Action",
  active: "Enable immediately",
  cancel: "Cancel",
  create: "Create",
  creating: "Creating...",
  triggerOptions: {
    new_lead: "New lead created",
    new_order: "New order received",
    payment_failed: "Payment failed",
    subscription_canceled: "Subscription canceled",
    custom_webhook: "Custom webhook event",
  },
  actionOptions: {
    send_email: "Send email",
    send_whatsapp: "Send WhatsApp message",
    create_task: "Create task",
    assign_owner: "Assign owner",
    run_webhook: "Run outgoing webhook",
  },
};

const ar: Dictionary = {
  button: "إنشاء أتمتة",
  title: "إنشاء أتمتة جديدة",
  description: "حدّد المشغّل والإجراء لأتمتة المهام المتكررة في مساحة العمل.",
  name: "اسم الأتمتة",
  namePlaceholder: "مثال: متابعة فشل الدفع",
  details: "تفاصيل (اختياري)",
  detailsPlaceholder: "أضف ملاحظات لفريقك…",
  trigger: "المشغّل",
  action: "الإجراء",
  active: "تفعيل مباشرة",
  cancel: "إلغاء",
  create: "إنشاء",
  creating: "جارٍ الإنشاء...",
  triggerOptions: {
    new_lead: "عند إنشاء عميل محتمل جديد",
    new_order: "عند استلام طلب جديد",
    payment_failed: "عند فشل الدفع",
    subscription_canceled: "عند إلغاء الاشتراك",
    custom_webhook: "حدث Webhook مخصص",
  },
  actionOptions: {
    send_email: "إرسال بريد إلكتروني",
    send_whatsapp: "إرسال رسالة واتساب",
    create_task: "إنشاء مهمة",
    assign_owner: "تعيين مسؤول",
    run_webhook: "تشغيل Webhook خارجي",
  },
};

export interface CreateAutomationButtonProps {
  className?: string;
  locale?: "en" | "ar";
  dir?: "ltr" | "rtl";
  defaultOpen?: boolean;
  onCreated?: (payload: CreateAutomationPayload) => Promise<void> | void;
}

export default function CreateAutomationButton({
  className,
  locale = "en",
  dir,
  defaultOpen = false,
  onCreated,
}: CreateAutomationButtonProps) {
  const t = locale === "ar" ? ar : en;
  const textDir = dir ?? (locale === "ar" ? "rtl" : "ltr");

  const [open, setOpen] = React.useState(defaultOpen);
  const [isSubmitting, startTransition] = React.useTransition();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [triggerType, setTriggerType] = React.useState<TriggerType>("new_lead");
  const [actionType, setActionType] = React.useState<ActionType>("send_email");
  const [isActive, setIsActive] = React.useState(true);

  const isValid = name.trim().length >= 3;

  const resetForm = React.useCallback(() => {
    setName("");
    setDescription("");
    setTriggerType("new_lead");
    setActionType("send_email");
    setIsActive(true);
  }, []);

  const handleCreate = React.useCallback(() => {
    if (!isValid || isSubmitting) return;

    const payload: CreateAutomationPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      triggerType,
      actionType,
      isActive,
    };

    startTransition(async () => {
      await onCreated?.(payload);
      setOpen(false);
      resetForm();
    });
  }, [
    actionType,
    description,
    isActive,
    isSubmitting,
    isValid,
    name,
    onCreated,
    resetForm,
    triggerType,
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            "gap-2 bg-primary text-primary-foreground shadow-sm transition-all hover:shadow",
            className
          )}
        >
          <Plus className="size-4" />
          {t.button}
        </Button>
      </DialogTrigger>

      <DialogContent dir={textDir} className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="automation-name">{t.name}</Label>
            <Input
              id="automation-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.namePlaceholder}
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="automation-description">{t.details}</Label>
            <Textarea
              id="automation-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.detailsPlaceholder}
              className="min-h-[88px] resize-y"
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>{t.trigger}</Label>
              <Select
                value={triggerType}
                onValueChange={(v) => setTriggerType(v as TriggerType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(t.triggerOptions) as TriggerType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {t.triggerOptions[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>{t.action}</Label>
              <Select
                value={actionType}
                onValueChange={(v) => setActionType(v as ActionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(t.actionOptions) as ActionType[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {t.actionOptions[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
            <Label htmlFor="automation-active" className="cursor-pointer">
              {t.active}
            </Label>
            <Switch
              id="automation-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="me-2 size-4 animate-spin" />
                {t.creating}
              </>
            ) : (
              t.create
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}