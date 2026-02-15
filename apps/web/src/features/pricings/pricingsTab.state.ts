import { useState } from 'react';
import type { BillingScope, PricingTreeItem, PricingType } from '../../api';
import type { DetachConfirmTarget, PricingActionsMenuTarget } from './components/pricingTree.types';
import type { PricingSortField, SortDirection } from './pricingsTab.utils';

type SubscriptionOpenOptions = {
  accountId?: string;
  scope?: BillingScope;
};

export function usePricingsTabState() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PricingType>('ALL');
  const [productIdFilter, setProductIdFilter] = useState<string[]>([]);
  const [accountIdFilter, setAccountIdFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<PricingSortField>('NAME');
  const [sortDirection, setSortDirection] = useState<SortDirection>('ASC');
  const [groupByProduct, setGroupByProduct] = useState(true);
  const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState<HTMLElement | null>(null);

  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [pricingModalMode, setPricingModalMode] = useState<'create' | 'edit'>('create');
  const [editingPricing, setEditingPricing] = useState<PricingTreeItem | null>(null);
  const [defaultProductId, setDefaultProductId] = useState<string | undefined>(undefined);

  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [defaultSubscriptionAccountId, setDefaultSubscriptionAccountId] =
    useState<string | undefined>(undefined);
  const [defaultSubscriptionPricingIds, setDefaultSubscriptionPricingIds] = useState<string[]>([]);
  const [defaultSubscriptionScope, setDefaultSubscriptionScope] = useState<BillingScope>('ACCOUNT');

  const [deletingPricing, setDeletingPricing] = useState<PricingTreeItem | null>(null);
  const [pricingActionsTarget, setPricingActionsTarget] =
    useState<PricingActionsMenuTarget | null>(null);
  const [detachConfirmTarget, setDetachConfirmTarget] = useState<DetachConfirmTarget | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isFiltersPopoverOpen = Boolean(filtersAnchorEl);
  const isSortMenuOpen = Boolean(sortMenuAnchorEl);

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
    setDefaultSubscriptionPricingIds([pricingId]);
    setDefaultSubscriptionAccountId(options?.accountId);
    setDefaultSubscriptionScope(options?.scope ?? 'ACCOUNT');
    setSubscriptionModalOpen(true);
  }

  function closeSubscriptionModal(): void {
    setSubscriptionModalOpen(false);
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
      defaultSubscriptionAccountId,
      defaultSubscriptionPricingIds,
      defaultSubscriptionScope,
      openCreateSubscription,
      closeSubscriptionModal
    },
    confirmations: {
      deletingPricing,
      setDeletingPricing,
      detachConfirmTarget,
      setDetachConfirmTarget
    },
    actionsMenu: {
      pricingActionsTarget,
      setPricingActionsTarget
    },
    feedback: {
      actionError,
      setActionError,
      successMessage,
      setSuccessMessage
    }
  };
}
