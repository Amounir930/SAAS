import "server-only";
import crypto from "node:crypto";

export type VoiceCallProvider = "twilio" | "mock";

export type VoiceCallStatus =
  | "queued"
  | "initiated"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "no-answer"
  | "failed"
  | "canceled";

export interface CreateVoiceCallInput {
  to: string;
  from?: string;
  locale?: "ar" | "en";
  message?: string;
  twiml?: string;
  metadata?: Record<string, unknown>;
  timeoutSeconds?: number;
  machineDetection?: "Enable" | "Disable";
}

export interface VoiceCallRecord {
  id: string;
  provider: VoiceCallProvider;
  providerCallId: string;
  to: string;
  from?: string;
  status: VoiceCallStatus;
  locale?: "ar" | "en";
  durationSeconds?: number | null;
  price?: string | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceCallWebhookPayload {
  provider: VoiceCallProvider;
  providerCallId: string;
  status: VoiceCallStatus;
  durationSeconds?: number;
  price?: string;
  currency?: string;
  raw?: unknown;
}

export interface VoiceCallRepository {
  create(input: VoiceCallRecord): Promise<void>;
  updateByProviderCallId(
    providerCallId: string,
    patch: Partial<VoiceCallRecord>,
  ): Promise<void>;
  getByProviderCallId(providerCallId: string): Promise<VoiceCallRecord | null>;
}

export interface VoiceCallServiceOptions {
  provider?: VoiceCallProvider;
  repository?: VoiceCallRepository;
  appBaseUrl?: string;
}

type TwilioCreateResponse = {
  sid: string;
  status: string;
  to: string;
  from: string;
};

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

function normalizeStatus(input?: string): VoiceCallStatus {
  const s = String(input || "").toLowerCase().trim();
  switch (s) {
    case "queued":
      return "queued";
    case "initiated":
      return "initiated";
    case "ringing":
      return "ringing";
    case "in-progress":
    case "inprogress":
      return "in-progress";
    case "completed":
      return "completed";
    case "busy":
      return "busy";
    case "no-answer":
    case "noanswer":
      return "no-answer";
    case "failed":
      return "failed";
    case "canceled":
    case "cancelled":
      return "canceled";
    default:
      return "failed";
  }
}

function assertEnv(name: string, value?: string): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function toFormBody(data: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    params.set(k, String(v));
  }
  return params;
}

function buildBasicAuth(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function randomId(prefix = "vcall"): string {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function validatePhone(value: string, fieldName: string) {
  if (!E164_REGEX.test(value)) {
    throw new Error(`${fieldName} must be a valid E.164 phone number`);
  }
}

function escapeXml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function defaultTwiml(message?: string, locale: "ar" | "en" = "en") {
  const text =
    message ||
    (locale === "ar"
      ? "مرحباً، هذه مكالمة صوتية آلية من نظامك."
      : "Hello, this is an automated voice call from your system.");
  const language = locale === "ar" ? "ar-SA" : "en-US";
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="${language}" voice="alice">${escapeXml(
    text,
  )}</Say></Response>`;
}

export class VoiceCallService {
  private provider: VoiceCallProvider;
  private repository?: VoiceCallRepository;
  private appBaseUrl?: string;

  constructor(options: VoiceCallServiceOptions = {}) {
    this.provider = options.provider || (process.env.VOICE_CALL_PROVIDER as VoiceCallProvider) || "twilio";
    this.repository = options.repository;
    this.appBaseUrl = options.appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  }

  async createCall(input: CreateVoiceCallInput): Promise<VoiceCallRecord> {
    validatePhone(input.to, "to");
    if (input.from) validatePhone(input.from, "from");

    if (this.provider === "mock") {
      return this.createMockCall(input);
    }

    return this.createTwilioCall(input);
  }

  async handleWebhook(payload: VoiceCallWebhookPayload): Promise<void> {
    if (!this.repository) return;
    await this.repository.updateByProviderCallId(payload.providerCallId, {
      status: payload.status,
      durationSeconds: payload.durationSeconds,
      price: payload.price,
      currency: payload.currency,
      updatedAt: new Date(),
    });
  }

  verifyTwilioSignature(
    signature: string | null,
    url: string,
    params: Record<string, string>,
  ): boolean {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken || !signature) return false;

    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);

    const digest = crypto.createHmac("sha1", authToken).update(data).digest("base64");
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
  }

  async parseTwilioStatusCallback(formData: FormData): Promise<VoiceCallWebhookPayload> {
    const providerCallId = String(formData.get("CallSid") || "");
    const status = normalizeStatus(String(formData.get("CallStatus") || ""));
    const duration = formData.get("CallDuration");
    const price = formData.get("CallPrice");
    const currency = formData.get("CallPriceUnit");

    if (!providerCallId) throw new Error("Missing CallSid in webhook payload");

    return {
      provider: "twilio",
      providerCallId,
      status,
      durationSeconds: duration ? Number(duration) : undefined,
      price: price ? String(price) : undefined,
      currency: currency ? String(currency) : undefined,
      raw: Object.fromEntries(formData.entries()),
    };
  }

  private async createTwilioCall(input: CreateVoiceCallInput): Promise<VoiceCallRecord> {
    const accountSid = assertEnv("TWILIO_ACCOUNT_SID", process.env.TWILIO_ACCOUNT_SID);
    const authToken = assertEnv("TWILIO_AUTH_TOKEN", process.env.TWILIO_AUTH_TOKEN);
    const from = input.from || assertEnv("TWILIO_PHONE_NUMBER", process.env.TWILIO_PHONE_NUMBER);

    const statusCallback =
      this.appBaseUrl?.replace(/\/$/, "") + "/api/plugins/voice-call/webhook";

    const twiml = input.twiml || defaultTwiml(input.message, input.locale || "en");

    const body = toFormBody({
      To: input.to,
      From: from,
      Twiml: twiml,
      StatusCallback: statusCallback,
      StatusCallbackMethod: "POST",
      Timeout: input.timeoutSeconds ?? 30,
      MachineDetection: input.machineDetection,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: buildBasicAuth(accountSid, authToken),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Twilio call creation failed (${res.status}): ${errorText}`);
    }

    const data = (await res.json()) as TwilioCreateResponse;

    const record: VoiceCallRecord = {
      id: randomId("vcall"),
      provider: "twilio",
      providerCallId: data.sid,
      to: input.to,
      from: data.from || from,
      status: normalizeStatus(data.status),
      locale: input.locale,
      metadata: input.metadata,
      durationSeconds: null,
      price: null,
      currency: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.repository) {
      await this.repository.create(record);
    }

    return record;
  }

  private async createMockCall(input: CreateVoiceCallInput): Promise<VoiceCallRecord> {
    const record: VoiceCallRecord = {
      id: randomId("vcall"),
      provider: "mock",
      providerCallId: randomId("mock_sid"),
      to: input.to,
      from: input.from || "+10000000000",
      status: "initiated",
      locale: input.locale,
      metadata: input.metadata,
      durationSeconds: null,
      price: null,
      currency: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (this.repository) {
      await this.repository.create(record);
    }

    return record;
  }
}

export const voiceCallService = new VoiceCallService();

// --- EXPERT EXPORTS FOR API ROUTES ---

import { db } from "@/lib/db/drizzle";
import { callCredits, callCreditTransactions, teamPhoneNumbers, callLogs } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { createVoiceAccessToken } from "./twilio-client";

export async function generateClientToken({ teamId, userId }: { teamId: number; userId: number }) {
  // Use identity format consistent with client-side expectation
  const identity = `user_${userId}_team_${teamId}`;
  const token = createVoiceAccessToken({ identity });
  
  return { token, identity };
}

export async function getCreditsBalance(teamId: number) {
  const [record] = await db.select().from(callCredits).where(eq(callCredits.teamId, teamId));
  return record?.balance ?? 0;
}

export async function addCredits(teamId: number, amount: number, paymentIntentId?: string, description?: string) {
  await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(callCredits).where(eq(callCredits.teamId, teamId));
    
    if (existing) {
      await tx.update(callCredits)
        .set({ 
          balance: sql`${callCredits.balance} + ${amount}`,
          updatedAt: new Date() 
        })
        .where(eq(callCredits.teamId, teamId));
    } else {
      await tx.insert(callCredits).values({
        teamId,
        balance: amount,
        updatedAt: new Date()
      });
    }

    // Record transaction
    await tx.insert(callCreditTransactions).values({
      teamId,
      amount,
      type: amount > 0 ? 'purchase' : 'usage',
      description: description || (amount > 0 ? 'Credit purchase' : 'Call usage'),
      stripePaymentIntentId: paymentIntentId,
      createdAt: new Date()
    });
  });
}

export async function provisionPhoneNumber(teamId: number, phoneNumber: string, subscriptionId?: string) {
  await db.insert(teamPhoneNumbers).values({
    teamId,
    phoneNumber,
    stripeSubscriptionId: subscriptionId,
    isActive: true,
    createdAt: new Date()
  });
  
  console.info('[Expert Voice] Provisioned phone number for team:', teamId, phoneNumber);
}

export async function handleCallStatusUpdate(payload: {
  callSid: string;
  status: string;
  duration?: number;
  recordingUrl?: string;
  recordingSid?: string;
}) {
  const { callSid, status, duration, recordingUrl, recordingSid } = payload;
  
  await db.update(callLogs)
    .set({
      status,
      duration: duration || undefined,
      recordingUrl: recordingUrl || undefined,
      recordingSid: recordingSid || undefined,
      endedAt: (status === 'completed' || status === 'busy' || status === 'no-answer' || status === 'canceled') ? new Date() : undefined
    })
    .where(eq(callLogs.twilioCallSid, callSid));

  console.info('[Expert Voice] Updated call log status:', callSid, status);
}