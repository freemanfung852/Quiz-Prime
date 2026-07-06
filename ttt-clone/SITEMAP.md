# Travel to Transform — Site Map & Content Conventions

Reference for anyone (human or Claude) adding or editing pages. Based on the live
site structure as of 2026-07-03. The clone mirrors the live site 1:1.

- **Live site:** https://traveltotransform.com (GoHighLevel funnel, location `pIQnJdASBmjOuDSHEr5v`)
- **Clone:** https://site-six-khaki-48.vercel.app (this repo, Vercel project `site`)
- **Visual index:** https://site-six-khaki-48.vercel.app/clone-map

## URL structure (this is how the LIVE site works, not a migration choice)

Every article — blog post or podcast episode — lives at a single canonical URL:

```
/post/<slug>
```

`/blog/<slug>` and `/podcast/<slug>` do NOT exist and 404 on the live site.
`/blog` and `/podcast` are **listing pages only**: grids of cards that link into
`/post/<slug>`. Whether something is a "blog" or a "podcast" is decided purely by
**which listing page carries its card**, not by its URL.

```
/                       Home
/blog                   Blog listing      → cards link to /post/<slug>
/podcast                Podcast listing   → cards link to /post/<slug>
/resources              Featured mix: podcast section + blog section + library
/post/<slug>            The article itself (blog AND podcast episodes)
/course/<slug>          Course pages (e.g. /course/tmb)
/about /coaching /speaking /the-book ...   standalone pages
```

## Adding a NEW article (blog or podcast) — playbook

1. Create the page at `traveltotransform.com/post/<slug>.html` in this repo
   (root vercel.json already routes `/post/:slug` → that file).
2. Add its card to the right **listing page**:
   - Blog article → `traveltotransform.com/blog.html`
   - Podcast episode → `traveltotransform.com/podcast.html`
3. If it should be featured, also add a card to the matching section of
   `traveltotransform.com/resources.html`.
4. Add a row to `/clone-map` (`traveltotransform.com/clone-map.html`).
5. Deploy: `vercel deploy --prod` from the repo/folder root.

An article that exists at `/post/<slug>` but is on NO listing page is an
**orphan**: reachable by direct URL, invisible to visitors and (eventually)
to Google. See Author Hour below.

## Full inventory

### Listing / standalone pages (19)

| Page | URL |
|---|---|
| Home | `/` |
| About | `/about` |
| Coaching | `/coaching` |
| Coaching Form | `/coaching-form` |
| Speaking | `/speaking` |
| The Book | `/the-book` |
| Resources | `/resources` |
| Podcast (listing) | `/podcast` |
| Blog (listing) | `/blog` |
| My Travel Stories | `/my-travel-stories` |
| Appreciation | `/appreciation` |
| Course: TMB | `/course/tmb` |
| Course Pre-Launch Sign-Up | `/course-pre-launch-sign-up` |
| TMB Offers Checkout | `/tmb-offers-checkout` |
| Masterclass Registration | `/masterclass-registration` |
| Masterclass Registration Page | `/masterclass-registration-page` |
| Privacy Policy | `/privacy-policy` |
| Terms of Use | `/terms-of-use` |
| 404 | `/404` |

### Blog articles (6) — carded on `/blog` (+ `/resources`)

| Title | URL |
|---|---|
| 12 Transformative Lessons From 2024 | `/post/12-transformative-lessons-from-2024` |
| Integrating Travel into Holistic Living | `/post/integrating-travel-into-holistic-living-3-tools-to-self-discovery-and-transformation` |
| 5 Tips to Improve Your Travel Wellbeing | `/post/5-tips-to-improve-your-travel-wellbeing-and-avoid-burn-out` |
| Why Mindfulness is the Key to Global Unity | `/post/why-mindfulness-is-the-key-to-global-unity` |
| Rethink Travelling | `/post/rethink-travelling` |
| What is Global Citizenship | `/post/what-is-global-citizenship` |

### Podcast episodes (6) — carded on `/podcast` (+ `/resources`)

| Title | URL |
|---|---|
| Why You Feel TIRED After A Holiday (Wonderlab) | `/post/why-you-feel-tired-after-a-holiday-and-how-to-fix-it-wonderlab-podcast` |
| Rebel with a Purpose (Prarthana Chandani) | `/post/rebel-with-a-purpose-with-prarthana-chandani` |
| Open World Podcast (Danny Flood) | `/post/open-world-podcast-with-danny-flood` |
| The Way of the Founder (Dina Marie) | `/post/the-way-of-the-founder-podcast-with-dina-marie` |
| From Isolation to Connection | `/post/from-isolation-to-connection-with-my-self-reliance-community` |
| The Value Within (Sean Michael Coaching) | `/post/the-value-within-podcast-by-sean-michael-coaching` |

### Orphan pages (live + cloned, but on NO listing page)

| Title | URL | Note |
|---|---|---|
| Author Hour Podcast | `/post/author-hour-podcast` | Dec 2022 book-launch interview (Scribe Media push). Live and cloned, but not carded on `/podcast`, `/blog`, or `/resources`, and the live site's `sitemap.xml` is EMPTY — so Google has no path to it. To restore its ranking: add its card to `/podcast` (and ideally fix sitemap.xml in GHL). |

## SEO notes

- The live site's `/sitemap.xml` is an **empty urlset** (GHL emits no URLs).
  Combined with orphaning, this is the likely cause of the Author Hour ranking
  drop — not the `/post/` slug structure, which is unchanged from the live site.
- The clone intentionally ships **no sitemap.xml and no canonical overrides**;
  it must not compete with the live domain in search.
