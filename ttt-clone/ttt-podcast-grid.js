/* TTT podcast grid — locally-owned client renderer (single keyed source).
 *
 * WHY THIS EXISTS
 * The /podcast grid is rendered by GHL's blog-list Vue component, compiled into
 * a third-party CDN chunk we cannot edit. Its v-for is NOT keyed by a stable id,
 * so on a hard load it hydrates against our correct SSR grid and recycles nodes:
 * title, href and <img> each go stale independently (duplicate/mismatched images,
 * Beyonder dropped). It self-heals on any later re-render (proven: paginating away
 * and back renders byte-perfect). Since we can't fix their :key, we OWN the render.
 *
 * HOW
 * - Single source: window.__TTT_PODCAST__ (emitted by publish.py from
 *   podcast-episodes.json — the same array that seeds the static SSR grid).
 * - window.__TTT_OWN_GRID__ (set inline in <head> BEFORE any GHL script) makes
 *   ghl-offline-data.js serve an EMPTY podcast list, so the GHL component never
 *   populates/reshuffles this grid. This renderer is then the sole writer.
 * - Each card binds title == link == image from ONE post object, keyed by slug
 *   (data-slug). Images use a native loading="lazy" <img src> (no data-src / no
 *   IntersectionObserver), so there are no stale observers to recycle.
 * - A MutationObserver re-asserts the grid if anything else touches it.
 * Page-scoped: only loaded on podcast.html. Does not touch the quiz or forms.
 */
(function () {
  "use strict";
  var PAGE_SIZE = 6;
  var LC = "https://images.leadconnectorhq.com/image/f_webp/q_80/r_";

  function data() { return (window.__TTT_PODCAST__ || []).slice(); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function pages() { return Math.max(1, Math.ceil(data().length / PAGE_SIZE)); }

  function picture(img, alt) {
    var a = esc(alt);
    if (/^https?:\/\//.test(img)) {
      function s(r) { return LC + r + "/u_" + img; }
      return (
        '<picture class="hl-image-picture h-100 w-100" style="display:block;">' +
        '<source media="(max-width:900px) and (min-width: 768px)" srcset="' + s(900) + '">' +
        '<source media="(max-width:768px) and (min-width: 640px)" srcset="' + s(768) + '">' +
        '<source media="(max-width:640px) and (min-width: 480px)" srcset="' + s(640) + '">' +
        '<source media="(max-width:480px) and (min-width: 320px)" srcset="' + s(768) + '">' +
        '<source media="(max-width:320px)" srcset="' + s(320) + '">' +
        '<img src="' + s(1200) + '" alt="' + a + '" style="object-fit:cover;" ' +
        'class="blog-image-corner blog-standard-image-mobile three-col-img hl-optimized mw-100" ' +
        'loading="lazy" fetchpriority="auto" data-animation-class=""></picture>'
      );
    }
    return (
      '<picture class="hl-image-picture h-100 w-100" style="display:block;">' +
      '<img src="' + esc(img) + '" alt="' + a + '" style="object-fit:cover;" ' +
      'class="blog-image-corner blog-standard-image-mobile three-col-img mw-100" ' +
      'loading="lazy" fetchpriority="auto" data-animation-class=""></picture>'
    );
  }

  function card(ep) {
    var url = esc(ep.url), title = esc(ep.title);
    return (
      '<div class="blog-post-wrapper-list three-col"><div class="blog-post-wrapper-wrapper" data-slug="' + esc(ep.slug) + '">' +
      '<div class="blog-box"><a href="' + url + '"><div class="blog-image-standard-wrapper">' +
      '<div class="blog-image-dap blog-image">' + picture(ep.image, ep.title) + '</div></div></a>' +
      '<div class="standard-blog-content">' +
      '<h2 class="blog-title text-xl font-bold text-black font-sans">' +
      '<a class="no-text-decoration" href="' + url + '">' + title + '</a></h2>' +
      '<div class="flex items-center"><div class="text-black text-xs" style="display:flex;"><!----></div>' +
      '<div class="text-black text-xs" style="display:flex;"><!----></div></div>' +
      '<div class="flex"><a href="' + url + '" class="blog-button text-light-blue focus:outline-none ' +
      'focus:underline active:text-light-blue font-sans readme-btn">Read more ' +
      '<svg xmlns="http://www.w3.org/2000/svg" height="15" width="15" fill="none" ' +
      'viewBox="0 0 15 24" stroke-width="2" stroke="#000" aria-hidden="true" ' +
      'class="w-5 h-5 readme-btn blog-button-icon"><path stroke-linecap="round" ' +
      'stroke-linejoin="round" d="M9 18l6-6-6-6"></path></svg></a></div></div></div></div><!----></div>'
    );
  }

  function paginationHTML(page, total) {
    var out = '<div class="pagination-container">';
    out += '<button ' + (page <= 1 ? "disabled " : "") +
      'class="pagination-button" data-ttt-page="' + (page - 1) + '"> Previous </button>';
    for (var i = 1; i <= total; i++) {
      out += '<button class="' + (i === page ? "active " : "") +
        'pagination-button" data-ttt-page="' + i + '">' + i + "</button>";
    }
    out += '<button ' + (page >= total ? "disabled " : "") +
      'class="pagination-button" data-ttt-page="' + (page + 1) + '"> Next </button>';
    return out + "</div>";
  }

  // ---- EJECT strategy -------------------------------------------------------
  // Sharing the grid with GHL is a losing race: it re-renders 6 cards of its own
  // (scrambled, Beyonder dropped) and any count/attr guard misses it. Instead we
  // clone the grid + pagination nodes and swap the clones into the DOM. GHL's Vue
  // still holds refs to the ORIGINAL (now-detached) nodes and keeps patching them
  // off-screen; our clones are framework-free and can never be overwritten.
  var state = { page: 1, gridEl: null, pagEl: null, mounted: false };

  function findGrid() { return state.gridEl && state.gridEl.isConnected ? state.gridEl
    : document.querySelector(".blog-post-wrapper"); }
  function findPagWrap() {
    if (state.pagEl && state.pagEl.isConnected) return state.pagEl;
    var pc = document.querySelector(".pagination-container");
    return pc ? pc.parentElement : null;
  }

  function fillGrid(el, page) {
    var eps = data();
    var start = (page - 1) * PAGE_SIZE;
    el.innerHTML = eps.slice(start, start + PAGE_SIZE).map(card).join("");
    el.setAttribute("data-ttt-grid", "1");
  }
  function fillPag(el, page) {
    el.innerHTML = paginationHTML(page, pages());
    el.setAttribute("data-ttt-pag", "1");
  }

  function render(page) {
    page = Math.min(Math.max(1, page || 1), pages());
    state.page = page;
    if (state.gridEl) fillGrid(state.gridEl, page);
    if (state.pagEl) fillPag(state.pagEl, page);
  }

  // Detach a live node from Vue by replacing it in the DOM with a deep clone.
  // cloneNode(true) drops Vue's addEventListener bindings, so the clone is inert.
  function eject(node) {
    var clone = node.cloneNode(false); // shallow: keep tag/classes/attrs only
    // preserve identifying classes/attrs already on the shallow clone
    node.parentNode.replaceChild(clone, node);
    return clone;
  }

  function mount() {
    if (state.mounted || !data().length) return;
    var g = document.querySelector(".blog-post-wrapper");
    if (!g) return; // grid not in DOM yet; a later tick will catch it
    var pc = document.querySelector(".pagination-container");
    var pw = pc ? pc.parentElement : null;

    state.gridEl = eject(g);
    fillGrid(state.gridEl, state.page);
    if (pw) { state.pagEl = eject(pw); fillPag(state.pagEl, state.page); }
    state.mounted = true;

    // Guard: if GHL injects a fresh, non-owned .blog-post-wrapper anywhere, drop it.
    var host = state.gridEl.parentNode ? state.gridEl.parentNode.parentNode : document.body;
    new MutationObserver(function () {
      document.querySelectorAll(".blog-post-wrapper").forEach(function (el) {
        if (!el.hasAttribute("data-ttt-grid")) el.remove();
      });
    }).observe(host || document.body, { childList: true, subtree: true });
  }

  function onClick(e) {
    var b = e.target && e.target.closest ? e.target.closest(".pagination-button[data-ttt-page]") : null;
    if (!b || b.disabled) return;
    e.preventDefault();
    e.stopPropagation();
    var p = parseInt(b.getAttribute("data-ttt-page"), 10);
    if (p >= 1 && p <= pages()) {
      render(p);
      if (state.gridEl && state.gridEl.scrollIntoView)
        state.gridEl.scrollIntoView({ block: "start", behavior: "auto" });
    }
  }

  function start() {
    if (!data().length) return; // nothing to own; leave GHL alone
    document.addEventListener("click", onClick, true); // capture phase, survives re-render

    // The eject MUST run AFTER Vue hydration, else Vue adopts our clone. Vue's
    // hydration/first render mutates the grid -> that's the signal to eject on the
    // next tick. Fallbacks cover a grid Vue never touches or that appears late.
    var g0 = document.querySelector(".blog-post-wrapper");
    if (g0) {
      var mo = new MutationObserver(function () {
        mo.disconnect();
        setTimeout(mount, 30); // let Vue finish its current render pass first
      });
      mo.observe(g0, { childList: true, subtree: true });
    }
    var tries = 0;
    var iv = setInterval(function () {
      if (!state.mounted && tries >= 6) mount(); // ~900ms in: assume hydrated
      if (state.mounted || ++tries > 40) clearInterval(iv); // ~6s ceiling
    }, 150);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
