import assert from "node:assert/strict";
import test from "node:test";
import { deliverCreatorAvatar, type AvatarImageOperations } from "../src/avatar_pipeline";

test("delivers only the compressed result after upload and square crop", async () => {
  const calls: string[] = [];
  const images: AvatarImageOperations = {
    async upload(_file, filename, requestId) {
      calls.push(`upload:${filename}:${requestId}`);
      return "uploaded-image";
    },
    async smartCrop(image, aspect, requestId) {
      calls.push(`crop:${String(image)}:${aspect}:${requestId}`);
      return "square-image";
    },
    async compress(image, requestId) {
      calls.push(`compress:${String(image)}:${requestId}`);
      return "delivery-image";
    }
  };

  const result = await deliverCreatorAvatar(images, {
    creatorId: "creator-42",
    filename: "profile.png",
    aspect: "1:1",
    file: new Blob(["avatar"])
  }, "job-7");

  assert.deepEqual(calls, [
    "upload:profile.png:job-7:upload",
    "crop:uploaded-image:1:1:job-7:crop",
    "compress:square-image:job-7:compress"
  ]);
  assert.deepEqual(result, {
    jobId: "job-7",
    creatorId: "creator-42",
    state: "delivered",
    asset: "delivery-image"
  });
});
