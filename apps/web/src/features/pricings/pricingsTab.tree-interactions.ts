import { useEffect, useRef, useState } from 'react';

export function usePricingTreeInteractions() {
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());
  const [expandedPricings, setExpandedPricings] = useState<Set<string>>(new Set());
  const cascadeScrollRef = useRef<HTMLDivElement | null>(null);

  function toggleExpanded(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string): void {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function togglePricingSectionLink(pricingId: string, section: 'subscriptions'): void {
    void section;
    const pricingKey = `pricing:${pricingId}`;
    setExpandedPricings((prev) => {
      const next = new Set(prev);
      if (next.has(pricingKey)) {
        next.delete(pricingKey);
      } else {
        next.add(pricingKey);
      }
      return next;
    });
  }

  function togglePricingFromCaret(pricingId: string): void {
    const pricingKey = `pricing:${pricingId}`;

    setExpandedPricings((prev) => {
      const next = new Set(prev);
      if (next.has(pricingKey)) {
        next.delete(pricingKey);
      } else {
        next.add(pricingKey);
      }
      return next;
    });
  }

  useEffect(() => {
    function handleGlobalWheel(event: WheelEvent): void {
      const container = cascadeScrollRef.current;
      if (!container) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (
        target?.closest('[role="dialog"]') ||
        target?.closest('[role="menu"]') ||
        target?.closest('.MuiPopover-root') ||
        target?.closest('.MuiAutocomplete-popper') ||
        target?.closest('.MuiAutocomplete-listbox') ||
        target?.closest('[role="listbox"]')
      ) {
        return;
      }

      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
        return;
      }

      if (container.scrollHeight <= container.clientHeight) {
        return;
      }

      event.preventDefault();
      const maxScrollTop = container.scrollHeight - container.clientHeight;
      const nextScrollTop = Math.min(maxScrollTop, Math.max(0, container.scrollTop + event.deltaY));
      container.scrollTop = nextScrollTop;
    }

    window.addEventListener('wheel', handleGlobalWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleGlobalWheel);
    };
  }, []);

  return {
    collapsedProducts,
    setCollapsedProducts,
    expandedPricings,
    setExpandedPricings,
    cascadeScrollRef,
    toggleExpanded,
    togglePricingSectionLink,
    togglePricingFromCaret
  };
}
