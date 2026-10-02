/**
 * Runs `fn` now, then at the start of every minute. Re-syncs when the tab
 * becomes visible again (timers drift or pause in background tabs).
 */
export function everyMinute(fn: () => void) {
  let timer: ReturnType<typeof setTimeout>;

  const schedule = () => {
    clearTimeout(timer);
    fn();
    const msToNextMinute = 60_000 - (Date.now() % 60_000);
    timer = setTimeout(schedule, msToNextMinute + 50);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') schedule();
  });

  schedule();
}
