/* Travel to Transform clone — order form embeds.
 *
 * The checkout pages are a Nuxt/Vue app: the legacy GHL order widget is
 * re-rendered on hydration, so a static HTML edit gets wiped. This swaps each
 * page's `.c-order` container(s) for its GHL form iframe after hydration and
 * re-applies if the app re-renders.
 *
 * Forms live on connect.unwiz.ai (the whitelabel domain on Freeman's GHL,
 * location pIQnJdASBmjOuDSHEr5v). Form IDs are from the GHL forms API and match
 * the products/prices in the GHL products API.
 *
 * Pages can carry desktop + mobile responsive variants. Only the visible copy
 * is loaded, preventing duplicate payment iframes and duplicate element ids.
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

(function () {
  var FORMS = {
    // path            : [ formId,                 form name / price ]
    'tmb-offers-checkout':      ['PTGQ0phzSrsJA6qIzFRp', 'Travel Mastery Blueprint'],                        // AU$999
    'tmb-offers-checkout-form': ['caydLPbksd9jzuGsY8JR', 'The Travel Mastery Blueprint Offer (discounted from $999)'], // AU$111
    'checkout-accelerator':     ['5UVMPd6C2qJ0qWbWfbE1', 'TMB + 1:1 Coaching Session'],                      // AU$2,999
    'checkout-accelerator-page':['qZLT2BcLPxW7P7Ei8yvg', 'TMB + 1:1 Coaching Offer (discounted from $2,999)'] // AU$1,333
  };

  var key = location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
  var entry = FORMS[key];
  if (!entry) return;

  var formId = entry[0], formName = entry[1];
  var scriptLoaded = false;

  function isVisible(el) {
    var style = window.getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    return style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0;
  }

  function iframeIdFor(container) {
    var suffix = (container.id || 'order').replace(/[^A-Za-z0-9_-]/g, '-');
    return 'inline-' + formId + '-' + suffix;
  }

  function iframeHtml(iframeId) {
    return '<iframe src="https://connect.unwiz.ai/widget/form/' + formId + '"' +
      ' style="width:100%;min-height:1232px;border:none;border-radius:8px"' +
      ' id="' + iframeId + '"' +
      ' data-layout="{\'id\':\'INLINE\'}"' +
      ' data-trigger-type="alwaysShow" data-trigger-value=""' +
      ' data-activation-type="alwaysActivated" data-activation-value=""' +
      ' data-deactivation-type="neverDeactivate" data-deactivation-value=""' +
      ' data-form-name="' + formName + '"' +
      ' data-height="1232"' +
      ' data-layout-iframe-id="' + iframeId + '"' +
      ' data-form-id="' + formId + '"' +
      ' title="' + formName + '"></iframe>';
  }

  function swap() {
    var boxes = document.querySelectorAll('.c-order');
    if (!boxes.length) return;

    var visibleBox = null;
    for (var i = 0; i < boxes.length; i++) {
      if (isVisible(boxes[i])) { visibleBox = boxes[i]; break; }
    }
    if (!visibleBox) return;

    var selector = 'iframe[data-form-id="' + formId + '"]';
    var active = document.querySelector('.c-order ' + selector);
    var created = false;

    if (active) {
      // Move the same live payment form across responsive containers so a
      // breakpoint change preserves entered state and never leaves two active.
      if (active.parentNode !== visibleBox) {
        visibleBox.innerHTML = '';
        visibleBox.appendChild(active);
      }
    } else {
      visibleBox.innerHTML = iframeHtml(iframeIdFor(visibleBox));
      active = visibleBox.querySelector(selector);
      created = true;
    }
    visibleBox.setAttribute('data-ttt-form', formId);

    for (var j = 0; j < boxes.length; j++) {
      var box = boxes[j];
      if (box === visibleBox) {
        // Remove any legacy payment iframe appended beside the live form.
        var stale = box.querySelectorAll('iframe:not([data-form-id])');
        for (var k = 0; k < stale.length; k++) stale[k].remove();
      } else if (box.childNodes.length) {
        box.innerHTML = '';
        box.setAttribute('data-ttt-hidden-order-cleared', 'true');
      }
    }

    if (created && !scriptLoaded) {
      scriptLoaded = true;
      var sc = document.createElement('script');
      sc.src = 'https://connect.unwiz.ai/js/form_embed.js';
      document.body.appendChild(sc);
    }
  }

  function start() {
    swap();
    new MutationObserver(swap).observe(document.documentElement, { childList: true, subtree: true });
    setInterval(swap, 1500);
    window.addEventListener('resize', swap);
  }

  function scheduleStart() { setTimeout(start, 1000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleStart, { once: true });
  else scheduleStart();
})();
