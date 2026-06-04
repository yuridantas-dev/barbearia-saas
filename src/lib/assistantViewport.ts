/** Viewport que impede zoom no iOS ao focar inputs (Safari ignora se mudar só depois do React). */
export const VIEWPORT_NO_ZOOM =
  'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content';

const VIEWPORT_DEFAULT = 'width=device-width, initial-scale=1, viewport-fit=cover';

export function isAssistantPath(pathname: string): boolean {
  return pathname.startsWith('/b/');
}

export function syncAssistantViewport(pathname: string): void {
  const meta = document.querySelector('meta[name="viewport"]');
  const assistant = isAssistantPath(pathname);

  if (meta) {
    meta.setAttribute('content', assistant ? VIEWPORT_NO_ZOOM : VIEWPORT_DEFAULT);
  }

  document.documentElement.classList.toggle('assistant-fullscreen', assistant);
  document.body.classList.toggle('assistant-fullscreen', assistant);
}

/** Truque clássico do iOS: evita zoom automático ao tocar no input */
export function primeInputNoZoom(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.readOnly = true;
  requestAnimationFrame(() => {
    el.readOnly = false;
  });
}

let gestureListenersAttached = false;

export function attachNoZoomGestures(): void {
  if (gestureListenersAttached) return;
  gestureListenersAttached = true;

  const block = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', block, { passive: false });
  document.addEventListener('gesturechange', block, { passive: false });
  document.addEventListener('gestureend', block, { passive: false });
}

export function detachNoZoomGestures(): void {
  if (!gestureListenersAttached) return;
  gestureListenersAttached = false;
  /* listeners permanecem — só evita duplicar; impacto mínimo fora do assistente */
}
