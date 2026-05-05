'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ChatPlaceholderPage() {
  const t = useTranslations('Chat');

  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/30 text-center p-8">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <MessageSquare className="h-10 w-10 text-primary opacity-40" />
      </div>
      <h2 className="text-2xl font-semibold mb-2">{t('inbox_placeholder_title')}</h2>
      <p className="text-muted-foreground max-w-sm">
        {t('inbox_placeholder_desc')}
      </p>
    </div>
  );
}
