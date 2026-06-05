/**
 * Tailoring Studio — Cloudflare Worker Proxy
 * Deploy to: api.shakil.fun  (or any Workers subdomain)
 *
 * What it does:
 *   1. Receives POST requests from the browser (no CORS issue since server-side)
 *   2. Forwards to Anthropic API using the secret ANTHROPIC_API_KEY env variable
 *   3. Returns the response with CORS headers so any browser can call it
 *
 * Setup (5 minutes):
 *   1. Go to Cloudflare dashboard → Workers & Pages → Create Worker
 *   2. Paste this entire file
 *   3. Click Settings → Variables → Add variable:
 *        Name:  ANTHROPIC_API_KEY
 *        Value: your sk-ant-... key  (mark as Secret)
 *   4. Deploy
 *   5. (Optional) Add a custom route: api.shakil.fun → this worker
 *   6. Put the worker URL in Tailoring Studio → Settings → Proxy URL
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY secret not set in Worker environment' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    try {
      const body = await request.json();

      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      const data = await upstream.json();

      return new Response(JSON.stringify(data), {
        status: upstream.status,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }
  },
};
