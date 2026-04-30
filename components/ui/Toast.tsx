"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastVariant = "info" | "success" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fail soft if a caller forgets to wrap — better than crashing the page.
    return {
      show: (m: string) => {
        // eslint-disable-next-line no-console
        console.warn("[toast]", m);
      },
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed left-0 right-0 bottom-4 flex flex-col items-center gap-2 z-[100] pointer-events-none px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 text-sm font-medium shadow-lg max-w-md w-full ${
              t.variant === "success"
                ? "bg-good text-bone"
                : t.variant === "error"
                ? "bg-bad text-bone"
                : "bg-ink text-bone"
            }`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// A tiny utility usable from anywhere in the React tree.
let externalShow: ToastContextValue["show"] | null = null;

/** Wrap children to also expose the show function for global helpers. */
export function ToastBridge() {
  const { show } = useToast();
  useEffect(() => {
    externalShow = show;
    return () => {
      if (externalShow === show) externalShow = null;
    };
  }, [show]);
  return null;
}

/** Programmatic toast helper — usable outside React. Falls back to console.log. */
export function toast(message: string, variant: ToastVariant = "info") {
  if (externalShow) externalShow(message, variant);
  // eslint-disable-next-line no-console
  else console.log("[toast]", message);
}
