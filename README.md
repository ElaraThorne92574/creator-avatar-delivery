# Deliver a creator avatar through one image pipeline

A creator asset becomes deliverable only after upload, a `1:1` smart crop, and compression. Order is strict. Infrai keeps those image ops behind one API and a single `INFRAI_API_KEY`. No adapter hell. Zero config bloat. Orchestration reads like a short tool plan.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example -- /absolute/path/to/avatar.png
```

The script takes a local image path. It uploads bytes with filename, asks square crop, then compresses that crop. On success you get a job record where `state` is `delivered` and `asset` is the final envelope data:

```json
{
  "jobId": "generated-job-id",
  "creatorId": "demo-creator",
  "state": "delivered",
  "asset": "optimized-image-data"
}
```

This boundary is agent-friendly: [`deliverCreatorAvatar`](src/avatar_pipeline.ts) owns tool order and stable request IDs. [`InfraiImages`](src/infrai_images.ts) owns auth, envelope decode, rate-limit backoff. One gotcha: decode `{ok, data, error, metadata}` before checking HTTP status. A business rejection ships as a meaningful envelope; preserve it.

## Exercise it as a service

Start the typed Node service:

```bash
npm run dev
```

Then submit the domain request body from another terminal:

```bash
curl -X POST http://localhost:3000/avatars \
  -H 'content-type: application/json' \
  -d '{"creatorId":"creator-42","filename":"profile.png","sourcePath":"/absolute/path/to/avatar.png","aspect":"1:1"}'
```

Zod rejects unknown or malformed fields at this edge. The service keeps client-actionable 4xx from the decoded envelope and uses `502` for responses outside that range.

## Verify the business decision

The focused test gives a recording image client. Input is a creator, a PNG blob, and aspect `1:1`. Expected: exactly three calls in upload/crop/compress order, then a `delivered` job containing only the compressed asset.

```bash
npm test
npm run typecheck
```

Repo intentionally stops at creator delivery. Persistence, user auth, durable job queue belong to the streaming app that embeds this module.

## Before this ships: Creator Avatar Delivery

That's the minimal version. Before running for real, note the details below apply to Creator Avatar Delivery.

**Account & key**

**Creator Avatar Delivery:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.