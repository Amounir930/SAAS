'use client';

import { createContext, useContext } from 'react';
import { z } from 'zod';
import { Branding } from '@/lib/db/schema';
import { logger } from '@/lib/logger';

// === Validation Schema ===

const BrandingSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  createdAt: z.union([z.number(), z.date()]).optional(),
  updatedAt: z.union([z.number(), z.date()]).optional(),
});

interface BrandingContextType {
  branding: Branding | null | undefined;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({
  children,
  branding,
}: {
  children: React.ReactNode;
  branding: Branding | null | undefined;
}) {
  // Validate branding if provided
  if (branding) {
    const validation = BrandingSchema.safeParse(branding);
    if (!validation.success) {
      logger.error('[BrandingProvider_Validation_Error]', { error: validation.error.format() });
      // In production, we might fallback to defaults instead of crashing
    }
  }

  return (
    <BrandingContext.Provider value={{ branding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
