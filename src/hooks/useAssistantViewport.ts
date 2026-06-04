import { useEffect, useState } from 'react';

const VIEWPORT_DEFAULT = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
/** Sem zoom no iOS; teclado sobrepõe a página em vez de redimensionar */
const VIEWPORT_ASSISTANT =
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content';

/**
 * Modo tela cheia do assistente: bloqueia zoom ao focar input e mede altura do teclado.
 */
export function useAssistantViewport() {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const previous = meta?.getAttribute('content') ?? VIEWPORT_DEFAULT;
    meta?.setAttribute('content', VIEWPORT_ASSISTANT);

    document.documentElement.classList.add('assistant-fullscreen');
    document.body.classList.add('assistant-fullscreen');

    const updateKeyboardInset = () => {
      const vv = window.visualViewport;
      if (!vv) {
        setKeyboardInset(0);
        return;
      }
      const gap = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardInset(gap > 80 ? Math.round(gap) : 0);
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener('resize', updateKeyboardInset);
    window.visualViewport?.addEventListener('scroll', updateKeyboardInset);

    return () => {
      meta?.setAttribute('content', previous);
      document.documentElement.classList.remove('assistant-fullscreen');
      document.body.classList.remove('assistant-fullscreen');
      window.visualViewport?.removeEventListener('resize', updateKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardInset);
      setKeyboardInset(0);
    };
  }, []);

  return keyboardInset;
}
