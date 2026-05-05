'use server';

import { db } from '@/lib/db/drizzle';
import { branding } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { checkRoutePermission } from '@/lib/auth/permissions-guard';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const BrandingSchema = z.object({
  name: z.string().min(1).max(100),
});

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];

export async function updateBranding(formData: FormData) {
  try {
    // Forensic Security: Always check permissions in Server Actions
    const { error: permError } = await checkRoutePermission('settings');
    if (permError) {
      return { success: false, message: 'Unauthorized access' };
    }

    const name = formData.get('name') as string;
    const logo = formData.get('logo') as File | null;
    const favicon = formData.get('favicon') as File | null;

    const validated = BrandingSchema.safeParse({ name });
    if (!validated.success) {
      return { success: false, message: validated.error.issues[0].message };
    }

    const uploadDir = join(process.cwd(), 'public/uploads/branding');
    await mkdir(uploadDir, { recursive: true });

    let logoUrl = '';
    if (logo && logo.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(logo.type) || logo.size > MAX_IMAGE_SIZE) {
        return { success: false, message: 'Invalid logo file' };
      }
      const bytes = await logo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `logo-${Date.now()}-${logo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const path = join(uploadDir, filename);
      await writeFile(path, buffer);
      logoUrl = `/uploads/branding/${filename}`;
    }

    let faviconUrl = '';
    if (favicon && favicon.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(favicon.type) || favicon.size > MAX_IMAGE_SIZE) {
        return { success: false, message: 'Invalid favicon file' };
      }
      const bytes = await favicon.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `favicon-${Date.now()}-${favicon.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const path = join(uploadDir, filename);
      await writeFile(path, buffer);
      faviconUrl = `/uploads/branding/${filename}`;
    }

    const currentBranding = await db.query.branding.findFirst();

    if (currentBranding) {
      await db
        .update(branding)
        .set({
          name: validated.data.name,
          logoUrl: logoUrl || currentBranding.logoUrl,
          faviconUrl: faviconUrl || currentBranding.faviconUrl,
          updatedAt: new Date(),
        })
        .where(eq(branding.id, currentBranding.id));
    } else {
      await db.insert(branding).values({
        name: validated.data.name,
        logoUrl,
        faviconUrl,
      });
    }

    await logger.info('Branding updated', {
      adminAction: true,
      updatedFields: {
        name: validated.data.name,
        logoChanged: !!logoUrl,
        faviconChanged: !!faviconUrl
      }
    });

    revalidatePath('/(admin)/admin/branding');
    revalidatePath('/');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Branding update error:', error);
    return {
      success: false,
      message: 'Failed to update branding.',
    };
  }
}