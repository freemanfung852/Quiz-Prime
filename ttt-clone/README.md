# ttt-clone — reference copy only, do NOT deploy

This folder is a reference copy of the Travel to Transform site pages.

**Do not deploy this folder to Vercel.** The post pages load images through
relative paths (`../../storage.googleapis.com/...`) that resolve to local CDN
mirror folders which are NOT included in this repo. Deploying from here breaks
every inline article image.

The production deploy source for the Vercel `site` project is the full clone
(pages + `assets.cdn.filesafe.space/`, `storage.googleapis.com/`,
`images.squarespace-cdn.com/` mirror folders + root `vercel.json`), deployed
direct-folder with `vercel deploy --prod`.
