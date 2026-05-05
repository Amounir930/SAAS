import { z } from 'zod';
import type { WhatsAppProvider, WhatsAppInstanceConfig, IntegrationType } from './types';
import { EvolutionProvider } from './providers/evolution';
import { MetaCloudProvider } from './providers/meta-cloud';
import { TwilioProvider } from './providers/twilio';
import { db } from '@/lib/db/drizzle';
import { evolutionInstances } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// --- Validation Schemas ---
const IntegrationTypeSchema = z.enum(['EVOLUTION', 'META-CLOUD', 'TWILIO', 'WHATSAPP-BAILEYS', 'WHATSAPP-BUSINESS']);

const InstanceConfigSchema = z.object({
  id: z.number(),
  instanceName: z.string(),
  accessToken: z.string().default(''),
  integration: IntegrationTypeSchema,
  metaToken: z.string().nullable().optional(),
  metaPhoneNumberId: z.string().nullable().optional(),
  twilioAccountSid: z.string().nullable().optional(),
  twilioAuthToken: z.string().nullable().optional(),
});

/**
 * Expert Provider Factory (Hardened)
 * Ensures robust initialization of WhatsApp providers with strict type validation.
 */
export async function getWhatsAppProvider(instanceOrId: WhatsAppInstanceConfig | number): Promise<WhatsAppProvider> {
  let instance: WhatsAppInstanceConfig;

  try {
    // 1. Resolve Instance from DB if ID is provided
    if (typeof instanceOrId === 'number') {
      const dbInstance = await db.query.evolutionInstances.findFirst({
        where: eq(evolutionInstances.id, instanceOrId),
      });

      if (!dbInstance) {
        throw new Error(`Instance ID ${instanceOrId} not found`);
      }

      // Map and validate DB structure
      const validated = InstanceConfigSchema.parse({
        id: dbInstance.id,
        instanceName: dbInstance.instanceName,
        accessToken: dbInstance.accessToken || '',
        integration: dbInstance.integration,
        metaToken: dbInstance.metaToken,
        metaPhoneNumberId: dbInstance.metaPhoneNumberId,
        twilioAccountSid: dbInstance.twilioAccountSid,
        twilioAuthToken: dbInstance.twilioAuthToken,
      });

      instance = validated;
    } else {
      // Validate provided config
      instance = InstanceConfigSchema.parse(instanceOrId);
    }

    // 2. Provider Dispatching
    switch (instance.integration) {
      case 'META-CLOUD':
        return new MetaCloudProvider(instance);
      
      case 'EVOLUTION':
      case 'WHATSAPP-BAILEYS':
      case 'WHATSAPP-BUSINESS':
        return new EvolutionProvider(instance);
      
      case 'TWILIO':
        return new TwilioProvider(instance);

      default:
        throw new Error(`Unsupported integration type: ${instance.integration}`);
    }
  } catch (error) {
    console.error('[ProviderFactory_Error]', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('PROVIDER_INITIALIZATION_FAILED');
  }
}
