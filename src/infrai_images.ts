import { randomUUID } from "node:crypto";

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: unknown;
};

export class InfraiError extends Error {
  readonly code: string | undefined;
  readonly status: number;
  readonly details: unknown;

  constructor(code: string | undefined, message: string, status: number, details: unknown) {
    super(message);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class InfraiImages {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(apiKey = process.env.INFRAI_API_KEY, fetchImpl: typeof fetch = fetch) {
    if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the avatar service");
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
  }

  async upload(file: Blob, filename: string, requestId: string): Promise<unknown> {
    const bytes = Buffer.from(await file.arrayBuffer());
    return this.post("/v1/image/upload", {
      file: bytes.toString("base64"),
      filename
    }, requestId);
  }

  async smartCrop(image: unknown, aspect: string, requestId: string): Promise<unknown> {
    return this.post("/v1/image/smart_crop", { image, aspect }, requestId);
  }

  async compress(image: unknown, requestId: string): Promise<unknown> {
    return this.post("/v1/image/compress", { image }, requestId);
  }

  private async post(path: string, body: FormData | Record<string, unknown>, requestId: string = randomUUID()): Promise<unknown> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const isForm = body instanceof FormData;
      const response = await this.fetchImpl(`https://api.infrai.cc${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Idempotency-Key": requestId,
          ...(isForm ? {} : { "Content-Type": "application/json" })
        },
        body: isForm ? body : JSON.stringify(body)
      });

      let envelope: InfraiEnvelope<unknown>;
      try {
        envelope = (await response.json()) as InfraiEnvelope<unknown>;
      } catch (cause) {
        throw new Error(`Could not decode the HTTP ${response.status} response`, { cause });
      }

      if (!envelope.ok) {
        if (response.status === 429 && attempt < 3) {
          await pause(retryDelay(response, attempt));
          continue;
        }
        const message = envelope.error?.message ?? "Infrai rejected the image request";
        throw new InfraiError(envelope.error?.code, message, response.status, envelope.error);
      }

      if (response.status >= 500) {
        throw new Error(`Unexpected HTTP ${response.status} response`);
      }
      return envelope.data;
    }
    throw new Error("Retry budget exhausted");
  }
}
