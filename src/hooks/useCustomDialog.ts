import { useState, useCallback, useRef } from 'react';

interface DialogOptions {
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
}

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'success' | 'error';
  confirmText: string;
  cancelText: string;
  // Only set once a dialog is actually opened.
  onConfirm?: () => void;
}

export function useCustomDialog() {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
    confirmText: 'OK',
    cancelText: 'Cancel',
  });

  // Held so that dismissing the dialog (Cancel, backdrop, Escape) can settle the
  // promise too. Without this, `await confirm(...)` never resolves when the user
  // declines and the calling function is left hanging forever.
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const settle = useCallback((confirmed: boolean) => {
    resolverRef.current?.(confirmed);
    resolverRef.current = null;
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showDialog = useCallback((options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      // A dialog opened while another is still pending would strand the old
      // promise, so settle it as declined first.
      resolverRef.current?.(false);
      resolverRef.current = resolve;

      setDialogState({
        isOpen: true,
        title: options.title,
        message: options.message,
        type: options.type ?? 'alert',
        confirmText: options.confirmText ?? 'OK',
        cancelText: options.cancelText ?? 'Cancel',
        onConfirm: () => settle(true),
      });
    });
  }, [settle]);

  const confirm = useCallback((message: string, title = 'Confirm') => {
    return showDialog({
      title,
      message,
      type: 'confirm',
      confirmText: 'Yes',
      cancelText: 'No'
    });
  }, [showDialog]);

  const alert = useCallback((message: string, title = 'Alert') => {
    return showDialog({
      title,
      message,
      type: 'alert'
    });
  }, [showDialog]);

  const success = useCallback((message: string, title = 'Success') => {
    return showDialog({
      title,
      message,
      type: 'success'
    });
  }, [showDialog]);

  const error = useCallback((message: string, title = 'Error') => {
    return showDialog({
      title,
      message,
      type: 'error'
    });
  }, [showDialog]);

  const closeDialog = useCallback(() => settle(false), [settle]);

  return {
    dialogState,
    closeDialog,
    confirm,
    alert,
    success,
    error
  };
}
