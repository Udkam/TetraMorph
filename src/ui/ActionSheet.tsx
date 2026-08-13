import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { browserPlatform } from '../platform/browserPlatform';

type SheetPhase = 'enter' | 'steady' | 'exit' | 'unmounted';
type FocusReturn = 'auto' | 'external';

interface SheetPresence {
  readonly phase: SheetPhase;
  readonly epoch: number;
  readonly reduced: boolean;
}

interface SheetFamily {
  readonly activeId: string | null;
  claim(id: string): void;
  release(id: string): void;
}

const EMPTY_FAMILY: SheetFamily = { activeId: null, claim: () => {}, release: () => {} };
const ActionSheetFamilyContext = createContext<SheetFamily>(EMPTY_FAMILY);

export function ActionSheetFamily({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const claim = useCallback((id: string) => setActiveId((current) => current === id ? current : id), []);
  const release = useCallback((id: string) => setActiveId((current) => current === id ? null : current), []);
  const value = useMemo(() => ({ activeId, claim, release }), [activeId, claim, release]);
  return (
    <ActionSheetFamilyContext.Provider value={value}>
      {children}
    </ActionSheetFamilyContext.Provider>
  );
}

interface ActionSheetProps {
  open: boolean;
  title: string;
  description: string;
  tone?: 'default' | 'success' | 'danger';
  className?: string;
  placement?: 'viewport' | 'gameplay';
  externalFocusSelector?: string;
  dismissOnBackdropClick?: boolean;
  visuallyHideTitle?: boolean;
  reducedMotion?: boolean;
  focusReturn?: FocusReturn;
  onCancel?: () => void;
  onConfirm?: () => void;
  children: ReactNode;
}

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const ACTION_BUTTONS = '.action-sheet__actions > button:not([disabled])';
const ARROW_NAVIGABLE = '[data-arrow-nav]:not([disabled])';

export function ActionSheet({
  open,
  title,
  description,
  tone = 'default',
  className,
  placement = 'viewport',
  externalFocusSelector,
  dismissOnBackdropClick = false,
  visuallyHideTitle = false,
  reducedMotion = false,
  focusReturn = 'auto',
  onCancel,
  onConfirm,
  children,
}: ActionSheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const familyId = useId();
  const { activeId, claim, release } = useContext(ActionSheetFamilyContext);
  const panelRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const pendingFocusRef = useRef<{ wasInside: boolean; external: boolean } | null>(null);
  const restoreFrameRef = useRef<number | null>(null);
  const phaseDeadlineRef = useRef<number | null>(null);
  const shortenedDurationRef = useRef<number | null>(null);
  const wasOpenRef = useRef(open);
  const focusReturnRef = useRef(focusReturn);
  const reducedMotionRef = useRef(reducedMotion);
  const externalFocusSelectorRef = useRef(externalFocusSelector);
  const onCancelRef = useRef(onCancel);
  const onConfirmRef = useRef(onConfirm);
  const [presence, setPresenceState] = useState<SheetPresence>(() => ({
    phase: open ? 'enter' : 'unmounted',
    epoch: open ? 1 : 0,
    reduced: reducedMotion,
  }));
  const presenceRef = useRef(presence);
  const presentationRef = useRef({ title, description, tone, className, placement, visuallyHideTitle, children });
  focusReturnRef.current = focusReturn;
  reducedMotionRef.current = reducedMotion;
  externalFocusSelectorRef.current = externalFocusSelector;
  onCancelRef.current = onCancel;
  onConfirmRef.current = onConfirm;

  const setPresence = useCallback((next: SheetPresence) => {
    presenceRef.current = next;
    setPresenceState(next);
  }, []);

  const sampleCloseFocus = useCallback((external = focusReturnRef.current === 'external') => {
    const active = browserPlatform.activeElement();
    pendingFocusRef.current = {
      wasInside: active !== null && panelRef.current?.contains(active) === true,
      external,
    };
  }, []);

  useLayoutEffect(() => {
    if (open) presentationRef.current = { title, description, tone, className, placement, visuallyHideTitle, children };
  }, [children, className, description, open, placement, title, tone, visuallyHideTitle]);

  useLayoutEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (open) {
      claim(familyId);
      if (!wasOpen) {
        browserPlatform.cancelFrame(restoreFrameRef.current);
        restoreFrameRef.current = null;
        const next = { phase: 'enter', epoch: presenceRef.current.epoch + 1, reduced: reducedMotionRef.current } as const;
        setPresence(next);
      } else {
        pendingFocusRef.current = null;
      }
      return;
    }
    if (!wasOpen) return;

    release(familyId);
    const next = { phase: 'exit', epoch: presenceRef.current.epoch + 1, reduced: reducedMotionRef.current } as const;
    const focusSample = pendingFocusRef.current ?? { wasInside: false, external: focusReturnRef.current === 'external' };
    pendingFocusRef.current = null;
    setPresence(next);
    browserPlatform.cancelFrame(restoreFrameRef.current);
    restoreFrameRef.current = focusSample.external || !focusSample.wasInside
      ? null
      : browserPlatform.defer(() => {
          restoreFrameRef.current = null;
          if (presenceRef.current.epoch !== next.epoch || presenceRef.current.phase !== 'exit') return;
          const documentTarget = browserPlatform.documentTarget();
          if (documentTarget?.querySelector('[role="dialog"][aria-modal="true"]')) return;
          const active = browserPlatform.activeElement();
          const vacant = active === null || active === documentTarget?.body || active === documentTarget?.documentElement;
          if (!vacant && panelRef.current?.contains(active) !== true) return;
          const target = previousFocusRef.current;
          if (!target?.isConnected) return;
          try {
            target.focus({ preventScroll: true });
          } catch {
            target.focus();
          }
        });
  }, [claim, familyId, open, release, setPresence]);

  useLayoutEffect(() => {
    if (!reducedMotion || presence.reduced || presence.phase === 'steady' || presence.phase === 'unmounted') return;
    const remaining = phaseDeadlineRef.current === null
      ? 32
      : Math.max(0, phaseDeadlineRef.current - browserPlatform.now());
    shortenedDurationRef.current = Math.min(32, remaining);
    setPresence({ ...presence, reduced: true });
  }, [presence, reducedMotion, setPresence]);

  useLayoutEffect(() => {
    if (open || presence.phase !== 'exit' || activeId === null || activeId === familyId) return;
    setPresence({ ...presence, phase: 'unmounted' });
  }, [activeId, familyId, open, presence, setPresence]);

  useEffect(() => {
    if (presence.phase !== 'enter' && presence.phase !== 'exit') return undefined;
    const epoch = presence.epoch;
    const finish = () => {
      if (presenceRef.current.epoch !== epoch || presenceRef.current.phase !== presence.phase) return;
      phaseDeadlineRef.current = null;
      setPresence({ ...presenceRef.current, phase: presence.phase === 'enter' ? 'steady' : 'unmounted' });
    };
    const duration = shortenedDurationRef.current
      ?? (presence.reduced ? 32 : presence.phase === 'enter' ? 180 : 120);
    shortenedDurationRef.current = null;
    phaseDeadlineRef.current = browserPlatform.now() + duration;
    const timer = browserPlatform.scheduleTimeout(finish, duration);
    if (timer === null) finish();
    return () => {
      browserPlatform.cancelTimeout(timer);
      if (presenceRef.current.epoch !== epoch || presenceRef.current.phase !== presence.phase) {
        phaseDeadlineRef.current = null;
      }
    };
  }, [presence, setPresence]);

  useEffect(() => () => {
    release(familyId);
    browserPlatform.cancelFrame(restoreFrameRef.current);
  }, [familyId, release]);

  const syncSelectedAction = (target: EventTarget | null) => {
    const panel = panelRef.current;
    const actions = panel ? [...panel.querySelectorAll<HTMLButtonElement>(ACTION_BUTTONS)] : [];
    if (actions.length !== 2) return;
    const index = actions.indexOf(target as HTMLButtonElement);
    if (index < 0) return;
    actions.forEach((action, actionIndex) => {
      if (actionIndex === index) action.dataset.actionSelected = 'true';
      else delete action.dataset.actionSelected;
    });
  };

  const syncArrowSelection = (target: EventTarget | null) => {
    const panel = panelRef.current;
    const controls = panel ? [...panel.querySelectorAll<HTMLButtonElement>(ARROW_NAVIGABLE)] : [];
    const index = controls.indexOf(target as HTMLButtonElement);
    if (index < 0) return;
    controls.forEach((control, controlIndex) => {
      if (controlIndex === index) control.dataset.arrowSelected = 'true';
      else delete control.dataset.arrowSelected;
    });
  };

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const activeBeforeOpen = browserPlatform.activeElement();
    if (panel?.contains(activeBeforeOpen) !== true) previousFocusRef.current = activeBeforeOpen;
    const focusInitial = () => {
      const preferred = panel?.querySelector<HTMLElement>('[data-autofocus]');
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
      const target = preferred ?? first ?? panel;
      target?.focus({ preventScroll: true });
      syncSelectedAction(target);
    };
    const frame = browserPlatform.defer(focusInitial);

    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Escape' && onCancelRef.current) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        sampleCloseFocus();
        onCancelRef.current();
        return;
      }
      const actionButtons = [...panel?.querySelectorAll<HTMLButtonElement>(ACTION_BUTTONS) ?? []];
      if ((keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowRight') && actionButtons.length === 2) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        const currentIndex = actionButtons.findIndex((action) => action.dataset.actionSelected === 'true');
        const direction = keyboardEvent.key === 'ArrowLeft' ? -1 : 1;
        const nextIndex = (Math.max(currentIndex, 0) + direction + actionButtons.length) % actionButtons.length;
        const next = actionButtons[nextIndex]!;
        next.focus({ preventScroll: true });
        syncSelectedAction(next);
        return;
      }
      const arrowControls = [...panel?.querySelectorAll<HTMLButtonElement>(ARROW_NAVIGABLE) ?? []];
      const activeElement = browserPlatform.activeElement();
      const focusedRange = activeElement instanceof HTMLInputElement && activeElement.type === 'range';
      if (
        !focusedRange
        && arrowControls.length > 0
        && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(keyboardEvent.key)
      ) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        const selectedIndex = arrowControls.findIndex((control) => control.dataset.arrowSelected === 'true');
        const focusedIndex = arrowControls.indexOf(activeElement as HTMLButtonElement);
        const currentIndex = selectedIndex >= 0 ? selectedIndex : Math.max(focusedIndex, 0);
        const coordinates = arrowControls.map((control, index) => {
          const rowValue = control.dataset.arrowRow;
          const columnValue = control.dataset.arrowCol;
          const row = rowValue === undefined ? Number.NaN : Number(rowValue);
          const column = columnValue === undefined ? Number.NaN : Number(columnValue);
          return { control, index, row, column };
        });
        const hasCoordinateLayout = coordinates.every(({ row, column }) => Number.isInteger(row) && Number.isInteger(column));
        let next: HTMLButtonElement;

        if (hasCoordinateLayout) {
          const current = coordinates[currentIndex]!;
          if (keyboardEvent.key === 'ArrowLeft' || keyboardEvent.key === 'ArrowRight') {
            const sameRow = coordinates
              .filter(({ row }) => row === current.row)
              .sort((left, right) => left.column - right.column || left.index - right.index);
            const rowIndex = sameRow.findIndex(({ control }) => control === current.control);
            const direction = keyboardEvent.key === 'ArrowLeft' ? -1 : 1;
            next = sameRow[(rowIndex + direction + sameRow.length) % sameRow.length]!.control;
          } else {
            const rows = [...new Set(coordinates.map(({ row }) => row))].sort((left, right) => left - right);
            const rowIndex = rows.indexOf(current.row);
            const direction = keyboardEvent.key === 'ArrowUp' ? -1 : 1;
            const targetRow = rows[(rowIndex + direction + rows.length) % rows.length]!;
            next = coordinates
              .filter(({ row }) => row === targetRow)
              .sort((left, right) => (
                Math.abs(left.column - current.column) - Math.abs(right.column - current.column)
                || left.column - right.column
                || left.index - right.index
              ))[0]!.control;
          }
        } else {
          const offset = keyboardEvent.key === 'ArrowLeft' ? -1
            : keyboardEvent.key === 'ArrowRight' ? 1
              : keyboardEvent.key === 'ArrowUp' ? -2 : 2;
          const nextIndex = (currentIndex + offset + arrowControls.length) % arrowControls.length;
          next = arrowControls[nextIndex]!;
        }

        next.focus({ preventScroll: true });
        syncArrowSelection(next);
        if (next.dataset.arrowActivateOnFocus === 'true') next.click();
        return;
      }
      if (keyboardEvent.key === 'Enter' && !keyboardEvent.isComposing && actionButtons.length === 2) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        const selected = actionButtons.find((action) => action.dataset.actionSelected === 'true') ?? actionButtons[0]!;
        selected.click();
        return;
      }
      if (!focusedRange && keyboardEvent.key === 'Enter' && !keyboardEvent.isComposing && arrowControls.length > 0) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        const selected = arrowControls.find((control) => control.dataset.arrowSelected === 'true') ?? arrowControls[0]!;
        selected.click();
        return;
      }
      if (keyboardEvent.key === 'Enter' && onConfirmRef.current && !keyboardEvent.isComposing) {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        sampleCloseFocus(true);
        onConfirmRef.current();
        return;
      }
      if (keyboardEvent.key !== 'Tab' || !panel) return;
      const panelFocusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const externalFocusable = externalFocusSelectorRef.current
        ? [...browserPlatform.documentTarget()?.querySelectorAll<HTMLElement>(externalFocusSelectorRef.current) ?? []]
        : [];
      const focusable = [...panelFocusable, ...externalFocusable]
        .filter((control, index, controls) => controls.indexOf(control) === index);
      if (focusable.length === 0) {
        keyboardEvent.preventDefault();
        panel.focus();
        return;
      }
      const activeIndex = focusable.indexOf(browserPlatform.activeElement() as HTMLElement);
      const direction = keyboardEvent.shiftKey ? -1 : 1;
      const nextIndex = activeIndex < 0
        ? 0
        : (activeIndex + direction + focusable.length) % focusable.length;
      keyboardEvent.preventDefault();
      focusable[nextIndex]!.focus({ preventScroll: true });
    };

    const removeKeyDown = browserPlatform.listenDocument('keydown', handleKeyDown, true);
    return () => {
      browserPlatform.cancelFrame(frame);
      removeKeyDown();
    };
  }, [open, sampleCloseFocus]);

  if (!open && presence.phase === 'unmounted') return null;

  const presentation = open
    ? { title, description, tone, className, placement, visuallyHideTitle, children }
    : presentationRef.current;
  const visualPhase = open
    ? presence.phase === 'steady' ? 'steady' : 'enter'
    : 'exit';
  const retired = !open;
  const stopRetiredEvent = (event: { preventDefault(): void; stopPropagation(): void }) => {
    if (!retired) return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={`sheet-backdrop sheet-backdrop--${presentation.placement}`}
      data-testid="action-sheet-backdrop"
      data-sheet-placement={presentation.placement}
      data-sheet-phase={visualPhase}
      data-sheet-motion={presence.reduced ? 'reduced' : 'full'}
      inert={retired || undefined}
      aria-hidden={retired || undefined}
      onClick={(event) => {
        if (retired) return;
        if (dismissOnBackdropClick && event.target === event.currentTarget) {
          sampleCloseFocus();
          onCancel?.();
        }
      }}
      onClickCapture={stopRetiredEvent}
      onPointerDownCapture={stopRetiredEvent}
      onKeyDownCapture={stopRetiredEvent}
    >
      <section
        ref={panelRef}
        className={`action-sheet action-sheet--${presentation.tone} action-sheet--placement-${presentation.placement}${presentation.className ? ` ${presentation.className}` : ''}`}
        data-sheet-phase={visualPhase}
        data-sheet-motion={presence.reduced ? 'reduced' : 'full'}
        role={retired ? undefined : 'dialog'}
        aria-modal={retired || externalFocusSelector ? undefined : 'true'}
        aria-labelledby={retired ? undefined : titleId}
        aria-describedby={retired || !presentation.description ? undefined : descriptionId}
        tabIndex={retired ? undefined : -1}
        onClickCapture={(event) => {
          if (retired) return;
          const target = event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-sheet-close]')
            : null;
          if (target) sampleCloseFocus(target.dataset.sheetFocusOwner === 'external');
        }}
        onFocusCapture={(event) => {
          syncSelectedAction(event.target);
          syncArrowSelection(event.target);
        }}
      >
        <h2 id={titleId} className={presentation.visuallyHideTitle ? 'sr-only' : undefined}>{presentation.title}</h2>
        {presentation.description && <p id={descriptionId}>{presentation.description}</p>}
        <div className="action-sheet__actions">{presentation.children}</div>
      </section>
    </div>
  );
}
