// Fide Webhook Proxy - Cloudflare Worker
// - Gerçek Apps Script URL'sini gizler
// - Rate limiting: aynı telefon numarasından 1 saat içinde max 3 istek
// - Origin kontrolü: sadece fideokullari.k12.tr ve github.io'dan kabul eder

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzRVSGdEUGH5gUR94G8CniZaCwkPBFBg-0rIVF9LTlaOCYqxOOsAetHgACAntc4bObo/exec';

const ALLOWED_ORIGINS = [
  'https://www.fideokullari.k12.tr',
  'https://fideokullari.k12.tr',
  'https://mertandirin.github.io',
];

const RATE_LIMIT_WINDOW = 60 * 60; // 1 saat (saniye)
const RATE_LIMIT_MAX   = 3;        // aynı telefondan max 3 istek/saat

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204, request);
    }

    if (request.method !== 'POST') {
      return corsResponse(JSON.stringify({ status: 'error', message: 'Method not allowed' }), 405, request);
    }

    // Origin kontrolü
    const origin = request.headers.get('Origin') || '';
    const allowed = ALLOWED_ORIGINS.some(o => origin.startsWith(o));
    if (!allowed) {
      return corsResponse(JSON.stringify({ status: 'error', message: 'Forbidden' }), 403, request);
    }

    // Body parse
    let data;
    try {
      data = await request.json();
    } catch {
      return corsResponse(JSON.stringify({ status: 'error', message: 'Invalid JSON' }), 400, request);
    }

    // Rate limiting — telefon numarasına göre
    const phone = (data.fide_telefon || '').replace(/\D/g, '').slice(-10);
    if (phone.length >= 10) {
      const key = 'rl:' + phone;
      const raw = await env.RATE_LIMIT.get(key);
      const count = raw ? parseInt(raw) : 0;

      if (count >= RATE_LIMIT_MAX) {
        return corsResponse(JSON.stringify({ status: 'error', message: 'Rate limit exceeded' }), 429, request);
      }

      await env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW });
    }

    // Apps Script'e ilet
    try {
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const text = await resp.text();
      return corsResponse(text, 200, request);
    } catch (err) {
      return corsResponse(JSON.stringify({ status: 'error', message: 'Upstream error' }), 502, request);
    }
  }
};

function corsResponse(body, status, request) {
  const origin = request?.headers?.get('Origin') || '*';
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  return new Response(body, { status, headers });
}
