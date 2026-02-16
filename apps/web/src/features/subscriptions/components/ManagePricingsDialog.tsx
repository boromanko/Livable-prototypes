import { Alert, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { PricingItem } from '../../../api';
import { PrimaryButton, SecondaryButton } from '../../../components/buttons';
import { AppFormDialog } from '../../../components/layout';
import { PricingFormDrawer } from '../../pricings/PricingFormDrawer';
import { SubscriptionFormPricingsSection } from './SubscriptionFormSections.payment-pricings';

type ManagePricingsDialogProps = {
  open: boolean;
  selectedCount: number;
  pricingIds: string[];
  usageCountByPricingId: Record<string, number>;
  pricings: PricingItem[];
  isLoading: boolean;
  isPending: boolean;
  hasChanges: boolean;
  error: string | null;
  canCreatePricing: boolean;
  onPricingIdsChange: (pricingIds: string[]) => void;
  onAppendPricingId: (pricingId: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function ManagePricingsDialog(props: ManagePricingsDialogProps): JSX.Element {
  const {
    open,
    selectedCount,
    pricingIds,
    usageCountByPricingId,
    pricings,
    isLoading,
    isPending,
    hasChanges,
    error,
    canCreatePricing,
    onPricingIdsChange,
    onAppendPricingId,
    onClose,
    onConfirm
  } = props;
  const [isCreatePricingOpen, setIsCreatePricingOpen] = useState(false);
  const [createdPricings, setCreatedPricings] = useState<PricingItem[]>([]);

  useEffect(() => {
    if (open) {
      return;
    }

    setCreatedPricings([]);
  }, [open]);

  const mergedPricings = useMemo(() => {
    const pricingById = new Map(pricings.map((pricing) => [pricing.id, pricing]));
    for (const createdPricing of createdPricings) {
      if (!pricingById.has(createdPricing.id)) {
        pricingById.set(createdPricing.id, createdPricing);
      }
    }

    return Array.from(pricingById.values());
  }, [createdPricings, pricings]);

  return (
    <>
      <AppFormDialog
        open={open}
        onClose={onClose}
        title="Manage pricings"
        subtitle={`Selected ${selectedCount} subscription${selectedCount === 1 ? '' : 's'}`}
        headerAlignItems="flex-start"
        closeButtonDisabled={isPending}
        bodySpacing={2.5}
        footer={
          <>
            <SecondaryButton onClick={onClose} disabled={isPending}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={onConfirm}
              disabled={isPending || isLoading || !hasChanges}
            >
              Save changes
            </PrimaryButton>
          </>
        }
      >
        {isLoading ? (
          <Typography variant="body2" color="text.secondary">
            Loading pricings...
          </Typography>
        ) : (
          <SubscriptionFormPricingsSection
            value={pricingIds}
            pricings={mergedPricings}
            error={false}
            usageCountByPricingId={usageCountByPricingId}
            showPricingUsage
            onCreatePricing={canCreatePricing ? () => setIsCreatePricingOpen(true) : undefined}
            onChange={onPricingIdsChange}
          />
        )}

        {error ? <Alert severity="error">{error}</Alert> : null}
      </AppFormDialog>

      {canCreatePricing ? (
        <PricingFormDrawer
          open={isCreatePricingOpen}
          mode="create"
          initialPricing={null}
          onSaved={(pricing) => {
            setCreatedPricings((previous) => {
              if (previous.some((item) => item.id === pricing.id)) {
                return previous;
              }

              return [...previous, pricing];
            });
            onAppendPricingId(pricing.id);
          }}
          onClose={() => setIsCreatePricingOpen(false)}
        />
      ) : null}
    </>
  );
}
