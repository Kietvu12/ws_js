import React from 'react';
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';

/**
 * Alert tùy chỉnh: icon dạng line, chữ bold, căn giữa card.
 */
const CustomAlert = ({ open, type = 'info', title, message, actionLabel, onAction, onClose }) => {
  if (!open) return null;

  const config = {
    info: {
      color: '#3b82f6',
      Icon: Info,
    },
    success: {
      color: '#22c55e',
      Icon: CheckCircle,
    },
    warning: {
      color: '#f97316',
      Icon: AlertTriangle,
    },
    error: {
      color: '#ef4444',
      Icon: AlertCircle,
    },
  };

  const { color, Icon } = config[type] || config.info;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'custom-alert-title' : undefined}
      aria-describedby="custom-alert-message"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-lg overflow-hidden relative"
        style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-gray-100 transition-colors z-10"
          style={{ color: '#9ca3af' }}
          aria-label="Đóng"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        {/* Nội dung căn giữa card */}
        <div className="pt-10 pb-6 px-6 text-center">
          <div className="flex justify-center mb-4">
            <Icon
              className="w-12 h-12 flex-shrink-0"
              style={{ color }}
              strokeWidth={1.5}
            />
          </div>
          {title && (
            <h3
              id="custom-alert-title"
              className="text-base font-bold mb-2"
              style={{ color: '#111827' }}
            >
              {title}
            </h3>
          )}
          <p id="custom-alert-message" className="text-sm font-bold" style={{ color: '#374151' }}>
            {message}
          </p>
          {actionLabel && (
            <button
              type="button"
              onClick={() => {
                if (onAction) onAction();
                onClose();
              }}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-bold transition-colors mx-auto block"
              style={{
                backgroundColor: '#f3f4f6',
                color: '#374151',
              }}
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;
