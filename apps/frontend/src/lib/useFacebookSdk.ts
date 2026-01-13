// apps/frontend/src/lib/useFacebookSdk.ts
import { useEffect, useState } from 'react';

declare global {
  interface Window { fbAsyncInit?: () => void; FB: any; }
}

export function useFacebookSdk(appId: string, version = 'v21.0') {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).FB) { setReady(true); return; }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version
      });
      setReady(true);
    };

    const id = 'facebook-jssdk';
    if (!document.getElementById(id)) {
      const js = document.createElement('script');
      js.id = id;
      js.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.body.appendChild(js);
    } else {
      setReady(true);
    }
  }, [appId, version]);

  return ready;
}
