# Travel to Transform — site clone

Faithful static clone of [traveltotransform.com](https://traveltotransform.com) (Freeman Fung), rebuilt for deployment on Vercel.

## What this is

The original site is a **GoHighLevel (LeadConnector) funnel** on location `pIQnJdASBmjOuDSHEr5v`. This repo serves the rendered pages as static HTML. Forms, fonts, and runtime scripts still load live from `*.leadconnectorhq.com`, so the native GHL forms submit straight into the same GHL location.

## Layout

```
traveltotransform.com/      # all 30 page HTML files (index, about, coaching, post/*, course/* ...)
assets.cdn.filesafe.space/  # GHL funnel media (images), mirrored locally
storage.googleapis.com/     # GHL media storage (images), mirrored locally
images.squarespace-cdn.com/ # a few embedded images, mirrored locally
vercel.json                 # clean-URL routing -> traveltotransform.com/<page>.html
```

## Routing

`vercel.json` rewrites clean URLs onto the page files:

- `/` → `traveltotransform.com/index.html`
- `/about`, `/coaching`, `/speaking`, … → `traveltotransform.com/<page>.html`
- `/post/<slug>` → `traveltotransform.com/post/<slug>.html`
- `/course/<slug>` → `traveltotransform.com/course/<slug>.html`

## Notes

- **Videos** are not committed (too large for git). They stream from the live GHL CDN via absolute URLs already baked into the HTML.
- Internal nav links were rewritten from `https://traveltotransform.com/...` to root-relative `/...` so the clone is self-contained.
- **No secrets in this repo.** The GHL Private Integration Token is stored in macOS Keychain, never in source.

## Local preview

```
npx -y serve -l 5235 .
# open http://localhost:5235/  (or any /about, /post/..., etc. through vercel dev)
```
