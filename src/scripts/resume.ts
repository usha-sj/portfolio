/**
 * Résumé (Preview window): filter chips + GSAP/ScrollTrigger animations.
 *
 * The window's content is cloned each time it opens, so everything is set up on
 * 'window:open' and torn down on 'window:close'. ScrollTrigger uses the window's own
 * scroll container ([data-window-body]) as its scroller, never the page.
 *
 * Reduced motion: GSAP isn't used at all; filtering just shows/hides entries.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const WINDOW_ID = 'preview';

// Timing: subtle and quick (nothing over ~0.6s)
const LINE_START = 'top 85%';
const LINE_END = 'bottom 85%';
const ENTRY_START = 'top 92%';
const CARD_IN = { duration: 0.45, y: 16 };
const MARKER_IN = { duration: 0.3, delay: 0.12 };
const FILTER_OUT = { duration: 0.18, y: 8, stagger: 0.02 };

let started = false;

export function initResume() {
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
    const { id } = (e as CustomEvent<{ id: string }>).detail;
    if (id !== WINDOW_ID) return;
    teardown?.();
    teardown = null;
  });
}

function setup(windowEl: HTMLElement) {
  const root = windowEl.querySelector<HTMLElement>('[data-resume]');
  const scroller = windowEl.querySelector<HTMLElement>('[data-window-body]');
  if (!root || !scroller) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timeline = root.querySelector<HTMLElement>('[data-timeline]')!;
  const progress = root.querySelector<HTMLElement>('[data-timeline-progress]')!;
  const entries = [...root.querySelectorAll<HTMLElement>('[data-entry]')];
  const chips = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const status = root.querySelector<HTMLElement>('[data-resume-status]')!;

  const visibleEntries = () => entries.filter((en) => !en.hidden);

  // ---- Animations ----
  // The line drawing is built once; entry animations are rebuilt after each filter so
  // they only cover the entries that are currently shown.
  let lineCtx: gsap.Context | null = null;
  let entryCtx: gsap.Context | null = null;

  const buildEntryAnimations = () => {
    entryCtx?.revert();
    entryCtx = gsap.context(() => {
      for (const entry of visibleEntries()) {
        const card = entry.querySelector('[data-card]');
        const marker = entry.querySelector('[data-marker]');
        const trigger = { trigger: entry, scroller, start: ENTRY_START, once: true };

        gsap.from(card, { autoAlpha: 0, y: CARD_IN.y, duration: CARD_IN.duration, ease: 'power2.out', scrollTrigger: trigger });
        gsap.from(marker, {
          scale: 0,
          duration: MARKER_IN.duration,
          delay: MARKER_IN.delay,
          ease: 'back.out(2.5)',
          scrollTrigger: { ...trigger },
        });
      }
    }, root);
  };

  if (!reducedMotion) {
    lineCtx = gsap.context(() => {
      gsap.fromTo(
        progress,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: timeline, scroller, start: LINE_START, end: LINE_END, scrub: true },
        },
      );
    }, root);
    buildEntryAnimations();
    ScrollTrigger.refresh();
  }

  // ---- Filtering (radio group: click, arrows, Home/End) ----
  let busy = false;

  const announce = (value: string, label: string) => {
    const n = visibleEntries().length;
    const tpl = value === 'all' ? root.dataset.statusAll! : root.dataset.status!;
    status.textContent = tpl.replace('{n}', String(n)).replace('{type}', label);
  };

  const applyFilter = async (chip: HTMLButtonElement) => {
    if (busy || chip.getAttribute('aria-checked') === 'true') return;
    busy = true;

    chips.forEach((c) => {
      const on = c === chip;
      c.setAttribute('aria-checked', String(on));
      c.tabIndex = on ? 0 : -1;
    });

    const value = chip.dataset.filter!;
    const show = (en: HTMLElement) => value === 'all' || en.dataset.type === value;

    if (!reducedMotion) {
      // Out: fade the currently shown entries, then swap
      const leaving = visibleEntries().flatMap((en) => [...en.querySelectorAll('[data-card], [data-marker]')]);
      await gsap.to(leaving, { autoAlpha: 0, y: FILTER_OUT.y, duration: FILTER_OUT.duration, stagger: FILTER_OUT.stagger });
    }

    entries.forEach((en) => (en.hidden = !show(en)));
    scroller.scrollTo({ top: 0 });

    if (!reducedMotion) {
      // In: rebuilding the entry triggers animates the ones in view straight away
      gsap.set(root.querySelectorAll('[data-card], [data-marker]'), { clearProps: 'all' });
      buildEntryAnimations();
      ScrollTrigger.refresh();
    }

    announce(value, chip.dataset.label!);
    busy = false;
  };

  const onChipClick = (e: Event) => applyFilter(e.currentTarget as HTMLButtonElement);

  const onChipKey = (e: KeyboardEvent) => {
    const i = chips.indexOf(e.currentTarget as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % chips.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + chips.length) % chips.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = chips.length - 1;
    if (next < 0) return;
    e.preventDefault();
    chips[next].focus();
    applyFilter(chips[next]); // radio groups select on arrow, like native radios
  };

  chips.forEach((c) => {
    c.addEventListener('click', onChipClick);
    c.addEventListener('keydown', onChipKey);
  });

  // ---- Keep ScrollTrigger measurements right when the window changes size ----
  const refreshIfMine = (e: Event) => {
    if ((e as CustomEvent<{ id: string }>).detail.id === WINDOW_ID && !reducedMotion) ScrollTrigger.refresh();
  };
  document.addEventListener('window:maximize', refreshIfMine);
  document.addEventListener('window:focus', refreshIfMine); // e.g. restored after minimise

  // ---- Cleanup when the window closes ----
  return () => {
    chips.forEach((c) => {
      c.removeEventListener('click', onChipClick);
      c.removeEventListener('keydown', onChipKey);
    });
    document.removeEventListener('window:maximize', refreshIfMine);
    document.removeEventListener('window:focus', refreshIfMine);
    entryCtx?.revert();
    lineCtx?.revert();
  };
}
