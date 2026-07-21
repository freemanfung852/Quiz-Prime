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

## ⚠️ WORKTREE NOTICE (2026-07-20)
This branch is being developed in an **isolated git worktree** at `/Users/freedom/ttt-podcast-wt`
because a **concurrent session was branch-switching the shared `~/ttt-website` tree** and auto-
stashed this work mid-flight. Continue in the worktree (`cd /Users/freedom/ttt-podcast-wt`) to
avoid collisions. `git worktree remove` it once merged.

## NOW / NEXT / BLOCKED
- **NOW:** **PR 1 (branch `fix-podcast-grid-rebuild`, PR #14) has THREE commits:**
  1. `3a43900` static-grid rebuild ✅ (data/SSR fix — solid).
  2. `2ac66b5` runtime grid takeover (eject-after-hydration) — superseded by commit 3.
  3. **hide-first/reveal-when-ready gate + Resources page coverage + active flag** — the eject
     landed the correct grid but GHL still painted its wrong grid for ~0.5s first; commit 3 gates
     visibility so GHL's paint never shows, extends the owned render to the `/resources` podcast
     preview, and adds a single-source active/inactive toggle. ⏳ **Still needs the zero-flash
     confirmation on the Vercel preview (5× hard refresh, both surfaces) before merge.**
- **NEXT (this session, in order):** Bug C header/footer → Wave 3 body content → runtime image
  optimisation. Each = own branch/PR, per-page browser verification before merge.
- **BLOCKED:** PR 1 merge blocked on validating the runtime takeover on the login-gated preview.

### PR 1 — Podcast grid (branch `fix-podcast-grid-rebuild`, PR #14)
**Commit 1 `3a43900` — static grid rebuild ✅ (the SSR/data half).**
- Root cause of the *static* desync: `window.__NUXT__` on podcast.html is config-only (4.1 KB, no
  card payload) — the sole post-hydration authority is the `blogs/posts/list` fetch from
  `ghl-offline-data.js`, whose catalog is already 100% in sync with `podcast-episodes.json`
  (Beyonder #1, 0 field diffs on all 22). The only stale surface was the static page-1 grid.
- New idempotent `publish.py podcastgrid`: single source `podcast-episodes.json`; regenerates the
  static page-1 grid inside `<!--ttt-podcast-grid-->` markers; owns the `ghl-offline-data.js`
  podcast array (rewrites only on drift — 0 bytes changed this run). Blog/book-reviews untouched.

**Commit 2 `2ac66b5` — runtime grid takeover (EJECT) — superseded by commit 3.**
- **The real bug (reproduced live):** GHL's blog-list **Vue component is a compiled third-party
  CDN chunk we cannot edit**, and its v-for is not stably keyed. On hard refresh it hydrates
  against our correct SSR grid and **recycles nodes into mismatched title/link/image cards,
  dropping Beyonder** (rendered catalog[1:7]). It **self-heals on any re-render** (paginate away
  and back → byte-perfect: Beyonder #1, title==link==image, 0 dup imgs). Classic index-key +
  stale-lazy recycling — confirmed by live browser inspection, not theory.
- Commit 2 owned the render page-side but **ejected _after_ hydration** (MutationObserver signal +
  fallback timer). That landed the correct grid but let GHL paint its wrong grid for ~0.5s first —
  the flicker commit 3 removes.

**Commit 3 — hide-first/reveal-when-ready gate + Resources coverage + active flag — ⏳ needs Vercel validation.**
- **Flicker fix (hide-first, reveal-when-ready):** a `<style id="ttt-grid-gate">` injected in
  `<head>` **before any GHL script** sets `.blog-post-wrapper:not([data-ttt-grid])` (and the
  `/resources` `.blog-row` equivalent) to `visibility:hidden` from the **first paint**, with a
  `min-height` reserve on the container so nothing jumps. GHL's grid is therefore never visible.
  The renderer builds our cards into a shallow clone, marks it `data-ttt-grid`, and swaps it in
  **already-filled** — only the owned, correct grid is ever shown; GHL's original detaches and
  stays starved. A ceiling timer drops the gate if our render never mounts (degraded-but-not-blank
  fallback). No longer depends on eject timing.
- **`ttt-podcast-grid.js` is now surface-aware (one script, two templates, one source
  `window.__TTT_PODCAST__`):**
  - `/podcast` — 3-col `.blog-post-wrapper` grid, paginated (6/page). Unchanged card markup.
  - `/resources` — the **second instance of the same GHL widget** (`#blog-IGYvVKC_zD`, the compact
    `.blog-item`/`.blog-row` "More stories" preview, NOT the 3-col grid). It previously loaded
    **neither** the renderer nor `ghl-offline-data.js` and showed the stale render (Beyonder
    missing until a podcast slug was opened). Now renders the **6 latest** episodes in the compact
    template, no pagination, scoped to that widget so the sibling **Blog** widget
    (`#blog-UiN8mVOG-O`) is untouched; the dead starved load-more is hidden.
- **`ghl-offline-data.js` — unchanged.** The existing starve (gated on `window.__TTT_OWN_GRID__`,
  podcast category only) already covers `/resources` once the file is loaded there. `publish.py`
  now injects that `<script src="/ghl-offline-data.js">` include into `resources.html`.
- **Single source (`publish.py`):** `_episodes()` filters an optional per-episode `active:false`
  toggle (default true) — one place to enable/disable an episode across grid, catalog and JSON-LD.
  One generalized `_wire_runtime()` wires **both** `podcast.html` and `resources.html` with the
  data block + gate + content-hashed `<script src="/ttt-podcast-grid.js?v=…">`. Order = array
  order; add/remove = entries. `podcast-episodes.json` shape unchanged (`active` is additive).
- **What IS validated (local, DOM-level):** generator idempotent; both pages wired with the same
  renderer hash; catalog in sync (22 eps, 0 bytes changed). Seeded-data render of both surfaces:
  owned grid visible, **Beyonder #1**, title==link==image as one unit, GHL grid ejected, gate
  hides the non-owned grid; `/resources` shows exactly 6 compact cards (7th excluded), correct
  date formatting + real hrefs, Blog widget untouched. `active:false` toggle removes an episode
  everywhere and reverts cleanly. No console errors; no CSP in project/Vercel config.
- **What is NOT validated (Vercel preview only):** the true **zero-flash across 5 hard refreshes
  with GHL's live bundle** attempting its wrong render. The in-app browser injects a CSP that
  blocks **inline** scripts (so the inline `__TTT_OWN_GRID__` data block can't run locally — the
  renderer was validated by seeding data directly), and the `/resources` layout needs GHL's
  runtime CSS (collapses locally). Both are environment artifacts, not regressions.
- ⏳ **NEXT STEP (validate on Vercel preview):** load `/podcast` and `/resources`, hard-refresh 5×
  each, confirm **zero** GHL flash before our grid + Beyonder present without opening a slug;
  paginate `/podcast` to page 2 and back (self-heal path stays correct); confirm the Blog widget
  on `/resources` still renders. If any flash remains, tighten the gate (e.g. gate at the
  `.hl-blog-post-home` host level).

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
