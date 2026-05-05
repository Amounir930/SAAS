"use client";

import { formatDateSeparator } from "./utils";

interface DateSeparatorProps {
  date: Date;
}

export function DateSeparator({ date }: DateSeparatorProps) {
  return (
    <div className="flex items-center justify-center my-6">
      <div className="bg-muted px-4 py-1 rounded-full text-[11px] font-medium text-muted-foreground shadow-sm">
        {formatDateSeparator(date)}
      </div>
    </div>
  );
}
