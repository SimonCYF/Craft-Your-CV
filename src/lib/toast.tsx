import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const say = useCallback((m: string) => {
    setMessage(m);
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 4500);
  }, []);
  return (
    <ToastContext.Provider value={say}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-[60] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-sm border-l-[6px] border-accent bg-ink px-4 py-3 font-semibold text-paper transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        {message}
      </div>
    </ToastContext.Provider>
  );
}
