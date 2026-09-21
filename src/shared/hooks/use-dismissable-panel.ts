import { useEffect, useRef, useState } from "react";

/**
 * Open/close state for a trigger-and-panel pair (dropdown, popover), with the
 * dismiss behaviour every one of them needs: a click outside the container
 * closes it, and Escape closes it and returns focus to the trigger so a
 * keyboard user isn't dropped back at the top of the document.
 *
 * Extracted from the sidebar area switcher, which had this logic inline
 * before the header grew a second panel that needed the same thing.
 */
export function useDismissablePanel<TContainer extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<TContainer>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return { containerRef, triggerRef, isOpen, setIsOpen };
}
