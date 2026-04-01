import { useCallback, useEffect, useRef, useState } from 'react';
import './PwaInstallPrompt.scss';

const DISMISS_KEY = 'pwa-install-dismissed';

// ── Platform detection ──────────────────────────────────────────────────────
function detectPlatform() {
  const ua = navigator.userAgent || '';
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    navigator.standalone === true;

  if (isStandalone) return 'standalone';

  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
    return isSafari ? 'ios-safari' : 'ios-chrome';
  }

  if (/Android/.test(ua)) return 'android';

  return 'desktop';
}

// ── Hook: usePwaInstall ─────────────────────────────────────────────────────
export function usePwaInstall() {
  const [platform] = useState(detectPlatform);
  const deferredPrompt = useRef(null);
  const [showAuto, setShowAuto] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const isDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
  const isInstalled = platform === 'standalone';

  // Capture Android beforeinstallprompt
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Auto-show on first visit after delay
  useEffect(() => {
    if (isInstalled || isDismissed) return;
    const timer = setTimeout(() => setShowAuto(true), 2000);
    return () => clearTimeout(timer);
  }, [isInstalled, isDismissed]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setShowAuto(false);
    setManualOpen(false);
  }, []);

  const triggerNativeInstall = useCallback(async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const result = await deferredPrompt.current.userChoice;
    if (result.outcome === 'accepted') {
      dismiss();
    }
    deferredPrompt.current = null;
  }, [dismiss]);

  const openManual = useCallback(() => setManualOpen(true), []);
  const closeManual = useCallback(() => setManualOpen(false), []);

  return {
    platform,
    isInstalled,
    showAuto,
    manualOpen,
    dismiss,
    triggerNativeInstall,
    openManual,
    closeManual,
  };
}

// ── Android bottom banner ───────────────────────────────────────────────────
function AndroidBanner({ onInstall, onDismiss }) {
  return (
    <div className="pwa-banner">
      <div className="pwa-banner__content">
        <img src="/icons/icon-192.svg" alt="" className="pwa-banner__icon" />
        <div className="pwa-banner__text">
          <strong>Re-smash</strong>
          <span>התקן את האפליקציה לגישה מהירה</span>
        </div>
      </div>
      <div className="pwa-banner__actions">
        <button className="pwa-banner__dismiss" onClick={onDismiss}>
          לא עכשיו
        </button>
        <button className="pwa-banner__install" onClick={onInstall}>
          התקן
        </button>
      </div>
    </div>
  );
}

// ── iOS Safari modal ────────────────────────────────────────────────────────
function IosSafariModal({ onDismiss }) {
  return (
    <div className="pwa-modal-overlay" onClick={onDismiss}>
      <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-modal__close" onClick={onDismiss} aria-label="סגור">×</button>
        <img src="/icons/icon-192.svg" alt="" className="pwa-modal__app-icon" />
        <h2 className="pwa-modal__title">התקן את Re-smash</h2>
        <p className="pwa-modal__subtitle">הוסף למסך הבית לגישה מהירה</p>

        <ol className="pwa-modal__steps">
          <li className="pwa-modal__step">
            <div className="pwa-modal__step-icon">
              {/* Share icon (iOS) */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
            </div>
            <span>לחצו על כפתור <strong>השיתוף</strong> בתפריט הדפדפן</span>
          </li>
          <li className="pwa-modal__step">
            <div className="pwa-modal__step-icon">
              {/* Plus in square icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <span>גללו ולחצו על <strong>הוסף למסך הבית</strong></span>
          </li>
          <li className="pwa-modal__step">
            <div className="pwa-modal__step-icon">
              {/* Check icon */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <span>לחצו <strong>הוסף</strong> לאישור</span>
          </li>
        </ol>
      </div>
    </div>
  );
}

// ── iOS Chrome (non-Safari) modal ───────────────────────────────────────────
function IosChromeModal({ onDismiss }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const el = document.createElement('textarea');
      el.value = url;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="pwa-modal-overlay" onClick={onDismiss}>
      <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pwa-modal__close" onClick={onDismiss} aria-label="סגור">×</button>
        <img src="/icons/icon-192.svg" alt="" className="pwa-modal__app-icon" />
        <h2 className="pwa-modal__title">התקן את Re-smash</h2>
        <p className="pwa-modal__subtitle">
          כדי להתקין את האפליקציה, פתח את הקישור בדפדפן Safari
        </p>

        <div className="pwa-modal__safari-guide">
          <div className="pwa-modal__safari-icon">
            {/* Safari compass icon */}
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity="0.3"/>
            </svg>
          </div>
          <p>פתח את Safari והדבק את הקישור</p>
        </div>

        <button
          className={`pwa-modal__copy-btn${copied ? ' pwa-modal__copy-btn--copied' : ''}`}
          onClick={handleCopy}
        >
          {copied ? '✓ הקישור הועתק' : 'העתק קישור'}
        </button>
      </div>
    </div>
  );
}

// ── Main prompt component (auto-triggered) ──────────────────────────────────
export function PwaInstallPrompt({ pwa }) {
  const { platform, showAuto, dismiss, triggerNativeInstall } = pwa;

  if (!showAuto) return null;

  if (platform === 'android') {
    return <AndroidBanner onInstall={triggerNativeInstall} onDismiss={dismiss} />;
  }
  if (platform === 'ios-safari') {
    return <IosSafariModal onDismiss={dismiss} />;
  }
  if (platform === 'ios-chrome') {
    return <IosChromeModal onDismiss={dismiss} />;
  }

  // Desktop: use Android-style banner if beforeinstallprompt is available
  if (platform === 'desktop') {
    return <AndroidBanner onInstall={triggerNativeInstall} onDismiss={dismiss} />;
  }

  return null;
}

// ── Manual prompt (triggered from menu button) ──────────────────────────────
export function PwaInstallManual({ pwa }) {
  const { platform, manualOpen, closeManual, triggerNativeInstall } = pwa;

  if (!manualOpen) return null;

  if (platform === 'android' || platform === 'desktop') {
    // Try native prompt; if not available, show as banner briefly
    triggerNativeInstall();
    closeManual();
    return null;
  }
  if (platform === 'ios-safari') {
    return <IosSafariModal onDismiss={closeManual} />;
  }
  if (platform === 'ios-chrome') {
    return <IosChromeModal onDismiss={closeManual} />;
  }

  return null;
}
