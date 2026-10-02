/**
 * Notes (About) window: switching notes, draggable stickers, GSAP animations.
 *
 * Each window open clones fresh content, so everything is set up on 'window:open' and
 * torn down on 'window:close'. Switching notes tears down and rebuilds the sticker
 * animations, which also resets positions (as does reopening the window).
 *
 * Sticker markup: .sticker[data-sticker] (positioned; Draggable moves it with x/y and
 * scales it) > .sticker__inner[data-sticker-inner] (idle bob, wiggle and drag tilt), so
 * the two never fight over the same transform. GSAP folds the sticker's CSS `rotate`
 * (its resting tilt) into its transform, so cleanup clears both.
 */
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(Draggable, InertiaPlugin);

const WINDOW_ID = 'notes';

// Feel: subtle and quick
const ENTRANCE = { textDuration: 0.3, popDuration: 0.45, stagger: 0.07, gap: 0.05 };
const DRAG = { scale: 1.08, maxTilt: 12, tiltPerPx: 1.4 };
const BOB = { distance: 5, minDuration: 2.4, maxDuration: 3.6 };
const WIGGLE = { angles: [0, -7, 6, -3, 0], duration: 0.45 };
const TIDY = { duration: 0.55, stagger: 0.03 };

let started = false;

export function initNotes() {
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

function setup(windowEl: HTMLElement) {
  const root = windowEl.querySelector<HTMLElement>('[data-notes]');
  if (!root) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Touch screens: dragging would fight scrolling, so stickers just wiggle on tap
  const touch = window.matchMedia('(pointer: coarse), (max-width: 767px)').matches;

  const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-note-tab]')];
  const notes = [...root.querySelectorAll<HTMLElement>('[data-note]')];
  const tidyButton = root.querySelector<HTMLButtonElement>('[data-notes-tidy]')!;

  let active: ReturnType<typeof activateNote> | null = null;

  const show = (id: string) => {
    active?.destroy();
    tabs.forEach((t) =>
      t.dataset.noteTab === id ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current'),
    );
    notes.forEach((n) => (n.hidden = n.dataset.note !== id));
    active = activateNote(notes.find((n) => n.dataset.note === id)!, { reducedMotion, touch });
  };

  // ---- Sidebar: click, plus Up/Down arrows like a list ----
  const onTabClick = (e: Event) => show((e.currentTarget as HTMLElement).dataset.noteTab!);
  const onTabKey = (e: KeyboardEvent) => {
    const i = tabs.indexOf(e.currentTarget as HTMLButtonElement);
    let next = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(i + 1, tabs.length - 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(i - 1, 0);
    if (next < 0 || next === i) return;
    e.preventDefault();
    tabs[next].focus();
    show(tabs[next].dataset.noteTab!);
  };
  tabs.forEach((t) => {
    t.addEventListener('click', onTabClick);
    t.addEventListener('keydown', onTabKey);
  });

  const onTidy = () => active?.tidy();
  tidyButton.addEventListener('click', onTidy);

  show(tabs.find((t) => t.getAttribute('aria-current') === 'true')?.dataset.noteTab ?? tabs[0].dataset.noteTab!);

  return () => {
    tabs.forEach((t) => {
      t.removeEventListener('click', onTabClick);
      t.removeEventListener('keydown', onTabKey);
    });
    tidyButton.removeEventListener('click', onTidy);
    active?.destroy();
    active = null;
  };
}

/** Sets up one visible note: entrance, idle bobbing, dragging, hover/tap wiggle. */
function activateNote(note: HTMLElement, { reducedMotion, touch }: { reducedMotion: boolean; touch: boolean }) {
  const paper = note.querySelector<HTMLElement>('[data-note-paper]')!;
  const text = note.querySelector<HTMLElement>('[data-note-text]')!;
  const stickers = [...note.querySelectorAll<HTMLElement>('[data-sticker]')];
  const inner = (s: HTMLElement) => s.querySelector<HTMLElement>('[data-sticker-inner]')!;

  let draggables: Draggable[] = [];
  const bobs = new Map<HTMLElement, gsap.core.Tween>();
  const cleanups: (() => void)[] = [];
  let zTop = stickers.length + 1;
  let dragging = false;

  const wiggle = (s: HTMLElement) => {
    if (reducedMotion || dragging) return;
    gsap.to(inner(s), {
      keyframes: { rotation: WIGGLE.angles },
      duration: WIGGLE.duration,
      ease: 'sine.inOut',
      overwrite: 'auto',
    });
  };

  const ctx = gsap.context(() => {
    // ---- Entrance: text first, then stickers pop in ----
    if (!reducedMotion) {
      gsap
        .timeline()
        .from(text, { autoAlpha: 0, y: 8, duration: ENTRANCE.textDuration, ease: 'power2.out' })
        .from(
          stickers,
          { scale: 0, autoAlpha: 0, duration: ENTRANCE.popDuration, ease: 'back.out(2.2)', stagger: ENTRANCE.stagger },
          `+=${ENTRANCE.gap}`,
        );

      // ---- Idle: a few stickers bob, each on its own timing ----
      stickers
        .filter((s) => s.hasAttribute('data-float'))
        .forEach((s) => {
          bobs.set(
            s,
            gsap.to(inner(s), {
              y: -BOB.distance,
              duration: gsap.utils.random(BOB.minDuration, BOB.maxDuration),
              delay: gsap.utils.random(0.6, 1.8),
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
            }),
          );
        });
    }
  }, note);

  // ---- Touch: tap to wiggle, no dragging ----
  if (touch) {
    stickers.forEach((s) => {
      const onTap = () => wiggle(s);
      s.addEventListener('click', onTap);
      cleanups.push(() => s.removeEventListener('click', onTap));
    });
  } else {
    // ---- Mouse/trackpad: drag with a little throw ----
    draggables = Draggable.create(stickers, {
      type: 'x,y',
      bounds: paper,
      inertia: !reducedMotion,
      edgeResistance: 0.8,
      onPress(this: Draggable) {
        const s = this.target as HTMLElement;
        s.style.zIndex = String(++zTop); // grabbed sticker comes to the front
        dragging = true;
        bobs.get(s)?.pause();
        if (!reducedMotion) gsap.to(s, { scale: DRAG.scale, '--lift': 1, duration: 0.15, ease: 'power2.out' });
      },
      onDrag(this: Draggable) {
        if (reducedMotion) return;
        // Tilt toward the direction of travel
        const tilt = gsap.utils.clamp(-DRAG.maxTilt, DRAG.maxTilt, this.deltaX * DRAG.tiltPerPx);
        gsap.to(inner(this.target as HTMLElement), { rotation: tilt, duration: 0.2, overwrite: 'auto' });
      },
      onRelease(this: Draggable) {
        const s = this.target as HTMLElement;
        dragging = false;
        if (!reducedMotion) {
          gsap.to(s, { scale: 1, '--lift': 0, duration: 0.35, ease: 'back.out(2)' });
          gsap.to(inner(s), { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' });
        }
        bobs.get(s)?.resume();
      },
    });

    if (!reducedMotion) {
      stickers.forEach((s) => {
        const onEnter = () => wiggle(s);
        s.addEventListener('pointerenter', onEnter);
        cleanups.push(() => s.removeEventListener('pointerenter', onEnter));
      });
    }
  }

  return {
    /** Animate every sticker back to where it started. */
    tidy() {
      const props = { x: 0, y: 0, scale: 1 };
      if (reducedMotion) {
        gsap.set(stickers, props);
      } else {
        gsap.to(stickers, { ...props, duration: TIDY.duration, ease: 'power3.inOut', stagger: TIDY.stagger, overwrite: 'auto' });
      }
      draggables.forEach((d) => d.update());
    },
    destroy() {
      draggables.forEach((d) => d.kill());
      draggables = [];
      cleanups.forEach((fn) => fn());
      ctx.revert(); // entrance + bobs
      // Clear anything Draggable/drag tweens left behind, so the note starts fresh next time
      gsap.killTweensOf([...stickers, ...stickers.map(inner)]);
      gsap.set([...stickers, ...stickers.map(inner)], { clearProps: 'transform,translate,rotate,scale,opacity,visibility,zIndex,--lift' });
    },
  };
}
