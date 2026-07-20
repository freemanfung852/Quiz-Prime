# SEO / AEO / GEO + Speed — Progress Tracker

> **Resume protocol:** read this file top-to-bottom + `git log --oneline -20`, then continue
> from the first ☐/◐ task. Every task below is an atomic commit. This file is the single
> source of truth for "where we are" — keep it updated as work lands.

**Goal:** make the live `www.traveltotransform.com` (this `ttt-clone/` on Vercel) fully
crawlable/indexable, emit rich structured data for search + answer + generative engines, and
load much faster. Full plan: `~/.claude/plans/https-github-com-freemanfung852-quiz-pri-compiled-anchor.md`.

**Working branch:** `seo-aeo-geo-optim` (off `origin/main`).
**Deploy target:** `main` → Vercel project `travel-to-transform` (Root Dir `ttt-clone`).
`main` is shared with Cris → ship via branch → PR → merge. **Do NOT push to `main` / deploy
without Freeman's go-ahead** (live production site).

**Status legend:** ☐ todo · ◐ in-progress · ✅ done · ⏳ blocked

---

## NOW / NEXT / BLOCKED
- **NOW:** Waves 0/1/1b/1c/2 SHIPPED + verified. Wave 4 safe part (`.vercelignore`, deploy
  −260 MB) on branch `seo-wave4-images`, PR — **this closes the safe standalone SEO work.**
- **NEXT:** the 🔒 FRESH SESSION bundle below (all hydration-sensitive, do together with per-page
  browser verification): podcast grid rebuild · Wave 3 body content · Bug C header/footer ·
  runtime image optimisation (all share the Nuxt data payload).
- **BLOCKED:** nothing standalone remains — everything left is hydration-coupled.

## 🔒 FRESH SESSION — hydration-sensitive work (do NOT touch piecemeal)
**Why grouped:** all three re-render/replace client-hydrated DOM; each needs per-page browser
verification. The `/podcast` grid reorder (PR #7) was reverted (PR #9) after it desynced card
title vs link on the live hydrated DOM.

**Cris's authoritative diagnosis (site's builder) — settled approach, do not re-investigate:**
> Clone is an HTML snapshot, not a reusable card system. Each podcast card exists in THREE places:
> (1) Static HTML (image/title initially shown); (2) Nuxt hydration payload (title/link restored
> after load); (3) `ghl-offline-data.js` (catalog used during client fetch). PR #7 changed only
> the static HTML image → Nuxt then reused the old title + hyperlink → mixed card.
> **Best fix:** replace the podcast grid with a locally-owned data model —
> `{ "title", "image": "/assets/podcast/x.png", "url": "/post/slug", "date" }`. One JSON object =
> one complete card; array order = grid order. No GHL hydration conflict; a future episode = one
> clean entry. **Durable Vercel fix:** local JSON + card renderer, **disable the old Nuxt
> podcast-grid hydration.** **Interim workaround:** publish the episode in GHL, then run
> `publish.py sync`.

- **Reuse `ttt-clone/podcast-episodes.json`** (created in Wave 2) as that local episode model —
  same shape Cris described. Don't build episode metadata twice.
- **Wave 3 (body content):** internal links, descriptive alt-text, in-body perf (img dims,
  YouTube facades) — body edits → hydration-sensitive.
- **Bug C (podcast-post header/footer):** ~27 KB HTML + ~46 KB missing CSS (footer entirely
  absent) + Nuxt-data transplant. Prove on ONE post, browser-verify hydration, then roll out to 22.
- **Runtime image optimisation (Wave 4 leftover):** the homepage's ~26 MB of images are
  **hydration-locked** — each heavy image lives in the Nuxt `<script>` data payload (with alt),
  so Nuxt re-renders it on hydration; rewriting `<img>` URLs to WebP/AVIF (optimizer-wrapped or
  re-hosted) desyncs like the cards did. Re-host from the local model + patch the data payload as
  part of this rebuild. (Cache headers already shipped in Wave 1c; the dead 248 MB mirror already
  dropped via `.vercelignore` in Wave 4.)
- **Verification standard (all of the above):** per-card/per-page browser check on the preview
  that **title == link == image == same episode**, clicked through, BEFORE merge. Never verify
  by static/raw HTML or slug-order alone (that's what missed the PR #7 desync).

## ⚠️ HYDRATION MODEL (learned 2026-07-19 — governs all head/body edits)
Pages are **Nuxt SSR clones with live client-side hydration**. Verified on a live post:
- Tags GHL puts in its head config (**canonical, description, og:title/description/image**) are
  **reconciled/rewritten by Nuxt on hydration** (post canonical became relative `/post/<slug>`).
- Tags GHL does NOT set (**og:url, og:site_name, og:locale, twitter:\*, og:image:alt**) are left
  alone → injected versions **survive**.
- Core pages have NO GHL-managed canonical (live homepage renders `canonical:null`) → injected
  core-page canonical/description should survive, but **verify on live after each deploy**.
- **BODY edits** (listing cards, post prose) risk the "content vanishes on hydration" regression
  the Cris session hit → require patching the Nuxt payload too / browser verification.

---

## Wave 0 — Indexing cutover  ✅ SHIPPED (PR #3 merged, deployed)
- ✅ `CUTOVER = True`; `robots.txt` → `Allow: /` + `Sitemap:`; `sitemap.xml` = 65 URLs.
- ✅ Merged via PR #3 → live `www.traveltotransform.com/robots.txt` confirms `Allow: /`.
- ☐ **Post-ship:** submit sitemap in Google Search Console + Bing; request homepage indexing. (Freeman)

## Wave 1 — Crawl/index foundation (head meta)  ✅ done (branch `seo-wave1-head-meta`, PR opening)
- ✅ **www vs non-www:** non-www serves 200 directly (no redirect) → kept `CANONICAL_DOMAIN` = non-www.
- ✅ New self-contained `cmd_seoheads()` in `publish.py` (`enhance_head`) — reads meta from each
  page's HTML (GHL API dead), adds only MISSING head tags inside `<!--ttt-seo-->` markers. Idempotent.
- ✅ Canonical on **all 32 indexable non-post pages** (were 0); `noindex,follow` on 16 funnel/system pages.
- ✅ OG/Twitter sitewide: `og:url`, `og:site_name`, `og:locale`, `twitter:card/title/description/image`,
  `og:image:alt` — added where missing (skips posts' existing tags; 0 duplicate canonicals).
- ✅ Curated `meta description` for 16 core public pages (DRAFT copy — refine in TTT voice).
- ✅ **Wave 1b (branch `seo-wave1b-gsc-redirect-desc`):** drafted descriptions for all 5 pages from
  page content (`anf-free`, `additional-accelerator(-page)`, `course-pre-launch-sign-up`, `newsletter-qr`).
- ✅ **Google Search Console** verification `<meta google-site-verification>` on homepage only.
- ✅ **www → non-www 301** in `vercel.json` (host `has` redirect, first rule) so Google sees one host.
- ✅ **Wave 1c (branch `seo-wave1c-infra`):** `llms.txt` AI manifest; robots.txt explicit AI-bot
  Allow (GPTBot/OAI-SearchBot/ChatGPT-User/ClaudeBot/Claude-Web/PerplexityBot/Google-Extended);
  `vercel.json` cache headers for `/assets/**` (30d + SWR); **fixed www-root 301** (Vercel `/:path*`
  missed bare `/` → added explicit `/` rule). *Verify www→non-www on `/` after deploy.*
- ⚠️ Parked: `additional-accelerator`, `additional-accelerator-page`, `coaching-form` are near-duplicate
  coaching-form pages → consider consolidating/cross-canonicalising later (duplicate-content).
- ⏳ **Post-merge verify:** confirm injected canonical/description survive Nuxt hydration on live core pages.

## Wave 2 — Structured-data depth (AEO/GEO)  ✅ done (branch `seo-wave2-jsonld`, PR opening)
New self-contained `cmd_jsonld()` / `inject_jsonld()` in `publish.py` — adds an idempotent
`<!--ttt-schema--><script data-ttt-schema>@graph</script>` to indexable pages (head/script-level;
leaves the old `data-ttt-seo` BlogPosting blocks in place; no grids/shim/body/forms touched).
- ✅ Homepage: `Organization` (with `logo` + `sameAs` FB/IG/LinkedIn) + `WebSite`.
- ✅ `/about`: `Person` (Freeman, jobTitle, sameAs, worksFor) + `ProfilePage`.
- ✅ `/course/tmb`: `Course` (with `provider` Organization).
- ✅ 22 podcast posts: `PodcastEpisode` (name/url/date/description/image/author/publisher) +
  `WebPage` with `SpeakableSpecification`. All 25 blocks validated as parseable JSON; @id refs
  carry inline type/name so each page validates standalone AND consolidates site-wide.
- **Episode source = `ttt-clone/podcast-episodes.json`** (NEW, 22 eps, shape
  `{title, slug, url, image, date, description}`) — the single local episode model. **The
  deferred grid rebuild MUST reuse this file** (see FRESH SESSION) so episode metadata isn't built
  twice. To add PodcastEpisode media/series later, enrich this JSON (associatedMedia/partOfSeries)
  and re-run `jsonld`.
- ⏳ Deferred (need body content, → Wave 3 fresh session): `FAQPage`/`Question` (no FAQ content yet);
  blog-post Article upgrade + Speakable.
- ⏳ **Post-merge verify:** JSON-LD present + valid on the live *rendered* DOM (Rich Results Test)
  on homepage, /about, /course/tmb, one podcast post.

## Wave 3 — Content extractability (AEO/GEO)  ☐  *[parallel: Agent Content]*
- ☐ ≥2 question-phrased H2s per post (21 podcasts have 0, blogs 1) + short FAQ tail (feeds Wave 2).
- ☐ Internal linking: ≥2 article-to-article + 1 money-page link per post (23/28 have zero).
- ☐ Descriptive alt text (replace `Photo 1`/`Reel 2`/`Brand Logo`).
- ☐ Semantic `<article>`/`<main>` wrappers where feasible.

## Wave 4 — Loading speed  ◐ (safe part shipped; runtime image work DEFERRED → fresh session)
- ✅ **`.vercelignore` the dead CDN mirror** (`assets.cdn.filesafe.space/`, `storage.googleapis.com/`,
  `images.squarespace-cdn.com/`) → deploy **~289 MB → ~29 MB (−260 MB, 90%)**. Zero runtime effect
  (all refs are absolute CDN URLs, verified). Branch `seo-wave4-images`, PR.
- ⛔ **DEFERRED (hydration-locked → fresh session):** homepage ~26 MB images, WebP/AVIF re-host,
  `width`/`height`+lazy/`fetchpriority` on data-driven imgs — all live in the Nuxt data payload
  (see FRESH SESSION bundle). Cannot touch without desync per the PR #7 lesson.
- ⛔ **DEFERRED (deferred body/head areas):** Tailwind CDN JIT removal, YouTube facades (post
  bodies), font subsetting (GHL-managed head) — need the same hydration-aware handling.
- ✅ Cache headers already shipped (Wave 1c) — not re-touched.

## Wave 5 — Verify & ship  ☐
- ☐ Re-crawl live: robots allows, sitemap resolves, canonicals 200 (no redirect chain), no noindex.
- ☐ Lighthouse before/after (Perf + SEO) homepage + a post; Rich Results Test + schema validator.
- ☐ GSC: sitemap accepted, pages indexing.

---

## Standalone pages
- ✅ **`/newsletter`** (2026-07-20, branch `newsletter-page`, PR): dedicated public opt-in page
  restored (lost in migration) as a funnel/keynote destination. New file
  `traveltotransform.com/newsletter.html` based on the `podcast.html` static shell (full global
  header/nav/footer + inline CSS). **Authored fresh with NO legacy Nuxt payload** — the
  `__NUXT_DATA__` content payload + `_preview/*` runtime module + 41 preload hints were dropped, so
  the page is fully static (zero PR#7-style hydration/desync surface). Mobile hamburger was
  runtime-wired, so a ~6-line vanilla `hide-popup`/`submenu-mobile-active` toggle restores it
  (browser-verified: opens overlay + X closes). **Embeds the live "Newsletter" GHL form
  (`Pqnb4CZblVGr0uxznfWj`) — distinct from the site-wide Footer form (`DFQZnEZ3zuA8L487qDE2`)** —
  via the direct `connect.unwiz.ai/widget/form/…` iframe + `form_embed.js` (full_name/email/consent/
  submit). Form appears **once** (hero only); the newsletter column was removed from this page's
  footer (both mobile+desktop) leaving links/social/copyright/Instagram intact. The Newsletter form
  is light-designed (white bg, dark labels, its own blue border, gold Submit), so the hero card is
  **white** with a soft shadow (NOT the footer form's `#187cb5` blue — verified on preview). Hero
  copy = the general "travel as a gateway to personal evolution" positioning (headline/subcopy/
  consent), with matching `og:title`/`og:description`/`twitter:*`. Hero has an empty
  `.nl-hero__gallery[hidden]` placeholder for a future image drop-in (no rebuild). `/newsletter`
  rewrite in `vercel.json` (mirrors `/quiz`), sitemap entry + self-canonical + OG/Twitter meta
  (indexable, `og:locale en_US`, title casing "Travel To Transform"). UTM params pass through
  (static page, no query parsing; verified no horizontal overflow). NB: the form's post-submit
  thank-you message lives inside the cross-origin `connect.unwiz.ai` iframe and is handled in GHL —
  not styleable from the page (do not add CSS/JS targeting iframe internals).
  ⏳ **CRM verify (Freeman):** one real submission → lands in GHL, records newsletter consent,
  respects DND/unsubscribe, fires the welcome (Soap Opera) sequence.

## Notes / decisions log
- 2026-07-19: Wave 0 done locally on branch `seo-aeo-geo-optim`. Crawler block was the #1 issue
  (live `robots.txt` was `Disallow: /`). Not yet pushed/deployed — awaiting go-ahead.
- GHL sync half of `publish.py` is defunct (content left GHL); `sitemap`/`enhance`/`check` still
  work locally. Note this in `PUBLISHING.md` during Wave 1/5.
- Untracked in tree (not on main): `assets/logos/`, `traveltotransform.com/resources/` — left alone.
