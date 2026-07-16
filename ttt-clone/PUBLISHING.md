# Publishing a New Blog Post or Podcast Episode

The playbook Claude Code (or anyone) follows when Freeman has a new article.
Companion to `SITEMAP.md` (URL structure) and `tools/publish.py` (automation).

## The pipeline in one picture

```
1. AUTHOR    Write the post (checklist below) 
2. PUBLISH   Freeman publishes it in GoHighLevel, in the right category:
             "Podcast Interview" or "Blog" — the category decides which
             listing page carries it. It goes live on traveltotransform.com.
3. SYNC      From the clone root:   python3 tools/publish.py sync
             This automatically:
               - detects the new post via the GHL API
               - clones /post/<slug> with the standard transforms
               - refreshes the offline catalogs in ghl-offline-data.js
               - re-scrapes the /blog or /podcast listing (fresh page 1)
               - injects canonical + BlogPosting/Breadcrumb JSON-LD
               - adds the row to /clone-map
4. DEPLOY    vercel deploy --prod        (project `site`; NO git auto-deploy)
5. COMMIT    git add -A && git commit && git push   (repo = source of truth)
6. VERIFY    curl the new /post/<slug> on the clone -> 200; open /clone-map.
```

If Freeman edits the post files in the repo directly instead (he has done this
for page tweaks): pull, deploy, and remind him article content should be
published through GHL so the live site, API catalog, and clone stay one system.

## Authoring checklist — SEO / AEO / GEO

Apply while WRITING the post (in GHL). The sync script cannot fix thin content.

### SEO (rank in classic search)
- **Slug**: short, keyword-first, hyphenated (`why-mindfulness-is-the-key-to-global-unity`). Never change a published slug (no redirect ability in GHL).
- **Title**: primary keyword near the front, under 60 chars before the `｜Travel to Transform` suffix.
- **Meta description**: GHL "description" field, 140-160 chars, contains the keyword and a reason to click. This also feeds the JSON-LD.
- **One H1** (the title). H2s for sections, H3s inside them, no level skips.
- **Cover image**: descriptive filename + alt text in GHL (feeds `imageAltText`).
- **Internal links**: link at least 2 other /post/ articles and 1 money page (/coaching, /the-book, or /course/tmb) in the body.
- **Dates**: GHL publishedAt is used as datePublished; keep it accurate.

### AEO (answer engines: featured snippets, People-Also-Ask, voice)
- **Open with the answer**: first 40-60 words answer the core question directly. The rest of the article elaborates.
- **Question-phrased H2s**: at least 2 H2s worded the way people ask ("Why do you feel tired after a holiday?"), each answered in the first sentence under it.
- **One extractable block**: a numbered list, table, or step sequence an engine can lift wholesale.
- **FAQ tail**: 2-4 real questions with 1-2 sentence answers at the end of the post body.

### GEO (generative engines: ChatGPT, Perplexity, AI Overviews)
- **Quotable standalone claims**: 2-3 sentences that carry full meaning out of context ("Global citizenship is a mindset, not a legal status.").
- **Named entities and numbers**: name people, places, frameworks, years. Generative engines cite specifics, not vibes.
- **Author authority**: reference Freeman's book / TEDx / coaching practice once in the body — entity reinforcement for the Person schema.
- **Define terms on first use**: one-sentence definitions get quoted verbatim.

### What the sync script adds automatically (do not hand-add)
- `<link rel="canonical">` on every cloned post -> `https://traveltotransform.com/post/<slug>` (the live site). The clone must never compete with the live domain in search. **On domain cutover**: change `CANONICAL_DOMAIN` in `tools/publish.py`, run `enhance`, add a real sitemap.xml, redeploy.
- **BlogPosting + BreadcrumbList JSON-LD** (`data-ttt-seo` block) built from the GHL catalog metadata: headline, description, image, dates, author Person, publisher Organization. The live GHL site ships zero structured data; the clone carries it so nothing is lost at cutover.

## Commands

```
python3 tools/publish.py check     # audit: live catalog vs clone (run first)
python3 tools/publish.py sync      # pull anything new + enhance + sitemap
python3 tools/publish.py enhance   # re-apply canonical + JSON-LD only
python3 tools/publish.py sitemap   # regenerate sitemap.xml + robots.txt
```

All idempotent. `sync` on an up-to-date clone changes nothing but re-verifies.

## Order forms

The 4 checkout pages carry GHL forms via `ghl-order-forms.js` (clone root), which
swaps the legacy GHL order widget after hydration. Form IDs live in that file:

| Page | GHL form | Price |
|---|---|---|
| `/tmb-offers-checkout` | Travel Mastery Blueprint | AU$999 |
| `/tmb-offers-checkout-form` | TMB Offer (discounted) | AU$111 |
| `/checkout-accelerator` | TMB + 1:1 Coaching Session | AU$2,999 |
| `/checkout-accelerator-page` | TMB + 1:1 Coaching Offer (discounted) | AU$1,333 |

To change a form: edit the `FORMS` map in `ghl-order-forms.js`. Do NOT hand-edit
the checkout HTML — the Vue app re-renders the widget and wipes static edits.

### All other forms — `ghl-live-forms.js`

Every other GHL form (Contact, Coaching, Masterclass, both Ebook opt-ins,
Newsletter, Footer Newsletter, Speaking Booking, Pre-launch Sign Up, …) is
embedded live by `ghl-live-forms.js`, loaded on all 33 pages that contain a form.

**Why:** the scrape baked frozen copies of these forms into the HTML. They fed
Freeman's automation workflows, but any edit made in GHL would never reach the
clone. Now each form is loaded live from GHL, so it can never drift.

**How it maps form → container without a per-page list:** the natively-rendered
form gives its own id away — its fields carry DOM ids shaped
`el_<formId>_<field>_<n>`. The script reads the formId back out of each `.c-form`
container at runtime and swaps in that form's iframe. This is self-detecting, so
it stays correct on every page and on any page cloned in future — nothing to
maintain.

Pages with two `.c-form` containers hold desktop + mobile variants of the same
form; both are filled and CSS keeps one hidden (same as the order forms).

Adding the script to a newly cloned page: inject
`<script src="/ghl-live-forms.js"></script>` before the Nuxt entry script
(`stcdn.leadconnectorhq.com/_preview/*.js`). Invariant to keep: **every page
containing `class="c-form"` must load the script** — 33/33 today.

Each form's **post-submit redirect is configured inside GHL**, not here. The
thank-you pages are `/travel-mastery-blueprint-thank-you`,
`/travel-mastery-blueprint-thankyou`, `/accelerator-thank-you-page`,
`/accelerator-thankyou-page`.

## URL parity with the live site

`vercel.json` reproduces live GoHighLevel's routing exactly, so every existing
URL keeps working at cutover. Verified 83 URLs live-vs-clone (82 identical; the
1 difference is the repo-authored Beyonder post, which live does not have).

Non-obvious rules — do not remove:
- `/home` → `index.html` (GHL serves the homepage at both `/` and `/home`)
- `/page-not-found` → `404.html` (GHL's branded 404 lives at this path)
- `/404`, `/index.html`, `/blogs`, `/media` → **301** to `/page-not-found` (live does this)
- Root `404.html` is a **redirect stub**, not the branded page: Vercel serves it
  for unmatched routes and it 301s to `/page-not-found`, matching live. It also
  retries a lowercased path first, because live GHL is case-insensitive while
  Vercel is not.

## Cutover checklist (domain moves to Vercel)

1. Set `CUTOVER = True` in `tools/publish.py`.
2. Run `python3 tools/publish.py sitemap` → robots.txt flips from `Disallow: /`
   to indexable and references the sitemap.
3. `CANONICAL_DOMAIN` already equals `https://traveltotransform.com`, so
   canonicals need no change — they simply stop being cross-domain. Re-run
   `python3 tools/publish.py enhance` to confirm.
4. Point the domain at the Vercel project (root directory `ttt-clone`).
5. Verify: `/`, `/home`, `/page-not-found`, an unknown URL, all 4 checkouts, and
   `/clone-map`. Confirm GHL form redirects land on the cloned thank-you pages.
6. The live sitemap is an empty urlset today — after cutover, submit
   `/sitemap.xml` in Google Search Console. This is the fix for buried pages like
   Author Hour.

## Failure modes seen before (do not repeat)
- **Editing listing grids by hand**: the Nuxt payload re-renders page 1 at
  hydration — hand edits vanish. Listings are re-scraped from live, never edited.
- **Static scrape of /podcast only sees page 1**: the catalog lives behind
  client-side pagination. `publish.py` reads the API directly instead.
- **rsync vault -> repo**: clobbered Freeman's commits once. Repo is the source
  of truth; sync repo -> vault only.
- **Pushing to GitHub does not deploy.** Always `vercel deploy --prod` after.
