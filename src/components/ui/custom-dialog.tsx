import { useEffect, useState } from 'react';

interface CustomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
}

export function CustomDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'alert',
  confirmText = 'OK',
  cancelText = 'Cancel'
}: CustomDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Flip to visible on the next frame, otherwise the element mounts and gets
  // its final classes in the same commit and the enter transition is skipped.
  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false);
      return;
    }
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Escape dismisses the dialog — it is the only keyboard route out now that
  // there is no close icon.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsVisible(false);
        setTimeout(onClose, 150);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  if (!isOpen) return null;

  const primaryClass =
    type === 'error'
      ? 'bg-red-600 hover:bg-red-700'
      : 'bg-orange-600 hover:bg-orange-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div
        className={`absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] transition-opacity duration-150 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-xl transition-all duration-150 ease-out sm:p-7 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-0'
        }`}
      >
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>

        {/* pre-line keeps the line breaks some callers put in their messages */}
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-600">
          {message}
        </p>

        <div className="mt-6 flex gap-2">
          {type === 'confirm' && (
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:cursor-pointer hover:bg-gray-50"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors hover:cursor-pointer ${primaryClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
