import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

// Can be imported from a shared config
export const locales = ['en', 'ar', 'pt', 'es'] as const;
export const defaultLocale = 'en';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid, fallback to default if not
  const safeLocale = (locale && (locales as readonly string[]).includes(locale)) 
    ? locale 
    : defaultLocale;

  return {
    locale: safeLocale,
    messages: (await import(`../messages/${safeLocale}.json`)).default
  };
});