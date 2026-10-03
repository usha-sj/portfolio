/**
 * Maps (Experience) window: route, pins, panning, place cards, filters, bottom sheet.
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
  const guide = root.querySelector<SVGPathElement>('[data-route-guide]')!;
  const mask = root.querySelector<SVGPathElement>('[data-route-mask]')!;
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

  // ---- Panning: drag (Draggable), buttons, arrow keys ----
  const bounds = () => ({
    minX: Math.min(0, viewport.clientWidth - canvasW),
    maxX: 0,
    minY: Math.min(0, viewport.clientHeight - canvasH),
    maxY: 0,
  });
  const clampPos = (x: number, y: number) => {
    const b = bounds();
    return { x: gsap.utils.clamp(b.minX, b.maxX, x), y: gsap.utils.clamp(b.minY, b.maxY, y) };
  };

  // 2D transforms only: 3D (translate3d) layers made Safari paint the map over the place card
  gsap.set(canvas, { force3D: false });
  const [drag] = Draggable.create(canvas, {
    type: 'x,y',
    force3D: false,
    trigger: viewport,
    bounds: bounds(),
    inertia: !reduced,
    edgeResistance: 0.85,
    dragClickables: false,
    // Cards, controls and links don't start a pan (so text can be selected and cards scrolled)
    clickableTest: (el: Element) => !!el.closest('.maps__cards, .maps__controls, a, button, input, label'),
    allowContextMenu: true,
    onPress() {
      gsap.killTweensOf(canvas);
    },
  });

  // Centre a stop in the visible map area (to the left of the place card on desktop)
  const panTo = (i: number, instant = false) => {
    const s = stops[i];
    // Visible map: the whole map area on desktop, the part above the bottom sheet on phones
    const visibleH = mobile.matches ? sheetY()[current >= 0 ? 'half' : 'peek'] : viewport.clientHeight;
    const target = clampPos(viewport.clientWidth / 2 - s.x * scale, visibleH / 2 - s.y * scale);
    if (instant || reduced) {
      gsap.set(canvas, { ...target, force3D: false });
      drag.update();
    } else {
      gsap.to(canvas, { ...target, ...PAN, force3D: false, onUpdate: () => drag.update() });
    }
  };

  const refreshBounds = () => {
    drag.applyBounds(bounds());
    const pos = clampPos(Number(gsap.getProperty(canvas, 'x')), Number(gsap.getProperty(canvas, 'y')));
    gsap.set(canvas, { ...pos, force3D: false });
    drag.update();
  };
  const ro = new ResizeObserver(refreshBounds);
  ro.observe(viewport);

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
    if (instant || reduced || from === to) {
      gsap.set(marker, { motionPath: { ...motionPath, start: progressAt[to], end: progressAt[to] } });
    } else {
      gsap.to(marker, { motionPath, ...MARKER });
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

  // ---- Selecting a stop ----
  const select = (i: number, { focusCard = true, instant = false } = {}) => {
    if (i < 0 || i >= stops.length) return;
    current = i;
    const id = stops[i].id;

    pins.forEach((p) => p.classList.toggle('is-selected', p.dataset.pin === id));
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
  const sheetY = () => {
    const h = root.clientHeight;
    const peek = parseFloat(getComputedStyle(root).getPropertyValue('--maps-sheet-peek')) || 168;
    return { full: h * 0.08, half: h * 0.5, peek: h - peek };
  };
  function setSheet(pos: 'peek' | 'half' | 'full') {
    if (!mobile.matches) return;
    const y = sheetY()[pos];
    if (reduced) gsap.set(sheet, { y });
    else gsap.to(sheet, { y, duration: SHEET.duration, ease: 'power2.out' });
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
      gsap.fromTo(mask, { drawSVG: '0%' }, { drawSVG: '100%', duration: INTRO.draw, ease: 'power1.inOut' });
      gsap.from(pins, {
        y: -40,
        autoAlpha: 0,
        duration: INTRO.pin,
        ease: 'back.out(2)',
        stagger: INTRO.pinStagger,
        delay: INTRO.pinDelay,
      });
    }
  });

  // Start at the first stop with no card open
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
    gsap.killTweensOf([canvas, marker, sheet, mask, ...pins, ...counters]);
    counters.clear();
    ctx.revert();
  };
}
