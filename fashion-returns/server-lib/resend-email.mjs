/**
 * Node 22+ server-only classroom email transport. Fixed sender: onboarding@resend.dev.
 * LAB_EMAIL_TO must be the owning Resend account's own verified email address.
 * The provider enforces its testing-domain recipient restrictions. This module
 * does not independently prove account ownership, plan tier or inbox arrival.
 */
if (typeof window !== "undefined") {
  throw new Error("The Resend helper must only run on the server.");
}

const actionId = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const emailIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const emailPattern = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
const from = "onboarding@resend.dev";

/** No recipient supplied by browser requests may override this fixed config. */
export function resendConfigFromEnv(env = process.env) {
  return { apiKey: env.RESEND_API_KEY, to: env.LAB_EMAIL_TO };
}

export function validateResendDestination(config) {
  return Boolean(
    config && typeof config.apiKey === "string" && /^re_[A-Za-z0-9_-]{8,512}$/.test(config.apiKey) &&
    typeof config.to === "string" && config.to.length <= 254 && emailPattern.test(config.to) &&
    !config.to.toLowerCase().endsWith("@resend.dev"),
  );
}

export function resendEmailPayload(config, action) {
  if (!validateResendDestination(config) || !action ||
    typeof action.requestId !== "string" || !actionId.test(action.requestId) ||
    typeof action.recordId !== "string" || !actionId.test(action.recordId) ||
    typeof action.title !== "string" || !action.title.trim() ||
    action.title.length > 256 || /[\r\n\x00]/.test(action.title) ||
    typeof action.body !== "string" || !action.body.trim() ||
    action.body.length > 12000 || action.body.includes("\0")) return null;
  return {
    from,
    to: [config.to],
    subject: action.title.trim(),
    text: `${action.body.trim()}\n\n---\nSource record: ${action.recordId}\nAction request: ${action.requestId}\n[ie-lab-action:${action.requestId}]`,
  };
}

function context(action) {
  return {
    requestId: typeof action?.requestId === "string" && actionId.test(action.requestId) ? action.requestId : null,
    recordId: typeof action?.recordId === "string" && actionId.test(action.recordId) ? action.recordId : null,
    inboxVerified: false,
  };
}

function timeout(options) {
  const value = options.timeoutMs ?? 10000;
  return Number.isInteger(value) && value > 0 && value <= 60000 ? value : null;
}

function headers(config) {
  return { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", Accept: "application/json" };
}

/** One POST, stable idempotency key; no automatic retries. Resend retains keys 24h. */
export async function createResendEmail(config, action, options = {}) {
  const linkage = context(action);
  const payload = resendEmailPayload(config, action);
  const timeoutMs = timeout(options);
  if (!payload || !timeoutMs) return { ...linkage, state: "invalid", code: "INVALID_ACTION_OR_CONFIGURATION" };
  let response;
  try {
    response = await (options.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { ...headers(config), "Idempotency-Key": `ie-lab-email/${action.requestId}` },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(timeoutMs), redirect: "error",
    });
  } catch {
    return { ...linkage, state: "unknown", code: "CHECK_RESEND_BEFORE_RETRY" };
  }
  if (response.status !== 200 && response.status !== 201) {
    // 409 may mean the same idempotent request is still being processed. Do not
    // misreport that original send as rejected or automatically resend it.
    const rejected = response.status >= 400 && response.status < 500 && ![408, 409].includes(response.status);
    return {
      ...linkage, state: rejected ? "rejected" : "unknown",
      code: rejected ? "RESEND_REJECTED_REQUEST" : "CHECK_RESEND_BEFORE_RETRY", httpStatus: response.status,
    };
  }
  try {
    const email = await response.json();
    if (typeof email.id !== "string" || !emailIdPattern.test(email.id)) throw new Error("Unexpected response");
    return { ...linkage, state: "accepted", emailId: email.id, deliveryState: "accepted", httpStatus: response.status };
  } catch {
    return { ...linkage, state: "unknown", code: "CHECK_RESEND_BEFORE_RETRY", httpStatus: response.status };
  }
}

const deliveryStates = new Map([
  ["sent", "accepted"], ["delivered", "delivered"], ["bounced", "bounced"],
  ["complained", "complained"], ["delivery_delayed", "delayed"], ["failed", "failed"],
  ["suppressed", "suppressed"], ["scheduled", "scheduled"], ["canceled", "canceled"],
  ["opened", "opened"], ["clicked", "clicked"],
]);

/** Read provider event and exact content. Provider delivery is not inbox verification. */
export async function verifyResendEmail(config, action, emailId, options = {}) {
  const linkage = context(action);
  const payload = resendEmailPayload(config, action);
  const timeoutMs = timeout(options);
  if (!payload || !timeoutMs || typeof emailId !== "string" || !emailIdPattern.test(emailId)) {
    return { ...linkage, state: "invalid", code: "INVALID_ACTION_OR_CONFIGURATION" };
  }
  let response;
  try {
    response = await (options.fetchImpl ?? fetch)(`https://api.resend.com/emails/${emailId}`, {
      method: "GET", headers: headers(config), signal: AbortSignal.timeout(timeoutMs), redirect: "error",
    });
  } catch {
    return { ...linkage, state: "unknown", code: "READBACK_UNAVAILABLE", emailId };
  }
  if (response.status !== 200) {
    return { ...linkage, state: "unknown", code: "READBACK_UNAVAILABLE", emailId, httpStatus: response.status };
  }
  try {
    const email = await response.json();
    const recipientMatches = Array.isArray(email.to) && email.to.length === 1 &&
      typeof email.to[0] === "string" && email.to[0].toLowerCase() === config.to.toLowerCase();
    if (email.id !== emailId || email.from !== from || !recipientMatches ||
      email.subject !== payload.subject || email.text !== payload.text ||
      (email.cc !== undefined && (!Array.isArray(email.cc) || email.cc.length)) ||
      (email.bcc !== undefined && (!Array.isArray(email.bcc) || email.bcc.length))) {
      return { ...linkage, state: "mismatch", code: "EMAIL_CONTENT_MISMATCH", emailId, httpStatus: 200 };
    }
    return {
      ...linkage, state: "matched", emailId, httpStatus: 200,
      deliveryState: deliveryStates.get(email.last_event) ?? "unknown",
      matched: { id: true, recipient: true, sender: true, subject: true, body: true },
    };
  } catch {
    return { ...linkage, state: "unknown", code: "READBACK_UNAVAILABLE", emailId, httpStatus: 200 };
  }
}
