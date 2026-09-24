'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertTriangle, Info, CheckCircle2, X, ShoppingBag, Trash2 } from 'lucide-react';

export type ModalType = 'warning' | 'danger' | 'info' | 'success' | 'cart';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
}

interface AlertOptions {
  title?: string;
  message: string;
  buttonText?: string;
  type?: ModalType;
}

interface ModalContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions) => Promise<void>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    type: ModalType;
    isConfirm: boolean;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || 'Confirm Action',
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'warning',
        isConfirm: true,
        resolve,
      });
      setIsOpen(true);
    });
  }, []);

  const alert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setConfig({
        title: options.title || 'Notice',
        message: options.message,
        confirmText: options.buttonText || 'Understood',
        type: options.type || 'info',
        isConfirm: false,
        resolve: () => resolve(),
      });
      setIsOpen(true);
    });
  }, []);

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    setTimeout(() => {
      if (config?.resolve) {
        config.resolve(result);
      }
      setConfig(null);
    }, 180);
  };

  const getTheme = (type: ModalType) => {
    switch (type) {
      case 'cart':
        return {
          icon: <ShoppingBag className="w-6 h-6 text-emerald-700" />,
          iconBg: 'bg-emerald-100 border-emerald-200',
          btnBg: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20',
        };
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-rose-600" />,
          iconBg: 'bg-rose-100 border-rose-200',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
          iconBg: 'bg-emerald-100 border-emerald-200',
          btnBg: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20',
        };
      case 'info':
        return {
          icon: <Info className="w-6 h-6 text-blue-600" />,
          iconBg: 'bg-blue-100 border-blue-200',
          btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20',
        };
      case 'warning':
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
          iconBg: 'bg-amber-100 border-amber-200',
          btnBg: 'bg-stone-900 hover:bg-stone-800 text-white shadow-stone-900/20',
        };
    }
  };

  const theme = config ? getTheme(config.type) : getTheme('warning');

  return (
    <ModalContext.Provider value={{ confirm, alert }}>
      {children}

      {isOpen && config && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop with Blur */}
          <div
            onClick={() => handleClose(false)}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Animated Modal Card */}
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200/80 p-6 overflow-hidden z-10 transition-all animate-in zoom-in-95 fade-in duration-200">
            {/* Top Close Button */}
            <button
              onClick={() => handleClose(false)}
              className="absolute right-4 top-4 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${theme.iconBg}`}
              >
                {theme.icon}
              </div>

              <div className="space-y-1.5 pt-0.5 pr-4">
                <h3 className="text-base font-black text-stone-900 tracking-tight">
                  {config.title}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {config.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              {config.isConfirm && (
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition-all active:scale-95"
                >
                  {config.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 ${theme.btnBg}`}
              >
                {config.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};