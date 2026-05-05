import { z } from 'zod';

// === Validation Schemas ===

export const TeamRoleSchema = z.enum(['owner', 'admin', 'agent']);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const ChatVisibilitySchema = z.enum(['all', 'assigned', 'department']);
export type ChatVisibility = z.infer<typeof ChatVisibilitySchema>;

export const MemberPermissionsSchema = z.object({
  automation: z.boolean(),
  aiAgent: z.boolean(),
  contacts: z.boolean(),
  templates: z.boolean(),
  campaigns: z.boolean(),
  voiceCalls: z.boolean(),
  settings: z.boolean(),
  chatVisibility: ChatVisibilitySchema,
});

export type MemberPermissions = z.infer<typeof MemberPermissionsSchema>;

export type ActionState<T = null> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

// === Presets & Configuration ===

export const ROLE_PRESETS: Record<TeamRole, MemberPermissions> = {
  owner: {
    automation: true,
    aiAgent: true,
    contacts: true,
    templates: true,
    campaigns: true,
    voiceCalls: true,
    settings: true,
    chatVisibility: 'all',
  },
  admin: {
    automation: true,
    aiAgent: true,
    contacts: true,
    templates: true,
    campaigns: true,
    voiceCalls: true,
    settings: false,
    chatVisibility: 'all',
  },
  agent: {
    automation: false,
    aiAgent: false,
    contacts: false,
    templates: false,
    campaigns: false,
    voiceCalls: false,
    settings: false,
    chatVisibility: 'assigned',
  },
};

// === Core Logic ===

/**
 * Resolves permissions for a given role and optional custom overrides.
 */
export function getPermissions(role: unknown, customPermissions?: MemberPermissions | null): MemberPermissions {
  const validatedRole = TeamRoleSchema.safeParse(role);
  const activeRole = validatedRole.success ? validatedRole.data : 'agent';

  if (activeRole === 'owner') return ROLE_PRESETS.owner;
  if (customPermissions) {
    const validatedCustom = MemberPermissionsSchema.safeParse(customPermissions);
    if (validatedCustom.success) return validatedCustom.data;
  }
  
  return ROLE_PRESETS[activeRole] || ROLE_PRESETS.agent;
}

/**
 * Checks if a role/permission set has access to a specific resource.
 */
export function hasPermission(
  role: unknown,
  permissions: MemberPermissions | null | undefined,
  resource: keyof Omit<MemberPermissions, 'chatVisibility'>
): boolean {
  const validatedRole = TeamRoleSchema.safeParse(role);
  const activeRole = validatedRole.success ? validatedRole.data : 'agent';

  if (activeRole === 'owner') return true;
  const perms = getPermissions(activeRole, permissions);
  return perms[resource] === true;
}

export function canSeeAllChats(role: unknown, permissions: MemberPermissions | null | undefined): boolean {
  const validatedRole = TeamRoleSchema.safeParse(role);
  const activeRole = validatedRole.success ? validatedRole.data : 'agent';

  if (activeRole === 'owner') return true;
  const perms = getPermissions(activeRole, permissions);
  return perms.chatVisibility === 'all';
}

export function getChatVisibility(role: unknown, permissions: MemberPermissions | null | undefined): ChatVisibility {
  const validatedRole = TeamRoleSchema.safeParse(role);
  const activeRole = validatedRole.success ? validatedRole.data : 'agent';

  if (activeRole === 'owner') return 'all';
  const perms = getPermissions(activeRole, permissions);
  return perms.chatVisibility;
}

export type PermissionResource = keyof Omit<MemberPermissions, 'chatVisibility'>;

export const ROUTE_PERMISSIONS: Record<string, PermissionResource> = {
  '/automation': 'automation',
  '/settings/ai': 'aiAgent',
  '/contacts': 'contacts',
  '/templates': 'templates',
  '/campaigns': 'campaigns',
  '/settings/voice': 'voiceCalls',
  '/settings': 'settings',
};
