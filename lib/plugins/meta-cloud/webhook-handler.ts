import { createHmac, timingSafeEqual } from "node:crypto";

type Logger = Pick<Console, "info" | "warn" | "error" | "debug">;

export type MetaWebhookRawBody = string;

export interface MetaWebhookContext {
  rawBody: MetaWebhookRawBody;
  headers: Headers;
  request: Request;
}

export interface MetaWebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: {
    body?: string;
  };
  image?: Record<string, unknown>;
  video?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  document?: Record<string, unknown>;
  sticker?: Record<string, unknown>;
  button?: Record<string, unknown>;
  interactive?: Record<string, unknown>;
  location?: Record<string, unknown>;
  contacts?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface MetaWebhookStatus {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  conversation?: Record<string, unknown>;
  pricing?: Record<string, unknown>;
  errors?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface MetaWebhookContact {
  wa_id?: string;
  profile?: {
    name?: string;
  };
  [key: string]: unknown;
}

export interface MetaWebhookMetadata {
  display_phone_number?: string;
  phone_number_id?: string;
  [key: string]: unknown;
}

export interface MetaWebhookValue {
  messaging_product?: string;
  metadata?: MetaWebhookMetadata;
  contacts?: MetaWebhookContact[];
  messages?: MetaWebhookMessage[];
  statuses?: MetaWebhookStatus[];
  errors?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface MetaWebhookChange {
  field?: string;
  value?: MetaWebhookValue;
  [key: string]: unknown;
}

export interface MetaWebhookEntry {
  id?: string;
  changes?: MetaWebhookChange[];
  [key: string]: unknown;
}

export interface MetaWebhookPayload {
  object?: string;
  entry?: MetaWebhookEntry[];
  [key: string]: unknown;
}

export interface MetaCloudWebhookHandlerOptions {
  /**
   * Used for GET verification flow:
   * hub.mode=subscribe&hub.verify_token=...&hub.challenge=...
   */
  verifyToken?: string;

  /**
   * Meta App Secret used to validate X-Hub-Signature-256
   */
  appSecret?: string;

  /**
   * If true and appSecret is set, invalid signature returns 401
   * Default: true
   */
  requireSignatureValidation?: boolean;

  logger?: Logger;

  onMessage?: (params: {
    message: MetaWebhookMessage;
    value: MetaWebhookValue;
    change: MetaWebhookChange;
    entry: MetaWebhookEntry;
    payload: MetaWebhookPayload;
    context: MetaWebhookContext;
  }) => Promise<void> | void;

  onStatus?: (params: {
    status: MetaWebhookStatus;
    value: MetaWebhookValue;
    change: MetaWebhookChange;
    entry: MetaWebhookEntry;
    payload: MetaWebhookPayload;
    context: MetaWebhookContext;
  }) => Promise<void> | void;

  onError?: (params: {
    error: unknown;
    payload?: MetaWebhookPayload;
    context: MetaWebhookContext;
  }) => Promise<void> | void;
}

type JsonRecord = Record<string, unknown>;

const DEFAULT_LOGGER: Logger = console;

function json(data: JsonRecord, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: init?.status ?? 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function getSignatureHeader(headers: Headers): string | null {
  return (
    headers.get("x-hub-signature-256") ??
    headers.get("X-Hub-Signature-256") ??
    null
  );
}

function computeMetaSignature(appSecret: string, rawBody: string): string {
  const digest = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return `sha256=${digest}`;
}

export class MetaCloudWebhookHandler {
  private readonly options: Required<
    Pick<MetaCloudWebhookHandlerOptions, "requireSignatureValidation" | "logger">
  > &
    Omit<
      MetaCloudWebhookHandlerOptions,
      "requireSignatureValidation" | "logger"
    >;

  constructor(options: MetaCloudWebhookHandlerOptions = {}) {
    this.options = {
      requireSignatureValidation: options.requireSignatureValidation ?? true,
      logger: options.logger ?? DEFAULT_LOGGER,
      ...options,
    };
  }

  /**
   * Handles Meta webhook verification (GET)
   * Returns:
   * - 200 + challenge on success
   * - 403 on token mismatch
   * - 400 on invalid mode/challenge
   */
  verify(request: Request): Response {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode !== "subscribe" || !challenge) {
      return new Response("Invalid verification request", { status: 400 });
    }

    if (!this.options.verifyToken) {
      this.options.logger.warn(
        "[meta-cloud:webhook] verifyToken missing; rejecting verification request."
      );
      return new Response("Verification token not configured", { status: 500 });
    }

    if (token !== this.options.verifyToken) {
      return new Response("Forbidden", { status: 403 });
    }

    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  /**
   * Handles Meta webhook events (POST)
   */
  async handle(request: Request): Promise<Response> {
    const rawBody = await request.text();
    const context: MetaWebhookContext = {
      rawBody,
      headers: request.headers,
      request,
    };

    try {
      if (!this.validateSignature(request.headers, rawBody)) {
        this.options.logger.warn(
          "[meta-cloud:webhook] Invalid webhook signature."
        );
        return json({ ok: false, error: "Invalid signature" }, { status: 401 });
      }

      const payload = this.parsePayload(rawBody);
      if (!payload) {
        return json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
      }

      await this.dispatch(payload, context);

      // Meta requires 200 within a short timeout.
      return json({ ok: true }, { status: 200 });
    } catch (error) {
      this.options.logger.error("[meta-cloud:webhook] Unhandled error:", error);
      if (this.options.onError) {
        await this.options.onError({ error, context });
      }
      return json({ ok: false, error: "Internal server error" }, { status: 500 });
    }
  }

  private parsePayload(rawBody: string): MetaWebhookPayload | null {
    try {
      const parsed = JSON.parse(rawBody) as MetaWebhookPayload;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  private validateSignature(headers: Headers, rawBody: string): boolean {
    const { appSecret, requireSignatureValidation } = this.options;
    if (!appSecret) {
      if (requireSignatureValidation) {
        this.options.logger.warn(
          "[meta-cloud:webhook] appSecret missing while signature validation is required."
        );
        return false;
      }
      return true;
    }

    const received = getSignatureHeader(headers);
    if (!received) {
      return !requireSignatureValidation;
    }

    const expected = computeMetaSignature(appSecret, rawBody);
    return safeEqual(expected, received);
  }

  private async dispatch(
    payload: MetaWebhookPayload,
    context: MetaWebhookContext
  ): Promise<void> {
    if (!Array.isArray(payload.entry)) return;

    for (const entry of payload.entry) {
      if (!Array.isArray(entry?.changes)) continue;

      for (const change of entry.changes) {
        const value = change?.value;
        if (!value || typeof value !== "object") continue;

        if (Array.isArray(value.messages) && this.options.onMessage) {
          for (const message of value.messages) {
            await this.options.onMessage({
              message,
              value,
              change,
              entry,
              payload,
              context,
            });
          }
        }

        if (Array.isArray(value.statuses) && this.options.onStatus) {
          for (const status of value.statuses) {
            await this.options.onStatus({
              status,
              value,
              change,
              entry,
              payload,
              context,
            });
          }
        }
      }
    }
  }
}

/**
 * Convenience factory for route handlers.
 */
export function createMetaCloudWebhookHandler(
  options: MetaCloudWebhookHandlerOptions
) {
  const handler = new MetaCloudWebhookHandler(options);

  return {
    GET: (request: Request) => handler.verify(request),
    POST: (request: Request) => handler.handle(request),
  };
}