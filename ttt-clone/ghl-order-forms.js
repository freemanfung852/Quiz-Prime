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
 * Pages carry two .c-order containers (desktop + mobile responsive variants);
 * only one is ever visible, so filling both is correct.
 */
(function () {
  var FORMS = {
    // path            : [ formId,                 form name / price ]
    'tmb-offers-checkout':      ['PTGQ0phzSrsJA6qIzFRp', 'Travel Mastery Blueprint'],                        // AU$999
    'tmb-offers-checkout-form': ['caydLPbksd9jzuGsY8JR', 'The Travel Mastery Blueprint Offer'],              // AU$111
    'checkout-accelerator':     ['5UVMPd6C2qJ0qWbWfbE1', 'TMB + 1:1 Coaching Session'],                      // AU$2,999
    'checkout-accelerator-page':['qZLT2BcLPxW7P7Ei8yvg', 'TMB + 1:1 Coaching Offer']                         // AU$1,333
  };

  var key = location.pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
  var entry = FORMS[key];
  if (!entry) return;

  var formId = entry[0], formName = entry[1];
  var scriptLoaded = false;

  function iframeHtml() {
    return '<iframe src="https://connect.unwiz.ai/widget/form/' + formId + '"' +
      ' style="width:100%;min-height:1232px;border:none;border-radius:8px"' +
      ' id="inline-' + formId + '"' +
      ' data-layout="{\'id\':\'INLINE\'}"' +
      ' data-trigger-type="alwaysShow" data-trigger-value=""' +
      ' data-activation-type="alwaysActivated" data-activation-value=""' +
      ' data-deactivation-type="neverDeactivate" data-deactivation-value=""' +
      ' data-form-name="' + formName + '"' +
      ' data-height="1232"' +
      ' data-layout-iframe-id="inline-' + formId + '"' +
      ' data-form-id="' + formId + '"' +
      ' title="' + formName + '"></iframe>';
  }

  function swap() {
    var boxes = document.querySelectorAll('.c-order');
    if (!boxes.length) return;
    var changed = false;
    for (var i = 0; i < boxes.length; i++) {
      var el = boxes[i];
      if (el.querySelector('#inline-' + formId)) continue;
      el.innerHTML = iframeHtml();
      el.setAttribute('data-ttt-form', formId);
      changed = true;
    }
    if (changed && !scriptLoaded) {
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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
