import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const AlertToast = ({ alert, onClose }) => {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [alert, onClose]);

  if (!alert) return null;

  const { type = 'success', message } = alert;

  const icons = {
    success: <CheckCircle2 size={20} className="toast-icon success" />,
    error: <AlertCircle size={20} className="toast-icon error" />,
    info: <Info size={20} className="toast-icon info" />,
  };

  return (
    <div className={`app-toast-container ${type}`}>
      <div className="toast-content">
        {icons[type] || icons.info}
        <span className="toast-message">{message}</span>
      </div>
      <button className="toast-close-btn" onClick={onClose} aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
};

export default AlertToast;
