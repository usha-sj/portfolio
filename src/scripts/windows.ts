/**
 * Window manager: opens, focuses, closes, minimises, maximises and drags windows,
 * and keeps the URL in sync (each history entry stores which windows are open).
 *
 * Opening a window from anywhere:
 *   - any element with data-open-window="<id>" opens it on click
 *   - or: document.dispatchEvent(new CustomEvent('window:request', { detail: { id } }))
 *
 * Events fired on document (detail: { id, el }): window:open, window:close, window:focus,
 * window:maximize (detail also has `maximized`).
 * Window content is cloned from a <template>, so content scripts live in src/scripts/,
 * set themselves up on 'window:open', and are started from WindowLayer.astro
 * (see finder.ts, resume.ts). Don't put <script> tags in window components.
 */

// ---------------------------------------------------------------------------
// GSAP hooks. Fill these in later; they're called at the right moments.
// ---------------------------------------------------------------------------

/** After a window is added and positioned. Animate it in here. */
function onWindowOpen(_el: HTMLElement, _id: string) {}

/** Before a window is removed. Return a promise (e.g. your GSAP timeline) to delay removal. */
async function onWindowClose(_el: HTMLElement, _id: string): Promise<void> {}

/** When a window comes to the front. */
function onWindowFocus(_el: HTMLElement, _id: string) {}

// ---------------------------------------------------------------------------

interface WindowDef {
  id: string;
  app: string;
  appLabel: string;
  title: string;
  path: string;
  size: string;
  template: HTMLTemplateElement;
}

interface OpenWindow {
  el: HTMLElement;
  opener: HTMLElement | null; // focus returns here on close
}

interface WMState {
  open: string[];
  focused: string | null;
}

const MOBILE_QUERY = '(max-width: 767px)';

export function initWindowManager() {
  // Wait for every module script on the page, so content listeners for 'window:open'
  // are registered before the first window (from the URL) opens.
  // Module scripts run while readyState is already 'interactive', so only 'complete'
  // means every script has run. 'load' is a fallback in case DOMContentLoaded has passed.
  if (document.readyState === 'complete') {
    setup();
    return;
  }
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    setup();
  };
  document.addEventListener('DOMContentLoaded', once, { once: true });
  window.addEventListener('load', once, { once: true });
}

function setup() {
  const layer = document.querySelector<HTMLElement>('[data-window-layer]');
  const chrome = document.querySelector<HTMLTemplateElement>('#window-chrome');
  if (!layer || !chrome) return;

  const siteTitle = layer.dataset.siteTitle ?? document.title;
  const mobile = window.matchMedia(MOBILE_QUERY);
  const menubarApp = document.querySelector<HTMLElement>('[data-menubar-app]');

  // ---- Registry, built from the templates on the page ----
  const defs = new Map<string, WindowDef>();
  const idByPath = new Map<string, string>();
  for (const t of document.querySelectorAll<HTMLTemplateElement>('template[data-window-template]')) {
    const d = t.dataset;
    const def: WindowDef = {
      id: d.windowTemplate!,
      app: d.app!,
      appLabel: d.appLabel!,
      title: d.title!,
      path: d.path!,
      size: d.size ?? 'default',
      template: t,
    };
    defs.set(def.id, def);
    idByPath.set(def.path, def.id);
  }

  const windows = new Map<string, OpenWindow>();
  let zCounter = 1;
  let cascadeIndex = 0;

  // ---- Helpers ----
  const normalize = (path: string) => path.replace(/\/+$/, '') || '/';
  const cssPx = (name: string) =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

  const isMinimized = (id: string) => windows.get(id)?.el.classList.contains('is-minimized') ?? false;

  const focusedId = () => {
    for (const [id, w] of windows) if (w.el.classList.contains('is-focused')) return id;
    return null;
  };

  // Highest visible window, i.e. the one that should be focused next
  const topVisible = () => {
    let best: string | null = null;
    let bestZ = -1;
    for (const [id, w] of windows) {
      const z = Number(w.el.style.zIndex);
      if (!isMinimized(id) && z > bestZ) {
        best = id;
        bestZ = z;
      }
    }
    return best;
  };

  const windowIdOf = (node: Element | null) =>
    node?.closest<HTMLElement>('[data-window-id]')?.dataset.windowId ?? null;

  const dispatch = (name: string, id: string, el: HTMLElement) =>
    document.dispatchEvent(new CustomEvent(name, { detail: { id, el } }));

  // ---- URL / history ----
  const currentState = (): WMState => ({ open: [...windows.keys()], focused: focusedId() });
  const urlFor = (s: WMState) => (s.focused ? defs.get(s.focused)!.path : '/');

  function record(mode: 'push' | 'replace') {
    const s = currentState();
    const url = urlFor(s);
    const same = normalize(location.pathname) === url;
    // Focus changes and no-op opens shouldn't add history entries
    if (mode === 'push' && same) mode = 'replace';
    const data = { ...(history.state ?? {}), wm: s };
    if (mode === 'push') history.pushState(data, '', url);
    else history.replaceState(data, '', same ? location.pathname : url);
  }

  // ---- Shared UI that reflects window state ----
  function syncChrome() {
    const fid = focusedId();
    const def = fid ? defs.get(fid) : null;

    if (menubarApp) {
      menubarApp.textContent = def?.appLabel ?? '';
      menubarApp.hidden = !def;
    }

    // Dock dots: an app is running if any of its windows is open (minimised counts)
    const running = new Set([...windows.keys()].map((id) => defs.get(id)!.app));
    for (const item of document.querySelectorAll<HTMLElement>('[data-dock-app]')) {
      const app = item.dataset.dockApp!;
      const isRunning = running.has(app);
      item.toggleAttribute('data-running', isRunning);
      const button = item.querySelector<HTMLElement>('[data-open-window]');
      if (button) button.setAttribute('aria-label', `${item.dataset.label}${isRunning ? ' (open)' : ''}`);
    }

    const anyVisible = [...windows.keys()].some((id) => !isMinimized(id));
    document.documentElement.classList.toggle('has-open-window', anyVisible);
    document.title = def ? `${def.title} · ${siteTitle}` : siteTitle;
  }

  // ---- Placement ----
  function setPosition(el: HTMLElement, x: number, y: number) {
    const margin = cssPx('--window-margin');
    const maxX = layer!.clientWidth - el.offsetWidth - margin;
    const maxY = layer!.clientHeight - el.offsetHeight - margin;
    el.style.left = `${clamp(x, margin, maxX)}px`;
    el.style.top = `${clamp(y, margin, maxY)}px`;
  }

  // New windows start near the centre and step down-right so they never stack exactly
  function placeNew(el: HTMLElement) {
    const step = cssPx('--window-cascade');
    const usableH = layer!.clientHeight - cssPx('--dock-h');
    const n = cascadeIndex++ % 6;
    const x = (layer!.clientWidth - el.offsetWidth) / 2 - step * 2 + n * step;
    const y = (usableH - el.offsetHeight) / 2 - step * 2 + n * step;
    setPosition(el, x, y);
  }

  // ---- Core actions ----
  function focusWindow(id: string, { moveFocus = true } = {}) {
    const w = windows.get(id);
    if (!w) return;
    for (const [otherId, other] of windows) other.el.classList.toggle('is-focused', otherId === id);
    w.el.style.zIndex = String(++zCounter);
    if (moveFocus && !w.el.contains(document.activeElement)) w.el.focus({ preventScroll: true });
    syncChrome();
    onWindowFocus(w.el, id);
    dispatch('window:focus', id, w.el);
  }

  function openWindow(id: string, { history: mode = 'push' as 'push' | 'replace' | false, opener = null as HTMLElement | null } = {}) {
    const def = defs.get(id);
    if (!def) return;

    const existing = windows.get(id);
    if (existing) {
      // Already open (maybe minimised): bring it back instead of duplicating
      existing.el.classList.remove('is-minimized');
      focusWindow(id);
      if (mode) record(mode);
      return;
    }

    const el = chrome!.content.firstElementChild!.cloneNode(true) as HTMLElement;
    el.dataset.windowId = id;
    el.dataset.size = def.size;
    el.dataset.app = def.app;

    const title = el.querySelector<HTMLElement>('[data-window-title]')!;
    title.textContent = def.title;
    title.id = `window-title-${id.replace(/[^\w-]/g, '-')}`;
    el.setAttribute('aria-labelledby', title.id);

    el.querySelector('[data-window-body]')!.append(def.template.content.cloneNode(true));
    layer!.append(el);

    windows.set(id, { el, opener });
    placeNew(el);
    wireWindow(el, id);
    focusWindow(id);

    onWindowOpen(el, id);
    dispatch('window:open', id, el);
    if (mode) record(mode);
  }

  async function closeWindow(id: string, { history: mode = 'push' as 'push' | 'replace' | false } = {}) {
    const w = windows.get(id);
    if (!w) return;
    const hadFocus = w.el.contains(document.activeElement);

    windows.delete(id);
    w.el.classList.remove('is-focused');
    w.el.inert = true; // no more clicks or focus while a close animation plays
    dispatch('window:close', id, w.el);
    const next = topVisible();
    if (next) focusWindow(next, { moveFocus: false });
    else syncChrome();
    if (mode) record(mode);

    // Return focus to whatever opened the window (dock icon, folder, link...)
    if (hadFocus || document.activeElement === document.body) {
      if (w.opener?.isConnected && w.opener.offsetParent !== null) w.opener.focus();
      else if (next) windows.get(next)!.el.focus({ preventScroll: true });
    }

    await onWindowClose(w.el, id);
    w.el.remove();
  }

  function minimizeWindow(id: string) {
    const w = windows.get(id);
    if (!w) return;
    w.el.classList.add('is-minimized');
    w.el.classList.remove('is-focused');
    const next = topVisible();
    if (next) focusWindow(next);
    else {
      syncChrome();
      // Nothing left on screen: move focus to the app's dock icon (where it can be restored)
      document.querySelector<HTMLElement>(`[data-dock-app="${defs.get(id)!.app}"] [data-open-window]`)?.focus();
    }
    record('replace');
  }

  function toggleMaximize(id: string) {
    const w = windows.get(id);
    if (!w) return;
    const on = w.el.classList.toggle('is-maximized');
    w.el
      .querySelector('[data-window-action="maximize"]')
      ?.setAttribute('aria-label', on ? 'Restore window size' : 'Maximise window');
    document.dispatchEvent(new CustomEvent('window:maximize', { detail: { id, el: w.el, maximized: on } }));
  }

  // ---- Per-window wiring: focus on click, buttons, dragging ----
  function wireWindow(el: HTMLElement, id: string) {
    const bringForward = () => {
      if (windows.has(id) && focusedId() !== id) {
        focusWindow(id, { moveFocus: false });
        record('replace');
      }
    };
    el.addEventListener('pointerdown', bringForward, true);
    el.addEventListener('focusin', bringForward);

    el.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).closest<HTMLElement>('[data-window-action]')?.dataset.windowAction;
      if (action === 'close') closeWindow(id);
      else if (action === 'minimize') minimizeWindow(id);
      else if (action === 'maximize') toggleMaximize(id);
    });

    const bar = el.querySelector<HTMLElement>('[data-window-drag]')!;

    // Double-click the title bar toggles maximise, like macOS
    bar.addEventListener('dblclick', (e) => {
      if (!(e.target as HTMLElement).closest('button') && !mobile.matches) toggleMaximize(id);
    });

    bar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || mobile.matches || el.classList.contains('is-maximized')) return;
      if ((e.target as HTMLElement).closest('button')) return;

      const startX = e.clientX - el.offsetLeft;
      const startY = e.clientY - el.offsetTop;
      bar.setPointerCapture(e.pointerId);
      el.classList.add('is-dragging');

      const move = (ev: PointerEvent) => setPosition(el, ev.clientX - startX, ev.clientY - startY);
      const end = () => {
        el.classList.remove('is-dragging');
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', end);
        bar.removeEventListener('pointercancel', end);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);
    });
  }

  // Restore a history entry exactly: close what shouldn't be open, open what should
  function applyState(s: WMState) {
    for (const id of [...windows.keys()]) if (!s.open.includes(id)) closeWindow(id, { history: false });
    for (const id of s.open) if (!windows.has(id)) openWindow(id, { history: false });
    if (s.focused && windows.has(s.focused)) {
      windows.get(s.focused)!.el.classList.remove('is-minimized');
      focusWindow(s.focused);
    }
  }

  // ---- Global listeners ----

  // Anything with data-open-window: dock icons, menu items, Finder items...
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const trigger = (e.target as HTMLElement).closest<HTMLElement>('[data-open-window]');
    if (!trigger) return;
    e.preventDefault();
    openWindow(trigger.dataset.openWindow!, { opener: trigger });
  });

  // Programmatic requests (desktop folders use this)
  document.addEventListener('window:request', (e) => {
    const { id, opener } = (e as CustomEvent<{ id: string; opener?: HTMLElement }>).detail;
    openWindow(id, { opener: opener ?? null });
  });

  // Esc closes the focused window (unless something else, like the menu, handled it)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    if (document.documentElement.classList.contains('loader-active')) return;
    const active = document.activeElement;
    const id = windowIdOf(active) ?? (!active || active === document.body ? topVisible() : null);
    if (id) {
      e.preventDefault();
      closeWindow(id);
    }
  });

  window.addEventListener('popstate', (e) => {
    const s = (e.state?.wm as WMState | undefined) ?? stateFromPath(location.pathname);
    applyState(s);
  });

  // Keep windows on screen when the viewport shrinks
  window.addEventListener('resize', () => {
    if (mobile.matches) return;
    for (const w of windows.values()) setPosition(w.el, w.el.offsetLeft, w.el.offsetTop);
  });

  function stateFromPath(path: string): WMState {
    const id = idByPath.get(normalize(path));
    return id ? { open: [id], focused: id } : { open: [], focused: null };
  }

  // ---- Initial window from the URL (/about, /projects/foo, ...) ----
  const initial = layer.dataset.initialWindow;
  if (initial && defs.has(initial)) openWindow(initial, { history: false });
  syncChrome();
  history.replaceState({ ...(history.state ?? {}), wm: currentState() }, '', location.pathname);
}
