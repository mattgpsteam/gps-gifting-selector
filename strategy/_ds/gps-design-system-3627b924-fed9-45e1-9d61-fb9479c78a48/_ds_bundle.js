/* @ds-bundle: {"format":3,"namespace":"GPSDesignSystem_3627b9","components":[],"sourceHashes":{"slides/deck-stage.js":"ad1c016a6256","ui_kits/ezgift/components.jsx":"d6217195b52b","ui_kits/gps-marketing/components.jsx":"2d5766c05a5e"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.GPSDesignSystem_3627b9 = window.GPSDesignSystem_3627b9 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// slides/deck-stage.js
try { (() => {
/**
 * <deck-stage> — reusable web component for HTML decks.
 *
 * Handles:
 *  (a) speaker notes — reads <script type="application/json" id="speaker-notes">
 *      and posts {slideIndexChanged: N} to the parent window on nav.
 *  (b) keyboard navigation — ←/→, PgUp/PgDn, Space, Home/End, number keys.
 *  (c) press R to reset to slide 0 (with a tasteful keyboard hint).
 *  (d) bottom-center overlay showing slide count + hints, fades out on idle.
 *  (e) auto-scaling — inner canvas is a fixed design size (default 1920×1080)
 *      scaled with `transform: scale()` to fit the viewport, letterboxed.
 *      Set the `noscale` attribute to render at authored size (1:1) — the
 *      PPTX exporter sets this so its DOM capture sees unscaled geometry.
 *  (f) print — `@media print` lays every slide out as its own page at the
 *      design size, so the browser's Print → Save as PDF produces a clean
 *      one-page-per-slide PDF with no extra setup.
 *
 * Slides are HIDDEN, not unmounted. Non-active slides stay in the DOM with
 * `visibility: hidden` + `opacity: 0`, so their state (videos, iframes,
 * form inputs, React trees) is preserved across navigation.
 *
 * Lifecycle event — the component dispatches a `slidechange` CustomEvent on
 * itself whenever the active slide changes (including the initial mount).
 * The event bubbles and composes out of shadow DOM, so you can listen on
 * the <deck-stage> element or on document:
 *
 *   document.querySelector('deck-stage').addEventListener('slidechange', (e) => {
 *     e.detail.index         // new 0-based index
 *     e.detail.previousIndex // previous index, or -1 on init
 *     e.detail.total         // total slide count
 *     e.detail.slide         // the new active slide element
 *     e.detail.previousSlide // the prior slide element, or null on init
 *     e.detail.reason        // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
 *   });
 *
 * Persistence: none at the deck level. The host app keeps the current slide
 * in its own URL (?slide=) and re-delivers it via location.hash on load, so a
 * bare load with no hash always starts at slide 1.
 *
 * Usage:
 *   <deck-stage width="1920" height="1080">
 *     <section data-label="Title">...</section>
 *     <section data-label="Agenda">...</section>
 *   </deck-stage>
 *
 * Slides are the direct element children of <deck-stage>. Each slide is
 * automatically tagged with:
 *   - data-screen-label="NN Label"   (1-indexed, for comment flow)
 *   - data-om-validate="no_overflowing_text,no_overlapping_text,slide_sized_text"
 */

(() => {
  const DESIGN_W_DEFAULT = 1920;
  const DESIGN_H_DEFAULT = 1080;
  const OVERLAY_HIDE_MS = 1800;
  const VALIDATE_ATTR = 'no_overflowing_text,no_overlapping_text,slide_sized_text';
  const pad2 = n => String(n).padStart(2, '0');
  const stylesheet = `
    :host {
      position: fixed;
      inset: 0;
      display: block;
      background: #000;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
      overflow: hidden;
    }

    .stage {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .canvas {
      position: relative;
      transform-origin: center center;
      flex-shrink: 0;
      background: #fff;
      will-change: transform;
    }

    /* Slides live in light DOM (via <slot>) so authored CSS still applies.
       We absolutely position each slotted child to stack them. */
    ::slotted(*) {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      box-sizing: border-box !important;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      visibility: hidden;
    }
    ::slotted([data-deck-active]) {
      opacity: 1;
      pointer-events: auto;
      visibility: visible;
    }

    /* Tap zones for mobile — back/forward thirds like Stories.
       Transparent, no visible UI, don't block the overlay. */
    .tapzones {
      position: fixed;
      inset: 0;
      display: flex;
      z-index: 2147482000;
      pointer-events: none;
    }
    .tapzone {
      flex: 1;
      pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    }
    /* Only activate tap zones on coarse pointers (touch devices). */
    @media (hover: hover) and (pointer: fine) {
      .tapzones { display: none; }
    }

    .overlay {
      position: fixed;
      left: 50%;
      bottom: 22px;
      transform: translate(-50%, 6px) scale(0.92);
      filter: blur(6px);
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      background: #000;
      color: #fff;
      border-radius: 999px;
      font-size: 12px;
      font-feature-settings: "tnum" 1;
      letter-spacing: 0.01em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 260ms ease, transform 260ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
      transform-origin: center bottom;
      z-index: 2147483000;
      user-select: none;
    }
    .overlay[data-visible] {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
      filter: blur(0);
    }

    .btn {
      appearance: none;
      -webkit-appearance: none;
      background: transparent;
      border: 0;
      margin: 0;
      padding: 0;
      color: inherit;
      font: inherit;
      cursor: default;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 28px;
      min-width: 28px;
      border-radius: 999px;
      color: rgba(255,255,255,0.72);
      transition: background 140ms ease, color 140ms ease;
      -webkit-tap-highlight-color: transparent;
    }
    .btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .btn:active { background: rgba(255,255,255,0.18); }
    .btn:focus { outline: none; }
    .btn:focus-visible { outline: none; }
    .btn::-moz-focus-inner { border: 0; }
    .btn svg { width: 14px; height: 14px; display: block; }
    .btn.reset {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.02em;
      padding: 0 10px 0 12px;
      gap: 6px;
      color: rgba(255,255,255,0.72);
    }
    .btn.reset .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 10px;
      line-height: 1;
      color: rgba(255,255,255,0.88);
      background: rgba(255,255,255,0.12);
      border-radius: 4px;
    }

    .count {
      font-variant-numeric: tabular-nums;
      color: #fff;
      font-weight: 500;
      padding: 0 8px;
      min-width: 42px;
      text-align: center;
      font-size: 12px;
    }
    .count .sep { color: rgba(255,255,255,0.45); margin: 0 3px; font-weight: 400; }
    .count .total { color: rgba(255,255,255,0.55); }

    .divider {
      width: 1px;
      height: 14px;
      background: rgba(255,255,255,0.18);
      margin: 0 2px;
    }

    /* ── Print: one page per slide, no chrome ────────────────────────────
       The screen layout stacks every slide at inset:0 inside a scaled
       canvas; for print we want them in document flow at the authored
       design size so the browser paginates one slide per sheet. The
       @page size is set from the width/height attributes via the inline
       <style id="deck-stage-print-page"> that connectedCallback injects
       into <head> (the @page at-rule has no effect inside shadow DOM). */
    @media print {
      :host {
        position: static;
        inset: auto;
        background: none;
        overflow: visible;
        color: inherit;
      }
      .stage { position: static; display: block; }
      .canvas {
        transform: none !important;
        width: auto !important;
        height: auto !important;
        background: none;
        will-change: auto;
      }
      ::slotted(*) {
        position: relative !important;
        inset: auto !important;
        width: var(--deck-design-w) !important;
        height: var(--deck-design-h) !important;
        box-sizing: border-box !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
        overflow: hidden;
      }
      ::slotted(*:last-child) {
        break-after: auto;
        page-break-after: auto;
      }
      .overlay, .tapzones { display: none !important; }
    }
  `;
  class DeckStage extends HTMLElement {
    static get observedAttributes() {
      return ['width', 'height', 'noscale'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._index = 0;
      this._slides = [];
      this._notes = [];
      this._hideTimer = null;
      this._mouseIdleTimer = null;
      this._onKey = this._onKey.bind(this);
      this._onResize = this._onResize.bind(this);
      this._onSlotChange = this._onSlotChange.bind(this);
      this._onMouseMove = this._onMouseMove.bind(this);
      this._onTapBack = this._onTapBack.bind(this);
      this._onTapForward = this._onTapForward.bind(this);
    }
    get designWidth() {
      return parseInt(this.getAttribute('width'), 10) || DESIGN_W_DEFAULT;
    }
    get designHeight() {
      return parseInt(this.getAttribute('height'), 10) || DESIGN_H_DEFAULT;
    }
    connectedCallback() {
      this._render();
      this._loadNotes();
      this._syncPrintPageRule();
      window.addEventListener('keydown', this._onKey);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('mousemove', this._onMouseMove, {
        passive: true
      });
      // Initial collection + layout happens via slotchange, which fires on mount.
    }
    disconnectedCallback() {
      window.removeEventListener('keydown', this._onKey);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('mousemove', this._onMouseMove);
      if (this._hideTimer) clearTimeout(this._hideTimer);
      if (this._mouseIdleTimer) clearTimeout(this._mouseIdleTimer);
    }
    attributeChangedCallback() {
      if (this._canvas) {
        this._canvas.style.width = this.designWidth + 'px';
        this._canvas.style.height = this.designHeight + 'px';
        this._canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
        this._canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
        this._fit();
        this._syncPrintPageRule();
      }
    }
    _render() {
      const style = document.createElement('style');
      style.textContent = stylesheet;
      const stage = document.createElement('div');
      stage.className = 'stage';
      const canvas = document.createElement('div');
      canvas.className = 'canvas';
      canvas.style.width = this.designWidth + 'px';
      canvas.style.height = this.designHeight + 'px';
      canvas.style.setProperty('--deck-design-w', this.designWidth + 'px');
      canvas.style.setProperty('--deck-design-h', this.designHeight + 'px');
      const slot = document.createElement('slot');
      slot.addEventListener('slotchange', this._onSlotChange);
      canvas.appendChild(slot);
      stage.appendChild(canvas);

      // Tap zones (mobile): left third = back, right third = forward.
      const tapzones = document.createElement('div');
      tapzones.className = 'tapzones export-hidden';
      tapzones.setAttribute('aria-hidden', 'true');
      tapzones.setAttribute('data-noncommentable', '');
      const tzBack = document.createElement('div');
      tzBack.className = 'tapzone tapzone--back';
      const tzMid = document.createElement('div');
      tzMid.className = 'tapzone tapzone--mid';
      tzMid.style.pointerEvents = 'none';
      const tzFwd = document.createElement('div');
      tzFwd.className = 'tapzone tapzone--fwd';
      tzBack.addEventListener('click', this._onTapBack);
      tzFwd.addEventListener('click', this._onTapForward);
      tapzones.append(tzBack, tzMid, tzFwd);

      // Overlay: compact, solid black, with clickable controls.
      const overlay = document.createElement('div');
      overlay.className = 'overlay export-hidden';
      overlay.setAttribute('role', 'toolbar');
      overlay.setAttribute('aria-label', 'Deck controls');
      overlay.setAttribute('data-noncommentable', '');
      overlay.innerHTML = `
        <button class="btn prev" type="button" aria-label="Previous slide" title="Previous (←)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>
        </button>
        <span class="count" aria-live="polite"><span class="current">1</span><span class="sep">/</span><span class="total">1</span></span>
        <button class="btn next" type="button" aria-label="Next slide" title="Next (→)">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>
        </button>
        <span class="divider"></span>
        <button class="btn reset" type="button" aria-label="Reset to first slide" title="Reset (R)">Reset<span class="kbd">R</span></button>
      `;
      overlay.querySelector('.prev').addEventListener('click', () => this._go(this._index - 1, 'click'));
      overlay.querySelector('.next').addEventListener('click', () => this._go(this._index + 1, 'click'));
      overlay.querySelector('.reset').addEventListener('click', () => this._go(0, 'click'));
      this._root.append(style, stage, tapzones, overlay);
      this._canvas = canvas;
      this._slot = slot;
      this._overlay = overlay;
      this._countEl = overlay.querySelector('.current');
      this._totalEl = overlay.querySelector('.total');
    }

    /** @page must live in the document stylesheet — it's a no-op inside
     *  shadow DOM. Inject/update a single <head> style tag so the print
     *  sheet matches the design size and Save-as-PDF yields one slide per
     *  page with no margins. */
    _syncPrintPageRule() {
      const id = 'deck-stage-print-page';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        document.head.appendChild(tag);
      }
      tag.textContent = '@page { size: ' + this.designWidth + 'px ' + this.designHeight + 'px; margin: 0; } ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; overflow: visible !important; height: auto !important; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }';
    }
    _onSlotChange() {
      this._collectSlides();
      this._restoreIndex();
      this._applyIndex({
        showOverlay: false,
        broadcast: true,
        reason: 'init'
      });
      this._fit();
    }
    _collectSlides() {
      const assigned = this._slot.assignedElements({
        flatten: true
      });
      this._slides = assigned.filter(el => {
        // Skip template/style/script nodes even if someone slots them.
        const tag = el.tagName;
        return tag !== 'TEMPLATE' && tag !== 'SCRIPT' && tag !== 'STYLE';
      });
      this._slides.forEach((slide, i) => {
        const n = i + 1;
        // Determine a label for comment flow: prefer explicit data-label,
        // then an existing data-screen-label, then first heading, else "Slide".
        let label = slide.getAttribute('data-label');
        if (!label) {
          const existing = slide.getAttribute('data-screen-label');
          if (existing) {
            // Strip any leading number the author may have included.
            label = existing.replace(/^\s*\d+\s*/, '').trim() || existing;
          }
        }
        if (!label) {
          const h = slide.querySelector('h1, h2, h3, [data-title]');
          if (h) label = (h.textContent || '').trim().slice(0, 40);
        }
        if (!label) label = 'Slide';
        slide.setAttribute('data-screen-label', `${pad2(n)} ${label}`);

        // Validation attribute for comment flow / auto-checks.
        if (!slide.hasAttribute('data-om-validate')) {
          slide.setAttribute('data-om-validate', VALIDATE_ATTR);
        }
        slide.setAttribute('data-deck-slide', String(i));
      });
      if (this._totalEl) this._totalEl.textContent = String(this._slides.length || 1);
      if (this._index >= this._slides.length) this._index = Math.max(0, this._slides.length - 1);
    }
    _loadNotes() {
      const tag = document.getElementById('speaker-notes');
      if (!tag) {
        this._notes = [];
        return;
      }
      try {
        const parsed = JSON.parse(tag.textContent || '[]');
        if (Array.isArray(parsed)) this._notes = parsed;
      } catch (e) {
        console.warn('[deck-stage] Failed to parse #speaker-notes JSON:', e);
        this._notes = [];
      }
    }
    _restoreIndex() {
      // The host's ?slide= param is delivered as a #<int> hash (1-indexed) on
      // the iframe src. No hash → slide 1; the deck itself keeps no position
      // state across loads.
      const h = (location.hash || '').match(/^#(\d+)$/);
      if (h) {
        const n = parseInt(h[1], 10) - 1;
        if (n >= 0 && n < this._slides.length) this._index = n;
      }
    }
    _applyIndex({
      showOverlay = true,
      broadcast = true,
      reason = 'init'
    } = {}) {
      if (!this._slides.length) return;
      const prev = this._prevIndex == null ? -1 : this._prevIndex;
      const curr = this._index;
      // Keep the iframe's own hash in sync so an in-iframe location.reload()
      // (reload banner path in viewer-handle.ts) lands on the current slide,
      // not the stale deep-link hash from initial load.
      try {
        history.replaceState(null, '', '#' + (curr + 1));
      } catch (e) {}
      this._slides.forEach((s, i) => {
        if (i === curr) s.setAttribute('data-deck-active', '');else s.removeAttribute('data-deck-active');
      });
      if (this._countEl) this._countEl.textContent = String(curr + 1);
      if (broadcast) {
        // (1) Legacy: host-window postMessage for speaker-notes renderers.
        try {
          window.postMessage({
            slideIndexChanged: curr
          }, '*');
        } catch (e) {}

        // (2) In-page CustomEvent on the <deck-stage> element itself.
        //     Bubbles and composes out of shadow DOM so slide code can listen:
        //       document.querySelector('deck-stage').addEventListener('slidechange', e => {
        //         e.detail.index, e.detail.previousIndex, e.detail.total, e.detail.slide, e.detail.reason
        //       });
        const detail = {
          index: curr,
          previousIndex: prev,
          total: this._slides.length,
          slide: this._slides[curr] || null,
          previousSlide: prev >= 0 ? this._slides[prev] || null : null,
          reason: reason // 'init' | 'keyboard' | 'click' | 'tap' | 'api'
        };
        this.dispatchEvent(new CustomEvent('slidechange', {
          detail,
          bubbles: true,
          composed: true
        }));
      }
      this._prevIndex = curr;
      if (showOverlay) this._flashOverlay();
    }
    _flashOverlay() {
      if (!this._overlay) return;
      this._overlay.setAttribute('data-visible', '');
      if (this._hideTimer) clearTimeout(this._hideTimer);
      this._hideTimer = setTimeout(() => {
        this._overlay.removeAttribute('data-visible');
      }, OVERLAY_HIDE_MS);
    }
    _fit() {
      if (!this._canvas) return;
      // PPTX export sets noscale so the DOM capture sees authored-size
      // geometry — the scaled canvas is in shadow DOM, so the exporter's
      // resetTransformSelector can't reach .canvas.style.transform directly.
      if (this.hasAttribute('noscale')) {
        this._canvas.style.transform = 'none';
        return;
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / this.designWidth, vh / this.designHeight);
      this._canvas.style.transform = `scale(${s})`;
    }
    _onResize() {
      this._fit();
    }
    _onMouseMove() {
      // Keep overlay visible while mouse moves; hide after idle.
      this._flashOverlay();
    }
    _onTapBack(e) {
      e.preventDefault();
      this._go(this._index - 1, 'tap');
    }
    _onTapForward(e) {
      e.preventDefault();
      this._go(this._index + 1, 'tap');
    }
    _onKey(e) {
      // Ignore when the user is typing.
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key;
      let handled = true;
      if (key === 'ArrowRight' || key === 'PageDown' || key === ' ' || key === 'Spacebar') {
        this._go(this._index + 1, 'keyboard');
      } else if (key === 'ArrowLeft' || key === 'PageUp') {
        this._go(this._index - 1, 'keyboard');
      } else if (key === 'Home') {
        this._go(0, 'keyboard');
      } else if (key === 'End') {
        this._go(this._slides.length - 1, 'keyboard');
      } else if (key === 'r' || key === 'R') {
        this._go(0, 'keyboard');
      } else if (/^[0-9]$/.test(key)) {
        // 1..9 jump to that slide; 0 jumps to 10.
        const n = key === '0' ? 9 : parseInt(key, 10) - 1;
        if (n < this._slides.length) this._go(n, 'keyboard');
      } else {
        handled = false;
      }
      if (handled) {
        e.preventDefault();
        this._flashOverlay();
      }
    }
    _go(i, reason = 'api') {
      if (!this._slides.length) return;
      const clamped = Math.max(0, Math.min(this._slides.length - 1, i));
      if (clamped === this._index) {
        this._flashOverlay();
        return;
      }
      this._index = clamped;
      this._applyIndex({
        showOverlay: true,
        broadcast: true,
        reason
      });
    }

    // Public API ------------------------------------------------------------

    /** Current slide index (0-based). */
    get index() {
      return this._index;
    }
    /** Total slide count. */
    get length() {
      return this._slides.length;
    }
    /** Programmatically navigate. */
    goTo(i) {
      this._go(i, 'api');
    }
    next() {
      this._go(this._index + 1, 'api');
    }
    prev() {
      this._go(this._index - 1, 'api');
    }
    reset() {
      this._go(0, 'api');
    }
  }
  if (!customElements.get('deck-stage')) {
    customElements.define('deck-stage', DeckStage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "slides/deck-stage.js", error: String((e && e.message) || e) }); }

// ui_kits/ezgift/components.jsx
try { (() => {
/* global React */
const {
  useState,
  useMemo
} = React;

/* Placeholder product tile — gradient block + label (no made-up product photos). */
function ProductThumb({
  hue = 270,
  label
}) {
  const bg = `linear-gradient(135deg, hsl(${hue}, 40%, 82%) 0%, hsl(${hue}, 35%, 60%) 100%)`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: "4/3",
      background: bg,
      borderRadius: 12,
      display: "grid",
      placeItems: "center",
      color: "#fff",
      font: "700 13px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      opacity: 0.92
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.8
    }
  }, label));
}
const GIFTS = [{
  id: 1,
  name: "Apple AirPods Pro",
  cat: "Electronics",
  pts: 24000,
  hue: 220,
  tag: "Apparel & Tech"
}, {
  id: 2,
  name: "Ninja Air Fryer",
  cat: "Home",
  pts: 16000,
  hue: 10,
  tag: "Home & Kitchen"
}, {
  id: 3,
  name: "Weekend Napa getaway",
  cat: "Experiences",
  pts: 180000,
  hue: 340,
  tag: "Travel experience"
}, {
  id: 4,
  name: "YETI Tundra 45 cooler",
  cat: "Outdoor",
  pts: 32000,
  hue: 200,
  tag: "Outdoor gear"
}, {
  id: 5,
  name: "Casino-branded polo",
  cat: "Apparel",
  pts: 6500,
  hue: 270,
  tag: "Property apparel"
}, {
  id: 6,
  name: "Dyson V12 vacuum",
  cat: "Home",
  pts: 45000,
  hue: 160,
  tag: "Home & Kitchen"
}, {
  id: 7,
  name: "Louis Vuitton duffle",
  cat: "VIP",
  pts: 380000,
  hue: 30,
  tag: "VIP exclusive"
}, {
  id: 8,
  name: "Traeger Pro pellet grill",
  cat: "Outdoor",
  pts: 64000,
  hue: 15,
  tag: "Outdoor gear"
}, {
  id: 9,
  name: "Breville espresso",
  cat: "Home",
  pts: 54000,
  hue: 200,
  tag: "Home & Kitchen"
}];
function TopBar({
  points,
  onCart,
  cartCount
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      background: "#fff",
      borderBottom: "1px solid #ece1f7",
      padding: "18px 32px",
      display: "flex",
      alignItems: "center",
      gap: 24,
      position: "sticky",
      top: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/ezGIFT-wordmark-tagline-purple.svg",
    style: {
      height: 42
    },
    alt: "ezGIFT"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#76737f",
      fontWeight: 500,
      letterSpacing: "0.08em",
      textTransform: "uppercase"
    }
  }, "River Bend Rewards"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "linear-gradient(135deg,#582c83,#44216a)",
      color: "#fff",
      padding: "10px 18px",
      borderRadius: 999,
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 10px/1 var(--font-sans)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#bda3e2"
    }
  }, "Balance"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 18px/1 var(--font-condensed)"
    }
  }, points.toLocaleString()), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 11px/1 var(--font-sans)",
      color: "#bda3e2"
    }
  }, "pts")), /*#__PURE__*/React.createElement("button", {
    onClick: onCart,
    style: {
      background: "#fff",
      border: "1.5px solid #582c83",
      color: "#582c83",
      font: "600 13px/1 var(--font-sans)",
      padding: "10px 16px",
      borderRadius: 8,
      cursor: "pointer",
      position: "relative"
    }
  }, "Cart \xB7 ", cartCount), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 999,
      background: "#ece1f7",
      color: "#582c83",
      display: "grid",
      placeItems: "center",
      font: "700 13px/1 var(--font-sans)"
    }
  }, "JD")));
}
function Filters({
  active,
  onSel
}) {
  const cats = ["All", "Experiences", "Electronics", "Home", "Outdoor", "Apparel", "VIP"];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      padding: "24px 32px 0",
      flexWrap: "wrap"
    }
  }, cats.map(c => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => onSel(c),
    style: {
      font: "600 13px/1 var(--font-sans)",
      padding: "9px 16px",
      borderRadius: 999,
      border: active === c ? "0" : "1px solid #d1cfd8",
      background: active === c ? "#582c83" : "#fff",
      color: active === c ? "#fff" : "#4a4752",
      cursor: "pointer"
    }
  }, c)));
}
function GiftCard({
  gift,
  onPick,
  canAfford
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: () => onPick(gift),
    style: {
      background: "#fff",
      borderRadius: 14,
      border: "1px solid #e7e6eb",
      overflow: "hidden",
      cursor: "pointer",
      transition: "all .2s"
    },
    onMouseEnter: e => e.currentTarget.style.boxShadow = "0 10px 24px rgba(31,15,49,0.10)",
    onMouseLeave: e => e.currentTarget.style.boxShadow = "none"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      paddingBottom: 0
    }
  }, /*#__PURE__*/React.createElement(ProductThumb, {
    hue: gift.hue,
    label: gift.tag
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 10px/1 var(--font-sans)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#76737f",
      marginBottom: 6
    }
  }, gift.cat), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 15px/1.3 var(--font-sans)",
      color: "#1a1022",
      marginBottom: 10,
      minHeight: 38
    }
  }, gift.name), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 22px/1 var(--font-condensed)",
      color: "#582c83"
    }
  }, gift.pts.toLocaleString()), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 11px/1 var(--font-sans)",
      color: "#76737f",
      marginLeft: 6
    }
  }, "pts")), !canAfford && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 10px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "#c47a0a",
      background: "#fbecd1",
      padding: "4px 8px",
      borderRadius: 4
    }
  }, "Earn more"))));
}
function DetailModal({
  gift,
  onClose,
  onAdd,
  balance
}) {
  if (!gift) return null;
  const afford = balance >= gift.pts;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(13,12,16,0.55)",
      display: "grid",
      placeItems: "center",
      zIndex: 50,
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "#fff",
      borderRadius: 16,
      width: 760,
      maxWidth: "100%",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement(ProductThumb, {
    hue: gift.hue,
    label: gift.tag
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "32px 28px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 10px/1 var(--font-sans)",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#582c83",
      marginBottom: 10
    }
  }, gift.cat), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "700 26px/1.2 var(--font-sans)",
      margin: "0 0 12px"
    }
  }, gift.name), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px/1.55 var(--font-sans)",
      color: "#4a4752",
      margin: "0 0 20px"
    }
  }, "Delivered directly to your preferred shipping address or available for property pickup. Redemption confirmation within 24 hours."), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px",
      background: "#faf8fd",
      borderRadius: 12,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 13px/1 var(--font-sans)",
      color: "#76737f"
    }
  }, "Cost"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 20px/1 var(--font-condensed)",
      color: "#582c83"
    }
  }, gift.pts.toLocaleString(), " pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 13px/1 var(--font-sans)",
      color: "#76737f"
    }
  }, "Your balance"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 14px/1 var(--font-sans)",
      color: afford ? "#1f5f3d" : "#82182a"
    }
  }, balance.toLocaleString(), " pts"))), /*#__PURE__*/React.createElement("button", {
    disabled: !afford,
    onClick: () => onAdd(gift),
    style: {
      width: "100%",
      padding: "14px",
      border: 0,
      borderRadius: 8,
      background: afford ? "#582c83" : "#d1cfd8",
      color: "#fff",
      font: "600 15px/1 var(--font-sans)",
      cursor: afford ? "pointer" : "not-allowed"
    }
  }, afford ? "ADD TO CART" : "NOT ENOUGH POINTS"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      width: "100%",
      marginTop: 8,
      padding: "10px",
      border: 0,
      background: "transparent",
      color: "#76737f",
      font: "500 13px/1 var(--font-sans)",
      cursor: "pointer"
    }
  }, "Close"))));
}
function CartDrawer({
  open,
  cart,
  balance,
  onClose,
  onCheckout,
  onRemove
}) {
  if (!open) return null;
  const total = cart.reduce((s, g) => s + g.pts, 0);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(13,12,16,0.45)",
      zIndex: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      width: 420,
      background: "#fff",
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "700 20px/1 var(--font-sans)",
      margin: 0
    }
  }, "Your cart"), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: 0,
      fontSize: 22,
      color: "#76737f",
      cursor: "pointer"
    }
  }, "\xD7")), cart.length === 0 ? /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "grid",
      placeItems: "center",
      color: "#76737f",
      font: "400 14px/1.5 var(--font-sans)",
      textAlign: "center",
      padding: 20
    }
  }, "Nothing here yet \u2014 add a gift from the store to get started.") : /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto"
    }
  }, cart.map((g, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 12,
      padding: "12px 0",
      borderBottom: "1px solid #f4f4f6"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 8,
      background: `hsl(${g.hue}, 40%, 78%)`
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 13px/1.3 var(--font-sans)"
    }
  }, g.name), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 14px/1.2 var(--font-condensed)",
      color: "#582c83",
      marginTop: 4
    }
  }, g.pts.toLocaleString(), " pts")), /*#__PURE__*/React.createElement("button", {
    onClick: () => onRemove(i),
    style: {
      background: "none",
      border: 0,
      color: "#76737f",
      cursor: "pointer",
      font: "500 12px/1 var(--font-sans)"
    }
  }, "Remove")))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "18px 0",
      borderTop: "1px solid #e7e6eb",
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 13px/1 var(--font-sans)",
      color: "#76737f"
    }
  }, "Subtotal"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "700 18px/1 var(--font-condensed)",
      color: "#582c83"
    }
  }, total.toLocaleString(), " pts")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "500 13px/1 var(--font-sans)",
      color: "#76737f"
    }
  }, "Balance after"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: "600 13px/1 var(--font-sans)",
      color: balance - total >= 0 ? "#1f5f3d" : "#82182a"
    }
  }, (balance - total).toLocaleString(), " pts")), /*#__PURE__*/React.createElement("button", {
    disabled: cart.length === 0 || balance - total < 0,
    onClick: onCheckout,
    style: {
      width: "100%",
      padding: "14px",
      border: 0,
      borderRadius: 8,
      background: cart.length === 0 || balance - total < 0 ? "#d1cfd8" : "#582c83",
      color: "#fff",
      font: "700 15px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      cursor: cart.length === 0 ? "not-allowed" : "pointer",
      display: "inline-flex",
      gap: 10,
      alignItems: "center",
      justifyContent: "center"
    }
  }, "Redeem now ", /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 54.75 88.5",
    fill: "currentColor",
    style: {
      height: "0.82em",
      width: "0.5em",
      flex: "0 0 auto",
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M54.04,41.23L35.29,3.73c-1.67-3.33-5.72-4.68-9.06-3.02-3.33,1.67-4.69,5.72-3.02,9.06l17.24,34.48-17.24,34.48c-1.67,3.33-.32,7.39,3.02,9.06.97.48,2,.71,3.01.71,2.48,0,4.86-1.37,6.04-3.73l18.75-37.5c.95-1.9.95-4.14,0-6.04Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M31.54,41.23L12.79,3.73C11.12.4,7.06-.95,3.73.71.4,2.38-.95,6.43.71,9.77l17.24,34.48L.71,78.73c-1.67,3.33-.32,7.39,3.02,9.06.97.48,2,.71,3.01.71,2.48,0,4.86-1.37,6.04-3.73l18.75-37.5c.95-1.9.95-4.14,0-6.04Z"
  }))))));
}
function SuccessModal({
  open,
  onClose
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(13,12,16,0.6)",
      display: "grid",
      placeItems: "center",
      zIndex: 60
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "#fff",
      padding: 40,
      borderRadius: 16,
      width: 420,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: 999,
      background: "#e3f2ea",
      margin: "0 auto 20px",
      display: "grid",
      placeItems: "center"
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "36",
    height: "36",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#1f5f3d",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "700 24px/1.2 var(--font-sans)",
      margin: "0 0 10px"
    }
  }, "Redemption confirmed"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px/1.55 var(--font-sans)",
      color: "#4a4752",
      margin: "0 0 24px"
    }
  }, "Your gift is on its way. You'll receive a shipping confirmation at the email on file within 24 hours."), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      width: "100%",
      padding: "14px",
      border: 0,
      borderRadius: 8,
      background: "#582c83",
      color: "#fff",
      font: "700 15px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      cursor: "pointer"
    }
  }, "Back to store")));
}
function App() {
  const [points, setPoints] = useState(128500);
  const [filter, setFilter] = useState("All");
  const [detail, setDetail] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const filtered = useMemo(() => filter === "All" ? GIFTS : GIFTS.filter(g => g.cat === filter), [filter]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#faf8fd",
      minHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    points: points,
    onCart: () => setCartOpen(true),
    cartCount: cart.length
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "40px 32px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 11px/1 var(--font-sans)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#582c83",
      marginBottom: 12
    }
  }, "Rewards store"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "700 44px/1.05 var(--font-sans)",
      letterSpacing: "-0.02em",
      margin: "0 0 10px",
      color: "#1a1022"
    }
  }, "Redeem your points."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 16px/1.5 var(--font-sans)",
      color: "#4a4752",
      maxWidth: 560,
      margin: 0
    }
  }, "Anywhere, anytime \u2014 over 130,000 gifts curated for River Bend loyalty members.")), /*#__PURE__*/React.createElement(Filters, {
    active: filter,
    onSel: setFilter
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "20px 32px 64px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20
    }
  }, filtered.map(g => /*#__PURE__*/React.createElement(GiftCard, {
    key: g.id,
    gift: g,
    onPick: setDetail,
    canAfford: points >= g.pts
  })))), /*#__PURE__*/React.createElement(DetailModal, {
    gift: detail,
    balance: points,
    onClose: () => setDetail(null),
    onAdd: g => {
      setCart([...cart, g]);
      setDetail(null);
      setCartOpen(true);
    }
  }), /*#__PURE__*/React.createElement(CartDrawer, {
    open: cartOpen,
    cart: cart,
    balance: points,
    onClose: () => setCartOpen(false),
    onRemove: i => setCart(cart.filter((_, j) => j !== i)),
    onCheckout: () => {
      const total = cart.reduce((s, g) => s + g.pts, 0);
      setPoints(points - total);
      setCart([]);
      setCartOpen(false);
      setSuccess(true);
    }
  }), /*#__PURE__*/React.createElement(SuccessModal, {
    open: success,
    onClose: () => setSuccess(false)
  }));
}
Object.assign(window, {
  App
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/ezgift/components.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gps-marketing/components.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React */
const {
  useState
} = React;

/* ---------------- Icon set (Lucide-style inline SVG) ---------------- */
const Icon = {
  arrow: p => /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 54.75 88.5",
    fill: "currentColor",
    style: {
      height: "0.82em",
      width: "0.5em",
      flex: "0 0 auto",
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M54.04,41.23L35.29,3.73c-1.67-3.33-5.72-4.68-9.06-3.02-3.33,1.67-4.69,5.72-3.02,9.06l17.24,34.48-17.24,34.48c-1.67,3.33-.32,7.39,3.02,9.06.97.48,2,.71,3.01.71,2.48,0,4.86-1.37,6.04-3.73l18.75-37.5c.95-1.9.95-4.14,0-6.04Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M31.54,41.23L12.79,3.73C11.12.4,7.06-.95,3.73.71.4,2.38-.95,6.43.71,9.77l17.24,34.48L.71,78.73c-1.67,3.33-.32,7.39,3.02,9.06.97.48,2,.71,3.01.71,2.48,0,4.86-1.37,6.04-3.73l18.75-37.5c.95-1.9.95-4.14,0-6.04Z"
  })),
  check: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })),
  menu: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M3 6h18M3 12h18M3 18h18"
  })),
  pkg: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M16.5 9.4 7.55 4.24M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m3.3 7 8.7 5 8.7-5M12 22V12"
  })),
  users: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "7",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
  })),
  shield: p => /*#__PURE__*/React.createElement("svg", _extends({
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, p), /*#__PURE__*/React.createElement("path", {
    d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z"
  }))
};

/* ---------------- Nav ---------------- */
function TopNav({
  onCta
}) {
  const items = ["Solutions", "ezGIFT®", "Case Studies", "About", "Contact"];
  return /*#__PURE__*/React.createElement("nav", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      background: "#fff",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      padding: "18px 32px",
      display: "flex",
      alignItems: "center",
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/GPS-logo-tagline-purple.png",
    alt: "GPS",
    style: {
      height: 40
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      marginLeft: 24
    }
  }, items.map(x => /*#__PURE__*/React.createElement("a", {
    key: x,
    href: "#",
    style: {
      font: "500 14px/1 var(--font-sans)",
      color: "var(--fg-2)",
      letterSpacing: "0.02em",
      borderBottom: "none"
    }
  }, x))), /*#__PURE__*/React.createElement("button", {
    onClick: onCta,
    style: {
      marginLeft: "auto",
      font: "700 14px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "13px 20px",
      borderRadius: 8,
      border: 0,
      background: "#582c83",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap"
    }
  }, "Schedule a demo")));
}

/* ---------------- Hero ---------------- */
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "linear-gradient(150deg, #381d52 0%, #5c3089 50%, #3a1f56 100%)",
      color: "#fff",
      padding: "96px 32px 120px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 12px/1 var(--font-sans)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#bda3e2",
      marginBottom: 20
    }
  }, "Casino Gifting Solutions \xB7 since 2001"), /*#__PURE__*/React.createElement("h1", {
    style: {
      font: "700 72px/1.02 var(--font-sans)",
      letterSpacing: "-0.02em",
      maxWidth: 900,
      margin: "0 0 20px"
    }
  }, "Keep players", /*#__PURE__*/React.createElement("br", null), "coming back."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 20px/1.55 var(--font-sans)",
      maxWidth: 620,
      color: "#e3d6f4",
      margin: "0 0 36px"
    }
  }, "For 25 years, GPS has helped casinos and gaming operators do one thing exceptionally well \u2014 deliver tailored loyalty solutions that drive incremental revenue."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      font: "700 15px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "16px 26px",
      borderRadius: 8,
      border: 0,
      background: "#fff",
      color: "#582c83",
      cursor: "pointer",
      display: "inline-flex",
      gap: 9,
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap"
    }
  }, "Schedule a demo ", /*#__PURE__*/React.createElement(Icon.arrow, null)), /*#__PURE__*/React.createElement("button", {
    style: {
      font: "700 15px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "16px 26px",
      borderRadius: 8,
      border: "1.5px solid rgba(255,255,255,0.4)",
      background: "transparent",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap"
    }
  }, "Explore ezGIFT\xAE"))));
}

/* ---------------- Stat band ---------------- */
function StatBand() {
  const stats = [{
    n: "25",
    u: "yr",
    l: "Industry expertise"
  }, {
    n: "$200M+",
    u: "",
    l: "Marketing partner"
  }, {
    n: "100%",
    u: "",
    l: "On-time delivery"
  }, {
    n: "80%",
    u: "",
    l: "Redemption lift"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#faf8fd",
      padding: "56px 32px",
      borderBottom: "1px solid #ece1f7"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 24
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "4px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 56px/1 var(--font-condensed)",
      color: "#582c83",
      letterSpacing: "-0.01em"
    }
  }, s.n, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      opacity: .75
    }
  }, s.u)), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 12px/1 var(--font-sans)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#4a4752",
      marginTop: 10
    }
  }, s.l)))));
}

/* ---------------- Solutions Grid ---------------- */
function Solutions() {
  const items = [{
    icon: /*#__PURE__*/React.createElement(Icon.pkg, null),
    title: "ezGIFT®",
    body: "Custom-branded online gifting stores. Players redeem points; we ship direct to home or back to property."
  }, {
    icon: /*#__PURE__*/React.createElement(Icon.users, null),
    title: "VIP Gift Program",
    body: "Premium experiences for your top players — choice-based gifting that drives 85% higher redemption."
  }, {
    icon: /*#__PURE__*/React.createElement(Icon.shield, null),
    title: "Tier Reward",
    body: "End-of-year reward programs that move players up a tier and deepen share of wallet."
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      padding: "96px 32px",
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 12px/1 var(--font-sans)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#582c83",
      marginBottom: 12
    }
  }, "What we do"), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "700 44px/1.1 var(--font-sans)",
      letterSpacing: "-0.015em",
      maxWidth: 760,
      margin: "0 0 56px"
    }
  }, "The only all-in-one provider of loyalty solutions for the gaming industry."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      border: "1px solid #e7e6eb",
      borderRadius: 14,
      padding: 28,
      background: "#fff",
      transition: "all .2s"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 44,
      borderRadius: 10,
      background: "#f6f1fc",
      color: "#582c83",
      display: "grid",
      placeItems: "center",
      marginBottom: 20
    }
  }, it.icon), /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "700 22px/1.25 var(--font-sans)",
      margin: "0 0 10px"
    }
  }, it.title), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 15px/1.55 var(--font-sans)",
      color: "#4a4752",
      margin: 0
    }
  }, it.body), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      font: "600 13px/1 var(--font-sans)",
      color: "#582c83",
      marginTop: 20,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      borderBottom: 0
    }
  }, "Learn more ", /*#__PURE__*/React.createElement(Icon.arrow, null)))))));
}

/* ---------------- Case study card strip ---------------- */
function CaseStudies() {
  const cards = [{
    tag: "365 by ezGIFT",
    title: "Online sportsbook & casino",
    stat: "80%",
    cap: "more monthly transactions vs previous vendor"
  }, {
    tag: "VIP Program",
    title: "Regional Oklahoma casino",
    stat: "225%",
    cap: "average event ROI"
  }, {
    tag: "Tier Reward",
    title: "Nationwide operator",
    stat: "$50M",
    cap: "incremental revenue year over year"
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "radial-gradient(120% 120% at 30% 25%, #2a2a2a 0%, #151515 45%, #000000 100%)",
      color: "#fff",
      padding: "96px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 48
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 12px/1 var(--font-sans)",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "#bda3e2",
      marginBottom: 12
    }
  }, "Proof"), /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "700 44px/1.1 var(--font-sans)",
      letterSpacing: "-0.015em",
      margin: 0,
      maxWidth: 600
    }
  }, "They don't just get a vendor. They get a partner.")), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      font: "600 14px/1 var(--font-sans)",
      color: "#bda3e2",
      borderBottom: 0,
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, "All case studies ", /*#__PURE__*/React.createElement(Icon.arrow, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20
    }
  }, cards.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: "#2a1550",
      borderRadius: 16,
      padding: 28,
      border: "1px solid #44216a"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 10px/1 var(--font-sans)",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#bda3e2",
      marginBottom: 16
    }
  }, c.tag), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 64px/0.95 var(--font-condensed)",
      color: "#fff",
      letterSpacing: "-0.01em",
      marginBottom: 8
    }
  }, c.stat), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "400 14px/1.5 var(--font-sans)",
      color: "#e3d6f4",
      marginBottom: 22
    }
  }, c.cap), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 16px/1.35 var(--font-sans)",
      color: "#fff",
      paddingTop: 18,
      borderTop: "1px solid #44216a"
    }
  }, c.title))))));
}

/* ---------------- Pull quote ---------------- */
function PullQuote() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "#faf8fd",
      padding: "96px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 900,
      margin: "0 auto",
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 40px/1.2 var(--font-sans)",
      color: "#31184d",
      letterSpacing: "-0.01em"
    }
  }, "\"We don't just take orders.", /*#__PURE__*/React.createElement("br", null), "We take ownership.\""), /*#__PURE__*/React.createElement("div", {
    style: {
      font: "600 12px/1 var(--font-sans)",
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color: "#582c83",
      marginTop: 28
    }
  }, "Women-owned \xB7 Las Vegas-based \xB7 In the trust business since 2001")));
}

/* ---------------- CTA band ---------------- */
function CtaBand() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "linear-gradient(150deg, #5c3089 0%, #472468 55%, #381d52 100%)",
      color: "#fff",
      padding: "72px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 40,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      font: "700 40px/1.1 var(--font-sans)",
      letterSpacing: "-0.01em",
      margin: "0 0 10px"
    }
  }, "Experience the GPS difference."), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 17px/1.5 var(--font-sans)",
      color: "#e3d6f4",
      margin: 0
    }
  }, "Where innovation meets execution \u2014 from ideation to fulfillment.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      font: "700 15px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "16px 26px",
      borderRadius: 8,
      border: 0,
      background: "#fff",
      color: "#582c83",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap"
    }
  }, "Schedule a demo"), /*#__PURE__*/React.createElement("button", {
    style: {
      font: "700 15px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "16px 26px",
      borderRadius: 8,
      border: "1.5px solid rgba(255,255,255,0.4)",
      background: "transparent",
      color: "#fff",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap"
    }
  }, "sales@gpsteam.com"))));
}

/* ---------------- Footer ---------------- */
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      background: "#0d0c10",
      color: "#a6a3b0",
      padding: "64px 32px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr",
      gap: 40
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/GPS-logo-tagline-white.png",
    style: {
      height: 40,
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 13px/1.55 var(--font-sans)",
      maxWidth: 300,
      margin: 0
    }
  }, "Proudly woman-owned and NWBOC-certified. Las Vegas, Nevada.")), [{
    h: "Solutions",
    l: ["ezGIFT®", "VIP Gift Program", "Tier Reward", "Passport catalog"]
  }, {
    h: "Company",
    l: ["About", "Case studies", "Press", "Careers"]
  }, {
    h: "Contact",
    l: ["sales@gpsteam.com", "info@gpsteam.com", "Request a demo"]
  }].map((col, i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      font: "700 12px/1 var(--font-sans)",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#fff",
      marginBottom: 16
    }
  }, col.h), col.l.map(it => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      display: "block",
      font: "400 13px/1.8 var(--font-sans)",
      color: "#a6a3b0",
      borderBottom: 0
    }
  }, it))))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1200,
      margin: "40px auto 0",
      paddingTop: 24,
      borderTop: "1px solid #2f2d36",
      display: "flex",
      justifyContent: "space-between",
      font: "400 12px/1 var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("span", null, "\xA9 2026 Global Promotional Sourcing. All rights reserved."), /*#__PURE__*/React.createElement("span", null, "Privacy \xB7 Terms")));
}
function App() {
  const [demo, setDemo] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      minHeight: "100vh"
    }
  }, /*#__PURE__*/React.createElement(TopNav, {
    onCta: () => setDemo(true)
  }), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(StatBand, null), /*#__PURE__*/React.createElement(Solutions, null), /*#__PURE__*/React.createElement(CaseStudies, null), /*#__PURE__*/React.createElement(PullQuote, null), /*#__PURE__*/React.createElement(CtaBand, null), /*#__PURE__*/React.createElement(Footer, null), demo && /*#__PURE__*/React.createElement("div", {
    onClick: () => setDemo(false),
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(13,12,16,0.6)",
      display: "grid",
      placeItems: "center",
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      background: "#fff",
      width: 460,
      padding: 32,
      borderRadius: 16,
      boxShadow: "0 20px 48px rgba(31,15,49,0.3)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      font: "700 24px/1.2 var(--font-sans)",
      margin: "0 0 8px"
    }
  }, "Schedule a demo"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: "400 14px/1.5 var(--font-sans)",
      color: "#4a4752",
      margin: "0 0 20px"
    }
  }, "Tell us about your program and we'll reply within one business day."), /*#__PURE__*/React.createElement("input", {
    placeholder: "Work email",
    style: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      borderRadius: 8,
      border: "1px solid #d1cfd8",
      font: "500 14px/1 var(--font-sans)",
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Casino / property name",
    style: {
      width: "100%",
      boxSizing: "border-box",
      padding: "12px 14px",
      borderRadius: 8,
      border: "1px solid #d1cfd8",
      font: "500 14px/1 var(--font-sans)",
      marginBottom: 16
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDemo(false),
    style: {
      width: "100%",
      padding: "14px",
      background: "#582c83",
      color: "#fff",
      border: 0,
      borderRadius: 8,
      font: "700 15px/1 var(--font-sans)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      cursor: "pointer",
      display: "inline-flex",
      gap: 10,
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap"
    }
  }, "Request demo ", /*#__PURE__*/React.createElement(Icon.arrow, null)))));
}
Object.assign(window, {
  App
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gps-marketing/components.jsx", error: String((e && e.message) || e) }); }

})();
