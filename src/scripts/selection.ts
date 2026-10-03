/**
 * Finder-style icons: click selects, double-click or Enter opens.
 * On phones a single tap opens. Works for anything with data-select-open="<window id>",
 * including icons inside windows cloned later (listeners are delegated on document).
 * Selection is scoped to the nearest [data-select-group].
 */

const MOBILE_QUERY = '(max-width: 767px)';
// What each kind of icon opens:
//   data-select-open="<window id>"  → that window
//   data-quicklook                  → Quick Look (images; see quicklook.ts)
//   data-open-url="<url>"           → a new tab (.webloc links)
const SELECTABLE = '[data-select-open], [data-quicklook], [data-open-url]';
const SELECTED = SELECTABLE.split(',').map((sel) => `${sel.trim()}[data-selected]`).join(', ');

let started = false;

export function initSelection() {
  if (started) return;
  started = true;

  const mobile = window.matchMedia(MOBILE_QUERY);

  const groupOf = (el: Element) => el.closest('[data-select-group]') ?? document;

  const select = (item: HTMLElement | null) => {
    const scope = item ? groupOf(item) : document;
    scope.querySelectorAll<HTMLElement>(SELECTED).forEach((el) => {
      if (el !== item) el.removeAttribute('data-selected');
    });
    item?.setAttribute('data-selected', '');
  };

  const open = (item: HTMLElement) => {
    if (item.dataset.openUrl) {
      window.open(item.dataset.openUrl, '_blank', 'noopener,noreferrer');
    } else if (item.hasAttribute('data-quicklook')) {
      document.dispatchEvent(new CustomEvent('quicklook:open', { detail: { item } }));
    } else {
      document.dispatchEvent(new CustomEvent('window:request', { detail: { id: item.dataset.selectOpen, opener: item } }));
    }
  };

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
    const item = itemFrom(e);
    if (!item) return;
    // Enter opens anything; Space opens images in Quick Look, like Finder
    if (e.key === 'Enter' || (e.key === ' ' && item.hasAttribute('data-quicklook'))) {
      e.preventDefault(); // otherwise the button's click would just select
      select(item);
      open(item);
    }
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
    scope.querySelectorAll(SELECTED).forEach((el) => el.removeAttribute('data-selected'));
  });
}
