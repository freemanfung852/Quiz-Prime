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
- **NOW:** Wave 0 (PR #3) + Wave 1 head meta (PR #4) SHIPPED. Wave 1b (GSC verify tag + www→non-www
  301 + 5 descriptions) done on branch `seo-wave1b-gsc-redirect-desc`, opening PR.
- **NEXT:** `llms.txt` + `vercel.json` cache headers; then Wave 2 (richer JSON-LD). Post-merge:
  verify head tags survive hydration on live core pages; Freeman completes GSC verification.
- **BLOCKED:** nothing. Ship path = branch → PR → merge → Vercel auto-deploy (confirmed working).

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
- ☐ `ttt-clone/llms.txt` (new) — AI-crawler manifest. Add explicit AI-bot `Allow` in `robots.txt`.
- ☐ `vercel.json` `headers` block — long cache for `/assets/**`. (Shared with Wave 4.)
- ⚠️ Parked: `additional-accelerator`, `additional-accelerator-page`, `coaching-form` are near-duplicate
  coaching-form pages → consider consolidating/cross-canonicalising later (duplicate-content).
- ⏳ **Post-merge verify:** confirm injected canonical/description survive Nuxt hydration on live core pages.

## Wave 2 — Structured-data depth (AEO/GEO)  ☐  *[parallel: Agent Schema]*
- ☐ `enhance_post`: add `publisher.logo` (fixes invalid Article rich results) + `sameAs`
  (brand + Freeman socials).
- ☐ Podcasts → `PodcastEpisode` (+ `partOfSeries`→`PodcastSeries`, `duration`,
  `associatedMedia`→`VideoObject`/`AudioObject`) instead of `BlogPosting`.
- ☐ `FAQPage`/`Question`/`acceptedAnswer` + `speakable` (both 0 today).
- ☐ Strip `｜Travel to Transform` from `headline`; stop mid-word 300-char `description` cut.
- ☐ Make generator reproduce the `beyonder` gold-standard (stop drift/clobber).
- ☐ Page schema: homepage `WebSite`+`SearchAction`+`Organization`; `/about` `Person`/`ProfilePage`;
  `/course/tmb` `Course`/`Offer`.

## Wave 3 — Content extractability (AEO/GEO)  ☐  *[parallel: Agent Content]*
- ☐ ≥2 question-phrased H2s per post (21 podcasts have 0, blogs 1) + short FAQ tail (feeds Wave 2).
- ☐ Internal linking: ≥2 article-to-article + 1 money-page link per post (23/28 have zero).
- ☐ Descriptive alt text (replace `Photo 1`/`Reel 2`/`Brand Logo`).
- ☐ Semantic `<article>`/`<main>` wrappers where feasible.

## Wave 4 — Loading speed  ☐  *[parallel: Agent Perf]*
- ☐ Images (hybrid): re-host + WebP/AVIF the worst offenders (18.9 MB PNG + multi-MB heroes on
  index/coaching/course/tmb) → `assets/optimized/`, rewrite those URLs; light-touch rest.
- ☐ Add `width`/`height` to all `<img>` (CLS); fix inverted lazy/eager priority (hero eager +
  `fetchpriority="high"`, below-fold lazy); `decoding="async"`.
- ☐ Remove `cdn.tailwindcss.com` runtime JIT on the 3 marketing pages → prebuilt purged CSS.
- ☐ YouTube facade (click-to-load) for 8 embeds.
- ☐ Fonts: subset used families/weights; `preconnect fonts.googleapis.com`; drop unused `.otf`.
- ☐ Resource hints: `preconnect assets.cdn.filesafe.space`, `preload` LCP image; de-dupe Swiper
  `<script>` + font preloads; `defer ghl-offline-data.js`.
- ☐ `.vercelignore` the 237 MB dead local CDN mirror (deploy bloat only).

## Wave 5 — Verify & ship  ☐
- ☐ Re-crawl live: robots allows, sitemap resolves, canonicals 200 (no redirect chain), no noindex.
- ☐ Lighthouse before/after (Perf + SEO) homepage + a post; Rich Results Test + schema validator.
- ☐ GSC: sitemap accepted, pages indexing.

---

## Notes / decisions log
- 2026-07-19: Wave 0 done locally on branch `seo-aeo-geo-optim`. Crawler block was the #1 issue
  (live `robots.txt` was `Disallow: /`). Not yet pushed/deployed — awaiting go-ahead.
- GHL sync half of `publish.py` is defunct (content left GHL); `sitemap`/`enhance`/`check` still
  work locally. Note this in `PUBLISHING.md` during Wave 1/5.
- Untracked in tree (not on main): `assets/logos/`, `traveltotransform.com/resources/` — left alone.
