import { redirect } from 'next/navigation';
import { z } from 'zod';

const RedirectPathSchema = z.string().regex(/^\/[a-z]{2}$/);

export default function RootPage() {
  const target = '/en';
  RedirectPathSchema.parse(target);
  redirect(target);
}
