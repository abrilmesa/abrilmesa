// Server-only Trello access for Week 3 Exercise 3. Credentials live only in Vercel env:
// TRELLO_API_KEY, TRELLO_TOKEN, TRELLO_LIST_ID (destination list), LAB_ACCESS_KEY (lab phrase).
import {timingSafeEqual} from 'node:crypto';
if (typeof window !== 'undefined') throw new Error('Server only.');

const API = 'https://api.trello.com/1';
const keyPattern = /^[a-f0-9]{32}$/i, tokenPattern = /^[A-Za-z0-9]{32,128}$/, idPattern = /^[a-f0-9]{24}$/i;

export function createTrelloService({env = process.env, fetchImpl = fetch} = {}) {
  const key = env.TRELLO_API_KEY, token = env.TRELLO_TOKEN, listId = env.TRELLO_LIST_ID, phrase = env.LAB_ACCESS_KEY;
  const credsOk = () => keyPattern.test(key || '') && tokenPattern.test(token || '') &&
    typeof phrase === 'string' && phrase.length >= 32 && phrase.length <= 256;
  const listOk = () => idPattern.test(listId || '');
  const missing = () => ['TRELLO_API_KEY', 'TRELLO_TOKEN', 'TRELLO_LIST_ID', 'LAB_ACCESS_KEY'].filter(k => !env[k]);
  const status = () => ({
    state: credsOk() && listOk() ? 'configured' : credsOk() ? 'list_needed' : 'not_configured',
    configured: credsOk() && listOk(), missing: missing(), createEnabled: credsOk() && listOk(),
    message: credsOk() && listOk() ? 'Server settings are present. Enter your lab access phrase to inspect the destination list. No card is created.'
      : credsOk() ? 'Trello credentials are present but TRELLO_LIST_ID is missing or invalid. Inspect to see the lists your token can reach.'
      : `Missing or invalid server settings: ${missing().length ? missing().join(', ') : 'check TRELLO_API_KEY (32 hex), TRELLO_TOKEN and LAB_ACCESS_KEY formats'}.`
  });
  const authorized = header => {
    const supplied = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : '';
    return Buffer.byteLength(supplied) === Buffer.byteLength(phrase) && timingSafeEqual(Buffer.from(supplied), Buffer.from(phrase));
  };
  const call = async (path, {method = 'GET', body} = {}) => {
    const r = await fetchImpl(`${API}${path}`, {method, redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: {Authorization: `OAuth oauth_consumer_key="${key}", oauth_token="${token}"`, Accept: 'application/json',
        ...(body ? {'Content-Type': 'application/json'} : {})}, body: body ? JSON.stringify(body) : undefined});
    if (!r.ok) throw Object.assign(Error('Trello rejected the request'), {providerStatus: r.status});
    return r.json();
  };
  const guard = auth => !credsOk() ? {status: 503, body: status()} :
    !authorized(auth) ? {status: 401, body: {state: 'unauthorized', message: 'Enter the correct lab access phrase. No Trello request was made.'}} : null;
  const tokenInfo = async () => {
    const t = await call(`/tokens/${encodeURIComponent(token)}?fields=dateCreated,dateExpires,permissions`);
    return {created: t.dateCreated || null, expires: t.dateExpires || 'never',
      permissions: (t.permissions || []).map(p => `${p.modelType}:${p.read ? 'read' : ''}${p.write ? '+write' : ''}`)};
  };
  const destination = async () => {
    const l = await call(`/lists/${listId}?fields=name,closed,idBoard&board=true&board_fields=name,url,closed`);
    return {listId: l.id, listName: l.name, listClosed: l.closed, boardId: l.idBoard, boardName: l.board?.name, boardUrl: l.board?.url, boardClosed: l.board?.closed};
  };

  return {
    status,
    async inspect(auth) {
      const g = guard(auth); if (g) return g;
      try {
        const tok = await tokenInfo();
        if (!listOk()) {
          const boards = await call('/members/me/boards?filter=open&fields=name,url&lists=open&list_fields=name');
          return {status: 200, body: {state: 'list_needed', token: tok, cardCreated: false,
            boards: boards.map(b => ({boardName: b.name, lists: (b.lists || []).map(l => ({listName: l.name, listId: l.id}))})),
            message: 'Token accepted. Choose one list ID below and save it in Vercel as TRELLO_LIST_ID, then redeploy. No card was created.'}};
        }
        const dest = await destination();
        if (dest.listClosed || dest.boardClosed) return {status: 409, body: {state: 'destination_closed', destination: dest, token: tok, cardCreated: false, message: 'The destination list or board is archived. Choose an open list. No card was created.'}};
        return {status: 200, body: {state: 'connection_verified', destination: dest, token: tok, checkedAt: new Date().toISOString(), cardCreated: false,
          message: 'Trello accepted read-only requests for the token and the destination list. No card was created.'}};
      } catch (e) {
        return {status: 502, body: {state: 'provider_rejected', providerHttpStatus: e.providerStatus || null, cardCreated: false,
          message: 'Trello did not accept the read-only check. Check the key, token, its expiry and the list ID. No card was created.'}};
      }
    },
    async create(body, auth) {
      const g = guard(auth); if (g) return g;
      if (!listOk()) return {status: 503, body: status()};
      const keys = ['operation', 'expected_list_id', 'title', 'description'];
      if (!body || Object.keys(body).sort().join() !== [...keys].sort().join() || body.operation !== 'create_card' ||
        body.expected_list_id !== listId || typeof body.title !== 'string' || typeof body.description !== 'string' ||
        !body.title.trim() || body.title.length > 200 || /[\r\n]/.test(body.title) || !body.description.trim() || body.description.length > 8000)
        return {status: 400, body: {state: 'rejected', cardCreated: false, message: 'Invalid card request or destination changed. No card was created.'}};
      try {
        const dest = await destination();
        if (dest.listClosed || dest.boardClosed) return {status: 409, body: {state: 'destination_closed', cardCreated: false, message: 'The destination list or board is archived. No card was created.'}};
        const card = await call('/cards', {method: 'POST', body: {idList: listId, name: body.title.trim(), desc: body.description.trim(), pos: 'top'}});
        return {status: 201, body: {state: 'card_created', cardCreated: true, card: {id: card.id, shortLink: card.shortLink, url: card.shortUrl || card.url, name: card.name, desc: card.desc, idList: card.idList}, destination: dest, createdAt: new Date().toISOString(),
          message: 'Trello created the card. Open it to compare with the approved content. Creation does not prove assignment or resolution.'}};
      } catch (e) {
        return {status: 502, body: {state: 'provider_rejected', providerHttpStatus: e.providerStatus || null, cardCreated: false, message: 'Trello did not create the card. Check the board before retrying to avoid duplicates.'}};
      }
    }
  };
}
