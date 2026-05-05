import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getWhatsAppProvider } from '../provider-factory';
import { EvolutionProvider } from '../providers/evolution';
import { MetaCloudProvider } from '../providers/meta-cloud';
import type { WhatsAppInstanceConfig } from '../types';

const evolutionConfig: WhatsAppInstanceConfig = {
  id: 1,
  instanceName: 'evo-instance',
  accessToken: 'token-123',
  integration: 'EVOLUTION',
};

const metaCloudConfig: WhatsAppInstanceConfig = {
  id: 3,
  instanceName: 'meta-direct',
  accessToken: 'token-meta',
  integration: 'META-CLOUD',
  metaPhoneNumberId: '67890',
};

describe('Provider Factory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWhatsAppProvider (async)', () => {
    it('should return EvolutionProvider for EVOLUTION', async () => {
      const provider = await getWhatsAppProvider(evolutionConfig);
      expect(provider).toBeInstanceOf(EvolutionProvider);
      expect(provider.providerType).toBe('evolution');
    });

    it('should return MetaCloudProvider for META-CLOUD', async () => {
      const provider = await getWhatsAppProvider(metaCloudConfig);
      expect(provider).toBeInstanceOf(MetaCloudProvider);
      expect(provider.providerType).toBe('meta-cloud');
    });
  });
});
