import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const OPEN_DIALOGS: HTMLElement[] = [];
let originalBodyOverflow: string | null = null;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Focus trapping, initial/return focus and scroll lock shared by app dialogs.
 * Only the topmost registered dialog handles Escape/Tab. Do not register a
 * background dialog's inner child as a second modal unless it is separate.
 * A disabled close policy is appropriate during saving or unsaved edits.
 */
export function useAccessibleDialog(options: {
  isOpen: boolean;
  onRequestClose?: () => void;
  canClose?: boolean;
  initialFocus?: string;
}): RefObject<HTMLDivElement | null> {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(options.onRequestClose);
  const canCloseRef = useRef(options.canClose ?? true);
  closeRef.current = options.onRequestClose;
  canCloseRef.current = options.canClose ?? true;

  useEffect(() => {
    if (!options.isOpen || typeof document === 'undefined') return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (OPEN_DIALOGS.length === 0) {
      originalBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    OPEN_DIALOGS.push(dialog);
    const focused = (options.initialFocus ? dialog.querySelector<HTMLElement>(options.initialFocus) : null)
      || dialog.querySelector<HTMLElement>(FOCUSABLE) || dialog;
    focused.focus({ preventScroll: true });

    const handleKeyboard = (event: KeyboardEvent) => {
      if (OPEN_DIALOGS[OPEN_DIALOGS.length - 1] !== dialog) return;
      // Leave nested alert/confirmation dialogs to their own controls.
      const nestedDialog = (event.target as Element | null)?.closest?.('[role="dialog"]');
      if (nestedDialog && nestedDialog !== dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (canCloseRef.current && closeRef.current) closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const targets = Array.from((dialog as HTMLDivElement).querySelectorAll<HTMLElement>(FOCUSABLE)).filter(node =>
        node.getClientRects().length > 0 && node.getAttribute('aria-hidden') !== 'true'
      );
      if (!targets.length) { event.preventDefault(); dialog.focus(); return; }
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyboard, true);
    return () => {
      document.removeEventListener('keydown', handleKeyboard, true);
      const position = OPEN_DIALOGS.lastIndexOf(dialog);
      if (position >= 0) OPEN_DIALOGS.splice(position, 1);
      if (!OPEN_DIALOGS.length) {
        document.body.style.overflow = originalBodyOverflow ?? '';
        originalBodyOverflow = null;
      }
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [options.isOpen, options.initialFocus]);

  return dialogRef;
}
