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
python3 tools/publish.py sync      # pull anything new + enhance everything
python3 tools/publish.py enhance   # re-apply canonical + JSON-LD only
```

All idempotent. `sync` on an up-to-date clone changes nothing but re-verifies.

## Failure modes seen before (do not repeat)
- **Editing listing grids by hand**: the Nuxt payload re-renders page 1 at
  hydration — hand edits vanish. Listings are re-scraped from live, never edited.
- **Static scrape of /podcast only sees page 1**: the catalog lives behind
  client-side pagination. `publish.py` reads the API directly instead.
- **rsync vault -> repo**: clobbered Freeman's commits once. Repo is the source
  of truth; sync repo -> vault only.
- **Pushing to GitHub does not deploy.** Always `vercel deploy --prod` after.
