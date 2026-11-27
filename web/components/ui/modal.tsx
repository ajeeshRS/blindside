"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative max-h-[calc(100svh-16px)] w-full max-w-[420px] overflow-y-auto overscroll-contain rounded-t-28 bg-bg-elevated p-24 pb-[max(24px,env(safe-area-inset-bottom))] shadow-float shadow-hairline sm:m-16 sm:rounded-28"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          >
            <div className="mb-20 flex items-start justify-between gap-16">
              <div>
                <h2 id={titleId} className="text-[22px] leading-[28px] font-[700] tracking-[-0.035em]">
                  {title}
                </h2>
                {description && (
                  <p className="mt-4 text-[14px] leading-[20px] text-text-secondary">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="-mr-4 -mt-2 flex size-36 shrink-0 items-center justify-center rounded-10 bg-bg-secondary text-text-secondary transition-colors hover:bg-bg-secondary-hover hover:text-text-primary"
                aria-label="Close"
              >
                <X className="size-16" />
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
