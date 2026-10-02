/**
 * Finder window: sidebar switches between Projects (by `order`) and Recents (newest year first).
 * Window content is cloned from a <template> on open, so this wires each new copy on 'window:open'.
 */

let started = false;

export function initFinder() {
  if (started) return;
  started = true;

  document.addEventListener('window:open', (e) => {
    const { id, el } = (e as CustomEvent<{ id: string; el: HTMLElement }>).detail;
    if (id !== 'finder') return;

    const list = el.querySelector<HTMLElement>('[data-finder-list]')!;
    const buttons = [...el.querySelectorAll<HTMLButtonElement>('[data-finder-view]')];
    const items = [...list.children] as HTMLElement[];

    const show = (view: string) => {
      const sorted = [...items].sort((a, b) =>
        view === 'recents'
          ? Number(b.dataset.year) - Number(a.dataset.year)
          : Number(a.dataset.order) - Number(b.dataset.order),
      );
      list.replaceChildren(...sorted);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.finderView === view)));
    };

    buttons.forEach((b) => b.addEventListener('click', () => show(b.dataset.finderView!)));
  });
}
