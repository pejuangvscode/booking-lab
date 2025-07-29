import { useState, useCallback } from 'react';

interface DialogOptions {
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
}

// Fix: Update the type definition to match DialogOptions
interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'success' | 'error'; // Changed from 'alert' as const
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
}

export function useCustomDialog() {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert', // Remove 'as const'
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: () => {},
  });

  const showDialog = useCallback((options: DialogOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        title: options.title,
        message: options.message,
        type: options.type || 'alert', // This should now work correctly
        confirmText: options.confirmText || 'OK',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: () => {
          resolve(true);
          setDialogState(prev => ({ ...prev, isOpen: false }));
        },
      });
    });
  }, []);

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

  const closeDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    dialogState,
    closeDialog,
    confirm,
    alert,
    success,
    error
  };
}