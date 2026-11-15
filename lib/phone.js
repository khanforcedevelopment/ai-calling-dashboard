// Turn whatever is in the CSV into an international number like +9715XXXXXXXX.
// Returns null if the number cannot be understood.
export function normalizeNumber(raw, defaultCountry = '971') {
  if (raw === null || raw === undefined) return null;
  let s = String(raw).trim().replace(/[\s\-().]/g, '');
  if (!s) return null;

  if (s.startsWith('00')) s = '+' + s.slice(2);

  if (s.startsWith('+')) {
    const d = s.slice(1).replace(/\D/g, '');
    return /^\d{8,15}$/.test(d) ? '+' + d : null;
  }

  s = s.replace(/\D/g, '');
  if (!s) return null;

  // Already has the country code, e.g. 9715XXXXXXXX
  if (s.startsWith(defaultCountry) && s.length >= 11) {
    return /^\d{8,15}$/.test(s) ? '+' + s : null;
  }

  // Local UAE formats: 05XXXXXXXX, 5XXXXXXXX, 04XXXXXXX
  if (s.startsWith('0')) s = s.slice(1);
  if (/^5\d{8}$/.test(s) || /^[2-79]\d{7}$/.test(s)) {
    return '+' + defaultCountry + s;
  }

  // Anything else with enough digits: assume it already has a country code
  if (/^\d{10,15}$/.test(s)) return '+' + s;
  return null;
}
