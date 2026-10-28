/* TalentPulse – utilitários (formatação, validação, hash) */
window.TP = window.TP || {};
(function (TP) {
  'use strict';
  const p2 = n => String(n).padStart(2, '0');

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const todayISO = () => {
    const d = new Date();
    return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  };

  const isISODate = s => {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  };

  const fmtDate = iso => (iso && isISODate(iso)) ? iso.split('-').reverse().join('/') : '—';

  const addMonths = (iso, months) => {
    let [y, m, d] = iso.split('-').map(Number);
    const total = (y * 12 + (m - 1)) + months;
    y = Math.floor(total / 12); m = (total % 12) + 1;
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return y + '-' + p2(m) + '-' + p2(Math.min(d, last));
  };

  const daysBetween = (a, b) => {
    const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
  };

  const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const digits = s => String(s ?? '').replace(/\D/g, '');
  const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  /* ---------- CPF ---------- */
  const cpfDV = base => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += Number(base[i]) * (base.length + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const isValidCPF = v => {
    const c = digits(v);
    if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
    const d1 = cpfDV(c.slice(0, 9));
    const d2 = cpfDV(c.slice(0, 9) + d1);
    return c.endsWith('' + d1 + d2);
  };
  const formatCPF = v => {
    const c = digits(v).slice(0, 11);
    return c.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  };
  const makeCPF = base9 => {
    const b = String(base9).padStart(9, '0');
    const d1 = cpfDV(b), d2 = cpfDV(b + d1);
    return formatCPF(b + d1 + d2);
  };

  /* ---------- outras validações ---------- */
  const isEmail = s => typeof s === 'string' && s.length <= 100 &&
    /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}$/.test(s);
  const cleanName = s => String(s ?? '').replace(/\s+/g, ' ').trim();
  const isPersonName = s => /^[A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]+$/.test(s) && s.split(' ').filter(w => w.length >= 2).length >= 2;
  const isMoney = n => typeof n === 'number' && isFinite(n);

  /* ---------- SHA-256 síncrono (sem backend) ---------- */
  const sha256 = (() => {
    const primes = []; for (let n = 2; primes.length < 64; n++) if (primes.every(p => n % p)) primes.push(n);
    const frac = x => Math.floor((x - Math.floor(x)) * 4294967296) >>> 0;
    const K = primes.map(p => frac(Math.cbrt(p)));
    const H0 = primes.slice(0, 8).map(p => frac(Math.sqrt(p)));
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    return str => {
      const bytes = Array.from(unescape(encodeURIComponent(str))).map(c => c.charCodeAt(0));
      const bitLen = bytes.length * 8;
      bytes.push(0x80);
      while (bytes.length % 64 !== 56) bytes.push(0);
      for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
      const H = H0.slice();
      for (let o = 0; o < bytes.length; o += 64) {
        const w = new Array(64);
        for (let i = 0; i < 16; i++) w[i] = (bytes[o + 4 * i] << 24) | (bytes[o + 4 * i + 1] << 16) | (bytes[o + 4 * i + 2] << 8) | bytes[o + 4 * i + 3];
        for (let i = 16; i < 64; i++) {
          const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
          const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
          w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        }
        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
          const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
          const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
          const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
          const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
          h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        [a, b, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
      }
      return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
    };
  })();

  TP.util = { esc, brl, todayISO, isISODate, fmtDate, addMonths, daysBetween, norm, digits, round2,
    isValidCPF, formatCPF, makeCPF, isEmail, cleanName, isPersonName, isMoney, sha256 };
})(window.TP);
