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
to Google.

NOTE for scrapers/QC: the `/podcast` listing paginates client-side (pages 2–4
load from the GHL API at runtime). Static scraping only sees page 1's six
cards — always click through ALL pagination pages when auditing coverage.

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

### Blog articles (6, complete) — carded on `/blog` (+ `/resources`)

| Title | URL |
|---|---|
| 12 Transformative Lessons From 2024 | `/post/12-transformative-lessons-from-2024` |
| Integrating Travel into Holistic Living | `/post/integrating-travel-into-holistic-living-3-tools-to-self-discovery-and-transformation` |
| 5 Tips to Improve Your Travel Wellbeing | `/post/5-tips-to-improve-your-travel-wellbeing-and-avoid-burn-out` |
| Why Mindfulness is the Key to Global Unity | `/post/why-mindfulness-is-the-key-to-global-unity` |
| Rethink Travelling | `/post/rethink-travelling` |
| What is Global Citizenship | `/post/what-is-global-citizenship` |

### Podcast episodes (21) — carded on `/podcast` (paginated, 6 per page) + featured on `/resources`

The `/podcast` listing paginates client-side: pages 2–4 are fetched at runtime from
the GHL content API (`content.apisystem.tech`). This works on the clone too (the
clone's pagination calls the same live API). Only page 1 is baked into the HTML.

| # | Title | URL |
|---|---|---|
| 1 | Why You Feel TIRED After A Holiday (Wonderlab) | `/post/why-you-feel-tired-after-a-holiday-and-how-to-fix-it-wonderlab-podcast` |
| 2 | Rebel with a Purpose (Prarthana Chandani) | `/post/rebel-with-a-purpose-with-prarthana-chandani` |
| 3 | Open World Podcast (Danny Flood) | `/post/open-world-podcast-with-danny-flood` |
| 4 | The Way of the Founder (Dina Marie) | `/post/the-way-of-the-founder-podcast-with-dina-marie` |
| 5 | From Isolation to Connection | `/post/from-isolation-to-connection-with-my-self-reliance-community` |
| 6 | The Value Within (Sean Michael Coaching) | `/post/the-value-within-podcast-by-sean-michael-coaching` |
| 7 | Global Citizen Life (Sally Pederson) | `/post/global-citizen-life-podcast-with-sally-pederson` |
| 8 | Reclaim Your Life (Irina Shehovsov) | `/post/reclaim-your-life-podcast-with-irina-shehovsov` |
| 9 | Spiritual Changemakers (Andreea Tamas) | `/post/spiritual-changemakers-podcast-with-andreea-tamas` |
| 10 | Design Her Travel (Kim Anderson) | `/post/design-her-travel-podcast-with-kim-anderson` |
| 11 | Embodiment: Activate All Parts of Your Brain | `/post/embodiment-activate-all-parts-of-your-brain` |
| 12 | Untethered Your Life (Nikhil Torsekar) | `/post/unthethered-your-life-podcast-with-nikhil-torsekar` |
| 13 | An Honest Look (Fati & Rick) | `/post/an-honest-look-podcast-with-fat-and-rick` |
| 14 | The Untold Story Told (Saliha Wazirzada) | `/post/the-untold-story-told-pocast-with-saliha-wazirzada` |
| 15 | Energy Medicine (Dr. Mary Sanders) | `/post/energy-medicine-podcast-with-dr-mary-sanders` |
| 16 | Insight and Awareness (Lorraine Nilon) | `/post/lorraine-nilons-insight-and-awareness-spiritual-explorer-podcast` |
| 17 | Fearless & Successful (Dijana Llugolli) | `/post/fearless-successful-podcast-with-dijana-llugolli` |
| 18 | My Best Healer (Dr. Moghazy) | `/post/my-best-healer-podcast-with-dr-moghazy` |
| 19 | The Abundance & Success Codes Summit | `/post/the-abundance-success-codes-summit` |
| 20 | Tuesday Talks with Zishan | `/post/tuesday-talks-with-zishan` |
| 21 | Author Hour Podcast | `/post/author-hour-podcast` |

### Correction log

Author Hour (`/post/author-hour-podcast`) was initially flagged as an orphan; it is
actually listed on `/podcast` page 4 (client-side pagination that static scraping
cannot see). All 21 episodes above are listed the same way.

## SEO notes

- The live site's `/sitemap.xml` is an **empty urlset** (GHL emits no URLs).
  This (plus the page sitting on pagination page 4, four clicks deep with no
  static internal link) is the likely cause of the Author Hour ranking drop —
  not the `/post/` slug structure, which is unchanged from the live site.
- The clone intentionally ships **no sitemap.xml and no canonical overrides**;
  it must not compete with the live domain in search.
