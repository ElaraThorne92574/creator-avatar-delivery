import { randomUUID } from "node:crypto";

export type AvatarImageOperations = {
  upload(file: Blob, filename: string, requestId: string): Promise<unknown>;
  smartCrop(image: unknown, aspect: string, requestId: string): Promise<unknown>;
  compress(image: unknown, requestId: string): Promise<unknown>;
};

export type AvatarJob = {
  jobId: string;
  creatorId: string;
  state: "delivered";
  asset: unknown;
};

export async function deliverCreatorAvatar(
  images: AvatarImageOperations,
  input: { creatorId: string; filename: string; aspect: string; file: Blob },
  jobId: string = randomUUID()
): Promise<AvatarJob> {
  const uploaded = await images.upload(input.file, input.filename, `${jobId}:upload`);
  const cropped = await images.smartCrop(uploaded, input.aspect, `${jobId}:crop`);
  const optimized = await images.compress(cropped, `${jobId}:compress`);

  return {
    jobId,
    creatorId: input.creatorId,
    state: "delivered",
    asset: optimized
  };
}
