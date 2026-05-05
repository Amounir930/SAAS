/**
 * Expert Automation Utilities
 * Standardized variable replacement and helper functions for the Automation Engine.
 */

export function replaceVariables(text: string, variables: Record<string, any> | null): string {
    if (!text || !variables) return text;
    
    return text.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
        // Support both dot notation (e.g. contact.name) and flat notation (e.g. contact_name)
        const normalizedKey = key.replace(/\./g, '_');
        const value = variables[normalizedKey] ?? variables[key] ?? "";
        
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
}

/**
 * Utility to safe-parse JSON with a default value.
 */
export function safeJsonParse<T>(json: string | null | undefined, defaultValue: T): T {
    if (!json) return defaultValue;
    try {
        return JSON.parse(json) as T;
    } catch {
        return defaultValue;
    }
}
