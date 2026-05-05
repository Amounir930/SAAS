import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleCallStatusUpdate } from '@/lib/plugins/voice-call/service';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

// --- Validation Schemas ---
const TwilioWebhookSchema = z.object({
  CallSid: z.string().optional(),
  CallStatus: z.string().optional(),
  CallDuration: z.string().optional(),
  RecordingUrl: z.string().optional(),
  RecordingSid: z.string().optional(),
});

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response/>';

/**
 * Twilio Webhook Handler - Sanitized
 * Supports both URL-encoded (standard) and JSON (rare) payloads.
 */
export async function POST(request: Request) {
  try {
    const limited = checkRateLimit(`webhook:${getClientIp(request)}`, RATE_LIMITS.webhook);
    if (limited) return limited;

    const contentType = request.headers.get('content-type') || '';
    let rawData: Record<string, any> = {};

    // 1. Unified Payload Extraction
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      params.forEach((value, key) => {
        rawData[key] = value;
      });
    } else if (contentType.includes('application/json')) {
      rawData = await request.json().catch(() => ({}));
    }

    // 2. Schema Validation
    const parsed = TwilioWebhookSchema.safeParse(rawData);
    if (!parsed.success) {
      console.warn('[Twilio Webhook] Validation failed:', parsed.error.format());
      return new Response(TWIML_EMPTY, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const { CallSid, CallStatus, CallDuration, RecordingUrl, RecordingSid } = parsed.data;

    if (!CallSid) {
      return new Response(TWIML_EMPTY, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // 3. Secure Service Invocation
    await handleCallStatusUpdate({
      callSid: CallSid,
      status: CallStatus || 'unknown',
      duration: CallDuration ? parseInt(CallDuration, 10) : undefined,
      recordingUrl: RecordingUrl || undefined,
      recordingSid: RecordingSid || undefined,
    }).catch(err => console.error('[Twilio Webhook] Service error:', err));

    return new Response(TWIML_EMPTY, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error: any) {
    console.error('[Twilio Webhook Fatal Error]', error.message);
    return new Response(TWIML_EMPTY, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
