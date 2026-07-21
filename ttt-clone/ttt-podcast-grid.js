/* TTT podcast grid — locally-owned client renderer (single keyed source).
 *
 * WHY THIS EXISTS
 * The podcast grid is rendered by GHL's blog-list Vue component, compiled into a
 * third-party CDN chunk we cannot edit. Its v-for is NOT keyed by a stable id, so
 * on a hard load it hydrates against our SSR grid and recycles nodes: title, href
 * and <img> each go stale independently (duplicate/mismatched images, Beyonder
 * dropped). It self-heals on any later re-render (paginating away and back renders
 * byte-perfect). Since we can't fix their :key, we OWN the render.
 *
 * TWO SURFACES, ONE SOURCE
 * The same GHL blog widget appears in two layouts, both driven from the single
 * source window.__TTT_PODCAST__ (emitted by publish.py from podcast-episodes.json):
 *   - /podcast   : 3-col ".blog-post-wrapper" grid, paginated (6/page).
 *   - /resources : compact ".blog-item" preview inside #blog-IGYvVKC_zD, first N,
 *                  no pagination (the sibling Blog widget is never touched).
 *
 * NO-FLICKER GATE (hide-first, reveal-when-ready)
 * window.__TTT_OWN_GRID__ (set inline in <head> BEFORE any GHL script) makes
 * ghl-offline-data.js serve an EMPTY podcast list, so the GHL component never
 * populates this grid. A CSS gate injected in <head> (publish.py) hides the GHL
 * grid node from the very first paint — `.blog-post-wrapper:not([data-ttt-grid])`
 * / `#blog-IGYvVKC_zD .blog-row:not([data-ttt-grid])` are visibility:hidden, with
 * a min-height reserve on the container so nothing jumps. We then EJECT GHL's grid
 * (clone it shallow, fill the clone with our cards, mark it data-ttt-grid, and swap
 * it in) — GHL's Vue keeps patching the detached original off-screen and can never
 * overwrite us, and only our filled clone (which carries data-ttt-grid) is visible.
 * A guard MutationObserver drops any fresh non-owned grid GHL later injects.
 * Page-scoped: loaded only on podcast.html and resources.html. Never touches quiz/forms.
 */
(function () {
  "use strict";
  var PAGE_SIZE = 6;   // /podcast cards per page
  var PREVIEW_N = 6;   // /resources preview count
  var LC = "https://images.leadconnectorhq.com/image/f_webp/q_80/r_";

  function data() { return (window.__TTT_PODCAST__ || []).slice(); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fmtDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return "";
    var MO = ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"];
    return MO[(+m[2]) - 1] + " " + (+m[3]) + ", " + m[1];
  }

  // ---- /podcast 3-col template ---------------------------------------------
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

  function gridCard(ep) {
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

  // ---- /resources compact template -----------------------------------------
  // Matches GHL's captured .blog-item markup, but with REAL hrefs (GHL relies on a
  // role="button" click handler we don't reproduce) and no read-time (not in JSON).
  function compactCard(ep) {
    var url = esc(ep.url), title = esc(ep.title), img = esc(ep.image);
    var date = esc(fmtDate(ep.date)), desc = esc(ep.description || "");
    return (
      '<div class="blog-item blog-column" role="button" tabindex="0" data-slug="' + esc(ep.slug) +
        '" data-ttt-href="' + url + '"><div class="blog-column-container">' +
        '<div><img src="' + img + '" alt="' + title + '" loading="lazy"></div>' +
        '<div class="blog-item-box-2"><div class="blog-item-texts">' +
          '<h2 class="blog-item-heading"><strong><a href="' + url + '" aria-label="' + title + '">' + title + '</a></strong></h2>' +
          '<p class="blog-item-description">' + desc + ' <a aria-label="...more" class="compact-more-button" href="' + url + '">...more</a></p>' +
          '<p class="blog-item-category"><!--[--><span>podcast </span><!--]--></p>' +
          (date ? '<p class="blog-item-subtexts"><span class="blog-item-date">' + date + '</span></p>' : '') +
        '</div><!----></div></div></div>'
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

  // ---- surfaces ------------------------------------------------------------
  // Each page matches exactly one surface. gridSel finds GHL's grid node; we clone
  // it shallow so our owned grid keeps the exact class/position and GHL's original
  // detaches. `cards(page)` builds the innerHTML for our owned grid.
  var SURFACES = [
    {
      name: "podcast",
      gridSel: ".blog-post-wrapper",
      detect: function () {
        return !!document.querySelector(".blog-post-wrapper") &&
               !!document.querySelector(".pagination-container");
      },
      paginated: true,
      pages: function () { return Math.max(1, Math.ceil(data().length / PAGE_SIZE)); },
      cards: function (page) {
        var eps = data(), start = (page - 1) * PAGE_SIZE;
        return eps.slice(start, start + PAGE_SIZE).map(gridCard).join("");
      },
      findPagWrap: function () {
        var pc = document.querySelector(".pagination-container");
        return pc ? pc.parentElement : null;
      }
    },
    {
      name: "resources",
      gridSel: "#blog-IGYvVKC_zD .blog-row",
      detect: function () { return !!document.querySelector("#blog-IGYvVKC_zD .blog-row"); },
      paginated: false,
      pages: function () { return 1; },
      cards: function () { return data().slice(0, PREVIEW_N).map(compactCard).join(""); },
      findPagWrap: function () { return null; }
    }
  ];

  // Detach a live node from Vue by swapping in a shallow clone (keeps tag/class/
  // attrs, drops Vue's addEventListener bindings). Fill BEFORE the swap so the
  // clone lands already-populated and marked owned — never a visible empty frame.
  function ejectFilled(node, html) {
    var clone = node.cloneNode(false);
    clone.setAttribute("data-ttt-grid", "1");
    clone.innerHTML = html;
    node.parentNode.replaceChild(clone, node);
    return clone;
  }

  function makeController(surface) {
    var state = { page: 1, gridEl: null, pagEl: null, mounted: false };

    function fillPag() {
      if (!state.pagEl) return;
      state.pagEl.innerHTML = paginationHTML(state.page, surface.pages());
      state.pagEl.setAttribute("data-ttt-pag", "1");
    }

    function render(page) {
      page = Math.min(Math.max(1, page || 1), surface.pages());
      state.page = page;
      if (state.gridEl) state.gridEl.innerHTML = surface.cards(page);
      fillPag();
    }

    function mount() {
      if (state.mounted || !data().length) return;
      var g = document.querySelector(surface.gridSel);
      if (!g) return; // grid not in DOM yet; a later tick will catch it
      state.gridEl = ejectFilled(g, surface.cards(state.page));

      if (surface.paginated) {
        var pw = surface.findPagWrap();
        if (pw) { state.pagEl = ejectFilled(pw, ""); fillPag(); }
      }
      state.mounted = true;

      // Guard: drop any fresh, non-owned grid GHL injects into this surface.
      var host = state.gridEl.parentNode ? state.gridEl.parentNode.parentNode : document.body;
      new MutationObserver(function () {
        document.querySelectorAll(surface.gridSel).forEach(function (el) {
          if (!el.hasAttribute("data-ttt-grid")) el.remove();
        });
      }).observe(host || document.body, { childList: true, subtree: true });
    }

    return { state: state, render: render, mount: mount };
  }

  function onClick(ctrl) {
    return function (e) {
      var t = e.target;
      // pagination (podcast surface)
      var b = t && t.closest ? t.closest(".pagination-button[data-ttt-page]") : null;
      if (b && !b.disabled) {
        e.preventDefault();
        e.stopPropagation();
        var p = parseInt(b.getAttribute("data-ttt-page"), 10);
        if (!isNaN(p) && p >= 1) {
          ctrl.render(p);
          if (ctrl.state.gridEl && ctrl.state.gridEl.scrollIntoView)
            ctrl.state.gridEl.scrollIntoView({ block: "start", behavior: "auto" });
        }
        return;
      }
      // whole-card navigation (resources compact card is a role="button")
      var card = t && t.closest ? t.closest(".blog-item[data-ttt-href]") : null;
      if (card && !(t.closest && t.closest("a"))) {
        e.preventDefault();
        location.href = card.getAttribute("data-ttt-href");
      }
    };
  }

  function startSurface(surface) {
    var ctrl = makeController(surface);
    document.addEventListener("click", onClick(ctrl), true); // capture, survives re-render

    // Mount as soon as the grid node exists (it ships in the SSR). The CSS gate
    // keeps GHL's grid invisible until our filled, owned clone replaces it, so we
    // no longer need to wait for hydration to avoid a flash. We still retry in case
    // the node appears late, and re-mount if a first attempt landed before the node.
    var tries = 0;
    var iv = setInterval(function () {
      if (!ctrl.state.mounted) ctrl.mount();
      if (ctrl.state.mounted) { clearInterval(iv); return; }
      if (++tries > 40) { clearInterval(iv); revealFallback(); } // ~4s ceiling
    }, 100);
    ctrl.mount(); // immediate first attempt
  }

  // Safety net: if our render never mounts (script error, grid node never appears),
  // drop the CSS gate so GHL's own SSR grid becomes visible again — a degraded but
  // non-blank fallback (on /podcast the SSR grid is already correct).
  function revealFallback() {
    var g = document.getElementById("ttt-grid-gate");
    if (g && g.parentNode) g.parentNode.removeChild(g);
  }

  function start() {
    if (!data().length) return; // nothing to own; leave GHL alone
    SURFACES.forEach(function (s) { if (s.detect()) startSurface(s); });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
