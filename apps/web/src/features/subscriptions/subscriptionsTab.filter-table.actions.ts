import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  type BillingScope,
  type PricingItem,
  type SubscriptionItem,
  type SubscriptionPricingItem,
  type SubscriptionStatus
} from '../../api';
import {
  loadAllMatchingSubscriptionIds,
  toPricingItem
} from './subscriptionsTab.helpers';
import {
  getBulkErrorMessage,
  toggleSelectedId,
  type SubscriptionsSortDirection,
  type SubscriptionsSortField
} from './subscriptionsTab.utils';

type SetState<T> = Dispatch<SetStateAction<T>>;

type CreateSubscriptionsTabFilterTableActionsInput = {
  search: string;
  scopeFilter: 'ALL' | BillingScope;
  statusFilter: SubscriptionStatus[];
  accountIdsFilter: string[];
  pricingIdsFilter: string[];
  setSearch: SetState<string>;
  setScopeFilter: SetState<'ALL' | BillingScope>;
  setStatusFilter: SetState<SubscriptionStatus[]>;
  setAccountIdsFilter: SetState<string[]>;
  setPricingIdsFilter: SetState<string[]>;
  setPage: SetState<number>;
  setDrawerMode: SetState<'create' | 'edit'>;
  setDrawerOpen: SetState<boolean>;
  setEditingSubscription: SetState<SubscriptionItem | null>;
  setPricingDrawerOpen: SetState<boolean>;
  setEditingPricing: SetState<PricingItem | null>;
  pricings: PricingItem[];
  setSelectedIds: SetState<string[]>;
  allMatchingSelected: boolean;
  isSelectingAll: boolean;
  setIsSelectingAll: SetState<boolean>;
  selectAllRequestIdRef: MutableRefObject<number>;
  sortField: SubscriptionsSortField | null;
  setSortField: SetState<SubscriptionsSortField | null>;
  setSortDirection: SetState<SubscriptionsSortDirection>;
  setBulkError: SetState<string | null>;
};

export function createSubscriptionsTabFilterTableActions(
  input: CreateSubscriptionsTabFilterTableActionsInput
) {
  const {
    search,
    scopeFilter,
    statusFilter,
    accountIdsFilter,
    pricingIdsFilter,
    setSearch,
    setScopeFilter,
    setStatusFilter,
    setAccountIdsFilter,
    setPricingIdsFilter,
    setPage,
    setDrawerMode,
    setDrawerOpen,
    setEditingSubscription,
    setPricingDrawerOpen,
    setEditingPricing,
    pricings,
    setSelectedIds,
    allMatchingSelected,
    isSelectingAll,
    setIsSelectingAll,
    selectAllRequestIdRef,
    sortField,
    setSortField,
    setSortDirection,
    setBulkError
  } = input;

  function onSearchChange(value: string): void {
    setSearch(value);
    setPage(0);
  }

  function onScopeFilterChange(value: 'ALL' | BillingScope): void {
    setScopeFilter(value);
    setPage(0);
  }

  function onStatusFilterChange(value: SubscriptionStatus[]): void {
    setStatusFilter(Array.from(new Set(value)));
    setPage(0);
  }

  function onAccountFilterChange(value: string[]): void {
    setAccountIdsFilter(value);
    setPage(0);
  }

  function onPricingFilterChange(value: string[]): void {
    setPricingIdsFilter(value);
    setPage(0);
  }

  function openCreateDrawer(): void {
    setDrawerMode('create');
    setEditingSubscription(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(subscription: SubscriptionItem): void {
    setDrawerMode('edit');
    setEditingSubscription(subscription);
    setDrawerOpen(true);
  }

  function closeDrawer(): void {
    setDrawerOpen(false);
  }

  function openEditPricing(pricing: SubscriptionPricingItem): void {
    const fullPricing = pricings.find((item) => item.id === pricing.id);
    setEditingPricing(fullPricing ?? toPricingItem(pricing));
    setPricingDrawerOpen(true);
  }

  function closePricingDrawer(): void {
    setPricingDrawerOpen(false);
    setEditingPricing(null);
  }

  function toggleOneSelection(subscriptionId: string): void {
    setSelectedIds((previous) => toggleSelectedId(previous, subscriptionId));
  }

  async function toggleAllSelection(): Promise<void> {
    if (isSelectingAll) {
      return;
    }

    if (allMatchingSelected) {
      selectAllRequestIdRef.current += 1;
      setIsSelectingAll(false);
      setSelectedIds([]);
      return;
    }

    const requestId = selectAllRequestIdRef.current + 1;
    selectAllRequestIdRef.current = requestId;
    setBulkError(null);
    setIsSelectingAll(true);

    try {
      const allIds = await loadAllMatchingSubscriptionIds({
        search,
        scopeFilter,
        statusFilter,
        accountIdsFilter,
        pricingIdsFilter
      });

      if (selectAllRequestIdRef.current !== requestId) {
        return;
      }

      setSelectedIds(allIds);
    } catch (error) {
      if (selectAllRequestIdRef.current !== requestId) {
        return;
      }

      setBulkError(getBulkErrorMessage(error));
    } finally {
      if (selectAllRequestIdRef.current === requestId) {
        setIsSelectingAll(false);
      }
    }
  }

  function onSort(field: SubscriptionsSortField): void {
    if (sortField === field) {
      setSortDirection((previous) => (previous === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDirection('asc');
  }

  return {
    onSearchChange,
    onScopeFilterChange,
    onStatusFilterChange,
    onAccountFilterChange,
    onPricingFilterChange,
    openCreateDrawer,
    openEditDrawer,
    closeDrawer,
    openEditPricing,
    closePricingDrawer,
    toggleOneSelection,
    toggleAllSelection,
    onSort
  };
}
