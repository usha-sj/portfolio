/**
 * Quick Look image viewer.
 *
 * Opened by selection.ts ('quicklook:open' with the clicked file). It cycles through every
 * image file in the same folder ([data-quicklook] items in the same [data-select-group]).
 *   ←/→ or the buttons: previous/next     Space or Esc: close     swipe on touch: previous/next
 * Opens with a zoom from the file's thumbnail and closes back into it (instant with reduced motion).
 * Focus moves into the viewer and returns to the file on close.
 */
import { gsap } from 'gsap';

// Feel: quick (nothing over ~0.35s)
const ZOOM = { duration: 0.32, ease: 'power3.out' };
const ZOOM_OUT = { duration: 0.24, ease: 'power2.in' };
const SWITCH = { out: 0.12, in: 0.2, slide: 28 };
const SWIPE_MIN_PX = 50;

let started = false;

export function initQuickLook() {
  if (started) return;
  started = true;

  const root = document.querySelector<HTMLElement>('[data-quicklook-root]');
  if (!root) return;

  const panel = root.querySelector<HTMLElement>('[data-ql-panel]')!;
  const stage = root.querySelector<HTMLElement>('[data-ql-stage]')!;
  const img = root.querySelector<HTMLImageElement>('[data-ql-img]')!;
  const nameEl = root.querySelector<HTMLElement>('[data-ql-name]')!;
  const countEl = root.querySelector<HTMLElement>('[data-ql-count]')!;
  const prevBtn = root.querySelector<HTMLButtonElement>('[data-ql-prev]')!;
  const nextBtn = root.querySelector<HTMLButtonElement>('[data-ql-next]')!;
  const counterTpl = root.dataset.counter ?? '{i} of {n}';
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let items: HTMLElement[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;
  let isOpen = false;
  let busy = false;

  // ---- Helpers ----
  const thumbOf = (item: HTMLElement) => item.querySelector<HTMLElement>('[data-quicklook-thumb]') ?? item;

  // Transform that makes the panel sit exactly over the thumbnail (for zoom in/out)
  const fromThumb = (item: HTMLElement) => {
    const t = thumbOf(item).getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    return {
      x: t.left + t.width / 2 - (p.left + p.width / 2),
      y: t.top + t.height / 2 - (p.top + p.height / 2),
      scaleX: t.width / p.width,
      scaleY: t.height / p.height,
    };
  };

  const show = (i: number) => {
    index = (i + items.length) % items.length;
    const item = items[index];
    img.src = item.dataset.src ?? '';
    img.alt = item.dataset.alt ?? '';
    nameEl.textContent = item.dataset.name ?? '';
    countEl.textContent = items.length > 1 ? counterTpl.replace('{i}', String(index + 1)).replace('{n}', String(items.length)) : '';
    prevBtn.hidden = nextBtn.hidden = items.length < 2;
  };

  // ---- Open / close ----
  const open = (item: HTMLElement) => {
    if (isOpen) return;
    const group = item.closest('[data-select-group]') ?? document;
    items = [...group.querySelectorAll<HTMLElement>('[data-quicklook]')];
    opener = item;
    show(Math.max(0, items.indexOf(item)));

    root.hidden = false;
    isOpen = true;
    document.addEventListener('keydown', onKey, true); // capture: runs before the window manager's Esc
    root.querySelector<HTMLElement>('[data-ql-close]:not(.quicklook__backdrop)')?.focus({ preventScroll: true });

    if (!reducedMotion()) {
      gsap.fromTo(panel, { ...fromThumb(item), autoAlpha: 0.4 }, { x: 0, y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, ...ZOOM });
      gsap.fromTo(root.querySelector('.quicklook__backdrop'), { autoAlpha: 0 }, { autoAlpha: 1, duration: ZOOM.duration });
    }
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    document.removeEventListener('keydown', onKey, true);
    const returnTo = items[index] ?? opener; // the image you ended on, like Finder

    const finish = () => {
      gsap.killTweensOf([panel, img, root.querySelector('.quicklook__backdrop')]);
      gsap.set([panel, img], { clearProps: 'all' });
      root.hidden = true;
      img.removeAttribute('src');
      if (returnTo?.isConnected) {
        // Select it so the highlight follows (set directly: a click would reopen on phones)
        returnTo.closest('[data-select-group]')?.querySelectorAll('[data-selected]').forEach((el) => el.removeAttribute('data-selected'));
        returnTo.setAttribute('data-selected', '');
        returnTo.focus({ preventScroll: true });
      }
      items = [];
      opener = null;
    };

    if (reducedMotion() || !returnTo?.isConnected) {
      finish();
      return;
    }
    gsap.to(panel, { ...fromThumb(returnTo), autoAlpha: 0, ...ZOOM_OUT, onComplete: finish });
    gsap.to(root.querySelector('.quicklook__backdrop'), { autoAlpha: 0, duration: ZOOM_OUT.duration });
  };

  // ---- Switching images: quick crossfade + slide ----
  const go = async (dir: 1 | -1) => {
    if (items.length < 2 || busy) return;
    if (reducedMotion()) {
      show(index + dir);
      return;
    }
    busy = true;
    await gsap.to(img, { autoAlpha: 0, x: -dir * SWITCH.slide, duration: SWITCH.out, ease: 'power1.in' });
    show(index + dir);
    await gsap.fromTo(img, { autoAlpha: 0, x: dir * SWITCH.slide }, { autoAlpha: 1, x: 0, duration: SWITCH.in, ease: 'power2.out' });
    busy = false;
  };

  // ---- Input ----
  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'Escape' || e.key === ' ') {
      // Space closes like Quick Look (even when a viewer button has focus)
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      // Keep focus inside the viewer
      const focusables = [...root.querySelectorAll<HTMLElement>('button:not([hidden])')];
      const i = focusables.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      focusables[(i + (e.shiftKey ? -1 : 1) + focusables.length) % focusables.length]?.focus();
    }
  }

  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-ql-close]')) close();
    else if (t.closest('[data-ql-prev]')) go(-1);
    else if (t.closest('[data-ql-next]')) go(1);
  });

  // Swipe left/right on touch screens
  let startX: number | null = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') startX = e.clientX;
  });
  stage.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) >= SWIPE_MIN_PX) go(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => (startX = null));

  // ---- Wiring ----
  document.addEventListener('quicklook:open', (e) => open((e as CustomEvent<{ item: HTMLElement }>).detail.item));

  // If the folder window closes underneath us, close instantly (nothing to zoom back into)
  document.addEventListener('window:close', (e) => {
    const el = (e as CustomEvent<{ el: HTMLElement }>).detail.el;
    if (isOpen && opener && el.contains(opener)) {
      items = [];
      opener = null;
      close();
    }
  });
}
