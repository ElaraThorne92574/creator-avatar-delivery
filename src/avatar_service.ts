import { readFile } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { z } from "zod";
import { deliverCreatorAvatar } from "./avatar_pipeline";
import { InfraiError, InfraiImages } from "./infrai_images";

const avatarRequest = z.object({
  creatorId: z.string().min(1),
  filename: z.string().min(1),
  sourcePath: z.string().min(1),
  aspect: z.string().regex(/^\d+:\d+$/)
}).strict();

function send(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(value));
}

async function readJson(request: AsyncIterable<Uint8Array>): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createAvatarServer(images = new InfraiImages()) {
  return createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/avatars") {
      send(response, 404, { error: "Route not found" });
      return;
    }

    try {
      const input = avatarRequest.parse(await readJson(request));
      const bytes = await readFile(input.sourcePath);
      const result = await deliverCreatorAvatar(images, {
        creatorId: input.creatorId,
        filename: input.filename,
        aspect: input.aspect,
        file: new Blob([bytes])
      });
      send(response, 201, result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        send(response, 400, { error: "Invalid avatar request", issues: error.issues });
        return;
      }
      if (error instanceof InfraiError) {
        const status = error.status >= 400 && error.status < 500 ? error.status : 502;
        send(response, status, { error: error.message, ...(error.code ? { code: error.code } : {}) });
        return;
      }
      send(response, 500, { error: error instanceof Error ? error.message : "Avatar job failed" });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  createAvatarServer().listen(port, () => {
    console.log(`Avatar service listening on http://localhost:${port}`);
  });
}
