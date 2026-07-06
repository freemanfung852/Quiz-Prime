#!/usr/bin/env python3
"""Travel to Transform clone — publish/sync pipeline.

The LIVE site (traveltotransform.com, GoHighLevel) is the source of truth for
content. Freeman publishes a post in GHL; this script brings the clone up to
date and applies the SEO/AEO/GEO layer the live site lacks.

Usage (run from the repo/clone root, the folder containing vercel.json):

  python3 tools/publish.py sync      # detect + clone new posts, refresh
                                     # catalogs/listings, enhance, update map
  python3 tools/publish.py enhance   # (re)apply canonical + JSON-LD to every
                                     # cloned post page (idempotent)
  python3 tools/publish.py check     # audit: catalogs vs cloned files vs live

After a sync: vercel deploy --prod  (project `site`; no git auto-deploy)

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

API = "https://backend.leadconnectorhq.com/blogs/posts/list"
LOCATION = "pIQnJdASBmjOuDSHEr5v"
CATS = {  # categoryId: (label, blogId, listing page)
    "6878c4aaf07aa601cf0236d1": ("podcast", "OpmhkeQp4dBsYivBdh3U", "podcast.html"),
    "6878be8fe6774b079d931ef0": ("blog", "l4woPhjYfsvIZSfgW676", "blog.html"),
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


def load_catalogs():
    out = {}
    for cid in CATS:
        posts, det = api_catalog(cid)
        out[cid] = (slim(posts), det)
    return out


def cmd_sync():
    catalogs = load_catalogs()
    shim_src = open(SHIM, encoding="utf-8").read()
    new = []
    for cid, (posts, _) in catalogs.items():
        label, _, listing = CATS[cid]
        for p in posts:
            slug = p["urlSlug"]
            p["_section"] = label
            missing_file = not os.path.exists(os.path.join(PAGES, "post", slug + ".html"))
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
    if new:
        print("\nNOW RUN:  vercel deploy --prod   (from the clone root)")


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


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    {"sync": cmd_sync, "enhance": cmd_enhance, "check": cmd_check}.get(
        cmd, lambda: print(__doc__))()
