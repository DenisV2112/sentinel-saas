import React, { useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: "400px",
  md: "600px",
  lg: "900px",
};

const FOCUSABLE_SELECTOR =
  "button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])";

export const Modal = React.memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Store the element that had focus before the modal opened
  useEffect(() => {
    if (isOpen) {
      openerRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Escape key closes modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Focus trap: Tab / Shift+Tab cycles within modal
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusable = Array.from(
      modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    modalRef.current.addEventListener("keydown", handleTab);
    // Focus the first focusable element on mount
    first.focus();

    return () => {
      modalRef.current?.removeEventListener("keydown", handleTab);
      // Restore focus to opener
      openerRef.current?.focus();
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const maxWidth = SIZE_MAP[size];

  const modalRoot = document.getElementById("modal-root");
  if (!modalRoot) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          }}
        >
          <motion.div
            ref={modalRef}
            className="modal-content"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              maxWidth,
              width: "90%",
              maxHeight: "85vh",
              overflow: "auto",
              borderRadius: "12px",
              background: "var(--color-surface, #1A1A1A)",
              border: "1px solid var(--color-border, #2A2A2A)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--color-border, #2A2A2A)",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.125rem", color: "var(--color-text-primary, #FFFFFF)" }}>
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-tertiary, #808080)",
                  cursor: "pointer",
                  padding: "4px 8px",
                  fontSize: "1.25rem",
                  lineHeight: 1,
                }}
              >
                &times;
              </button>
            </div>
            <div style={{ padding: "20px" }}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    modalRoot
  );
});
