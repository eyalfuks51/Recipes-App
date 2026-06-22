import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWorkspace } from '../lib/workspace.jsx';
import { buildInviteUrl, buildWhatsAppInviteUrl } from '../lib/recipeLibraryMenu.js';
import { CreateLibraryModal } from './CreateLibraryModal.jsx';
import { JoinWorkspaceModal } from './JoinWorkspaceModal.jsx';
import { LeaveWorkspaceModal } from './LeaveWorkspaceModal.jsx';
import './RecipeLibraryMenu.scss';

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" />
      <path d="M5 5.5A2.5 2.5 0 0 0 2.5 3H2v16h.5A2.5 2.5 0 0 1 5 21.5" />
      <path d="M8 7h8" />
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg className={open ? 'is-open' : ''} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 4 4 10-10" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11.5a8 8 0 0 1-11.8 7l-3.7 1 1-3.5A8 8 0 1 1 20 11.5Z" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 19h14" />
    </svg>
  );
}

function IconLogOut() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 6H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4" />
      <path d="M14 16l4-4-4-4" />
      <path d="M18 12H9" />
    </svg>
  );
}

function MenuRow({ children, icon, tone, disabled, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`recipe-library-menu__row${tone ? ` recipe-library-menu__row--${tone}` : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="recipe-library-menu__row-icon">{icon}</span>
      <span className="recipe-library-menu__row-label">{children}</span>
    </button>
  );
}

export function RecipeLibraryMenu({ pwa }) {
  const { workspaces, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const ref = useRef(null);
  const panelRef = useRef(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, right: 0 });

  const onlyLibrary = workspaces.length <= 1;
  const otherLibraries = workspaces.filter((ws) => ws.id !== activeWorkspace?.id);

  const updatePanelPosition = useCallback(() => {
    if (typeof window === 'undefined' || !ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    setPanelPosition({
      top: Math.round(rect.bottom + 10),
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (e) => {
      const target = e.target;
      const isInTrigger = ref.current?.contains(target);
      const isInPanel = panelRef.current?.contains(target);

      if (!isInTrigger && !isInPanel) setOpen(false);
    };

    updatePanelPosition();
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined;

    const isMobile = window.matchMedia('(max-width: 719px)').matches;
    if (!isMobile) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (workspaces.length === 0) return null;

  const closeMenu = () => setOpen(false);

  const toggleMenu = () => {
    if (!open) updatePanelPosition();
    setOpen((value) => !value);
  };

  const handleSelect = (id) => {
    setActiveWorkspace(id);
    closeMenu();
  };

  const copyInviteLink = () => {
    if (!activeWorkspace?.invite_code) return;
    const url = buildInviteUrl(window.location.origin, activeWorkspace.invite_code);

    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(markCopied).catch(() => {
        const el = document.createElement('textarea');
        el.value = url;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        markCopied();
      });
      return;
    }

    const el = document.createElement('textarea');
    el.value = url;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    markCopied();
  };

  const shareWhatsApp = () => {
    if (!activeWorkspace?.invite_code) return;
    const url = buildWhatsAppInviteUrl(window.location.origin, activeWorkspace.invite_code);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const menuLayer = open ? (
    <>
      <button
        className="recipe-library-menu__backdrop"
        type="button"
        aria-label="סגירת תפריט ספרייה"
        onClick={closeMenu}
      />
      <div
        className="recipe-library-menu__panel"
        role="dialog"
        aria-label="תפריט ספריית מתכונים"
        dir="rtl"
        ref={panelRef}
        style={{
          '--recipe-library-panel-top': `${panelPosition.top}px`,
          '--recipe-library-panel-right': `${panelPosition.right}px`,
        }}
      >
        <div className="recipe-library-menu__sheet-handle" />

        <section className="recipe-library-menu__current">
          <span className="recipe-library-menu__section-label">הספרייה הנוכחית</span>
          <div className="recipe-library-menu__current-card">
            <div>
              <strong>{activeWorkspace?.name ?? 'ספריית מתכונים'}</strong>
              <span>ספריית מתכונים</span>
            </div>
            <IconCheck />
          </div>
        </section>

        <section className="recipe-library-menu__section">
          <span className="recipe-library-menu__section-label">החלפת ספרייה</span>
          <div className="recipe-library-menu__library-list">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspace?.id;
              return (
                <button
                  key={ws.id}
                  className={`recipe-library-menu__library${isActive ? ' recipe-library-menu__library--active' : ''}`}
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => handleSelect(ws.id)}
                >
                  <span>{ws.name}</span>
                  {isActive ? <IconCheck /> : null}
                </button>
              );
            })}

            {otherLibraries.length === 0 && (
              <p className="recipe-library-menu__empty">אין ספריות נוספות עדיין</p>
            )}
          </div>

          <div className="recipe-library-menu__actions">
            <MenuRow
              icon={<IconPlus />}
              onClick={() => { closeMenu(); setCreateOpen(true); }}
            >
              יצירת ספרייה חדשה
            </MenuRow>
            <MenuRow
              icon={<IconLink />}
              onClick={() => { closeMenu(); setJoinOpen(true); }}
            >
              הצטרפות לספרייה
            </MenuRow>
          </div>
        </section>

        {activeWorkspace?.invite_code && (
          <section className="recipe-library-menu__section">
            <span className="recipe-library-menu__section-label">הזמנת חברים</span>
            <p className="recipe-library-menu__section-copy">
              מי שמקבל את הקישור יוכל להצטרף לספרייה הזו.
            </p>
            <MenuRow icon={<IconLink />} onClick={copyInviteLink}>
              {copied ? 'הקישור הועתק' : 'העתקת קישור'}
            </MenuRow>
            <MenuRow icon={<IconMessage />} tone="whatsapp" onClick={shareWhatsApp}>
              שליחה בוואטסאפ
            </MenuRow>
          </section>
        )}

        {pwa.canInstall && (
          <section className="recipe-library-menu__section">
            <MenuRow icon={<IconDownload />} onClick={() => { closeMenu(); pwa.openManual(); }}>
              התקנת Re-smash
            </MenuRow>
          </section>
        )}

        <section className="recipe-library-menu__danger">
          <MenuRow
            icon={<IconLogOut />}
            tone="danger"
            disabled={onlyLibrary}
            onClick={() => { closeMenu(); setLeaveOpen(true); }}
          >
            עזיבת הספרייה
          </MenuRow>
          {onlyLibrary && (
            <p className="recipe-library-menu__danger-copy">
              זו הספרייה היחידה שלך. לפני עזיבה צריך ליצור או להצטרף לספרייה אחרת.
            </p>
          )}
        </section>
      </div>
    </>
  ) : null;

  return (
    <div className="recipe-library-menu" ref={ref}>
      <button
        className="recipe-library-menu__trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="בחירת ספריית מתכונים"
        onClick={toggleMenu}
      >
        <span className="recipe-library-menu__trigger-icon"><IconBook /></span>
        <span className="recipe-library-menu__trigger-text">
          <span className="recipe-library-menu__trigger-kicker">נשמר אל</span>
          <span className="recipe-library-menu__trigger-name">{activeWorkspace?.name ?? 'ספריית מתכונים'}</span>
        </span>
        <span className="recipe-library-menu__trigger-chevron"><IconChevron open={open} /></span>
      </button>

      {menuLayer && createPortal(menuLayer, document.body)}

      <CreateLibraryModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinWorkspaceModal isOpen={joinOpen} onClose={() => setJoinOpen(false)} />
      <LeaveWorkspaceModal
        isOpen={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        workspace={activeWorkspace}
      />
    </div>
  );
}
