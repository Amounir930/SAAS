import { getLocale } from 'next-intl/server';
import { Manrope } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['latin'] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) || 'en';

  return (
    <html lang={locale} suppressHydrationWarning className={manrope.className}>
      <body className="min-h-[100dvh] bg-background" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}