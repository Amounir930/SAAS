import { z } from 'zod';

// === Validation Schemas ===

const PluginIdSchema = z.string()
  .trim()
  .min(1, { message: "Plugin ID is required" })
  .regex(/^[a-z0-9-]+$/, {
    message: "Plugin ID must be lowercase alphanumeric with hyphens only",
  });

type PluginId = z.infer<typeof PluginIdSchema>;

type ActionState<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// === Registry Logic ===

// Static list of installed plugins (Hardened)
const INSTALLED_PLUGINS = new Set<string>([
  'ai-chat',
]);

/**
 * Hardened check for plugin installation status.
 * Implements strict ID validation to prevent prototype pollution or malformed queries.
 */
export function isPluginInstalled(rawPluginId: unknown): ActionState<boolean> {
  try {
    const validatedId = PluginIdSchema.parse(rawPluginId);
    const isInstalled = INSTALLED_PLUGINS.has(validatedId);
    
    return { success: true, data: isInstalled };
  } catch (error: any) {
    console.error('[PluginRegistry_Validation_Failed]', { input: 'REDACTED' });
    return { 
      success: false, 
      error: 'Invalid plugin identifier provided', 
      code: 'INVALID_ID' 
    };
  }
}

/**
 * Retrieves a list of all installed plugins with type-safe mapping.
 */
export function getInstalledPlugins(): ActionState<string[]> {
  try {
    const plugins = Array.from(INSTALLED_PLUGINS).sort();
    return { success: true, data: plugins };
  } catch (error: any) {
    return { success: false, error: 'Failed to retrieve plugin registry', code: 'REGISTRY_ERROR' };
  }
}
