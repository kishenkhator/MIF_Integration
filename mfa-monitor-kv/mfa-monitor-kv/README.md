# MFA Integration Monitor

Vercel-hosted monitor for a Maximo for Aviation outbound integration.

Flow:
Maximo -> Publish Channel -> JMS Queue -> End Point -> /api/maximo/webhook -> Redis (KV) -> live UI.

No database, no history. Only the latest received JSON event is stored (overwritten
on every POST), and the page polls it every 2 seconds.

## Deploy

1. Push this folder to GitHub.
2. Import the repository into Vercel.
3. In your Vercel project -> Storage tab -> Marketplace -> add a Redis database
   (e.g. Upstash) and connect it to this project. This automatically sets
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as env vars — you
   don't need to type them in yourself.
4. Leave `MAXIMO_WEBHOOK_SECRET` unset unless you also configure a matching
   `x-maximo-webhook-secret` header on the Maximo End Point (see "Avoiding 401s" below).
5. Redeploy (env vars only take effect on the next deploy).
6. Point your Maximo End Point at:
   https://YOUR-PROJECT.vercel.app/api/maximo/webhook

## Avoiding 401 errors

A 401 from `/api/maximo/webhook` only happens if `MAXIMO_WEBHOOK_SECRET` is set in
Vercel but the incoming request either has no `x-maximo-webhook-secret` header or
the value doesn't match. If Maximo's End Point config has no easy way to add a
custom header, the simplest fix is: don't set `MAXIMO_WEBHOOK_SECRET` at all. With
it unset, the endpoint accepts any POST with a JSON body — no auth check runs.

## Manual test

POST JSON to `/api/maximo/webhook`, for example:

```json
{"wonum":"1090","siteid":"AVIATION","orgid":"EAGLE","description":"Hydraulic fluid leak detected","status":"WAPPR","worktype":"CM"}
```

You can `curl` it directly to sanity-check before wiring up Maximo:

```bash
curl -X POST https://YOUR-PROJECT.vercel.app/api/maximo/webhook \
  -H "Content-Type: application/json" \
  -d '{"wonum":"1090","siteid":"AVIATION","orgid":"EAGLE","description":"Hydraulic fluid leak detected","status":"WAPPR","worktype":"CM"}'
```

Then refresh the deployed page — the event should appear within ~2 seconds.

## Inbound panel (GET / Create / Update)

The page also has an Inbound panel that calls Maximo's REST API directly —
Retrieve, Create, and Update, mirroring the Postman inbound collection.

Requires two more env vars in Vercel (Settings -> Environment Variables):

- `MAXIMO_BASE_URL` — e.g. `https://ws1.manage.inst1.apps.ocp2.rnsmas2.lab/maximo/api/os/mif_workorder`
- `MAXIMO_API_KEY` — the same value used as the `apikey` header in Postman

The API key is only ever used server-side (inside `/api/maximo/inbound`) and
is never sent to the browser.

Update works as a two-step call under the hood: it first looks up the
record's `href` via a GET filtered by wonum + siteid, then POSTs to that
exact href with `x-method-override: PATCH`, matching what Postman does.
