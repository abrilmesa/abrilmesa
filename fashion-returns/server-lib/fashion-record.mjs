// Server-only record access for Week 3 Exercise 2 (sales.units_sold writeback).
// The Supabase secret key stays in Vercel (SUPABASE_SECRET_KEY); the browser only sends the lab access phrase.
import {timingSafeEqual} from 'node:crypto';
if (typeof window !== 'undefined') throw new Error('Server only.');

const DEFAULT_URL = 'https://ssrrxhwxgjrpminymyvs.supabase.co';
const lineId = /^S\d{6}$/, productId = /^P\d{3}$/, size = /^(XS|S|M|L|XL)$/, month = /^20\d\d-(0[1-9]|1[0-2])$/;

export function createRecordService({env = process.env, fetchImpl = fetch} = {}) {
  const url = env.SUPABASE_URL || DEFAULT_URL, key = env.SUPABASE_SECRET_KEY, phrase = env.LAB_ACCESS_KEY;
  const missing = () => ['SUPABASE_SECRET_KEY', 'LAB_ACCESS_KEY'].filter(k => !env[k]);
  const ready = () => typeof key === 'string' && /^sb_secret_[A-Za-z0-9_-]{10,}$/.test(key) &&
    typeof phrase === 'string' && phrase.length >= 32 && phrase.length <= 256 && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url);
  const status = () => ({state: ready() ? 'configured' : 'not_configured', configured: ready(), missing: missing(),
    field: 'sales.units_sold', writeEnabled: ready(),
    message: ready() ? 'Server settings are present. Enter your lab access phrase to read records.' :
      `Missing or invalid server settings: ${missing().length ? missing().join(', ') : 'check SUPABASE_SECRET_KEY (sb_secret_…) and LAB_ACCESS_KEY'}.`});
  const authorized = header => {
    const supplied = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
    return Buffer.byteLength(supplied) === Buffer.byteLength(phrase) && timingSafeEqual(Buffer.from(supplied), Buffer.from(phrase));
  };
  const rpc = async (fn, args) => {
    const r = await fetchImpl(`${url}/rest/v1/rpc/${fn}`, {method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: {apikey: key, 'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify(args)});
    if (!r.ok) throw Object.assign(Error('Supabase rejected the request'), {providerStatus: r.status});
    return r.json();
  };
  const guard = auth => !ready() ? {status: 503, body: status()} :
    !authorized(auth) ? {status: 401, body: {state: 'unauthorized', message: 'Enter the correct lab access phrase. No database request was made.'}} : null;

  return {
    status,
    async read(query, auth) {
      const g = guard(auth); if (g) return g;
      if (query.id) {
        if (!lineId.test(query.id)) return {status: 400, body: {state: 'rejected', message: 'Invalid sale_line_id.'}};
        const record = await rpc('fashion_sale_line_v1', {p_sale_line_id: query.id});
        return record ? {status: 200, body: {state: 'read', record}} : {status: 404, body: {state: 'not_found', message: 'No sale line with that ID.'}};
      }
      if (!productId.test(query.product || '') || !size.test(query.size || '') || !month.test(query.start || '') || !month.test(query.end || '') || query.start > query.end)
        return {status: 400, body: {state: 'rejected', message: 'Choose one product, one size and a valid month range.'}};
      const [y, m] = query.end.split('-').map(Number), last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      const lines = await rpc('fashion_sale_lines_v1', {p_product_id: query.product, p_size: query.size, p_start: `${query.start}-01`, p_end: last});
      return {status: 200, body: {state: 'read', lines}};
    },
    async update(body, auth) {
      const g = guard(auth); if (g) return g;
      const keys = ['operation', 'sale_line_id', 'expected_units', 'expected_revision', 'new_units', 'reason'];
      if (!body || Object.keys(body).sort().join() !== [...keys].sort().join() || body.operation !== 'update_units_sold' ||
        !lineId.test(body.sale_line_id) || ![body.expected_units, body.expected_revision, body.new_units].every(Number.isInteger) ||
        typeof body.reason !== 'string')
        return {status: 400, body: {state: 'rejected', message: 'Invalid update request. Nothing was saved.'}};
      const result = await rpc('fashion_update_units_sold_v1', {p_sale_line_id: body.sale_line_id, p_expected_units: body.expected_units,
        p_expected_revision: body.expected_revision, p_new_units: body.new_units, p_reason: body.reason});
      const code = {saved: 200, conflict: 409, invalid: 422, not_found: 404}[result?.state] || 502;
      return {status: code, body: result};
    }
  };
}
