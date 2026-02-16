import { useEffect, useState } from 'react';
import type {
  BillingScope,
  PricingTreeItem,
  PricingType,
  SubscriptionItem
} from '../../api';
import type { DetachConfirmTarget } from './components/pricingTree.types';
import type { PricingSortField, SortDirection } from './pricingsTab.utils';

type SubscriptionOpenOptions = {
  accountId?: string;
  scope?: BillingScope;
};

const GROUP_BY_PRODUCT_SESSION_KEY = 'pricings.groupByProduct';

function readGroupByProductSessionValue(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  try {
    const rawValue = window.sessionStorage.getItem(GROUP_BY_PRODUCT_SESSION_KEY);
    if (rawValue === null) {
      return true;
    }

    return rawValue === '1';
  } catch {
    return true;
  }
}

function writeGroupByProductSessionValue(value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(GROUP_BY_PRODUCT_SESSION_KEY, value ? '1' : '0');
  } catch {
    // Ignore storage write failures to avoid breaking UI interactions.
  }
}

export function usePricingsTabState() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PricingType>('ALL');
  const [productIdFilter, setProductIdFilter] = useState<string[]>([]);
  const [accountIdFilter, setAccountIdFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<PricingSortField>('NAME');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');
  const [groupByProduct, setGroupByProduct] = useState(readGroupByProductSessionValue);
  const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState<HTMLElement | null>(null);

  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingModalMode, setPricingModalMode] = useState<'create' | 'edit'>('create');
  const [editingPricing, setEditingPricing] = useState<PricingTreeItem | null>(null);
  const [defaultProductId, setDefaultProductId] = useState<string | undefined>(undefined);

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [subscriptionModalMode, setSubscriptionModalMode] = useState<'create' | 'edit'>('create');
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionItem | null>(null);
  const [defaultSubscriptionAccountId, setDefaultSubscriptionAccountId] =
    useState<string | undefined>(undefined);
  const [defaultSubscriptionPricingIds, setDefaultSubscriptionPricingIds] = useState<string[]>([]);
  const [defaultSubscriptionScope, setDefaultSubscriptionScope] = useState<BillingScope>('ACCOUNT');

  const [deletingPricing, setDeletingPricing] = useState<PricingTreeItem | null>(null);
  const [detachConfirmTarget, setDetachConfirmTarget] = useState<DetachConfirmTarget | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFiltersPopoverOpen = Boolean(filtersAnchorEl);
  const isSortMenuOpen = Boolean(sortMenuAnchorEl);

  useEffect(() => {
    writeGroupByProductSessionValue(groupByProduct);
  }, [groupByProduct]);

  function openCreatePricing(productId?: string): void {
    setPricingModalMode('create');
    setEditingPricing(null);
    setDefaultProductId(productId);
    setPricingModalOpen(true);
  }

  function openEditPricing(pricing: PricingTreeItem): void {
    setPricingModalMode('edit');
    setEditingPricing(pricing);
    setDefaultProductId(undefined);
    setPricingModalOpen(true);
  }

  function closePricingModal(): void {
    setPricingModalOpen(false);
    setDefaultProductId(undefined);
  }

  function openCreateSubscription(pricingId: string, options?: SubscriptionOpenOptions): void {
    setSubscriptionModalMode('create');
    setEditingSubscription(null);
    setDefaultSubscriptionPricingIds([pricingId]);
    setDefaultSubscriptionAccountId(options?.accountId);
    setDefaultSubscriptionScope(options?.scope ?? 'ACCOUNT');
    setSubscriptionModalOpen(true);
  }

  function openEditSubscription(subscription: SubscriptionItem): void {
    setSubscriptionModalMode('edit');
    setEditingSubscription(subscription);
    setDefaultSubscriptionAccountId(undefined);
    setDefaultSubscriptionPricingIds([]);
    setDefaultSubscriptionScope('ACCOUNT');
    setSubscriptionModalOpen(true);
  }

  function closeSubscriptionModal(): void {
    setSubscriptionModalOpen(false);
    setSubscriptionModalMode('create');
    setEditingSubscription(null);
    setDefaultSubscriptionAccountId(undefined);
    setDefaultSubscriptionPricingIds([]);
    setDefaultSubscriptionScope('ACCOUNT');
  }

  function openFiltersPopover(event: React.MouseEvent<HTMLElement>): void {
    setFiltersAnchorEl(event.currentTarget);
  }

  function closeFiltersPopover(): void {
    setFiltersAnchorEl(null);
  }

  function clearFilters(): void {
    setTypeFilter('ALL');
    setProductIdFilter([]);
    setAccountIdFilter([]);
  }

  function openSortMenu(event: React.MouseEvent<HTMLElement>): void {
    setSortMenuAnchorEl(event.currentTarget);
  }

  function closeSortMenu(): void {
    setSortMenuAnchorEl(null);
  }

  function selectSortBy(nextSortBy: PricingSortField): void {
    setSortBy(nextSortBy);
    closeSortMenu();
  }

  function toggleSortDirection(): void {
    setSortDirection((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
  }

  return {
    filters: {
      search,
      setSearch,
      typeFilter,
      setTypeFilter,
      productIdFilter,
      setProductIdFilter,
      accountIdFilter,
      setAccountIdFilter,
      filtersAnchorEl,
      isFiltersPopoverOpen,
      openFiltersPopover,
      closeFiltersPopover,
      clearFilters
    },
    sort: {
      sortBy,
      sortDirection,
      sortMenuAnchorEl,
      isSortMenuOpen,
      openSortMenu,
      closeSortMenu,
      selectSortBy,
      toggleSortDirection
    },
    view: {
      groupByProduct,
      setGroupByProduct
    },
    pricingModal: {
      pricingModalOpen,
      pricingModalMode,
      editingPricing,
      defaultProductId,
      openCreatePricing,
      openEditPricing,
      closePricingModal
    },
    subscriptionModal: {
      subscriptionModalOpen,
      subscriptionModalMode,
      editingSubscription,
      defaultSubscriptionAccountId,
      defaultSubscriptionPricingIds,
      defaultSubscriptionScope,
      openCreateSubscription,
      openEditSubscription,
      closeSubscriptionModal
    },
    confirmations: {
      deletingPricing,
      setDeletingPricing,
      detachConfirmTarget,
      setDetachConfirmTarget
    },
    feedback: {
      actionError,
      setActionError,
      successMessage,
      setSuccessMessage
    }
  };
}
