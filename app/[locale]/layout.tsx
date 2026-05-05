import type { Metadata, Viewport } from 'next';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { SWRConfig } from 'swr';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { getBranding } from '@/lib/db/queries/branding';
import { BrandingProvider } from '@/providers/branding-provider';
import { CallProviderWrapper } from '@/providers/call-provider-wrapper';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound, redirect } from 'next/navigation';
import { locales } from '@/i18n/request';
import { cache } from 'react';

type Locale = (typeof locales)[number];

const getBrandingCached = cache(async () => {
  try {
    return await getBranding();
  } catch {
    return null;
  }
});

function isValidLocale(locale: string): locale is Locale {
  return (locales as readonly string[]).includes(locale);
}

function buildFaviconUrl(
  branding: Awaited<ReturnType<typeof getBrandingCached>>
): string {
  if (!branding?.faviconUrl) return '/favicon.ico';
  const ts = branding.updatedAt ? new Date(branding.updatedAt).getTime() : Date.now();
  const safeTs = Number.isFinite(ts) ? ts : Date.now();
  return `${branding.faviconUrl}?v=${safeTs}`;
}

export const viewport: Viewport = {
  // Accessibility-friendly: allows user zooming
};

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!locale || !isValidLocale(locale)) {
    return {
      title: 'WhatSaaS',
      description:
        'Get started quickly with a WhatsApp CRM designed to manage leads, conversations, and sales in one place.',
      icons: { icon: '/favicon.ico' }
    };
  }

  const branding = await getBrandingCached();

  return {
    title: branding?.name || 'WhatSaaS',
    description:
      'Get started quickly with a WhatsApp CRM designed to manage leads, conversations, and sales in one place.',
    icons: {
      icon: buildFaviconUrl(branding)
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locale || !isValidLocale(locale)) {
    redirect('/en');
  }

  // Set the request locale for server-side next-intl
  setRequestLocale(locale);

  // Fetch messages for the specific locale
  const messages = await getMessages({ locale });

  const brandingPromise = getBrandingCached();

  // Backend-safe fetching: don't let team failure crash the whole page
  let userData: Awaited<ReturnType<typeof getUser>> | null = null;
  let teamData: Awaited<ReturnType<typeof getTeamForUser>> | null = null;

  try {
    userData = await getUser();
    if (userData) {
      try {
        teamData = await getTeamForUser();
      } catch {
        teamData = null;
      }
    }
  } catch {
    userData = null;
    teamData = null;
  }

  const branding = await brandingPromise;

  return (
    <>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <SWRConfig
              value={{
                fallback: {
                  '/api/user': userData,
                  '/api/team': teamData
                }
              }}
            >
              <BrandingProvider branding={branding}>
                <CallProviderWrapper>{children}</CallProviderWrapper>
                <Toaster richColors position="top-center" theme="system" />
              </BrandingProvider>
            </SWRConfig>
          </ThemeProvider>
        </NextIntlClientProvider>
    </>
  );
}