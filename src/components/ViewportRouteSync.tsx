import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { syncAssistantViewport } from '../lib/assistantViewport';

/** Aplica viewport sem zoom antes do paint em cada troca de rota */
export default function ViewportRouteSync() {
  const { pathname } = useLocation();

  useEffect(() => {
    syncAssistantViewport(pathname);
  }, [pathname]);

  return null;
}
