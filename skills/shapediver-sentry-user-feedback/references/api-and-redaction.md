# Sentry Envelope Feedback API and Redaction Reference

## Direct HTTP (envelope ingest)

Modern User Feedback is sent as a `feedback` envelope item — the same path `Sentry.captureFeedback()` uses internally. Do **not** use the deprecated [Submit User Feedback REST API](https://docs.sentry.io/api/projects/submit-user-feedback/) (`/api/0/projects/.../user-feedback/`).

Product overview: [User Feedback](https://docs.sentry.io/product/user-feedback/).

Protocol: [Feedback telemetry](https://develop.sentry.dev/sdk/telemetry/feedbacks/), [Envelope items](https://develop.sentry.dev/sdk/data-model/envelope-items/#feedback).

## ShapeDiver project constants (fixed)

| Constant | Value |
| :------- | :---- |
| Organization ID | `363881` |
| Project ID | `4511609191137280` |
| Ingest host | `o363881.ingest.us.sentry.io` |
| Public ingest key | `15feecf633eddb011ac60e804cbe399a` |

Do not read `sentryconfig.ts`, `.env`, or other project files for these values.

## Endpoint

```
POST https://o363881.ingest.us.sentry.io/api/4511609191137280/envelope/?sentry_key=15feecf633eddb011ac60e804cbe399a
Content-Type: application/x-sentry-envelope
```

Authentication is the **public** `sentry_key` query parameter. No Bearer token. No SDK initialization.

## Envelope format

The body is **not JSON** — it is newline-delimited parts:

1. **Envelope header** (JSON line)
2. **Item header** (JSON line) — `{"type":"feedback"}`
3. **Item payload** (JSON line) — event with `contexts.feedback`

Generate a fresh `event_id` (32 lowercase hex chars) for each submission. Use the same `event_id` in the envelope header and payload.

### Item payload shape

```json
{
  "event_id": "a1b2c3d4e5f6478990a1b2c3d4e5f6789",
  "timestamp": "2026-06-22T10:00:00Z",
  "platform": "other",
  "contexts": {
    "feedback": {
      "message": "## Summary\n...\n\n## Error\n...",
      "contact_email": "jane@example.com",
      "name": "Jane Schmidt"
    }
  },
  "tags": {
    "source": "agent-session"
  }
}
```

- `message` — required; sanitized markdown debug narrative (no email/username inside).
- `contact_email`, `name` — optional; ask the user. Omitting them may trigger [spam classification](https://docs.sentry.io/product/user-feedback/#spam-detection-for-user-feedback). If the user does not provide them, submit without these fields.
- `associated_event_id` — optional; set only when linking to an existing Sentry error from the app.

### Contact fields and spam (LLM classifier)

Sentry classifies feedback with an **internal LLM** — not only missing contact fields. Submissions that look like automated tests, contain words like "verify" / "agent test", or use invented emails often land in **Spam** even with `name` and `contact_email` set.

The agent should:

1. Ask for the developer's **real** name and **work email** before submit.
2. Set `contexts.feedback.name`, `contexts.feedback.contact_email`, and mirror in top-level `user`: `{ "email": "…", "name": "…" }`.
3. Add `contexts.feedback.url` when a dev URL or repro page is known.
4. Add `contexts.feedback.associated_event_id` when linking to a Sentry error from the same project.
5. Write `message` as a **real bug report** (summary, repro, errors) — not a connectivity/diagnostic ping.
6. Never invent name or email. Keep contact info out of the `message` body.

### Generate `event_id` and timestamp

**Do not use `uuidgen`** — it is not available on Windows Git Bash and is not a project dependency.

Use Node.js built-in `crypto` (no extra packages):

```bash
EVENT_ID="$(node -e "console.log(require('crypto').randomUUID().replace(/-/g,'').toLowerCase())")"
SENT_AT="$(node -e "console.log(new Date().toISOString())")"
```

### curl example (full)

Build the payload with Node so `message` is JSON-escaped:

```bash
EVENT_ID="$(node -e "console.log(require('crypto').randomUUID().replace(/-/g,'').toLowerCase())")"
SENT_AT="$(node -e "console.log(new Date().toISOString())")"
export EVENT_ID SENT_AT
export FEEDBACK_NAME='Jane Schmidt'
export FEEDBACK_EMAIL='jane@example.com'
export MESSAGE='## Summary
Sanitized markdown here.'

node -e "
const eventId = process.env.EVENT_ID;
const sentAt = process.env.SENT_AT;
const message = process.env.MESSAGE;
const name = process.env.FEEDBACK_NAME || '';
const email = process.env.FEEDBACK_EMAIL || '';
const feedback = { message };
if (name) feedback.name = name;
if (email) feedback.contact_email = email;
const header = JSON.stringify({ event_id: eventId, sent_at: sentAt, sdk: { name: 'shapediver.agent-skills', version: '1.0.0' } });
const itemHeader = JSON.stringify({ type: 'feedback' });
const payload = JSON.stringify({
  event_id: eventId,
  timestamp: sentAt,
  platform: 'other',
  contexts: { feedback },
  tags: { source: 'agent-session' },
});
process.stdout.write(header + '\n' + itemHeader + '\n' + payload + '\n');
" | curl -s -w "\nHTTP_STATUS:%{http_code}\n" \
  "https://o363881.ingest.us.sentry.io/api/4511609191137280/envelope/?sentry_key=15feecf633eddb011ac60e804cbe399a" \
  -H 'Content-Type: application/x-sentry-envelope' \
  --data-binary @-

echo "EVENT_ID=$EVENT_ID"
```

Set `MESSAGE` to the sanitized markdown before running. For a minimal heredoc-only variant (fixed message, no newlines in JSON):

```bash
EVENT_ID="$(node -e "console.log(require('crypto').randomUUID().replace(/-/g,'').toLowerCase())")"
SENT_AT="$(node -e "console.log(new Date().toISOString())")"

curl "https://o363881.ingest.us.sentry.io/api/4511609191137280/envelope/?sentry_key=15feecf633eddb011ac60e804cbe399a" \
  -H 'Content-Type: application/x-sentry-envelope' \
  --data-binary @- <<ENVELOPE
{"event_id":"${EVENT_ID}","sent_at":"${SENT_AT}","sdk":{"name":"shapediver.agent-skills","version":"1.0.0"}}
{"type":"feedback"}
{"event_id":"${EVENT_ID}","timestamp":"${SENT_AT}","platform":"other","contexts":{"feedback":{"message":"Single-line sanitized summary here","contact_email":"jane@example.com","name":"Jane Schmidt"}},"tags":{"source":"agent-session"}}
ENVELOPE
```

Replace `event_id`, `sent_at`, `timestamp`, and `message` with live values. Prefer the Node pipe variant when `message` contains newlines.

### Structured fields → message

| Collected field | Section in `message` |
| :-------------- | :------------------- |
| `summary` / `message` | `## Summary` |
| `reproSteps` | `## Steps to reproduce` |
| `errors` | `## Error output` (fenced code block) |
| `environment` | `## Environment` |
| `gitContext` | `## Git context` |
| `attemptedFixes` | `## Attempted fixes` |

## Redaction Rules

### Pattern table

| Category | Patterns / fields | Replacement |
| :------- | :---------------- | :---------- |
| API keys | `sk-`, `ghp_`, `gho_`, `xoxb-`, `Bearer `, `api_key=` | `[REDACTED:api-key]` |
| Tokens | `token`, `secret`, `password`, `credential` in key names | `[REDACTED:token]` |
| Config secrets | `KEY=value` lines in dumps or pasted config | `KEY=[REDACTED]` |
| Sentry | Private auth tokens in debug text (public ingest key in URL is OK) | `[REDACTED:sentry-auth]` |
| ShapeDiver | `ticket`, `modelViewUrl` with credentials, Platform access key ID/secret | `[REDACTED:shapediver-credential]` |
| PII | Email, phone, IP in `message` body (use `contact_email` / `name` fields instead) | `[REDACTED:pii]` |
| Cookies / sessions | `Cookie:`, `sessionId`, `set-cookie` headers | `[REDACTED:session]` |

### Redaction procedure

1. Assemble the raw payload from session sources.
2. Run pattern replacements on the `message` string.
3. If quoting file contents, truncate files > 200 lines; prefer line ranges around the error.
4. List configuration key **names** only — never secret values.
5. Re-read the final text — scan for `=`, `://`, and base64 blobs.

### Safe to include

- Error messages and stack traces (after redaction pass)
- File paths and line numbers
- Package names and semver ranges
- Git branch names and commit messages (not commit author email unless opted in)
- Test output (sanitized)

## Links

- [User Feedback product overview](https://docs.sentry.io/product/user-feedback/)
- [Spam detection for User Feedback](https://docs.sentry.io/product/user-feedback/#spam-detection-for-user-feedback)
- [Set Up User Feedback (JavaScript)](https://docs.sentry.io/platforms/javascript/user-feedback/)
- [Feedback telemetry (envelope protocol)](https://develop.sentry.dev/sdk/telemetry/feedbacks/)
