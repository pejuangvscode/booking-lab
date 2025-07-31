import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'confirm':
        return <AlertTriangle className="h-6 w-6 text-orange-500" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-6 w-6 text-red-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${
          isVisible ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Dialog - Tambahkan rounded-2xl untuk semua corners */}
      <div 
        className={`relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 transform transition-all duration-200 overflow-hidden ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 hover:cursor-pointer transition-colors p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Actions - Pastikan background dan rounded sesuai */}
        <div className="flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200">
          {type === 'confirm' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium hover:cursor-pointer text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              type === 'error' 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                : type === 'success'
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}