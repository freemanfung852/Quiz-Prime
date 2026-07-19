#!/usr/bin/env python3
"""Travel to Transform clone — publish/sync pipeline.

The LIVE site (traveltotransform.com, GoHighLevel) is the source of truth for
content. Freeman publishes a post in GHL; this script brings the clone up to
date and applies the SEO/AEO/GEO layer the live site lacks.

Usage (run from the repo/clone root, the folder containing vercel.json):

  python3 tools/publish.py sync      # detect + clone new posts, refresh
                                     # catalogs/listings, enhance, update map,
                                     # regenerate sitemap
  python3 tools/publish.py enhance   # (re)apply canonical + JSON-LD to every
                                     # cloned post page (idempotent)
  python3 tools/publish.py sitemap   # regenerate sitemap.xml from cloned pages
  python3 tools/publish.py check     # audit: catalogs vs cloned files vs live

After a sync: commit + push. Deploy is Freeman's own Vercel project
(root directory `ttt-clone`).

See PUBLISHING.md for the full playbook and the authoring checklist.
"""
import json, os, re, sys, urllib.request, html as html_mod

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGES = os.path.join(ROOT, "traveltotransform.com")
SHIM = os.path.join(ROOT, "ghl-offline-data.js")
LIVE = "https://traveltotransform.com"
CLONE = "https://site-six-khaki-48.vercel.app"
# While the clone is staging, canonicals point at the live domain so the clone
# never competes with it in search. On domain cutover set this to the clone's
# final domain and run `enhance`.
CANONICAL_DOMAIN = LIVE

# ---- CUTOVER SWITCH -------------------------------------------------------
# False = staging: robots.txt disallows all (clone must not compete with the
#         live domain in search).
# True  = cutover: the clone IS traveltotransform.com. Flip this, then run
#         `python3 tools/publish.py sitemap` and redeploy. Canonicals already
#         point at CANONICAL_DOMAIN (the live domain), so they need no change.
# Pages excluded from the sitemap either way (thank-yous, checkouts, system).
# CUTOVER executed 2026-07-19: the clone is now the live traveltotransform.com
# (content no longer lives in GHL). robots.txt now allows indexing.
CUTOVER = True
SITEMAP_EXCLUDE = {
    "404", "page-not-found", "maintenance-page", "clone-map",
    "tmb-offers-checkout", "tmb-offers-checkout-form",
    "checkout-accelerator", "checkout-accelerator-page",
    "travel-mastery-blueprint-thank-you", "travel-mastery-blueprint-thankyou",
    "accelerator-thank-you-page", "accelerator-thankyou-page",
    "coaching-thank-you-page", "masterclass-thank-you",
    "ebook-download-thankyou", "ebook-download-thank-you",
    "result", "quiz-4272",
}

API = "https://backend.leadconnectorhq.com/blogs/posts/list"
LOCATION = "pIQnJdASBmjOuDSHEr5v"
CATS = {  # categoryId: (label, blogId, listing page)
    "6878c4aaf07aa601cf0236d1": ("podcast", "OpmhkeQp4dBsYivBdh3U", "podcast.html"),
    "6878be8fe6774b079d931ef0": ("blog", "l4woPhjYfsvIZSfgW676", "blog.html"),
    "687bdb9331c0ce7ef045ba10": ("book-reviews", "3hOLFO0CTHDXJcdYSv9s", "book-reviews.html"),
}
# Posts authored directly in the repo (not published in GHL) — appended to the
# shim catalog so listings show them. Prefer publishing in GHL, then sync.
MANUAL_POSTS = {
    "6878c4aaf07aa601cf0236d1": [{
        "_id": "manual-beyonder", "urlSlug": "beyonder-the-podcast-with-veerle-beelen",
        "title": "Beyonder The Podcast with Veerle Beelen",
        "description": "Tourist or Global Citizen? Freeman Fung on Beyonder The Podcast with Veerle Beelen.",
        "imageUrl": "/assets/podcast/beyonder-the-podcast-freeman-fung-veerle-beelen-tourist-or-global-citizen.png",
        "imageAltText": "Beyonder The Podcast with Veerle Beelen",
        "author": {"name": "Freeman Fung"}, "categories": [], "tags": [],
        "publishedAt": "2026-07-15T00:00:00.000Z", "updatedAt": "2026-07-15T00:00:00.000Z",
    }],
}
FONT = ('<link rel="stylesheet" href="https://fonts.googleapis.com/css?family='
        'Poppins:100,100i,300,300i,400,400i,500,500i,700,700i,900,900i|Inter:100,100i,'
        '300,300i,400,400i,500,500i,700,700i,900,900i|roboto:100,100i,300,300i,400,'
        '400i,500,500i,700,700i,900,900i" media="print" onload="this.media=\'all\'">')


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0",
                                               "Origin": LIVE, "Referer": LIVE + "/"})
    return urllib.request.urlopen(req, timeout=30).read().decode("utf-8", "replace")


def api_catalog(cat_id):
    label, blog_id, _ = CATS[cat_id]
    data = json.loads(fetch(f"{API}?locationId={LOCATION}&blogId={blog_id}"
                            f"&limit=50&offset=0&categories={cat_id}"))
    return data.get("blogPosts", []), data.get("categoryDetails")


def slim(posts):
    keep = ("_id", "author", "blogId", "canonicalLink", "categories", "description",
            "imageAltText", "imageUrl", "publishedAt", "readTimeInMinutes",
            "scheduledAt", "tags", "title", "type", "updatedAt", "urlSlug")
    out = []
    for p in posts:
        q = {k: p[k] for k in keep if k in p}
        if isinstance(q.get("canonicalLink"), str):
            q["canonicalLink"] = q["canonicalLink"].replace(LIVE, "")
        out.append(q)
    return out


def clone_post(slug):
    s = fetch(f"{LIVE}/post/{slug}")
    if ">404" in s[:4000] or "<title>404" in s:
        raise RuntimeError(f"live /post/{slug} is a 404")
    s = s.replace(LIVE, "")
    i = s.find("</style><style>")
    if i != -1 and FONT not in s:
        s = s[:i + 8] + FONT + s[i + 8:]
    path = os.path.join(PAGES, "post", slug + ".html")
    open(path, "w", encoding="utf-8").write(s)
    return path


def refresh_shim(catalogs):
    """catalogs: {cat_id: (slim_posts, categoryDetails)} — rebuild data blob,
    keep the interception/rewrite code that follows it intact."""
    src = open(SHIM, encoding="utf-8").read()
    data = {cid: {"posts": posts, "categoryDetails": det}
            for cid, (posts, det) in catalogs.items()}
    new_blob = json.dumps(data, separators=(",", ":"))
    m = re.search(r"var CATS = (\{.*?\});\n", src, re.S)
    if not m:
        raise RuntimeError("CATS blob not found in shim")
    src = src[:m.start(1)] + new_blob + src[m.end(1):]
    open(SHIM, "w", encoding="utf-8").write(src)


def rescrape_listing(page):
    """Re-scrape a listing page from live (fresh Nuxt payload = fresh page 1)
    and re-apply the clone transforms + shim tag."""
    s = fetch(f"{LIVE}/{page.replace('.html', '')}")
    s = s.replace(LIVE, "")
    i = s.find("</style><style>")
    if i != -1:
        s = s[:i + 8] + FONT + s[i + 8:]
    tag = '<script src="/ghl-offline-data.js"></script>'
    if "ghl-offline-data.js" not in s:
        m = re.search(r'<script[^>]*src="https://stcdn\.leadconnectorhq\.com/_preview/[^"]+"', s)
        if not m:
            raise RuntimeError(f"no Nuxt entry script in live /{page}")
        s = s[:m.start()] + tag + s[m.start():]
    open(os.path.join(PAGES, page), "w", encoding="utf-8").write(s)


def enhance_post(slug, meta):
    """Idempotent SEO/AEO/GEO layer on a cloned post page:
    - canonical -> CANONICAL_DOMAIN/post/<slug>
    - BlogPosting + BreadcrumbList JSON-LD built from catalog metadata
    (live GHL pages ship neither)."""
    path = os.path.join(PAGES, "post", slug + ".html")
    if not os.path.exists(path):
        return False
    s = open(path, encoding="utf-8").read()
    canon = f"{CANONICAL_DOMAIN}/post/{slug}"
    if re.search(r'<link rel="canonical"[^>]*>', s):
        s = re.sub(r'<link rel="canonical"[^>]*>', f'<link rel="canonical" href="{canon}">', s, count=1)
    else:
        s = s.replace("</head>", f'<link rel="canonical" href="{canon}">\n</head>', 1)
    s = re.sub(r'<script type="application/ld\+json" data-ttt-seo>.*?</script>\n?', "", s, flags=re.S)
    author = meta.get("author") or {}
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "BlogPosting",
         "headline": meta.get("title", ""),
         "description": meta.get("description", "")[:300],
         "image": meta.get("imageUrl", ""),
         "datePublished": meta.get("publishedAt", ""),
         "dateModified": meta.get("updatedAt", meta.get("publishedAt", "")),
         "author": {"@type": "Person", "name": author.get("name", "Freeman Fung"),
                    "url": CANONICAL_DOMAIN + "/about"},
         "publisher": {"@type": "Organization", "name": "Travel to Transform",
                       "url": CANONICAL_DOMAIN},
         "mainEntityOfPage": {"@type": "WebPage", "@id": canon},
         "url": canon},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": CANONICAL_DOMAIN + "/"},
            {"@type": "ListItem", "position": 2,
             "name": meta.get("_section", "Blog").capitalize(),
             "item": CANONICAL_DOMAIN + "/" + meta.get("_section", "blog")},
            {"@type": "ListItem", "position": 3, "name": meta.get("title", ""), "item": canon}]}]}
    block = ('<script type="application/ld+json" data-ttt-seo>'
             + json.dumps(ld, separators=(",", ":")) + "</script>\n")
    s = s.replace("</head>", block + "</head>", 1)
    open(path, "w", encoding="utf-8").write(s)
    return True


def clone_map_add(slug, title):
    p = os.path.join(PAGES, "clone-map.html")
    s = open(p, encoding="utf-8").read()
    if f"/post/{slug}</code>" in s:
        return False
    svg = ('<svg viewBox="0 0 16 16" aria-hidden="true">'
           '<path d="M6 3.5h6.5V10M12.5 3.5L4 12" /></svg>')
    esc = html_mod.escape(title, quote=False)
    row = f'''        <tr>
          <th scope="row"><span class="pg">{esc}</span><code class="path">/post/{slug}</code></th>
          <td><a class="lnk lnk--clone" href="{CLONE}/post/{slug}" target="_blank" rel="noopener">Open clone{svg}</a></td>
          <td><a class="lnk lnk--live" href="{LIVE}/post/{slug}" target="_blank" rel="noopener">Live original{svg}</a></td>
          <td class="st"><span class="chip">200</span></td>
        </tr>
'''
    i = s.rfind("</tbody>")
    s = s[:i] + row + s[i:]
    m = re.search(r"(\d+) / \1 pages live", s)
    if m:
        n = int(m.group(1)); s = s.replace(f"{n} / {n} pages live", f"{n+1} / {n+1} pages live")
        s = s.replace(f"All {n} pages verified live", f"All {n+1} pages verified live")
        s = s.replace(f"<b>{n}</b><span>Pages cloned</span>", f"<b>{n+1}</b><span>Pages cloned</span>")
        s = s.replace(f"<b>{n}</b><span>Verified live</span>", f"<b>{n+1}</b><span>Verified live</span>")
    open(p, "w", encoding="utf-8").write(s)
    return True


def cmd_sitemap():
    """Generate sitemap.xml + robots.txt from the cloned pages.

    The live GHL site serves an EMPTY sitemap urlset — a real SEO bug that
    likely contributes to buried pages (e.g. Author Hour) never being indexed.
    The clone carries a real one, ready for cutover.
    """
    urls = []
    for f in sorted(os.listdir(PAGES)):
        if f.endswith(".html"):
            name = f[:-5]
            if name in SITEMAP_EXCLUDE:
                continue
            urls.append("/" if name == "index" else "/" + name)
    for sub in ("post", "course"):
        d = os.path.join(PAGES, sub)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith(".html"):
                urls.append("/%s/%s" % (sub, f[:-5]))
    # publish dates from the catalogs, where we have them
    lastmod = {}
    try:
        for cid, (posts, _) in load_catalogs().items():
            for p in posts:
                d = (p.get("updatedAt") or p.get("publishedAt") or "")[:10]
                if d:
                    lastmod["/post/" + p["urlSlug"]] = d
    except Exception:
        pass

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        out.append("  <url>")
        out.append("    <loc>%s%s</loc>" % (CANONICAL_DOMAIN, u))
        if u in lastmod:
            out.append("    <lastmod>%s</lastmod>" % lastmod[u])
        out.append("    <priority>%s</priority>" % ("1.0" if u == "/" else "0.7"))
        out.append("  </url>")
    out.append("</urlset>")
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write("\n".join(out) + "\n")

    if CUTOVER:
        robots = ("User-agent: *\nAllow: /\n\n"
                  "# AI answer / generative engines are welcome (GEO). See /llms.txt\n"
                  "User-agent: GPTBot\nAllow: /\n\n"
                  "User-agent: OAI-SearchBot\nAllow: /\n\n"
                  "User-agent: ChatGPT-User\nAllow: /\n\n"
                  "User-agent: ClaudeBot\nAllow: /\n\n"
                  "User-agent: Claude-Web\nAllow: /\n\n"
                  "User-agent: PerplexityBot\nAllow: /\n\n"
                  "User-agent: Google-Extended\nAllow: /\n\n"
                  "Sitemap: %s/sitemap.xml\n" % CANONICAL_DOMAIN)
        mode = "CUTOVER (indexable)"
    else:
        robots = ("# Staging mirror of traveltotransform.com — must not compete with\n"
                  "# the live domain in search. Flip CUTOVER=True in tools/publish.py\n"
                  "# and re-run `publish.py sitemap` when the domain moves here.\n"
                  "User-agent: *\nDisallow: /\n")
        mode = "STAGING (noindex)"
    open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8").write(robots)
    print("sitemap.xml: %d urls | robots.txt: %s" % (len(urls), mode))


def load_catalogs():
    out = {}
    for cid in CATS:
        posts, det = api_catalog(cid)
        sl = slim(posts)
        for extra in MANUAL_POSTS.get(cid, []):
            if not any(p["urlSlug"] == extra["urlSlug"] for p in sl):
                sl.append(extra)
        out[cid] = (sl, det)
    return out


def cmd_sync():
    catalogs = load_catalogs()
    shim_src = open(SHIM, encoding="utf-8").read()
    new = []
    manual_slugs = {m["urlSlug"] for ms in MANUAL_POSTS.values() for m in ms}
    for cid, (posts, _) in catalogs.items():
        label, _, listing = CATS[cid]
        for p in posts:
            slug = p["urlSlug"]
            p["_section"] = label
            missing_file = (not os.path.exists(os.path.join(PAGES, "post", slug + ".html"))
                            and slug not in manual_slugs)  # manual posts have no live page to scrape
            missing_shim = slug not in shim_src
            if missing_file or missing_shim:
                new.append((cid, p, missing_file))
    if not new:
        print("sync: no new posts. catalogs already match the clone.")
    for cid, p, missing_file in new:
        slug = p["urlSlug"]
        if missing_file:
            clone_post(slug)
            print(f"cloned  /post/{slug}")
        clone_map_add(slug, p.get("title", slug))
    if new:
        refresh_shim(catalogs)
        touched = {CATS[cid][2] for cid, _, _ in new}
        for page in touched:
            rescrape_listing(page)
            print(f"refreshed listing {page}")
        print(f"shim catalogs refreshed ({sum(len(v[0]) for v in catalogs.values())} posts)")
    # enhancement runs regardless (idempotent, also picks up metadata edits)
    n = 0
    for cid, (posts, _) in catalogs.items():
        label = CATS[cid][0]
        for p in posts:
            p["_section"] = label
            if enhance_post(p["urlSlug"], p):
                n += 1
    print(f"enhanced {n} post pages (canonical + JSON-LD)")
    cmd_sitemap()
    if new:
        print("\nNOW RUN:  git add -A && git commit && git push"
              "\n          (Freeman's Vercel project auto-deploys from ttt-clone)")


def cmd_enhance():
    catalogs = load_catalogs()
    n = 0
    for cid, (posts, _) in catalogs.items():
        label = CATS[cid][0]
        for p in posts:
            p["_section"] = label
            if enhance_post(p["urlSlug"], p):
                n += 1
    print(f"enhanced {n} post pages (canonical + JSON-LD)")


def cmd_check():
    catalogs = load_catalogs()
    problems = 0
    for cid, (posts, _) in catalogs.items():
        label = CATS[cid][0]
        print(f"[{label}] {len(posts)} posts in live catalog")
        shim_src = open(SHIM, encoding="utf-8").read()
        for p in posts:
            slug = p["urlSlug"]
            f = os.path.join(PAGES, "post", slug + ".html")
            probs = []
            if not os.path.exists(f):
                probs.append("NO FILE")
            else:
                s = open(f, encoding="utf-8").read()
                if "data-ttt-seo" not in s: probs.append("no JSON-LD")
                if f'rel="canonical" href="{CANONICAL_DOMAIN}/post/{slug}"' not in s:
                    probs.append("bad canonical")
            if slug not in shim_src: probs.append("not in shim catalog")
            if probs:
                problems += 1
                print(f"  !! {slug}: {', '.join(probs)}")
    print("check:", "OK — clone matches live" if not problems else f"{problems} posts need attention (run sync)")


# ---- Wave 1: self-contained head SEO (no GHL API) -------------------------
# GHL content is gone, so this reads metadata from each page's own HTML and
# adds only the head tags that are MISSING (idempotent, inside markers). Safe
# for bare core pages AND the posts that already carry canonical + JSON-LD.
SITE_NAME = "Travel to Transform"
OG_LOCALE = "en_US"
SEO_BEGIN, SEO_END = "<!--ttt-seo-->", "<!--/ttt-seo-->"
# Google Search Console HTML-tag verification (homepage only). Public token.
GOOGLE_SITE_VERIFICATION = "n_Y3ZpsZr623nx6Oq4RZ0MRswGAvsGRade74VPA3syM"
# Curated meta descriptions for indexable pages that ship none. DRAFT copy —
# refine in TTT brand voice. Keyed by canonical path. Pages not listed keep
# whatever description they already have (or none).
SEO_DESCRIPTIONS = {
    "/about": "Meet Freeman Fung, founder of Travel to Transform — speaker, coach and author helping you turn travel into deep personal transformation and purposeful living.",
    "/coaching": "1:1 transformational coaching with Freeman Fung. Stop waiting for breakthrough by chance — design a life and travel path aligned with your highest vision.",
    "/coaching-form": "Apply for 1:1 transformational coaching with Freeman Fung — start designing a life and travel path aligned with your highest vision.",
    "/podcast": "Freeman Fung on transformational travel, global citizenship and conscious living. Listen to every podcast episode from Travel to Transform.",
    "/speaking": "Book Freeman Fung to speak — keynotes on transformational travel, global citizenship and turning journeys into growth for your event or organisation.",
    "/book-reviews": "Reader reviews of Freeman Fung's book on transformational travel — real stories of how travelling with purpose sparked lasting personal change.",
    "/resources": "Free tools, guides and resources from Travel to Transform to help you travel with purpose and turn every journey into lasting transformation.",
    "/my-travel-stories": "Freeman Fung's personal travel stories — honest reflections on the journeys that shaped his path from tourist to transformed global citizen.",
    "/the-traveller-dna-quiz": "Take the free Traveller DNA Quiz and discover your unique travel archetype — plus how to turn your next journey into real personal transformation.",
    "/course/tmb": "The Travel Mastery Blueprint — Freeman Fung's flagship course to help you travel the world purposefully and transform your life through conscious travel.",
    "/contact": "Get in touch with Freeman Fung and the Travel to Transform team for coaching, speaking, media and partnership enquiries.",
    "/appreciation": "A note of appreciation from Freeman Fung and Travel to Transform — thank you for being part of this journey of purposeful, transformational travel.",
    "/media-kit": "Travel to Transform media kit — bio, photos and speaking topics for Freeman Fung. Everything media and event partners need in one place.",
    "/media-contact": "Media and press enquiries for Freeman Fung and Travel to Transform — reach out for interviews, features and speaking opportunities.",
    "/privacy-policy": "Travel to Transform privacy policy — how we collect, use and protect your personal information.",
    "/terms-of-use": "Travel to Transform terms of use — the terms and conditions governing your use of this website and our services.",
    "/anf-free": "Athens Nomad Fest attendees — claim your free digital copy of Freeman Fung's bestselling book, Travel to Transform, plus exclusive attendee-only gifts.",
    "/additional-accelerator": "Apply for 1:1 transformational coaching with Freeman Fung — fill out the coaching application form and take the next step on your journey.",
    "/additional-accelerator-page": "Apply for 1:1 transformational coaching with Freeman Fung — fill out the coaching application form and take the next step on your journey.",
    "/course-pre-launch-sign-up": "Join the waitlist for Freeman Fung's Travel Mastery Blueprint — an interactive course that turns his book's teaching into a lifelong blueprint for travel mastery.",
    "/newsletter-qr": "Join the Travel to Transform newsletter for life-changing travel stories, soulful growth prompts, and early access to retreats, events and exclusive offers.",
}


def _esc(t):
    return ((t or "").replace("&", "&amp;").replace('"', "&quot;")
            .replace("<", "&lt;").replace(">", "&gt;"))


def _url_path(relpath):
    name = relpath[:-5]
    return "/" if name == "index" else "/" + name


def _present(head, pat):
    return bool(re.search(pat, head, re.I))


def _meta_content(head, attr, val):
    """Return existing meta content (already HTML-escaped) or None. Handles
    either attribute order and content that contains apostrophes."""
    for pat in (r'<meta[^>]*%s=["\']%s["\'][^>]*content=(["\'])(.*?)\1' % (attr, re.escape(val)),
                r'<meta[^>]*content=(["\'])(.*?)\1[^>]*%s=["\']%s["\']' % (attr, re.escape(val))):
        m = re.search(pat, head, re.I | re.S)
        if m:
            return m.group(2)
    return None


def enhance_head(relpath):
    """Idempotent, self-contained SEO head layer. Adds only missing tags,
    wrapped in <!--ttt-seo--> markers. noindex for excluded funnel pages."""
    path = os.path.join(PAGES, relpath)
    s = open(path, encoding="utf-8").read()
    if "</head>" not in s.lower():
        return False
    s = re.sub(re.escape(SEO_BEGIN) + r".*?" + re.escape(SEO_END), "", s, flags=re.S)
    head = s[:s.lower().find("</head>")]
    name = relpath[:-5]
    url = CANONICAL_DOMAIN + _url_path(relpath)
    lines = []
    if name in SITEMAP_EXCLUDE:
        if not _present(head, r'<meta[^>]+name=["\']robots["\']'):
            lines.append('<meta name="robots" content="noindex,follow">')
    else:
        if _url_path(relpath) == "/" and GOOGLE_SITE_VERIFICATION and not _present(head, r'google-site-verification'):
            lines.append('<meta name="google-site-verification" content="%s">' % GOOGLE_SITE_VERIFICATION)
        og_title = _meta_content(head, "property", "og:title")
        og_image = _meta_content(head, "property", "og:image")
        og_desc = _meta_content(head, "property", "og:description")
        meta_desc = _meta_content(head, "name", "description")
        title_txt = (re.search(r'<title[^>]*>(.*?)</title>', s, re.I | re.S) or [None, ""])[1].strip()
        curated = SEO_DESCRIPTIONS.get(_url_path(relpath))
        if meta_desc is not None:
            desc_html = meta_desc
        elif curated:
            desc_html = _esc(curated)
        elif og_desc is not None:
            desc_html = og_desc
        else:
            desc_html = None
        tw_title = og_title if og_title is not None else title_txt
        if not _present(head, r'<link[^>]+rel=["\']canonical'):
            lines.append('<link rel="canonical" href="%s">' % url)
        if not _present(head, r'og:url'):
            lines.append('<meta property="og:url" content="%s">' % url)
        if not _present(head, r'og:site_name'):
            lines.append('<meta property="og:site_name" content="%s">' % SITE_NAME)
        if not _present(head, r'og:locale'):
            lines.append('<meta property="og:locale" content="%s">' % OG_LOCALE)
        if meta_desc is None and curated:
            lines.append('<meta name="description" content="%s">' % _esc(curated))
            if og_desc is None:
                lines.append('<meta property="og:description" content="%s">' % _esc(curated))
        if og_image and not _present(head, r'og:image:alt'):
            lines.append('<meta property="og:image:alt" content="%s">' % (tw_title or SITE_NAME))
        if not _present(head, r'twitter:card'):
            lines.append('<meta name="twitter:card" content="summary_large_image">')
        if tw_title and not _present(head, r'twitter:title'):
            lines.append('<meta name="twitter:title" content="%s">' % tw_title)
        if desc_html and not _present(head, r'twitter:description'):
            lines.append('<meta name="twitter:description" content="%s">' % desc_html)
        if og_image and not _present(head, r'twitter:image'):
            lines.append('<meta name="twitter:image" content="%s">' % og_image)
    if not lines:
        return False
    block = SEO_BEGIN + "".join(lines) + SEO_END
    m = re.search(r'</title>', s, re.I)
    at = m.end() if m else s.lower().find("<head>") + 6
    s = s[:at] + block + s[at:]
    open(path, "w", encoding="utf-8").write(s)
    return True


def cmd_seoheads():
    import glob as _glob
    files = [os.path.basename(f) for f in sorted(_glob.glob(os.path.join(PAGES, "*.html")))]
    files += ["course/" + os.path.basename(f) for f in sorted(_glob.glob(os.path.join(PAGES, "course", "*.html")))]
    files += ["post/" + os.path.basename(f) for f in sorted(_glob.glob(os.path.join(PAGES, "post", "*.html")))]
    n = sum(1 for rel in files if enhance_head(rel))
    print("seoheads: updated %d/%d pages (canonical/OG/Twitter/robots)" % (n, len(files)))


# ---- Wave 2: JSON-LD structured data (AEO/GEO) ----------------------------
# Head/script-level only. Adds an idempotent <script data-ttt-schema> @graph to
# indexable pages. Podcast episodes are sourced from podcast-episodes.json (the
# single local episode model), so the future locally-owned grid renderer reuses
# the same source instead of building episode metadata twice.
SCHEMA_BEGIN, SCHEMA_END = "<!--ttt-schema-->", "<!--/ttt-schema-->"
LOGO_URL = "https://storage.googleapis.com/msgsndr/pIQnJdASBmjOuDSHEr5v/media/687c9ccbe36c1580ec1b2ea4.png"
SAME_AS = [
    "https://www.facebook.com/freemanfung.global",
    "https://www.instagram.com/freemanfung.global",
    "https://www.linkedin.com/in/freeman-fung",
]
ORG_ID = CANONICAL_DOMAIN + "/#organization"
WEBSITE_ID = CANONICAL_DOMAIN + "/#website"
PERSON_ID = CANONICAL_DOMAIN + "/#freeman"
# Reference nodes carry @id (for site-wide entity consolidation) AND inline
# type/name/logo (so each page validates standalone).
ORG_REF = {"@id": ORG_ID, "@type": "Organization", "name": SITE_NAME,
           "url": CANONICAL_DOMAIN + "/", "logo": {"@type": "ImageObject", "url": LOGO_URL}}
PERSON_REF = {"@id": PERSON_ID, "@type": "Person", "name": "Freeman Fung",
              "url": CANONICAL_DOMAIN + "/about"}


def _org():
    return {"@type": "Organization", "@id": ORG_ID, "name": SITE_NAME,
            "url": CANONICAL_DOMAIN + "/",
            "logo": {"@type": "ImageObject", "url": LOGO_URL},
            "sameAs": SAME_AS}


def _person():
    return {"@type": "Person", "@id": PERSON_ID, "name": "Freeman Fung",
            "url": CANONICAL_DOMAIN + "/about",
            "jobTitle": "Speaker, Coach & Author", "worksFor": ORG_REF,
            "sameAs": SAME_AS}


def _abs(url):
    return CANONICAL_DOMAIN + url if url.startswith("/") else url


def _episodes():
    try:
        return json.load(open(os.path.join(ROOT, "podcast-episodes.json"), encoding="utf-8"))
    except Exception:
        return []


def build_jsonld(relpath):
    name = relpath[:-5]
    if name in SITEMAP_EXCLUDE:
        return None
    path = _url_path(relpath)
    s = open(os.path.join(PAGES, relpath), encoding="utf-8").read()
    head = s[:s.lower().find("</head>")]
    og_title = _meta_content(head, "property", "og:title") or ""
    og_image = _meta_content(head, "property", "og:image") or ""
    desc = _meta_content(head, "name", "description") or _meta_content(head, "property", "og:description") or ""
    url = CANONICAL_DOMAIN + path
    eps = {e["slug"]: e for e in _episodes()}

    if path == "/":
        return [_org(),
                {"@type": "WebSite", "@id": WEBSITE_ID, "name": SITE_NAME,
                 "url": CANONICAL_DOMAIN + "/", "publisher": {"@id": ORG_ID},
                 "inLanguage": "en"}]
    if path == "/about":
        p = _person()
        if og_image:
            p["image"] = og_image
        return [p, {"@type": "ProfilePage", "@id": url + "#profile",
                    "url": url, "mainEntity": {"@id": PERSON_ID},
                    "isPartOf": {"@id": WEBSITE_ID}}]
    if path == "/course/tmb":
        return [{"@type": "Course", "name": og_title or "The Travel Mastery Blueprint",
                 "description": desc, "url": url, "provider": ORG_REF,
                 "inLanguage": "en"}]
    slug = name.split("/")[-1]
    if slug in eps:
        e = eps[slug]
        ep = {"@type": "PodcastEpisode", "@id": url + "#episode",
              "name": e["title"], "url": url,
              "description": e.get("description") or desc,
              "image": _abs(e.get("image") or og_image),
              "inLanguage": "en", "author": PERSON_REF, "publisher": ORG_REF}
        if e.get("date"):
            ep["datePublished"] = e["date"]
        return [ep, {"@type": "WebPage", "@id": url + "#webpage", "url": url,
                     "speakable": {"@type": "SpeakableSpecification",
                                   "cssSelector": ["h1", ".hl_page-preview--content h2"]}}]
    return None


def inject_jsonld(relpath):
    graph = build_jsonld(relpath)
    if not graph:
        return False
    path = os.path.join(PAGES, relpath)
    s = open(path, encoding="utf-8").read()
    s = re.sub(re.escape(SCHEMA_BEGIN) + r".*?" + re.escape(SCHEMA_END), "", s, flags=re.S)
    payload = json.dumps({"@context": "https://schema.org", "@graph": graph},
                         separators=(",", ":"), ensure_ascii=False)
    block = (SCHEMA_BEGIN + '<script type="application/ld+json" data-ttt-schema>'
             + payload + '</script>' + SCHEMA_END)
    m = re.search(r'</title>', s, re.I)
    at = m.end() if m else s.lower().find("<head>") + 6
    s = s[:at] + block + s[at:]
    open(path, "w", encoding="utf-8").write(s)
    return True


def cmd_jsonld():
    import glob as _glob
    files = [os.path.basename(f) for f in sorted(_glob.glob(os.path.join(PAGES, "*.html")))]
    files += ["course/" + os.path.basename(f) for f in sorted(_glob.glob(os.path.join(PAGES, "course", "*.html")))]
    files += ["post/" + os.path.basename(f) for f in sorted(_glob.glob(os.path.join(PAGES, "post", "*.html")))]
    n = sum(1 for rel in files if inject_jsonld(rel))
    print("jsonld: injected data-ttt-schema on %d pages" % n)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    {"sync": cmd_sync, "enhance": cmd_enhance, "check": cmd_check,
     "sitemap": cmd_sitemap, "seoheads": cmd_seoheads,
     "jsonld": cmd_jsonld}.get(cmd, lambda: print(__doc__))()
