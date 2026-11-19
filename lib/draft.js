// Keeps an unsent rate report in this browser while the person signs in, so they come back
// to a filled-in form instead of an empty one. Stored only on their device (localStorage),
// never sent anywhere until they press Share. Plain JS so `node --test` can import it.

export const DRAFT_KEY = 'sr_draft_v1';
export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // a day
const SKIP = new Set(['website']); // honeypot

/** @typedef {{ savedAt: number, fields: Record<string, string> }} Draft */

/**
 * Turn form entries into a plain object (last value wins; empty values dropped).
 * @param {Iterable<[string, unknown]>} entries
 * @param {number} [now]
 * @returns {Draft}
 */
export function entriesToDraft(entries, now = Date.now()) {
  /** @type {Record<string, string>} */
  const fields = {};
  for (const [k, v] of entries) {
    if (SKIP.has(k) || typeof v !== 'string') continue;
    const t = v.trim();
    if (t) fields[k] = t.slice(0, 400);
  }
  return { savedAt: now, fields };
}

/**
 * Parse a stored draft; null if missing, broken, empty or older than a day.
 * @param {string | null | undefined} raw
 * @param {number} [now]
 * @returns {Draft | null}
 */
export function parseDraft(raw, now = Date.now()) {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object' || typeof d.savedAt !== 'number' || !d.fields || typeof d.fields !== 'object') return null;
    if (now - d.savedAt > DRAFT_TTL_MS || d.savedAt > now + 60_000) return null;
    /** @type {Record<string, string>} */
    const fields = {};
    for (const [k, v] of Object.entries(d.fields)) if (typeof v === 'string' && !SKIP.has(k)) fields[k] = v.slice(0, 400);
    return Object.keys(fields).length ? { savedAt: d.savedAt, fields } : null;
  } catch {
    return null;
  }
}

// Browser helpers: every storage call is wrapped, because private windows and blocked
// storage throw. Without storage the form still works, it just won't remember answers.
/** @param {HTMLFormElement} form */
export function saveDraft(form) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(entriesToDraft(new FormData(form).entries()))); } catch {}
}
/** @returns {Draft | null} */
export function loadDraft() {
  try { return parseDraft(localStorage.getItem(DRAFT_KEY)); } catch { return null; }
}
export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

/**
 * Put saved values back into the form's inputs (radios, selects, text, month).
 * @param {HTMLFormElement} form
 * @param {Record<string, string>} fields
 */
export function applyDraft(form, fields) {
  for (const [name, value] of Object.entries(fields)) {
    const els = form.querySelectorAll(`[name="${CSS.escape(name)}"]`);
    els.forEach((node) => {
      const el = /** @type {HTMLInputElement} */ (node);
      if (el.type === 'radio') el.checked = el.value === value;
      else if (el.type !== 'hidden') el.value = value;
    });
  }
}
