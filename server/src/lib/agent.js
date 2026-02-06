// Availability checker using direct DuckDuckGo site-restricted search.
// OpenAI remains optional and can be used later for disambiguation if desired.

import duckduckgoSearch from 'duckduckgo-search';
import { load as cheerioLoad } from 'cheerio';
import OpenAI from 'openai';
import AIAgentSettings from '../models/AIAgentSettings.js';

export function normalizeVendors(searchVendors = []) {
  return (Array.isArray(searchVendors) ? searchVendors : [])
    .filter((v) => v && v.enabled !== false && (v.url || v.name))
    .map((v) => ({ name: String(v.name || v.url || '').trim(), url: String(v.url || '').trim() }))
    .filter((v) => v.name || v.url);
}

function toDomain(input = '') {
  const s = String(input || '').trim();
  if (!s) return '';
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    return u.hostname.replace(/^www\./, '');
  } catch (_) {
    return s.replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/#?]/)[0];
  }
}

async function ddgSearchSites(query, domains = [], { maxResultsPerDomain = 5 } = {}) {
  const resultsByDomain = new Map();

  for (const d of domains) {
    const site = toDomain(d);
    if (!site) continue;
    const q = `${query} site:${site}`;
    const collected = [];
    try {
      // Primary: library iterator with a custom logger shim (workaround for .warning bug)
      let count = 0;
      const logger = { warning: () => {}, info: () => {}, debug: () => {} };
      for await (const r of duckduckgoSearch.text(q, { logger })) {
        if (count >= maxResultsPerDomain) break;
        collected.push({
          title: r?.title || '',
          url: r?.href || r?.url || '',
          snippet: r?.body || r?.description || '',
        });
        count += 1;
      }
      // If library produced no results, try HTML fallback
      if (collected.length === 0) {
        const fallback = await ddgHtmlSearch(q, maxResultsPerDomain);
        collected.push(...fallback);
      }
    } catch (err) {
      // Fallback: parse HTML results page
      try {
        const fallback = await ddgHtmlSearch(q, maxResultsPerDomain);
        collected.push(...fallback);
      } catch (err2) {
        console.error('[AI][search] DuckDuckGo search failed for', site, '-', err?.message || err, '| fallback:', err2?.message || err2);
      }
    }
    resultsByDomain.set(site, collected);
  }
  return resultsByDomain;
}

function decodeDuckLink(href = '') {
  try {
    const u = new URL(href, 'https://duckduckgo.com');
    const redirect = u.searchParams.get('uddg');
    if (redirect) return decodeURIComponent(redirect);
    return href;
  } catch (_) {
    return href;
  }
}

async function ddgHtmlSearch(query, limit = 5) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=en-us&ia=web`; // HTML endpoint avoids JS/cookie flows
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://duckduckgo.com/',
    },
  });
  if (!res.ok) throw new Error(`HTML search HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerioLoad(html);
  const out = [];
  // Try common selectors for DDG HTML results
  $('a.result__a, a.result__url, h2.result__title a').each((_, el) => {
    if (out.length >= limit) return false;
    const a = $(el);
    const href = a.attr('href') || '';
    const title = a.text().trim();
    const url = decodeDuckLink(href);
    if (!url) return;
    const parent = a.closest('.result, .web-result, .result__body');
    const snippet = parent.find('.result__snippet, .result__snippet.js-result-snippet, .result__extras__url').first().text().trim();
    out.push({ title, url, snippet });
  });
  return out.slice(0, limit);
}

function basicMatchScore(name = '', item = {}) {
  const title = String(item.title || '').toLowerCase();
  const snippet = String(item.snippet || '').toLowerCase();
  const q = String(name || '').toLowerCase();
  if (!q) return 0;
  let score = 0;
  if (title.includes(q)) score += 2;
  if (snippet.includes(q)) score += 1;
  // Token overlap heuristic
  const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
  const tokenHits = tokens.filter((t) => title.includes(t) || snippet.includes(t)).length;
  score += Math.min(2, tokenHits);
  return score;
}

// Check availability for a product using site-restricted search.
// Returns: { hits, vendors: [{name,url,hit:boolean}], sampleUrls: [] }
export async function checkAvailability(product, settingsDoc) {
  const settings = settingsDoc || (await AIAgentSettings.findOne().select('+apiKey'));
  const vendors = normalizeVendors(settings?.searchVendors);
  const allowedDomains = vendors.map((v) => v.url || v.name).filter(Boolean).map(toDomain);

  if (!allowedDomains.length) {
    return { hits: 0, vendors: vendors.map((v) => ({ ...v, hit: false })), sampleUrls: [] };
  }

  const query = [product?.name, product?.products?.name, product?.id, product?.product_id]
    .filter(Boolean)
    .join(' ');

  // Try OpenAI web_search first when API key is available
  const apiKey = settings?.apiKey ? String(settings.apiKey).trim() : '';
  const model = settings?.model || 'gpt-5';
  if (apiKey) {
    try {
      const { foundDomains, sampleUrls } = await openaiWebSearchAvailability({
        apiKey,
        model,
        query,
        allowedDomains,
        systemPrompt: settings?.systemPrompt,
        temperature: Number(settings?.modelSettings?.temperature ?? 0.2),
        top_p: Number(settings?.modelSettings?.top_p ?? 1),
      });
      const foundSet = new Set((foundDomains || []).map((d) => toDomain(d)));
      const enriched = vendors.map((v) => {
        const key = toDomain(v.url || v.name);
        const hit = foundSet.has(key);
        return { ...v, hit };
      });
      const hits = enriched.filter((v) => v.hit).length;
      return { hits, vendors: enriched, sampleUrls: (sampleUrls || []).slice(0, 5), note: 'openai_web_search' };
    } catch (err) {
      console.warn('[AI][search] OpenAI web_search failed, falling back to DDG:', err?.message || err);
      // fall through to DDG
    }
  }

  // Fallback to DuckDuckGo search (library + HTML parsing)
  const resultsByDomain = await ddgSearchSites(query, allowedDomains, { maxResultsPerDomain: 5 });

  const enriched = vendors.map((v) => {
    const key = toDomain(v.url || v.name);
    const list = resultsByDomain.get(key) || [];
    const best = list.reduce((m, it) => Math.max(m, basicMatchScore(product?.name || '', it)), 0);
    const hit = best >= 2 || list.length > 0;
    return { ...v, hit };
  });

  const sampleUrls = [];
  for (const d of allowedDomains) {
    const list = resultsByDomain.get(d) || [];
    for (const it of list) {
      if (it?.url) sampleUrls.push(it.url);
      if (sampleUrls.length >= 5) break;
    }
    if (sampleUrls.length >= 5) break;
  }

  const hits = enriched.filter((v) => v.hit).length;
  return { hits, vendors: enriched, sampleUrls, note: 'ddg_fallback' };
}

async function openaiWebSearchAvailability({ apiKey, model, query, allowedDomains, systemPrompt, temperature = 0.2, top_p = 1 }) {
  const client = new OpenAI({ apiKey });
  const instructions =
    systemPrompt ||
    'You are an electronics sourcing assistant. Search ONLY the allowed domains for the exact product availability. Return strict JSON.';

  const toolPrompt = `Allowed domains: ${allowedDomains.join(', ')}\n` +
    `Task: Determine which allowed domains list this product and provide up to 5 example URLs from those domains.\n` +
    `Product query: ${query}\n` +
    `Constraints: Only search allowed domains. If possible, use site:domain style queries. If no matches, return empty arrays.\n` +
    `Output JSON with this shape: {"domains": ["example.com"], "sample_urls": ["https://example.com/..."]}`;

  const resp = await client.responses.create({
    model,
    tools: [{ type: 'web_search' }],
    input: `${instructions}\n\n${toolPrompt}`,
    temperature,
    top_p,
    max_output_tokens: 300,
  });

  const text = resp?.output_text || '';
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {
    // Try to extract JSON block from text
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error('OpenAI response not parseable as JSON');
    json = JSON.parse(m[0]);
  }
  const domains = Array.isArray(json?.domains) ? json.domains.map(toDomain).filter(Boolean) : [];
  const sampleUrls = Array.isArray(json?.sample_urls) ? json.sample_urls.filter((u) => typeof u === 'string') : [];
  return { foundDomains: domains, sampleUrls };
}
