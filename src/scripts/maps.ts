/**
 * Maps (Experience) window: route, pins, pan/zoom/rotate, place cards, filters, bottom sheet.
 *
 * The map itself is generated at build time (src/lib/mapgen.ts). Here the canvas is moved with
 * one GSAP transform (x, y, scale, rotation about its centre). Pins, the marker and labels are
 * counter-scaled/rotated so they stay upright and the same size on screen, like real maps.
 *   Zoom: +/− buttons, + / − keys, Ctrl/⌘+scroll or trackpad pinch, two-finger pinch on touch
 *   Rotate: Shift+←/→, Option+drag, trackpad/touch twist. The compass faces north again.
 *
 * Content is cloned per window open, so everything is set up on 'window:open' and torn
 * down on 'window:close'. The directions list in the sidebar is the accessible way through;
 * the map itself is decorative (aria-hidden) and mirrors it.
 *
 * Reduced motion: route fully drawn, pins in place, instant pans/marker moves, no count-up.
 */
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(Draggable, DrawSVGPlugin, InertiaPlugin, MotionPathPlugin);

const WINDOW_ID = 'maps';
const MOBILE_QUERY = '(max-width: 767px)';

// Feel (seconds)
const INTRO = { draw: 1.3, pinDelay: 0.35, pinStagger: 0.12, pin: 0.45 };
const PAN = { duration: 0.7, ease: 'power3.inOut' };
const MARKER = { duration: 0.8, ease: 'power2.inOut' };
const COUNT = { duration: 0.8 };
const SHEET = { duration: 0.3 };
const VIEW = { duration: 0.35, ease: 'power2.out' };
const PIN_SELECTED = { scale: 1.3, duration: 0.25 };
const LABEL_FADE = 0.25;

// Zoom/rotate limits and steps
const ZOOM = { min: 1, max: 3.5, step: 1.5, detail: 1.4 }; // detail: revealOnZoom labels show from here
const ROTATE_STEP = 15; // degrees per Shift+arrow

let started = false;

export function initMaps() {
  if (started) return;
  started = true;

  let teardown: (() => void) | null = null;

  document.addEventListener('window:open', (e) => {
    const { id, el } = (e as CustomEvent<{ id: string; el: HTMLElement }>).detail;
    if (id !== WINDOW_ID) return;
    teardown?.();
    teardown = setup(el);
  });

  document.addEventListener('window:close', (e) => {
    if ((e as CustomEvent<{ id: string }>).detail.id !== WINDOW_ID) return;
    teardown?.();
    teardown = null;
  });
}

interface StopPos {
  id: string;
  x: number;
  y: number;
}

function setup(windowEl: HTMLElement) {
  const root = windowEl.querySelector<HTMLElement>('[data-maps]');
  if (!root) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia(MOBILE_QUERY);
  const stops = JSON.parse(root.dataset.stops ?? '[]') as StopPos[];
  const scale = Number(root.dataset.scale ?? 1); // canvas is drawn at this scale; stop x/y are unscaled

  const viewport = root.querySelector<HTMLElement>('[data-maps-viewport]')!;
  const canvas = root.querySelector<HTMLElement>('[data-maps-canvas]')!;
  const svg = root.querySelector<SVGSVGElement>('.maps__svg')!;
  const guide = root.querySelector<SVGPathElement>('[data-route-guide]')!;
  const routeCasing = root.querySelector<SVGPathElement>('[data-route-casing]')!;
  const pinBodies = [...root.querySelectorAll<SVGGElement>('[data-pin-body]')];
  const uprights = [...root.querySelectorAll<SVGGElement>('[data-upright]')];
  const mapLabels = [...root.querySelectorAll<SVGGElement>('[data-map-label]')];
  const tools = [...root.querySelectorAll<HTMLElement>('.maps__tools, .maps__controls')];
  const puckHalo = root.querySelector<SVGCircleElement>('[data-puck-halo]');
  const compassRose = root.querySelector<SVGGElement>('[data-compass-rose]')!;
  const marker = root.querySelector<SVGGElement>('[data-maps-marker]')!;
  const pins = [...root.querySelectorAll<SVGGElement>('[data-pin]')];
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const stepButtons = [...root.querySelectorAll<HTMLButtonElement>('.directions__button')];
  const cards = [...root.querySelectorAll<HTMLElement>('[data-place-card]')];
  const layerBoxes = [...root.querySelectorAll<HTMLInputElement>('[data-layer]')];
  const skillChips = [...root.querySelectorAll<HTMLButtonElement>('[data-skill]')];
  const status = root.querySelector<HTMLElement>('[data-maps-status]')!;
  const announcer = root.querySelector<HTMLElement>('[data-maps-announce]')!;
  const cardsBox = root.querySelector<HTMLElement>('.maps__cards')!;
  const sheet = root.querySelector<HTMLElement>('[data-maps-sheet]')!;
  const handle = root.querySelector<HTMLElement>('[data-maps-handle]')!;

  const canvasW = canvas.offsetWidth;
  const canvasH = canvas.offsetHeight;

  const listeners: [EventTarget, string, EventListener, boolean?][] = [];
  const on = (t: EventTarget, type: string, fn: EventListener, capture = false) => {
    t.addEventListener(type, fn, capture);
    listeners.push([t, type, fn, capture]);
  };

  let current = -1; // selected stop index (-1 = none)
  let markerAt = 0; // stop index the marker sits at

  const ctx = gsap.context(() => {}, root);

  // ---- Where each stop sits along the route (0–1), for the marker ----
  const total = guide.getTotalLength();
  const progressAt = stops.map((s) => {
    let best = 0;
    let bestD = Infinity;
    const samples = 600;
    for (let i = 0; i <= samples; i++) {
      const p = guide.getPointAtLength((i / samples) * total);
      const d = (p.x - s.x) ** 2 + (p.y - s.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i / samples;
      }
    }
    return best;
  });

  // ---- View: pan (Draggable), zoom, rotate ----
  // The canvas is transformed as translate(x, y) rotate(r) scale(z) about its centre.
  gsap.set(canvas, { transformOrigin: '50% 50%', force3D: false });
  const view = () => ({
    x: Number(gsap.getProperty(canvas, 'x')),
    y: Number(gsap.getProperty(canvas, 'y')),
    z: Number(gsap.getProperty(canvas, 'scaleX')) || 1,
    r: Number(gsap.getProperty(canvas, 'rotation')) || 0,
  });

  // Keep the viewport covered by the map's (rotated) bounding box
  const bounds = (z = view().z, r = view().r) => {
    const a = (r * Math.PI) / 180;
    const hx = z * (Math.abs(Math.cos(a)) * canvasW + Math.abs(Math.sin(a)) * canvasH) / 2;
    const hy = z * (Math.abs(Math.sin(a)) * canvasW + Math.abs(Math.cos(a)) * canvasH) / 2;
    const vw = viewport.clientWidth;
    // Phones: the map only needs to cover the part above the bottom sheet, so a stop can be
    // centred there even near the bottom of the map
    const vh = mobile.matches ? visibleCentre().y * 2 : viewport.clientHeight;
    const [cx0, cx1] = 2 * hx >= vw ? [vw - hx, hx] : [vw / 2, vw / 2];
    const [cy0, cy1] = 2 * hy >= vh ? [vh - hy, hy] : [vh / 2, vh / 2];
    return { minX: cx0 - canvasW / 2, maxX: cx1 - canvasW / 2, minY: cy0 - canvasH / 2, maxY: cy1 - canvasH / 2 };
  };
  const clampPos = (x: number, y: number, z?: number, r?: number) => {
    const b = bounds(z, r);
    return { x: gsap.utils.clamp(b.minX, b.maxX, x), y: gsap.utils.clamp(b.minY, b.maxY, y) };
  };

  // Where a map point (map units) lands on screen, relative to the canvas centre
  const offsetOf = (mx: number, my: number, z: number, r: number) => {
    const a = (r * Math.PI) / 180;
    const vx = mx * scale - canvasW / 2;
    const vy = my * scale - canvasH / 2;
    return { x: z * (vx * Math.cos(a) - vy * Math.sin(a)), y: z * (vx * Math.sin(a) + vy * Math.cos(a)) };
  };

  // ---- Labels: shown unless zoomed out too far (revealOnZoom) or sliding under the controls ----
  const labelInfo = mapLabels.map((el) => ({
    el,
    x: Number(el.dataset.x),
    y: Number(el.dataset.y),
    w: Number(el.dataset.w),
    h: Number(el.dataset.h),
    angle: Number(el.querySelector<SVGGElement>('[data-upright]')?.dataset.angle ?? 0),
    zoomOnly: el.classList.contains('ml--zoom'),
    shown: !el.classList.contains('ml--zoom'),
  }));
  const SAFE_PAD = 10; // px around the controls
  const updateLabels = () => {
    const { x, y, z, r } = view();
    const vr = viewport.getBoundingClientRect();
    const zones = tools.map((t) => {
      const b = t.getBoundingClientRect();
      return { x0: b.left - vr.left - SAFE_PAD, y0: b.top - vr.top - SAFE_PAD, x1: b.right - vr.left + SAFE_PAD, y1: b.bottom - vr.top + SAFE_PAD };
    });
    const detail = z >= ZOOM.detail - 0.001;
    labelInfo.forEach((l) => {
      // Screen box (labels keep their on-screen size, so no zoom factor here)
      const off = offsetOf(l.x, l.y, z, r);
      const cx = x + canvasW / 2 + off.x;
      const cy = y + canvasH / 2 + off.y;
      const a = ((l.angle + r) * Math.PI) / 180;
      const hw = ((Math.abs(Math.cos(a)) * l.w + Math.abs(Math.sin(a)) * l.h) * scale) / 2;
      const hh = ((Math.abs(Math.sin(a)) * l.w + Math.abs(Math.cos(a)) * l.h) * scale) / 2;
      const under = zones.some((zb) => cx - hw < zb.x1 && cx + hw > zb.x0 && cy - hh < zb.y1 && cy + hh > zb.y0);
      const show = (!l.zoomOnly || detail) && !under;
      if (show === l.shown) return;
      l.shown = show;
      gsap.to(l.el, { autoAlpha: show ? 1 : 0, duration: reduced ? 0 : LABEL_FADE, overwrite: true });
    });
  };

  // Pins, labels and the marker stay upright and the same size on screen
  const syncView = () => {
    const { z, r } = view();
    const inv = 1 / z;
    uprights.forEach((g) => {
      const kind = g.dataset.upright;
      if (kind === 'free') {
        g.setAttribute('transform', `rotate(${-r}) scale(${inv})`);
        return;
      }
      // Follows its road/river; switches to the reversed curve so it never reads upside down
      const eff = (((Number(g.dataset.angle) + r) % 360) + 360) % 360;
      const flip = eff > 90 && eff < 270;
      g.setAttribute('transform', `scale(${inv})`);
      const tp = g.querySelector('textPath');
      if (tp) {
        const href = `#${tp.dataset.pathId}${flip ? '-r' : ''}`;
        if (tp.getAttribute('href') !== href) tp.setAttribute('href', href);
      }
    });
    svg.style.setProperty('--map-k', String(z ** -0.5));
    svg.style.setProperty('--route-k', String(z ** -0.75));
    compassRose.style.transform = `rotate(${r}deg)`;
    updateLabels();
  };

  // 2D transforms only: 3D (translate3d) layers made Safari paint the map over the place card
  const [drag] = Draggable.create(canvas, {
    type: 'x,y',
    force3D: false,
    // Draggable raises the dragged element's z-index (1000+) by default, which put the map
    // over the zoom/compass/prev-next controls (and the place card) after the first drag
    zIndexBoost: false,
    trigger: viewport,
    bounds: bounds(1, 0),
    inertia: !reduced,
    edgeResistance: 0.85,
    dragClickables: false,
    // Cards, controls and links don't start a pan (so text can be selected and cards scrolled)
    clickableTest: (el: Element) => !!el.closest('.maps__cards, .maps__controls, .maps__tools, a, button, input, label'),
    allowContextMenu: true,
    onPress() {
      gsap.killTweensOf(canvas);
    },
    onDrag: () => updateLabels(),
    onThrowUpdate: () => updateLabels(),
  });

  // Where the view is heading: quick repeated presses (+ + +, Shift+→ ×3) build on the
  // previous target instead of wherever the animation happens to be
  type View = ReturnType<typeof view>;
  let goal: View | null = null;
  const base = (): View => (goal && gsap.isTweening(canvas) ? goal : view());

  // Move to a view (clamped). Instant with reduced motion.
  const setView = (to: View, opts: { instant?: boolean; tween?: object } = {}) => {
    const z = gsap.utils.clamp(ZOOM.min, ZOOM.max, to.z);
    const pos = clampPos(to.x, to.y, z, to.r);
    goal = opts.instant || reduced ? null : { ...pos, z, r: to.r };
    drag.applyBounds(bounds(z, to.r));
    const props = { ...pos, scale: z, rotation: to.r, force3D: false };
    gsap.killTweensOf(canvas);
    if (opts.instant || reduced) {
      gsap.set(canvas, props);
      drag.update();
      syncView();
    } else {
      gsap.to(canvas, {
        ...props,
        ...VIEW,
        ...opts.tween,
        onUpdate: syncView,
        onComplete: () => {
          // The viewport may have changed size mid-tween
          const v = view();
          const c = clampPos(v.x, v.y, v.z, v.r);
          if (c.x !== v.x || c.y !== v.y) gsap.set(canvas, { ...c, force3D: false });
          drag.applyBounds(bounds());
          drag.update();
          updateLabels();
        },
      });
    }
  };

  // Zoom/rotate about a screen point (default: the centre of the visible map)
  function visibleCentre() {
    return {
      x: viewport.clientWidth / 2,
      y: (mobile.matches ? sheetY()[current >= 0 ? 'half' : 'peek'] : viewport.clientHeight) / 2,
    };
  }
  const transformAbout = (
    anchor: { x: number; y: number },
    from: { x: number; y: number; z: number; r: number },
    z: number,
    r: number,
  ) => {
    z = gsap.utils.clamp(ZOOM.min, ZOOM.max, z);
    const k = z / from.z;
    const a = ((r - from.r) * Math.PI) / 180;
    // Vector from the anchor to the canvas centre, scaled and rotated with the map
    const dx = from.x + canvasW / 2 - anchor.x;
    const dy = from.y + canvasH / 2 - anchor.y;
    const cx = anchor.x + k * (dx * Math.cos(a) - dy * Math.sin(a));
    const cy = anchor.y + k * (dx * Math.sin(a) + dy * Math.cos(a));
    return { x: cx - canvasW / 2, y: cy - canvasH / 2, z, r };
  };
  const zoomBy = (factor: number, anchor = visibleCentre(), instant = false) => {
    const v = instant ? view() : base();
    setView(transformAbout(anchor, v, v.z * factor, v.r), { instant });
  };
  const rotateBy = (deg: number, instant = false) => {
    const v = base();
    setView(transformAbout(visibleCentre(), v, v.z, v.r + deg), { instant });
  };
  const faceNorth = () => {
    const v = base();
    // Shortest way back to 0°
    const r = ((v.r % 360) + 540) % 360 - 180;
    const now = Number(gsap.getProperty(canvas, 'rotation'));
    gsap.set(canvas, { rotation: now - (v.r - r) });
    setView(transformAbout(visibleCentre(), { ...v, r }, v.z, 0));
  };

  // Centre a stop in the visible map area (above the bottom sheet on phones)
  const panTo = (i: number, instant = false) => {
    const s = stops[i];
    const v = instant ? view() : base();
    const off = offsetOf(s.x, s.y, v.z, v.r);
    const c = visibleCentre();
    const to = { x: c.x - off.x - canvasW / 2, y: c.y - off.y - canvasH / 2, z: v.z, r: v.r };
    setView(to, { instant, tween: PAN });
  };

  // Resizes (card opening, window maximised) just update the limits; a pan/zoom that's
  // still animating finishes on its own and is clamped when it does
  const refreshBounds = () => {
    if (gsap.isTweening(canvas)) {
      drag.applyBounds(bounds());
      return;
    }
    setView(view(), { instant: true });
  };
  // Older browsers without overflow: clip can still scroll the map box (e.g. focusing something
  // inside it); the map moves by transform only, so undo any scroll
  on(viewport, 'scroll', () => {
    viewport.scrollLeft = 0;
    viewport.scrollTop = 0;
  });
  const ro = new ResizeObserver(refreshBounds);
  ro.observe(viewport);

  // Buttons
  on(root.querySelector('[data-maps-zoom-in]')!, 'click', () => zoomBy(ZOOM.step));
  on(root.querySelector('[data-maps-zoom-out]')!, 'click', () => zoomBy(1 / ZOOM.step));
  on(root.querySelector('[data-maps-compass]')!, 'click', faceNorth);
  on(root.querySelector('[data-maps-recenter]')!, 'click', () => panTo(current >= 0 ? current : markerAt));

  // Ctrl/⌘ + scroll, and trackpad pinch in Chrome/Firefox (sent as ctrl+wheel), zoom at the pointer
  const pointIn = (e: { clientX: number; clientY: number }) => {
    const rect = viewport.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  on(
    viewport,
    'wheel',
    ((e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // plain scrolling is left alone
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.01), pointIn(e), true);
    }) as EventListener,
  );

  // Safari trackpad pinch + twist
  type GestureEvt = Event & { scale: number; rotation: number; clientX: number; clientY: number };
  let gestureStart: ReturnType<typeof view> | null = null;
  on(viewport, 'gesturestart', (e) => {
    e.preventDefault();
    gestureStart = view();
  });
  on(viewport, 'gesturechange', (e) => {
    const g = e as GestureEvt;
    if (!gestureStart) return;
    g.preventDefault();
    setView(transformAbout(pointIn(g), gestureStart, gestureStart.z * g.scale, gestureStart.r + g.rotation), { instant: true });
  });
  on(viewport, 'gestureend', () => (gestureStart = null));

  // Touch: two fingers pinch to zoom and twist to rotate. Option+drag rotates with a mouse.
  const touches = new Map<number, { x: number; y: number }>();
  let twoFinger: { start: ReturnType<typeof view>; d: number; a: number; mid: { x: number; y: number } } | null = null;
  let altRotate: { start: ReturnType<typeof view>; a: number } | null = null;
  const angleFromCentre = (p: { x: number; y: number }) => {
    const c = visibleCentre();
    return (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;
  };
  const pair = () => {
    const [a, b] = [...touches.values()];
    return {
      d: Math.hypot(b.x - a.x, b.y - a.y),
      a: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };
  on(
    root,
    'pointerdown',
    ((e: PointerEvent) => {
      if (!viewport.contains(e.target as Node) || (e.target as Element).closest('.maps__tools, .maps__controls')) return;
      if (e.pointerType === 'mouse' && e.altKey) {
        e.stopPropagation(); // keep Draggable from panning
        e.preventDefault();
        altRotate = { start: view(), a: angleFromCentre(pointIn(e)) };
        return;
      }
      if (e.pointerType !== 'touch') return;
      touches.set(e.pointerId, pointIn(e));
      if (touches.size === 2) {
        drag.endDrag(e);
        drag.disable();
        gsap.killTweensOf(canvas);
        twoFinger = { start: view(), ...pair() };
      }
    }) as EventListener,
    true,
  );
  on(window, 'pointermove', ((e: PointerEvent) => {
    if (altRotate) {
      const v = altRotate.start;
      setView(transformAbout(visibleCentre(), v, v.z, v.r + angleFromCentre(pointIn(e)) - altRotate.a), { instant: true });
      return;
    }
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, pointIn(e));
    if (twoFinger && touches.size === 2) {
      const now = pair();
      const s = twoFinger.start;
      const next = transformAbout(twoFinger.mid, s, s.z * (now.d / twoFinger.d), s.r + now.a - twoFinger.a);
      // Follow the fingers' midpoint as well
      setView({ ...next, x: next.x + now.mid.x - twoFinger.mid.x, y: next.y + now.mid.y - twoFinger.mid.y }, { instant: true });
    }
  }) as EventListener);
  const endPointer = ((e: PointerEvent) => {
    altRotate = null;
    if (!touches.delete(e.pointerId)) return;
    if (twoFinger && touches.size < 2) {
      twoFinger = null;
      drag.enable();
    }
  }) as EventListener;
  on(window, 'pointerup', endPointer);
  on(window, 'pointercancel', endPointer);

  // ---- Marker ----
  const moveMarker = (to: number, instant = false) => {
    const from = markerAt;
    markerAt = to;
    const motionPath = {
      path: guide,
      align: guide,
      alignOrigin: [0.5, 0.5] as [number, number],
      start: progressAt[from],
      end: progressAt[to],
    };
    const atEnd = to === stops.length - 1; // the location dot is already there
    if (instant || reduced || from === to) {
      gsap.set(marker, { motionPath: { ...motionPath, start: progressAt[to], end: progressAt[to] }, autoAlpha: atEnd ? 0 : 1 });
    } else {
      gsap.to(marker, { motionPath, ...MARKER });
      gsap.to(marker, { autoAlpha: atEnd ? 0 : 1, duration: 0.2, delay: atEnd ? MARKER.duration - 0.2 : 0 });
    }
  };

  // ---- Stats count up: "4,300+" → 0 … 4,300+ ----
  const counters = new Set<object>(); // killed on reselect and on close
  const countUp = (el: HTMLElement) => {
    const raw = el.dataset.stat ?? el.textContent ?? '';
    const m = raw.match(/^(\D*)([\d,]*\.?\d+)(.*)$/);
    if (!m || reduced) {
      el.textContent = raw;
      return;
    }
    const [, prefix, num, suffix] = m;
    const target = parseFloat(num.replace(/,/g, ''));
    const decimals = (num.split('.')[1] ?? '').length;
    const fmt = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: num.includes(','),
    });
    const counter = { v: 0 };
    counters.add(counter);
    gsap.to(counter, {
      v: target,
      duration: COUNT.duration,
      ease: 'power2.out',
      onUpdate: () => (el.textContent = `${prefix}${fmt.format(counter.v)}${suffix}`),
      onComplete: () => (el.textContent = raw),
    });
  };

  // The selected pin is larger (grows from its tip)
  const sizePins = (selected: number) => {
    pinBodies.forEach((b, i) => {
      const s = i === selected ? PIN_SELECTED.scale : 1;
      const transformOrigin = b.hasAttribute('data-puck') ? '50% 50%' : '50% 100%'; // pins grow from the tip
      if (reduced) gsap.set(b, { scale: s, transformOrigin });
      else gsap.to(b, { scale: s, transformOrigin, duration: PIN_SELECTED.duration, ease: 'back.out(2)', overwrite: true });
    });
  };

  // ---- Selecting a stop ----
  const select = (i: number, { focusCard = true, instant = false } = {}) => {
    if (i < 0 || i >= stops.length) return;
    current = i;
    const id = stops[i].id;

    pins.forEach((p) => p.classList.toggle('is-selected', p.dataset.pin === id));
    sizePins(i);
    steps.forEach((s) => (s.dataset.step === id ? s.setAttribute('aria-current', 'step') : s.removeAttribute('aria-current')));
    cards.forEach((c) => (c.hidden = c.dataset.placeCard !== id));

    const card = cards[i];
    card.scrollTop = 0;
    cardsBox.scrollTop = 0;
    gsap.killTweensOf([...counters]);
    counters.clear();
    card.querySelectorAll<HTMLElement>('.entry:not([hidden]) [data-stat]').forEach(countUp);

    // The card replaces the directions in the sidebar (the bottom sheet on phones), like Apple Maps
    sheet.classList.add('has-card');
    if (mobile.matches) setSheet('half');

    if (focusCard) {
      // Moving focus to the heading announces the card
      card.querySelector<HTMLElement>('.place-card__title')?.focus({ preventScroll: true });
    } else {
      // Focus stays put (arrow keys, pins, prev/next), so announce it instead
      const visible = card.querySelectorAll('[data-entry]:not([hidden])').length;
      announcer.textContent = `${card.dataset.label ?? stops[i].id}. ${visible} ${visible === 1 ? 'role' : 'roles'}.`;
    }

    panTo(i, instant);
    moveMarker(i, instant);
  };

  const closeCard = () => {
    if (current < 0) return;
    const returnTo = stepButtons[current];
    cards.forEach((c) => (c.hidden = true));
    pins.forEach((p) => p.classList.remove('is-selected'));
    sizePins(-1);
    current = -1;
    sheet.classList.remove('has-card');
    if (mobile.matches) setSheet('half'); // back to the directions
    returnTo?.focus({ preventScroll: true });
  };

  stepButtons.forEach((b) => on(b, 'click', () => select(Number(b.dataset.stopIndex))));
  pins.forEach((p) => on(p, 'click', () => select(Number(p.dataset.stopIndex), { focusCard: false })));
  on(root.querySelector('[data-maps-prev]')!, 'click', () => select(Math.max(0, (current < 0 ? markerAt : current) - 1), { focusCard: false }));
  on(root.querySelector('[data-maps-next]')!, 'click', () => select(Math.min(stops.length - 1, (current < 0 ? markerAt : current) + 1), { focusCard: false }));
  cards.forEach((c) => on(c.querySelector('[data-card-close]')!, 'click', closeCard));

  // ←/→ move between stops; Esc closes the card (before the window manager closes the window)
  on(root, 'keydown', (e) => {
    const ke = e as KeyboardEvent;
    const t = ke.target as HTMLElement;
    if (ke.key === 'Escape' && current >= 0) {
      ke.preventDefault();
      closeCard();
      return;
    }
    if (t.matches('input, textarea, [data-skill]')) return; // chips/checkboxes keep their own keys

    // + / − zoom, Shift+←/→ rotate (the compass button faces north again)
    if (!ke.metaKey && !ke.ctrlKey && (ke.key === '+' || ke.key === '=')) {
      ke.preventDefault();
      zoomBy(ZOOM.step);
      return;
    }
    if (!ke.metaKey && !ke.ctrlKey && (ke.key === '-' || ke.key === '_')) {
      ke.preventDefault();
      zoomBy(1 / ZOOM.step);
      return;
    }
    if (ke.shiftKey && (ke.key === 'ArrowLeft' || ke.key === 'ArrowRight')) {
      ke.preventDefault();
      rotateBy(ke.key === 'ArrowLeft' ? -ROTATE_STEP : ROTATE_STEP);
      return;
    }

    // Directions list: ↑/↓/Home/End move focus between steps (Enter opens one)
    const stepIndex = stepButtons.indexOf(t as HTMLButtonElement);
    if (stepIndex >= 0 && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(ke.key)) {
      ke.preventDefault();
      const next =
        ke.key === 'Home' ? 0 : ke.key === 'End' ? stepButtons.length - 1 : stepIndex + (ke.key === 'ArrowDown' ? 1 : -1);
      stepButtons[gsap.utils.clamp(0, stepButtons.length - 1, next)].focus();
      return;
    }
    const from = current < 0 ? markerAt : current;
    if (ke.key === 'ArrowRight') {
      ke.preventDefault();
      select(Math.min(stops.length - 1, from + 1), { focusCard: false });
    } else if (ke.key === 'ArrowLeft') {
      ke.preventDefault();
      select(Math.max(0, from - 1), { focusCard: false });
    }
  });

  // Expand / collapse an entry's bullets
  root.querySelectorAll<HTMLButtonElement>('[data-entry-toggle]').forEach((b) => {
    on(b, 'click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? (b.dataset.less ?? '') : (b.dataset.more ?? '');
      root.querySelector<HTMLElement>(`#${b.getAttribute('aria-controls')}`)!.hidden = !open;
    });
  });

  // ---- Layers + skills ----
  let activeSkill: string | null = null;

  const applyFilters = () => {
    const visibleTypes = new Set(layerBoxes.filter((b) => b.checked).map((b) => b.dataset.layer));
    let matches = 0;
    cards.forEach((card, i) => {
      const entries = [...card.querySelectorAll<HTMLElement>('[data-entry]')];
      let visible = 0;
      let hits = 0;
      entries.forEach((en) => {
        const show = visibleTypes.has(en.dataset.type);
        en.hidden = !show;
        const tags = JSON.parse(en.dataset.tags ?? '[]') as string[];
        const hit = !!activeSkill && show && tags.includes(activeSkill);
        en.classList.toggle('is-highlighted', hit);
        en.classList.toggle('is-dim', !!activeSkill && show && !hit);
        en.querySelectorAll<HTMLElement>('[data-tag]').forEach((t) => t.classList.toggle('is-match', t.dataset.tag === activeSkill));
        if (show) visible++;
        if (hit) hits++;
      });
      matches += hits;
      const empty = entries.length > 0 && visible === 0;
      const dim = empty || (!!activeSkill && hits === 0);
      pins[i].classList.toggle('is-dim', dim);
      pins[i].classList.toggle('is-highlighted', hits > 0);
      steps[i].classList.toggle('is-dim', dim);
      steps[i].classList.toggle('is-highlighted', hits > 0);
    });
    status.textContent = activeSkill ? `${activeSkill}: ${matches} ${matches === 1 ? 'role' : 'roles'}` : '';
  };

  layerBoxes.forEach((b) => on(b, 'change', applyFilters));
  skillChips.forEach((chip) => {
    on(chip, 'click', () => {
      activeSkill = activeSkill === chip.dataset.skill ? null : chip.dataset.skill!;
      skillChips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.skill === activeSkill)));
      applyFilters();
    });
  });

  // ---- Phone: bottom sheet (peek / half / full) ----
  let sheetDrag: Draggable | null = null;
  function sheetY() {
    const h = root.clientHeight;
    const peek = parseFloat(getComputedStyle(root).getPropertyValue('--maps-sheet-peek')) || 168;
    return { full: h * 0.08, half: h * 0.5, peek: h - peek };
  }
  function setSheet(pos: 'peek' | 'half' | 'full') {
    if (!mobile.matches) return;
    const y = sheetY()[pos];
    if (reduced) gsap.set(sheet, { y });
    else gsap.to(sheet, { y, duration: SHEET.duration, ease: 'power2.out' });
    drag.applyBounds(bounds());
  }
  const setupSheet = () => {
    sheetDrag?.kill();
    sheetDrag = null;
    gsap.set(sheet, { clearProps: 'transform' });
    if (!mobile.matches) return;
    const ys = sheetY();
    gsap.set(sheet, { y: current >= 0 ? ys.half : ys.peek });
    [sheetDrag] = Draggable.create(sheet, {
      type: 'y',
      // Drag by the handle or any header (like Apple Maps); buttons inside still click
      trigger: [handle, ...root.querySelectorAll<HTMLElement>('.maps__tldr .maps__heading, .place-card__header')],
      dragClickables: false,
      bounds: { minY: ys.full, maxY: ys.peek },
      onRelease() {
        // Snap to the nearest resting point
        const y = this.endY ?? this.y;
        const nearest = (Object.entries(sheetY()) as [keyof ReturnType<typeof sheetY>, number][]).reduce((a, b) =>
          Math.abs(b[1] - y) < Math.abs(a[1] - y) ? b : a,
        );
        setSheet(nearest[0]);
      },
    });
  };
  setupSheet();
  on(mobile as unknown as EventTarget, 'change', () => {
    setupSheet();
    refreshBounds();
  });

  // ---- Intro: route draws, pins drop one by one ----
  ctx.add(() => {
    if (!reduced) {
      gsap.fromTo([routeCasing, guide], { drawSVG: '0%' }, { drawSVG: '100%', duration: INTRO.draw, ease: 'power1.inOut' });
      // fromTo with explicit end values, so a re-open never animates from a half-finished state
      gsap.fromTo(
        pins,
        { y: -40, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: INTRO.pin, ease: 'back.out(2)', stagger: INTRO.pinStagger, delay: INTRO.pinDelay },
      );
    }
  });

  // "You are here" halo pulses gently (static with reduced motion)
  if (puckHalo && !reduced) {
    ctx.add(() => {
      gsap.fromTo(
        puckHalo,
        { scale: 0.55, opacity: 0.45 },
        { scale: 1.6, opacity: 0, duration: 2, ease: 'power1.out', repeat: -1, transformOrigin: '50% 50%' },
      );
    });
  }

  // Start at the first stop with no card open
  syncView();
  moveMarker(0, true);
  panTo(0, true);

  // Map resized (window maximised etc.)
  const onMax = (e: Event) => {
    if ((e as CustomEvent<{ id: string }>).detail.id === WINDOW_ID) requestAnimationFrame(refreshBounds);
  };
  on(document, 'window:maximize', onMax);

  return () => {
    listeners.forEach(([t, type, fn, capture]) => t.removeEventListener(type, fn, capture));
    ro.disconnect();
    drag.kill();
    sheetDrag?.kill();
    ctx.revert(); // first, so the intro's start state is undone before its tweens are killed
    gsap.killTweensOf([canvas, marker, sheet, routeCasing, guide, ...pins, ...pinBodies, ...mapLabels, ...counters]);
    gsap.set(pins, { clearProps: 'opacity,visibility,transform' });
    counters.clear();
  };
}
