import "server-only";

import twilio, { type Twilio } from "twilio";

type TwilioEnv = {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  authToken: string;
  twimlAppSid: string;
  callerId?: string;
};

export class TwilioConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TwilioConfigError";
  }
}

let cachedClient: Twilio | null = null;
let cachedEnv: TwilioEnv | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new TwilioConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function readTwilioEnv(): TwilioEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = {
    accountSid: requiredEnv("TWILIO_ACCOUNT_SID"),
    apiKeySid: requiredEnv("TWILIO_API_KEY_SID"),
    apiKeySecret: requiredEnv("TWILIO_API_KEY_SECRET"),
    authToken: requiredEnv("TWILIO_AUTH_TOKEN"),
    twimlAppSid: requiredEnv("TWILIO_TWIML_APP_SID"),
    callerId: optionalEnv("TWILIO_CALLER_ID"),
  };

  return cachedEnv;
}

/**
 * Returns a Twilio REST client instance.
 * If config is provided, it uses those credentials. Otherwise, it defaults to environment variables.
 */
export function getTwilioClient(config?: Partial<TwilioEnv>): Twilio {
  if (!config && cachedClient) return cachedClient;

  const env = config ? { ...readTwilioEnv(), ...config } : readTwilioEnv();
  
  const client = twilio(env.apiKeySid, env.apiKeySecret, {
    accountSid: env.accountSid,
  });

  if (!config) cachedClient = client;
  return client;
}

/**
 * Expert Alias for getTwilioClient to satisfy API route requirements.
 */
export const createTwilioClient = getTwilioClient;

/**
 * Generates a Twilio Voice access token for browser/mobile SDK clients.
 */
export function createVoiceAccessToken(params: {
  identity: string;
  ttl?: number;
}): string {
  const { identity, ttl = 3600 } = params;
  if (!identity?.trim()) {
    throw new Error("identity is required to create a voice access token.");
  }

  const env = readTwilioEnv();
  const AccessToken = twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const token = new AccessToken(env.accountSid, env.apiKeySid, env.apiKeySecret, {
    identity: identity.trim(),
    ttl,
  });

  token.addGrant(
    new VoiceGrant({
      outgoingApplicationSid: env.twimlAppSid,
      incomingAllow: true,
    }),
  );

  return token.toJwt();
}

/**
 * Starts an outbound call using Twilio REST API.
 * You can provide either:
 * - url: TwiML URL
 * - twiml: inline TwiML XML
 */
export async function startOutboundCall(params: {
  to: string;
  from?: string;
  url?: string;
  twiml?: string;
  statusCallback?: string;
  statusCallbackEvents?: Array<
    "initiated" | "ringing" | "answered" | "completed"
  >;
  machineDetection?: "Enable" | "DetectMessageEnd";
  timeout?: number;
  record?: boolean;
}) {
  const client = getTwilioClient();
  const env = readTwilioEnv();

  const to = params.to?.trim();
  const from = (params.from || env.callerId || "").trim();

  if (!to) throw new Error("Outbound call requires a 'to' number.");
  if (!from) {
    throw new Error(
      "Outbound call requires a 'from' number. Set TWILIO_CALLER_ID or pass from explicitly.",
    );
  }
  if (!params.url && !params.twiml) {
    throw new Error("Outbound call requires either 'url' or 'twiml'.");
  }

  const payload: Record<string, unknown> = {
    to,
    from,
    timeout: params.timeout ?? 25,
    record: params.record ?? false,
  };

  if (params.url) payload.url = params.url;
  if (params.twiml) payload.twiml = params.twiml;
  if (params.machineDetection) payload.machineDetection = params.machineDetection;
  if (params.statusCallback) payload.statusCallback = params.statusCallback;
  if (params.statusCallbackEvents?.length) {
    payload.statusCallbackEvent = params.statusCallbackEvents;
  }

  return client.calls.create(payload as any);
}

/**
 * Fetch single call details.
 */
export async function getCall(callSid: string) {
  const sid = callSid?.trim();
  if (!sid) throw new Error("callSid is required.");
  return getTwilioClient().calls(sid).fetch();
}

/**
 * Update call status (e.g., complete/cancel) or redirect call flow.
 */
export async function updateCall(
  callSid: string,
  params:
    | { status: "canceled" | "completed" }
    | { url: string; method?: "GET" | "POST" }
    | { twiml: string },
) {
  const sid = callSid?.trim();
  if (!sid) throw new Error("callSid is required.");

  return getTwilioClient().calls(sid).update(params);
}

/**
 * Convenience helper to end an active call.
 */
export async function endCall(callSid: string) {
  return updateCall(callSid, { status: "completed" });
}

/**
 * Lists recent calls with optional filters.
 */
export async function listCalls(params?: {
  to?: string;
  from?: string;
  status?:
    | "queued"
    | "ringing"
    | "in-progress"
    | "completed"
    | "busy"
    | "failed"
    | "no-answer"
    | "canceled";
  limit?: number;
}) {
  const limit = Math.min(Math.max(params?.limit ?? 20, 1), 100);

  return getTwilioClient().calls.list({
    to: params?.to,
    from: params?.from,
    status: params?.status,
    limit,
  });
}