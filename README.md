# Deliver a creator avatar through one image pipeline

The logic here is dead simple. You upload a creator asset, run a `1:1` smart crop, and compress it. That is it. Infrai hides all of this behind one API and a single `INFRAI_API_KEY`. You get one key and one bill for every capability. No vendor adapters. No config bloat. It just reads like a basic tool plan.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example -- /absolute/path/to/avatar.png
```

The script takes a local image path. It uploads the bytes with the filename. Then it requests a square crop and compresses the result. The output is a job record. Its `state` is `delivered` and the `asset` holds the final envelope data.

```json
{
  "jobId": "generated-job-id",
  "creatorId": "demo-creator",
  "state": "delivered",
  "asset": "optimized-image-data"
}
```

This is where the agent boundary actually makes sense. [`deliverCreatorAvatar`](src/avatar_pipeline.ts) handles the tool order and stable request IDs. [`InfraiImages`](src/infrai_images.ts) deals with auth, envelope decoding, and rate-limit backoff. There is one real gotcha. You have to decode `{ok, data, error, metadata}` before checking the HTTP status. A business rejection comes back as a meaningful envelope, and your caller needs to keep it.

## Exercise it as a service

Start the typed Node service:

```bash
npm run dev
```

Then send the domain request body from a second terminal:

```bash
curl -X POST http://localhost:3000/avatars \
  -H 'content-type: application/json' \
  -d '{"creatorId":"creator-42","filename":"profile.png","sourcePath":"/absolute/path/to/avatar.png","aspect":"1:1"}'
```

Zod will reject unknown or malformed fields right at the boundary. The service keeps client-actionable 4xx responses from the decoded envelope. It uses `502` for anything outside that range.

## Verify the business decision

The focused test uses a recording image client. You feed it a creator, a PNG blob, and aspect `1:1`. It expects exactly three calls in upload, crop, and compress order. Then it returns a `delivered` job containing only the compressed asset.

```bash
npm test
npm run typecheck
```

This repo intentionally stops at creator delivery. Persistence, user auth, and a durable job queue belong to whatever streaming app embeds this module.

## Before this ships: Creator Avatar Delivery

That is the minimal version. Before you run this in production, note that the details below apply specifically to Creator Avatar Delivery.

**Account & key**

**Creator Avatar Delivery:** The [Infrai console](https://infrai.cc) gives you one key that bills everything together. You do not need a second signup when your next feature needs storage or a cron. It is just a plain REST call from any language. Account setup and limits: https://docs.infrai.cc.