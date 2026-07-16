/* Travel to Transform clone — live GHL form embeds.
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
(function () {
  var HOST = 'https://connect.unwiz.ai';   // whitelabel form domain on Freeman's GHL
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
    container.innerHTML =
      '<iframe src="' + HOST + '/widget/form/' + formId + '"' +
      ' style="width:100%;min-height:' + h + 'px;border:none;border-radius:8px"' +
      ' id="inline-' + formId + '"' +
      ' data-layout="{\'id\':\'INLINE\'}"' +
      ' data-trigger-type="alwaysShow" data-trigger-value=""' +
      ' data-activation-type="alwaysActivated" data-activation-value=""' +
      ' data-deactivation-type="neverDeactivate" data-deactivation-value=""' +
      ' data-form-name="' + name + '"' +
      ' data-height="' + h + '"' +
      ' data-layout-iframe-id="inline-' + formId + '"' +
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
      if (done && c.querySelector('#inline-' + done)) continue;
      var fid = formIdOf(c);
      if (!fid) continue;             // not hydrated yet; try again next tick
      embed(c, fid, c.getBoundingClientRect().height);
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
