// POST /api/quote — quotation request from /options (Vercel serverless function, no dependencies).
// Sends two plain-text e-mails through the KMS mail server (Hitrost, SMTP over TLS, port 465):
//   1. the full specification to KMS (MAIL_TO), Reply-To = the customer
//   2. a confirmation with a copy of the specification to the customer, Reply-To = KMS
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   SMTP_PASS  required — password of the sending mailbox (info@vertical-plast.com)
//   SMTP_HOST, SMTP_PORT, SMTP_USER, MAIL_FROM, MAIL_TO  optional — defaults below
//   SMTP_SECURE=false  only for local tests against a plain-text SMTP server
const tls = require('tls');
const net = require('net');
const crypto = require('crypto');

const CFG = () => ({
  host: process.env.SMTP_HOST || 'b3.hitrost.net',          // the server behind mail.vertical-plast.com (its TLS certificate is *.hitrost.net)
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE !== 'false',
  user: process.env.SMTP_USER || 'info@vertical-plast.com',
  pass: process.env.SMTP_PASS || '',
  from: process.env.MAIL_FROM || process.env.SMTP_USER || 'info@vertical-plast.com',
  to: process.env.MAIL_TO || 'info@vertical-plast.com',
});
const FROM_NAME = 'KMS · vertical-plast.com';
const SITE = 'www.vertical-plast.com';
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
const MIN_FILL_MS = 3000;                                    // a person needs longer than this to fill in the form
const RATE = { max: 5, windowMs: 15 * 60 * 1000 };           // per IP, per warm function instance (best effort)
const hits = new Map();

/* ── helpers ── */
const clean = (v, max) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim().slice(0, max);   // single-line header-safe
const body = (v, max) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').slice(0, max);
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
function encWord(s) {                                        // RFC 2047 for non-ASCII headers: words of ≤ 75 chars, folded
  if (/^[\x20-\x7e]*$/.test(s)) return s;
  const words = []; let chunk = '';
  for (const ch of s) {                                      // by code point, so no character is split
    if (Buffer.byteLength(chunk + ch, 'utf8') > 45) { words.push(chunk); chunk = ''; }
    chunk += ch;
  }
  if (chunk) words.push(chunk);
  return words.map(w => '=?UTF-8?B?' + b64(w) + '?=').join('\r\n ');
}
const addr = (name, email) => (name ? encWord(name.replace(/["\\]/g, '')) + ' ' : '') + '<' + email + '>';

function message({ from, fromName, to, replyTo, subject, text }) {
  const domain = from.split('@')[1];
  const lines = [
    'From: ' + addr(fromName, from),
    'To: ' + addr('', to),
    replyTo ? 'Reply-To: ' + addr('', replyTo) : null,
    'Subject: ' + encWord(subject),
    'Date: ' + new Date().toUTCString().replace('GMT', '+0000'),
    'Message-ID: <' + crypto.randomUUID() + '@' + domain + '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean);
  const encoded = b64(text.replace(/\n/g, '\r\n')).replace(/.{1,76}/g, '$&\r\n');   // base64 lines never start with "."
  return lines.join('\r\n') + '\r\n\r\n' + encoded;
}

/* ── minimal SMTP client: implicit TLS, AUTH PLAIN, several messages per session ── */
function smtpSend(cfg, mails) {
  return new Promise((resolve, reject) => {
    const sock = cfg.secure
      ? tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host })
      : net.connect({ host: cfg.host, port: cfg.port });
    sock.setTimeout(15000, () => { sock.destroy(); reject(new Error('SMTP timeout')); });
    sock.on('error', reject);
    let buf = '', waiter = null;
    sock.on('data', d => {
      buf += d.toString('utf8');
      // a reply is complete when a line starts with "NNN " (multi-line replies use "NNN-")
      const m = buf.match(/(^|\r\n)(\d{3}) [^\r\n]*\r\n$/);
      if (m && waiter) { const w = waiter, text = buf; waiter = null; buf = ''; w(Number(m[2]), text.trim()); }
    });
    const expect = (codes, what) => new Promise((ok, fail) => {
      waiter = (code, text) => codes.includes(code) ? ok(text) : fail(new Error(what + ' failed: ' + text));
    });
    const cmd = (line, codes, what) => { const p = expect(codes, what); sock.write(line + '\r\n'); return p; };
    const results = [];
    (async () => {
      await expect([220], 'greeting');
      await cmd('EHLO vertical-plast.com', [250], 'EHLO');
      await cmd('AUTH PLAIN ' + Buffer.from('\0' + cfg.user + '\0' + cfg.pass, 'utf8').toString('base64'), [235], 'AUTH');
      for (const m of mails) {
        try {
          await cmd('MAIL FROM:<' + cfg.from + '>', [250], 'MAIL FROM');
          await cmd('RCPT TO:<' + m.to + '>', [250, 251], 'RCPT TO');
          await cmd('DATA', [354], 'DATA');
          await cmd(m.raw + '.', [250], 'message');           // raw ends with CRLF → "CRLF . CRLF" terminator
          results.push(true);
        } catch (e) {
          results.push(e);
          await cmd('RSET', [250], 'RSET').catch(() => {});
        }
      }
      await cmd('QUIT', [221], 'QUIT').catch(() => {});
      sock.end();
      resolve(results);
    })().catch(e => { sock.destroy(); reject(e); });
  });
}

function allowedOrigin(o) {
  if (!o) return true;                                        // same-origin requests may omit it
  try {
    const h = new URL(o).hostname;
    return h === 'www.vertical-plast.com' || h === 'vertical-plast.com' || h.endsWith('.vercel.app') || h === 'localhost' || h === '127.0.0.1';
  } catch (e) { return false; }
}

function rateLimited(ip) {
  const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < RATE.windowMs);
  list.push(now); hits.set(ip, list);
  return list.length > RATE.max;
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 100000) throw new Error('too large'); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

/* ── handler ── */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const reply = (status, data) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return reply(405, { ok: false, error: 'Method not allowed' }); }
  if (!allowedOrigin(req.headers.origin)) return reply(403, { ok: false, error: 'Forbidden' });

  let d;
  try { d = await readJson(req); } catch (e) { return reply(400, { ok: false, error: 'Invalid request' }); }

  if (d._gotcha) return reply(200, { ok: true });                                   // spam trap filled in: pretend success
  if (!(Number(d._t) >= MIN_FILL_MS)) return reply(429, { ok: false, error: 'Please wait a moment and send again.' });
  const ip = String(req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress) || '').split(',')[0].trim();
  if (rateLimited(ip)) return reply(429, { ok: false, error: 'Too many requests — please try again later or e-mail us directly.' });

  const f = {
    name: clean(d.name, 120), company: clean(d.company, 160), email: clean(d.email, 160).toLowerCase(),
    phone: clean(d.phone, 60), country: clean(d.country, 80), machine: clean(d.machine, 80),
    spec: body(d.message, 20000),
  };
  if (!f.name || !f.company || !f.phone || !f.country || !f.machine || !f.spec.trim()) return reply(400, { ok: false, error: 'Please fill in all fields marked *.' });
  if (!EMAIL_RE.test(f.email)) return reply(400, { ok: false, error: 'Please check your email address.' });
  if (f.phone.replace(/\D/g, '').length < 6) return reply(400, { ok: false, error: 'Please check your phone number.' });

  const cfg = CFG();
  if (!cfg.pass) { console.error('quote: SMTP_PASS is not set'); return reply(503, { ok: false, error: 'Sending is not configured yet.' }); }

  const toKms = message({
    from: cfg.from, fromName: FROM_NAME, to: cfg.to, replyTo: f.email,
    subject: 'Quotation request — ' + f.machine + ' — ' + f.company,
    text: 'New quotation request from ' + SITE + '/options\n'
      + 'Reply to this e-mail to answer ' + f.name + ' (' + f.email + ') directly.\n\n'
      + f.spec + '\n',
  });
  const toCustomer = message({
    from: cfg.from, fromName: FROM_NAME, to: f.email, replyTo: cfg.to,
    subject: 'Your quotation request — ' + f.machine + ' (copy)',
    text: 'Dear ' + f.name + ',\n\n'
      + 'thank you for your request. We have received your technical file and will reply with a quotation shortly.\n'
      + 'Below is a copy of your specification. If anything needs to change, simply reply to this e-mail.\n\n'
      + '----------------------------------------------------------------\n'
      + f.spec + '\n'
      + '----------------------------------------------------------------\n\n'
      + 'KMS, d.o.o. · official TAYU distributor for Slovenia, Croatia and Bosnia and Herzegovina\n'
      + 'Poslovna cona A 34, 4208 Šenčur, Slovenia · +386 4 25 16 150 · https://' + SITE + '\n\n'
      + 'This e-mail was sent automatically because this address was entered in the quotation form on ' + SITE + '.\n'
      + 'If you did not send a request, please ignore this message.\n',
  });

  try {
    const [kms, copy] = await smtpSend(cfg, [{ to: cfg.to, raw: toKms }, { to: f.email, raw: toCustomer }]);
    if (kms !== true) { console.error('quote: mail to KMS failed', String(kms)); return reply(502, { ok: false, error: 'Sending failed.' }); }
    if (copy !== true) console.error('quote: copy to customer failed', String(copy));
    return reply(200, { ok: true, copy: copy === true });
  } catch (e) {
    console.error('quote: SMTP error', e && e.message);
    return reply(502, { ok: false, error: 'Sending failed.' });
  }
};
