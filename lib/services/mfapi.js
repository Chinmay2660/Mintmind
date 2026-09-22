const MFAPI_BASE = 'https://api.mfapi.in/mf';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const navCache = new Map();

function cacheKey(schemeCode, date) {
  return `${schemeCode}:${date || 'latest'}`;
}

function getCached(key) {
  const entry = navCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    navCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  navCache.set(key, { data, ts: Date.now() });
}

export async function fetchSchemeNav(schemeCode) {
  const key = cacheKey(schemeCode);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${MFAPI_BASE}/${schemeCode}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error(`mfapi returned ${res.status}`);
    const json = await res.json();
    if (json.status !== 'SUCCESS' || !json.data?.length) {
      throw new Error('No NAV data available');
    }
    const latest = json.data[0];
    const result = {
      schemeCode: String(schemeCode),
      schemeName: json.meta?.scheme_name || '',
      fundHouse: json.meta?.fund_house || '',
      nav: parseFloat(latest.nav),
      navDate: latest.date,
      stale: false,
    };
    setCache(key, result);
    return result;
  } catch (err) {
    console.error('mfapi fetch failed:', err.message);
    return { schemeCode: String(schemeCode), nav: null, navDate: null, stale: true, error: err.message };
  }
}

export async function fetchSchemeHistory(schemeCode, range = '1Y') {
  const key = cacheKey(schemeCode, `history-${range}`);
  const cached = getCached(key);
  if (cached) return cached;

  try {
    const res = await fetch(`${MFAPI_BASE}/${schemeCode}`, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`mfapi returned ${res.status}`);
    const json = await res.json();
    if (json.status !== 'SUCCESS') throw new Error('No history available');

    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12, '3Y': 36, '5Y': 60, MAX: 9999 }[range] || 12;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);

    const history = json.data
      .filter((d) => new Date(d.date.split('-').reverse().join('-')) >= cutoff)
      .map((d) => ({ date: d.date, nav: parseFloat(d.nav) }))
      .reverse();

    setCache(key, history);
    return history;
  } catch (err) {
    console.error('mfapi history failed:', err.message);
    return [];
  }
}

export async function searchSchemes(query) {
  try {
    const res = await fetch(`${MFAPI_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json || []).slice(0, 20).map((s) => ({
      schemeCode: String(s.schemeCode),
      schemeName: s.schemeName,
    }));
  } catch {
    return [];
  }
}
