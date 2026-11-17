# Week 3 · Exercise 1 · Checkpoint 1 — Email connection

Fashion Returns continues as the student's permitted previous project; Northstar is not substituted for its data. App: https://hello-world-puce-two-10.vercel.app/fashion-returns/index.html .

This checkpoint implements KPI -> contextual menu -> Share finding -> scoped connection dialog. The metric, figures and original-sale period/category/product/size snapshot stay visible. No email-send route is enabled. Connection configuration and sending/receipt are distinct outcomes.

The original workshop's MIT Resend transport/configuration helper is retained in server-lib/resend-email.mjs with license attribution. A Fashion Returns connection adapter reads the same server variables. It does not pass Northstar's data or destinations into a Fashion Returns action.

User enters directly into the hello-world Vercel project's Production environment settings:
- RESEND_API_KEY: a Resend Full access key, never placed in chat, browser source or repository. Full access is needed for the workshop's later send/readback workflow; Sending access alone is insufficient for readback.
- LAB_EMAIL_TO: the user's own Resend account email; no personal recipient is hardcoded in the public repository.
- LAB_ACCESS_KEY: a random32–256character lab phrase, saved privately by the user. Shared classroom protection, not full multi-user authentication.
Save and redeploy the hello-world project. Do not accidentally configure the other abrilmesa Vercel project and expect this hostname's server settings to change.

GET /api/fashion-email returns redacted presence/format status only; never exposes the API key, lab phrase or private recipient. POST only accepts operation=inspect, requires the correct lab phrase and performs GET https://api.resend.com/domains. Its response discloses the intended recipient only to the authorized user. Domains are not returned. A successful check demonstrates read-only API authentication, not email delivery or recipient ownership. The user must choose their own account address; onboarding@resend.dev is restricted to that address unless using an appropriately verified domain.

No secret has been requested, obtained or used by the assistant. No key is stored locally. No email is sent, no automatic external retry, and every unsupported send/execute operation is rejected. Provider error bodies are redacted. Six meaningful mocked server checks passed: public redaction, missing settings, wrong phrase, send rejection, authorized GET-only inspection and error/no-retry handling. These tests do not establish a live Resend account connection.

At implementation time, provider credentials are pending user entry. Do not submit this as a successful configured connection until the redacted deployed result has been checked. Later checkpoints will add an editable email and exact preview/cancel/confirm using verified Fashion Returns source context; real sends require explicit user approval and actual inbox verification.

Sources: https://ie-apps-action-lab.vercel.app/start-here ; https://github.com/josncmar/ie-apps-action-lab ; https://resend.com/docs/dashboard/api-keys/introduction ; https://resend.com/docs/api-reference/domains/list-domains .
