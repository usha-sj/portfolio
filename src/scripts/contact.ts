/**
 * Mail (Contact) window: validation, Web3Forms sending, copy-email, send animation.
 *
 * Window content is cloned on open, so everything is wired on 'window:open' and torn
 * down on 'window:close' (including aborting a send that's still in flight).
 */
import { gsap } from 'gsap';

const WINDOW_ID = 'mail';
const ENDPOINT = 'https://api.web3forms.com/submit';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COPY_RESET_MS = 1600;

// Send animation: fold, then fly toward the Send button (each step under 0.6s)
const FOLD = { duration: 0.22, scaleY: 0.55 };
const FLY = { duration: 0.42, scale: 0.06 };
const SENT_IN = { duration: 0.3, y: 10 };

let started = false;

export function initContact() {
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

type FieldName = 'name' | 'email' | 'subject' | 'message';

function setup(windowEl: HTMLElement) {
  const root = windowEl.querySelector<HTMLElement>('[data-mail]');
  if (!root) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const form = root.querySelector<HTMLFormElement>('[data-mail-form]')!;
  const send = root.querySelector<HTMLButtonElement>('[data-mail-send]')!;
  const compose = root.querySelector<HTMLElement>('[data-mail-compose]')!;
  const errorBanner = root.querySelector<HTMLElement>('[data-mail-error]')!;
  const sentPanel = root.querySelector<HTMLElement>('[data-mail-sent]')!;
  const status = root.querySelector<HTMLElement>('[data-mail-status]')!;
  const honeypot = form.querySelector<HTMLInputElement>('[name="botcheck"]')!;
  const accessKey = root.dataset.key ?? '';
  const sendLabel = send.getAttribute('aria-label') ?? '';

  const fields: Record<FieldName, HTMLInputElement | HTMLTextAreaElement> = {
    name: form.querySelector('[name="name"]')!,
    email: form.querySelector('[name="email"]')!,
    subject: form.querySelector('[name="subject"]')!,
    message: form.querySelector('[name="message"]')!,
  };
  const order: FieldName[] = ['name', 'email', 'subject', 'message'];

  const touched = new Set<FieldName>();
  let sending = false;
  let controller: AbortController | null = null;
  let timeline: gsap.core.Timeline | null = null;
  const timers: number[] = [];
  const listeners: [EventTarget, string, EventListener][] = [];
  const on = (target: EventTarget, type: string, fn: EventListener) => {
    target.addEventListener(type, fn);
    listeners.push([target, type, fn]);
  };

  // ---- Validation ----
  const isValid = (name: FieldName) => {
    const value = fields[name].value.trim();
    return name === 'email' ? EMAIL_RE.test(value) : value.length > 0;
  };
  const allValid = () => order.every(isValid);

  const showError = (name: FieldName, show: boolean) => {
    const field = fields[name];
    const error = root.querySelector<HTMLElement>(`#${field.getAttribute('aria-describedby')}`)!;
    field.setAttribute('aria-invalid', String(show));
    error.textContent = show ? (field.dataset.error ?? '') : '';
  };

  const refresh = () => {
    send.disabled = sending || !allValid();
  };

  order.forEach((name) => {
    on(fields[name], 'input', () => {
      if (touched.has(name)) showError(name, !isValid(name));
      refresh();
    });
    // Only nag after someone has left a field
    on(fields[name], 'blur', () => {
      if (fields[name].value.length === 0 && !touched.has(name)) return;
      touched.add(name);
      showError(name, !isValid(name));
    });
  });

  // ---- Sending ----
  const setSending = (on: boolean) => {
    sending = on;
    order.forEach((n) => ((fields[n] as HTMLInputElement).readOnly = on));
    send.setAttribute('aria-label', on ? (status.dataset.sending ?? sendLabel) : sendLabel);
    send.toggleAttribute('aria-busy', on);
    status.textContent = on ? (status.dataset.sending ?? '') : '';
    refresh();
  };

  const submit = async () => {
    if (sending) return;
    if (!allValid()) {
      order.forEach((n) => {
        touched.add(n);
        showError(n, !isValid(n));
      });
      fields[order.find((n) => !isValid(n))!].focus();
      return;
    }

    errorBanner.hidden = true;
    setSending(true);

    // Honeypot ticked: almost certainly a bot. Pretend it worked and send nothing.
    if (honeypot.checked) {
      setSending(false);
      showSent();
      return;
    }

    try {
      if (!accessKey) throw new Error('Missing PUBLIC_WEB3FORMS_KEY');
      controller = new AbortController();
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          subject: `${root.dataset.subjectPrefix ?? ''}${fields.subject.value.trim()}`,
          message: fields.message.value,
          from_name: root.dataset.fromName ?? '',
          botcheck: false,
        }),
        signal: controller.signal,
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (!res.ok || !data.success) throw new Error('Send failed');
      setSending(false);
      showSent();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // window closed mid-send
      setSending(false);
      errorBanner.hidden = false;
    } finally {
      controller = null;
    }
  };

  on(form, 'submit', (e) => {
    e.preventDefault();
    submit();
  });

  // Cmd+Enter (Ctrl+Enter elsewhere) sends, like Mail
  on(form, 'keydown', (e) => {
    const ke = e as KeyboardEvent;
    if (ke.key === 'Enter' && (ke.metaKey || ke.ctrlKey)) {
      ke.preventDefault();
      submit();
    }
  });

  on(root.querySelector('[data-mail-retry]')!, 'click', () => submit());

  // ---- Sent: fold + fly toward Send, then the confirmation ----
  function showSent() {
    send.hidden = true; // nothing to send from the confirmation screen
    const reveal = () => {
      compose.style.visibility = 'hidden';
      sentPanel.hidden = false;
      sentPanel.focus();
    };

    if (reducedMotion) {
      reveal();
      return;
    }

    const from = compose.getBoundingClientRect();
    const to = send.getBoundingClientRect();
    // transform-origin is the compose area's top-right; aim that corner at the Send button
    const dx = to.left + to.width / 2 - from.right;
    const dy = to.top + to.height / 2 - from.top;

    timeline = gsap
      .timeline()
      .to(compose, { scaleY: FOLD.scaleY, duration: FOLD.duration, ease: 'power2.in' })
      .to(compose, {
        x: dx,
        y: dy,
        scale: FLY.scale,
        autoAlpha: 0,
        duration: FLY.duration,
        ease: 'power3.in',
      });
    timeline.eventCallback('onComplete', () => {
      reveal();
      gsap.from(sentPanel, { autoAlpha: 0, y: SENT_IN.y, duration: SENT_IN.duration, ease: 'power2.out' });
    });
  }

  on(root.querySelector('[data-mail-again]')!, 'click', () => {
    timeline?.kill();
    timeline = null;
    form.reset();
    touched.clear();
    order.forEach((n) => showError(n, false));
    gsap.set([compose, sentPanel], { clearProps: 'all' });
    compose.style.visibility = '';
    sentPanel.hidden = true;
    send.hidden = false;
    errorBanner.hidden = true;
    refresh();
    fields.name.focus();
  });

  // ---- Copy email (chip + error fallback) ----
  root.querySelectorAll<HTMLButtonElement>('[data-mail-copy]').forEach((button) => {
    const label = button.querySelector<HTMLElement>('[data-mail-copy-label]')!;
    const original = label.textContent ?? '';
    on(button, 'click', async () => {
      const email = button.dataset.email ?? '';
      let ok = false;
      try {
        await navigator.clipboard.writeText(email);
        ok = true;
      } catch {
        // Older browsers / insecure contexts: fall back to a hidden textarea
        const ta = document.createElement('textarea');
        ta.value = email;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.append(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      }
      label.textContent = ok ? (button.dataset.copied ?? '') : (button.dataset.failed ?? '');
      timers.push(window.setTimeout(() => (label.textContent = original), COPY_RESET_MS));
    });
  });

  refresh();

  return () => {
    controller?.abort();
    timeline?.kill();
    gsap.killTweensOf([compose, sentPanel]);
    timers.forEach(clearTimeout);
    listeners.forEach(([t, type, fn]) => t.removeEventListener(type, fn));
  };
}
