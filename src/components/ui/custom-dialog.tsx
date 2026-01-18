import { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

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
    setTimeout(onClose, 250);
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  const getIconConfig = () => {
    switch (type) {
      case 'confirm':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          bgColor: 'bg-orange-500',
          textColor: 'text-orange-600'
        };
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5" />,
          bgColor: 'bg-green-500',
          textColor: 'text-green-600'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-5 w-5" />,
          bgColor: 'bg-red-500',
          textColor: 'text-red-600'
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-600'
        };
    }
  };

  const iconConfig = getIconConfig();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-250 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div 
        className={`relative bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden transform transition-all duration-250 ease-out ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${iconConfig.bgColor} mb-4`}>
            <div className="text-white">
              {iconConfig.icon}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 text-[15px] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          {type === 'confirm' && (
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
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