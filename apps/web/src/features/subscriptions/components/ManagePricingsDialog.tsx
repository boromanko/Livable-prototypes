import CloseIcon from '@mui/icons-material/Close';
import { Alert, Dialog, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import type { PricingItem } from '../../../api';
import { AppIconButton, PrimaryButton, SecondaryButton } from '../../../components/buttons';
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
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth={false}
        PaperProps={{
          sx: {
            width: { xs: 'calc(100vw - 16px)', sm: 760 },
            maxWidth: 760,
            height: 'min(920px, calc(100vh - 16px))',
            m: { xs: 1, sm: 2 },
            overflow: 'hidden',
            borderRadius: '2px',
            boxShadow: '0px 18px 32px rgba(0, 0, 0, 0.15)'
          }
        }}
      >
        <Stack sx={{ height: '100%' }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            justifyContent="space-between"
            sx={{
              px: { xs: 2.5, sm: 5 },
              py: 3.5,
              background: 'linear-gradient(180deg, #F8F9FA 0%, #FFFFFF 100%)',
              borderBottom: '1px solid #E1E7EC',
              flexShrink: 0
            }}
          >
            <Stack spacing={0.75}>
              <Typography sx={{ color: '#212934', fontSize: 20, fontWeight: 600 }}>
                Manage pricings
              </Typography>
              <Typography variant="body2" sx={{ color: '#4B617C' }}>
                {`Selected ${selectedCount} subscription${selectedCount === 1 ? '' : 's'}`}
              </Typography>
            </Stack>
            <AppIconButton
              tone="plain"
              onClick={onClose}
              aria-label="Close dialog"
              disabled={isPending}
            >
              <CloseIcon sx={{ color: '#4B617C' }} />
            </AppIconButton>
          </Stack>

          <Stack
            spacing={2.5}
            sx={{
              px: { xs: 2.5, sm: 4 },
              py: 4,
              flex: 1,
              overflowY: 'auto'
            }}
          >
            {isLoading ? (
              <Typography variant="body2" color="text.secondary">
                Loading pricings...
              </Typography>
            ) : (
              <>
                <SubscriptionFormPricingsSection
                  value={pricingIds}
                  pricings={mergedPricings}
                  error={false}
                  usageCountByPricingId={usageCountByPricingId}
                  showPricingUsage
                  onCreatePricing={() => setIsCreatePricingOpen(true)}
                  onChange={onPricingIdsChange}
                />
              </>
            )}

            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{
              px: 3,
              py: 2,
              borderTop: '1px solid #E1E7EC',
              backgroundColor: '#FFFFFF',
              flexShrink: 0
            }}
          >
            <SecondaryButton onClick={onClose} disabled={isPending}>
              Cancel
            </SecondaryButton>
            <PrimaryButton
              onClick={onConfirm}
              disabled={isPending || isLoading || !hasChanges}
            >
              Save changes
            </PrimaryButton>
          </Stack>
        </Stack>
      </Dialog>

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
    </>
  );
}
