# KMS — Vertical Injection Moulding Machines website

A static, SEO-optimised marketing site built from the **Industry** design system and the
homepage/inner-page wireframes (option 2c). Populated with the KMS vertical injection moulding
machine range (12 models, 45–450 t) for **insert moulding, insert overmoulding and metal
overmoulding** on **vertical rotary table** cells.

No build step, no framework — plain HTML/CSS/JS. It deploys to Vercel or GitHub Pages as-is.

## Structure

```
index.html              Homepage — sticky machine finder (configurator) + product story (wireframe 2c)
machines.html           Machine range — /machines — compare table with live filters (3a)
machine/<slug>.html     12 machine detail pages — /machine/<slug> — spec-sheet-first (3b)
insert-moulding.html    Insert & overmoulding process — /insert-moulding (3c)
automation.html         Automation cells — /automation (3d)
service.html            Service & support — /service
company.html            About + industries served (solutions) — /company
downloads.html          Spec sheets + contact form + global presence — /downloads (3e)
404.html                Not-found page
assets/css/styles.css   Design-system tokens + components (blueprint objects, duotone, buttons, tables)
assets/css/site.css     Production layout (header, finder rail, sections, footer, responsive)
assets/js/machines.js   Machine catalogue (single source of truth) + configurator match logic
assets/js/site.js       Configurator, range filters/highlight, detail tabs, mobile nav
assets/img/             Product photography (duotoned in-page via CSS)
vercel.json             cleanUrls, security + cache headers
robots.txt, sitemap.xml SEO
favicon.svg
```

## Run locally

```bash
npx serve .
```

Then open the printed `http://localhost:3000`. (Use a server, not `file://` — pages use root-absolute
paths like `/assets/...` and `/machines`.)

## Deploy

### Vercel (recommended)
1. Push this folder to a GitHub repo.
2. In Vercel: **New Project → Import** the repo. Framework preset: **Other**. Build command: none.
   Output directory: `.` (root).
3. Deploy. `vercel.json` enables clean URLs (`/machines`, `/machine/tyw-1200-j`), cache headers on
   `/assets/*`, and basic security headers.

Or from the CLI: `npm i -g vercel && vercel`.

### GitHub Pages
Works too, but clean URLs (`/machines` without `.html`) are a Vercel feature. On Pages, either keep the
`.html` in links or add a static-site generator. Vercel is the intended target.

## Design system

Ported from the handoff `ds/styles.css`. Signature = **blueprint objects**: square corners, 1px
hairline borders, `+` corner registration marks (`.blueprint` + four `<i class="corner …">`).
Photography is washed to steel via `.duotone`. Type is Barlow Condensed over Barlow. The one vibrant
colour (`--accent: #ff5a1f`) is used **only** for the primary button and selection state.

## The machine finder (configurator)

One piece of client state — `{ insert, weight, volume }` — all pre-answered with the most common
value, so a match shows on first paint (works without JS). Selecting a chip recomputes the match from
the lookup in `assets/js/machines.js`. The last answer is stored (localStorage) so the range page
highlights the same suggested model.

## ⚠️ Before launch — replace these placeholders

- **Canonical domain.** Everything uses `https://www.kms.si`. Find-and-replace to your real domain in
  all `.html`, `sitemap.xml` and `robots.txt` if different.
- **Contact details.** `sales@kms.si` and `+386 (0)1 000 00 00` are placeholders (footer + Downloads
  page). Replace with live KMS sales contact.
- **Download form.** `downloads.html` posts to `https://formspree.io/f/your-form-id`. Wire it to your
  form handler (Formspree, Vercel Forms, etc.) or point the buttons at real PDF files.
- **Spec-sheet PDFs.** "Download spec sheet" links currently point to `/downloads`. Add one PDF per
  model and link them.
- **Images.** Product photos in `assets/img/` are sourced from the supplied product data. Swap for
  final KMS photography (duotone treatment is automatic).
- **Technical figures.** Detail pages show real headline specs (clamping force, table, process, insert
  loading) and mark shot weight / screw Ø / energy as "On request" — fill from the real spec sheets.

## SEO

- Unique `<title>`, meta description and canonical per page.
- Target keywords woven into copy: *vertical injection moulding, insert moulding, insert overmoulding,
  metal overmoulding, vertical rotary table, higher added value.*
- Open Graph tags, `sitemap.xml`, `robots.txt`.
- JSON-LD: `Organization` + `WebSite` (home), `Product` (each machine), `BreadcrumbList` (inner pages).
- Fully pre-rendered static HTML — crawlable without JS. English only.
