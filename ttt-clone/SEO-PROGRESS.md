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
- **NOW:** Wave 0 complete locally (crawler unblocked). Awaiting Freeman's go-ahead to ship.
- **NEXT:** Wave 1 (sitewide meta/canonical/OG-Twitter + llms.txt + vercel cache headers).
- **BLOCKED:** shipping to `main`/prod — needs Freeman's confirmation (live shared site).

---

## Wave 0 — Indexing cutover  ✅ (local; unshipped)
- ✅ `tools/publish.py` — `CUTOVER = True` (was False). *verify: line ~44.*
- ✅ Ran `python3 tools/publish.py sitemap` → `robots.txt` = `User-agent:* / Allow:/ / Sitemap:`;
  `sitemap.xml` = 65 URLs. *verify: `cat ttt-clone/robots.txt` shows `Allow: /`.*
- ☐ **SHIP + submit** sitemap in Google Search Console + Bing; request homepage indexing. ⏳ needs go-ahead.

## Wave 1 — Crawl/index foundation (sitewide meta + infra)  ☐
- ☐ **www vs non-www decision.** Live 301s non-www→www, but `CANONICAL_DOMAIN`/sitemap/canonicals
  use non-www. Recommend aligning everything to **www** (server already enforces www): set
  `CANONICAL_DOMAIN = "https://www.traveltotransform.com"`, re-run `enhance` + `sitemap`.
- ☐ Core-page enhancement stage in `publish.py` (map `slug → {title, description}`): add
  `meta description` (missing on ≥8: podcast, coaching, appreciation, about, resources, speaking,
  my-travel-stories, course/tmb…), self `canonical` (missing on all core pages), consistent
  `<title>` delimiter.
- ☐ OG/Twitter sitewide (posts via `enhance_post`, core via new stage): `og:url`, `og:site_name`,
  `twitter:card`+`twitter:*`, `og:image:alt`; fix `og:type` (`blog`→`article`) on 21 podcasts.
- ☐ `ttt-clone/llms.txt` (new) — AI-crawler manifest (site summary + key URLs). Add explicit
  `Allow` for GPTBot/ClaudeBot/PerplexityBot/Google-Extended in `robots.txt`.
- ☐ `vercel.json` `headers` block — `Cache-Control: public, max-age=31536000, immutable` for
  `/assets/**` + mirrored media; sensible HTML cache. (Shared with Wave 4.)

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
