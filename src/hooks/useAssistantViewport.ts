import { useEffect, useState } from 'react';
import { attachNoZoomGestures, syncAssistantViewport } from '../lib/assistantViewport';

/**
 * Teclado virtual + bloqueio de zoom no assistente (/b/:slug).
 */
export function useAssistantViewport(pathname: string) {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    syncAssistantViewport(pathname);
    attachNoZoomGestures();

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
      window.visualViewport?.removeEventListener('resize', updateKeyboardInset);
      window.visualViewport?.removeEventListener('scroll', updateKeyboardInset);
      setKeyboardInset(0);
    };
  }, [pathname]);

  return keyboardInset;
}
