/**
 * Finder-style icons: click selects, double-click or Enter opens.
 * On phones a single tap opens. Works for anything with data-select-open="<window id>",
 * including icons inside windows cloned later (listeners are delegated on document).
 * Selection is scoped to the nearest [data-select-group].
 */

const MOBILE_QUERY = '(max-width: 767px)';
const SELECTABLE = '[data-select-open]';

let started = false;

export function initSelection() {
  if (started) return;
  started = true;

  const mobile = window.matchMedia(MOBILE_QUERY);

  const groupOf = (el: Element) => el.closest('[data-select-group]') ?? document;

  const select = (item: HTMLElement | null) => {
    const scope = item ? groupOf(item) : document;
    scope.querySelectorAll<HTMLElement>(`${SELECTABLE}[data-selected]`).forEach((el) => {
      if (el !== item) el.removeAttribute('data-selected');
    });
    item?.setAttribute('data-selected', '');
  };

  const open = (item: HTMLElement) =>
    document.dispatchEvent(
      new CustomEvent('window:request', { detail: { id: item.dataset.selectOpen, opener: item } }),
    );

  const itemFrom = (e: Event) => (e.target as HTMLElement).closest<HTMLElement>(SELECTABLE);

  document.addEventListener('click', (e) => {
    const item = itemFrom(e);
    if (!item) return;
    if (mobile.matches) open(item);
    else select(item);
  });

  document.addEventListener('dblclick', (e) => {
    const item = itemFrom(e);
    if (item && !mobile.matches) open(item);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const item = itemFrom(e);
    if (!item) return;
    e.preventDefault(); // otherwise the button's click would just select
    select(item);
    open(item);
  });

  document.addEventListener('focusin', (e) => {
    const item = itemFrom(e);
    if (item) select(item);
  });

  // Clicking empty space clears the selection in that area
  document.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest(SELECTABLE)) return;
    const scope = target.closest('[data-select-group]') ?? document;
    scope.querySelectorAll(`${SELECTABLE}[data-selected]`).forEach((el) => el.removeAttribute('data-selected'));
  });
}
