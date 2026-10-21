/*
 * GPS Gifting Program Selector: embed loader for gpspromotions.com.
 *
 *   <div data-gps-selector></div>
 *   <script src="https://gifting-selector.gpspromotions.com/embed/embed.js" async></script>
 *
 * Each [data-gps-selector] element gets a frame of /embed/ that sizes itself to
 * the page inside it. The frame gates the result behind GPS's HubSpot form; once
 * it is submitted, the element fires a "gps-selector:result" DOM event (bubbles)
 * whose detail is { sessionId, result, score }, for analytics or a conversion tag.
 */
(function () {
  'use strict';
  var script = document.currentScript;
  var base = script ? new URL('./', script.src).href : 'https://gifting-selector.gpspromotions.com/embed/';
  var origin = new URL(base).origin;
  var frames = [];

  function mount(el) {
    if (el.getAttribute('data-gps-selector-mounted')) return;
    el.setAttribute('data-gps-selector-mounted', '1');
    var f = document.createElement('iframe');
    f.src = base;
    f.title = el.getAttribute('data-title') || 'GPS Gifting Program Selector';
    f.setAttribute('scrolling', 'no');
    f.style.cssText = 'display:block;width:100%;border:0;min-height:' + (el.getAttribute('data-min-height') || '640') + 'px;';
    el.appendChild(f);
    frames.push({ el: el, frame: f });
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== origin || !e.data || typeof e.data.type !== 'string') return;
    var hit = null;
    frames.forEach(function (x) { if (x.frame.contentWindow === e.source) hit = x; });
    if (!hit) return;
    var d = e.data;
    if (d.type === 'gps-selector:height' && d.height > 0) {
      hit.frame.style.height = d.height + 'px';
    } else if (d.type === 'gps-selector:step') {
      // New screen: bring the top of the frame back into view if it scrolled away.
      var top = hit.frame.getBoundingClientRect().top;
      if (top < 0) window.scrollBy({ top: top - 16, behavior: 'smooth' });
    } else if (d.type === 'gps-selector:result') {
      var detail = { sessionId: d.sessionId, result: d.result, score: d.score };
      hit.el.dispatchEvent(new CustomEvent('gps-selector:result', { bubbles: true, detail: detail }));
    }
  });

  function init() { document.querySelectorAll('[data-gps-selector]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.GPSSelector = { mount: mount };
})();
