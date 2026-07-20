/* Travel to Transform clone — shared browser fixes and live GHL form embeds.
 *
 * WHY: the scraped pages render their GHL forms natively inline, baked in at
 * scrape time. Those copies are frozen — edit a form in GHL (fields, workflow
 * wiring) and the clone would never see the change. These forms feed Freeman's
 * automation workflows, so they must always be the live version.
 *
 * WHAT: after hydration, each `.c-form` container is replaced with the official
 * GHL iframe embed for ITS form, so the form is always loaded live from GHL.
 *
 * HOW it knows which form goes in which container (no hardcoded per-page map):
 * the natively-rendered form gives its own id away — its fields carry DOM ids
 * shaped `el_<formId>_<field>_<n>`. We read the formId back out of the rendered
 * container, then swap in that form's iframe. Self-detecting, so it stays
 * correct on every page and survives new pages being cloned.
 *
 * Order forms (`.c-order`) are handled separately by ghl-order-forms.js.
 */

/* GHL's hydrated image-link handler can turn internal links into malformed
 * `https:///...` URLs after a client-side route change. Force same-tab,
 * same-origin links to perform a normal document navigation instead. This is
 * especially important for the header logo, which must always load `/`.
 */
(function () {
  if (window.__tttSameOriginNavigationInstalled) return;
  window.__tttSameOriginNavigationInstalled = true;

  function navigate(e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var target = e.target;
    var a = target && target.closest ? target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download')) return;

    var linkTarget = (a.getAttribute('target') || '').toLowerCase();
    if (linkTarget && linkTarget !== '_self') return;

    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^(?:mailto:|tel:|javascript:|data:)/i.test(href)) return;

    var url;
    try { url = new URL(href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    location.assign(url.href);
  }

  window.addEventListener('click', navigate, true);
})();

/* Stable anchors for responsive speaking-page sections. GHL gives the desktop
 * and mobile copies generated ids, so links to human-readable fragments would
 * otherwise land nowhere. Move one anchor before whichever copy is visible. */
(function () {
  if (location.pathname.replace(/\/+$/, '') !== '/speaking') return;

  function visible(el) {
    return el && window.getComputedStyle(el).display !== 'none' && el.getClientRects().length > 0;
  }

  function place(id, selectors) {
    var anchor = document.getElementById(id);
    if (!anchor) {
      anchor = document.createElement('span');
      anchor.id = id;
      anchor.setAttribute('aria-hidden', 'true');
    }

    var target = null;
    for (var i = 0; i < selectors.length; i++) {
      var candidate = document.querySelector(selectors[i]);
      if (!target && candidate) target = candidate;
      if (visible(candidate)) { target = candidate; break; }
    }
    if (target && target.parentNode) target.parentNode.insertBefore(anchor, target);

    if (location.hash === '#' + id && !anchor.getAttribute('data-ttt-scrolled')) {
      anchor.setAttribute('data-ttt-scrolled', 'true');
      requestAnimationFrame(function () { anchor.scrollIntoView(); });
    }
  }

  function placeAnchors() {
    place('mindvalley-feature', ['#section-THZYexGtHC', '#section-PMLP6iZwMA']);
    place('booking-form', ['#section-Cf0_OypN7G', '#section-7ejH1KY26r']);
  }

  function scheduleAnchors() { setTimeout(placeAnchors, 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleAnchors, { once: true });
  else scheduleAnchors();
  window.addEventListener('resize', placeAnchors);
})();

(function () {
  var HOST = 'https://connect.unwiz.ai';   // whitelabel form domain on Freeman's GHL
  var NEXT_STEPS = {
    'anf-free': ['kJdPp16RLXEdiFb4vPQS', '/ebook-download-thank-you'],
    'dnf-free': ['Vtxdc9IwM2QIdQkPBJDq', '/ebook-download-thankyou'],
    'additional-accelerator': ['TOsnKn8148rDyymmtY6Z', '/checkout-accelerator'],
    'additional-accelerator-page': ['TOsnKn8148rDyymmtY6Z', '/checkout-accelerator-page']
  };
  var NAMES = {
    fwdksuE2rkdxnQvRjW4G: 'Masterclass Form',
    lXV21cVWhFRV7yjVkSz0: 'Quiz Form',
    '6U0Vz7IwkJpG9XbeBYNp': 'QUiz form hidden Code',
    rIgAR76VtbCLUa4g0iZc: 'QuizHiddenSubmission',
    Vtxdc9IwM2QIdQkPBJDq: 'Ebook Form Vietnam',
    kJdPp16RLXEdiFb4vPQS: 'Ebook Form Athens',
    Pqnb4CZblVGr0uxznfWj: 'Newsletter',
    DFQZnEZ3zuA8L487qDE2: 'Footer Form (Newsletter)',
    SUDlSnUDDO3m1X0l1Sz1: 'Contact Form',
    TOsnKn8148rDyymmtY6Z: 'Coaching Form',
    pEZ29iRi9fqelR4EQ4zE: 'Form 10',
    FR5FFjwzF8hSL7MFWhw8: 'Testimonial Form',
    FLeccoaacyAbeMA4XvP2: 'Speaking Booking Form',
    u23AvsXr5KEHa7GD7cHb: 'Pre-launch Sign Up Form',
    PtYYOEhNAGBwgw5luQE8: 'Form 6'
  };

  var scriptLoaded = false;

  function pathKey() {
    return location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
  }

  function isVisible(el) {
    var style = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 && rect.height > 0;
  }

  function iframeIdFor(container, formId) {
    var suffix = (container.id || 'form').replace(/[^A-Za-z0-9_-]/g, '-');
    return 'inline-' + formId + '-' + suffix;
  }

  function formIdOf(container) {
    var els = container.querySelectorAll('[id^="el_"]');
    for (var i = 0; i < els.length; i++) {
      var m = /^el_([A-Za-z0-9]{20})_/.exec(els[i].id);
      if (m) return m[1];
    }
    return null;
  }

  function embed(container, formId, height) {
    var name = NAMES[formId] || 'Form';
    var h = Math.max(height || 0, 420);
    var iframeId = iframeIdFor(container, formId);
    container.innerHTML =
      '<iframe src="' + HOST + '/widget/form/' + formId + '"' +
      ' style="width:100%;min-height:' + h + 'px;border:none;border-radius:8px"' +
      ' id="' + iframeId + '"' +
      ' data-layout="{\'id\':\'INLINE\'}"' +
      ' data-trigger-type="alwaysShow" data-trigger-value=""' +
      ' data-activation-type="alwaysActivated" data-activation-value=""' +
      ' data-deactivation-type="neverDeactivate" data-deactivation-value=""' +
      ' data-form-name="' + name + '"' +
      ' data-height="' + h + '"' +
      ' data-layout-iframe-id="' + iframeId + '"' +
      ' data-form-id="' + formId + '"' +
      ' title="' + name + '"></iframe>';
    container.setAttribute('data-ttt-live-form', formId);

    if (!scriptLoaded) {
      scriptLoaded = true;
      var sc = document.createElement('script');
      sc.src = HOST + '/js/form_embed.js';   // auto-resizes the iframes
      document.body.appendChild(sc);
    }
  }

  function swap() {
    var boxes = document.querySelectorAll('.c-form');
    for (var i = 0; i < boxes.length; i++) {
      var c = boxes[i];
      var done = c.getAttribute('data-ttt-live-form');
      // already embedded and the iframe is still there -> nothing to do
      if (done && c.querySelector('iframe[data-form-id="' + done + '"]')) continue;
      // GHL pages carry separate desktop/mobile copies. Do not load the hidden
      // copy until it is actually shown at a breakpoint or inside a popup.
      if (!isVisible(c)) continue;
      var fid = formIdOf(c);
      if (!fid) continue;             // not hydrated yet; try again next tick
      embed(c, fid, c.getBoundingClientRect().height);
    }
  }

  function start() {
    swap();
    new MutationObserver(swap).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(swap, 1500);
    window.addEventListener('resize', swap);
  }

  // Give Nuxt one second after DOMContentLoaded to finish hydration. Waiting
  // for window.load can stall forms behind slow images and third-party media.
  function scheduleStart() { setTimeout(start, 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleStart, { once: true });
  else scheduleStart();

  // A standalone GHL iframe does not know the original funnel's "next step".
  // GHL emits set-sticky-contacts with the iframe id after a successful lead
  // capture. Restore the four native funnel transitions only for the expected
  // form on the expected page.
  window.addEventListener('message', function (event) {
    var next = NEXT_STEPS[pathKey()];
    if (!next || event.origin !== HOST || !Array.isArray(event.data)) return;
    if (event.data[0] !== 'set-sticky-contacts') return;

    var payload = event.data[2];
    var hasStringId = typeof payload === 'string';
    var hasCookiePayload = payload && typeof payload === 'object';
    if (!hasStringId && !hasCookiePayload) return;

    var iframes = document.querySelectorAll('.c-form iframe[data-form-id="' + next[0] + '"]');
    var matched = false;
    for (var i = 0; i < iframes.length; i++) {
      if (event.source === iframes[i].contentWindow && (!hasStringId || payload === iframes[i].id)) {
        matched = true;
        break;
      }
    }
    if (!matched) return;
    location.assign(next[1]);
  });
})();
