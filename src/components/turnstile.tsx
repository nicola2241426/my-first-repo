'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';

type TurnstileTheme = 'light' | 'dark' | 'auto';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: TurnstileTheme;
      callback?: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: TurnstileTheme;
}

export function Turnstile({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onVerifyRef.current = onVerify;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  }, [onVerify, onExpire, onError]);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    const render = () => {
      if (cancelled || widgetIdRef.current) return;
      const container = containerRef.current;
      const turnstile = window.turnstile;
      if (!container || !turnstile) return;

      widgetIdRef.current = turnstile.render(container, {
        sitekey: siteKey,
        theme,
        callback: (token) => onVerifyRef.current(token),
        'expired-callback': () => onExpireRef.current?.(),
        'error-callback': () => onErrorRef.current?.(),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      interval = setInterval(() => {
        if (window.turnstile) {
          if (interval) clearInterval(interval);
          render();
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      const widgetId = widgetIdRef.current;
      if (widgetId && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          // ignore
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, theme]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div ref={containerRef} />
    </>
  );
}
