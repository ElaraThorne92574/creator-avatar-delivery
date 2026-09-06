import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { deliverCreatorAvatar } from "./avatar_pipeline";
import { InfraiImages } from "./infrai_images";

const sourcePath = process.argv[2];
if (!sourcePath) {
  throw new Error("Run npm run example -- /absolute/path/to/avatar.png");
}

const bytes = await readFile(sourcePath);
const result = await deliverCreatorAvatar(new InfraiImages(), {
  creatorId: "demo-creator",
  filename: basename(sourcePath),
  aspect: "1:1",
  file: new Blob([bytes])
});

console.log(JSON.stringify(result, null, 2));
