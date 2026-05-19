import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert from '../component/Shared/CustomAlert';

const NotificationContext = createContext(null);

/**
 * Hook để hiển thị alert tùy chỉnh (thay cho alert() mặc định).
 * @returns {{ success, info, warning, error }} Mỗi hàm nhận (message) hoặc ({ title?, message, actionLabel?, onAction? })
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

const defaultState = {
  open: false,
  type: 'info',
  title: '',
  message: '',
  actionLabel: '',
  onAction: null,
};

export function NotificationProvider({ children }) {
  const [state, setState] = useState(defaultState);

  const close = useCallback(() => {
    setState(defaultState);
  }, []);

  const show = useCallback((type, messageOrOptions) => {
    const isSimple = typeof messageOrOptions === 'string';
    setState({
      open: true,
      type,
      title: isSimple ? '' : (messageOrOptions.title || ''),
      message: isSimple ? messageOrOptions : messageOrOptions.message,
      actionLabel: isSimple ? '' : (messageOrOptions.actionLabel || ''),
      onAction: isSimple ? null : (messageOrOptions.onAction || null),
    });
  }, []);

  const api = {
    close,
    success: (msgOrOpts) => show('success', msgOrOpts),
    info: (msgOrOpts) => show('info', msgOrOpts),
    warning: (msgOrOpts) => show('warning', msgOrOpts),
    error: (msgOrOpts) => show('error', msgOrOpts),
  };

  return (
    <NotificationContext.Provider value={api}>
      {children}
      <CustomAlert
        open={state.open}
        type={state.type}
        title={state.title}
        message={state.message}
        actionLabel={state.actionLabel}
        onAction={state.onAction}
        onClose={close}
      />
    </NotificationContext.Provider>
  );
}
