import { useRef, useState } from 'react';

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
