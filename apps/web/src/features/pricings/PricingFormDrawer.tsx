import CloseIcon from '@mui/icons-material/Close';
import { Alert, Dialog, Stack, Typography } from '@mui/material';
import type { PricingItem } from '../../api';
import { AppIconButton, PrimaryButton, SecondaryButton } from '../../components/buttons';
import {
  PricingFormFixedPriceSection,
  PricingFormMinimumPriceSection,
  PricingFormNameSection,
  PricingFormProductSection,
  PricingFormTieredSection,
  PricingFormTypeSection
} from './components/PricingFormSections';
import { usePricingFormController } from './pricingForm.hooks';

type PricingFormDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialPricing: PricingItem | null;
  defaultProductId?: string;
  onSaved?: (pricing: PricingItem) => void;
  onClose: () => void;
};

export function PricingFormDrawer(props: PricingFormDrawerProps): JSX.Element {
  const controller = usePricingFormController(props);

  return (
    <Dialog
      open={props.open}
      onClose={controller.actions.onClose}
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
          alignItems="center"
          justifyContent="space-between"
          sx={{
            px: { xs: 2.5, sm: 5 },
            py: 3.5,
            background: 'linear-gradient(180deg, #F8F9FA 0%, #FFFFFF 100%)',
            borderBottom: '1px solid #E1E7EC',
            flexShrink: 0
          }}
        >
          <Typography sx={{ color: '#212934', fontSize: 20, fontWeight: 600 }}>
            {controller.title}
          </Typography>
          <AppIconButton tone="plain" onClick={controller.actions.onClose} aria-label="Close dialog">
            <CloseIcon sx={{ color: '#4B617C' }} />
          </AppIconButton>
        </Stack>

        <Stack
          spacing={4}
          sx={{
            px: { xs: 2.5, sm: 4 },
            py: 4,
            flex: 1,
            overflowY: 'auto'
          }}
        >
          {controller.formError ? <Alert severity="error">{controller.formError}</Alert> : null}

          <PricingFormNameSection
            fieldRef={controller.refs.internalNameFieldRef}
            value={controller.formState.internalName}
            error={controller.validation.pricingNameError}
            onChange={controller.actions.setInternalName}
          />

          <PricingFormProductSection
            fieldRef={controller.refs.productFieldRef}
            value={controller.formState.productId}
            productItems={controller.productItems}
            productsLoading={controller.productsLoading}
            error={controller.validation.productError}
            onChange={controller.actions.setProductId}
          />

          <PricingFormTypeSection
            value={controller.formState.type}
            onChange={controller.actions.setPricingType}
          />

          {controller.formState.type === 'FIXED' ? (
            <PricingFormFixedPriceSection
              fieldRef={controller.refs.fixedAmountFieldRef}
              value={controller.formState.fixedAmountUsd}
              error={controller.validation.fixedAmountError}
              onChange={controller.actions.setFixedAmount}
              onBlur={controller.actions.onNormalizeFixedAmountOnBlur}
            />
          ) : (
            <PricingFormTieredSection
              fieldRef={controller.refs.tierSectionRef}
              tiers={controller.formState.tiers}
              tierStartUnits={controller.validation.tierStartUnits}
              tierValidationErrors={controller.validation.tierValidation.errors}
              showValidation={controller.showValidation}
              hasTierErrors={controller.validation.hasTierErrors}
              onAddTier={controller.actions.onAddTier}
              onRemoveTier={controller.actions.onRemoveTier}
              onUpdateTierMaxUnits={controller.actions.onUpdateTierMaxUnits}
              onNormalizeTierMaxUnitsOnBlur={controller.actions.onNormalizeTierMaxUnitsOnBlur}
              onUpdateTierUnitPrice={controller.actions.onUpdateTierUnitPrice}
              onNormalizeTierUnitPriceOnBlur={controller.actions.onNormalizeTierUnitPriceOnBlur}
            />
          )}

          {controller.formState.type === 'TIERED' ? (
            <PricingFormMinimumPriceSection
              fieldRef={controller.refs.minimumPriceFieldRef}
              value={controller.formState.minimumPriceUsd}
              error={controller.validation.minimumPriceError}
              onChange={controller.actions.setMinimumPrice}
              onBlur={controller.actions.onNormalizeMinimumPriceOnBlur}
            />
          ) : null}
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
          <SecondaryButton onClick={controller.actions.onClose} disabled={controller.isSaving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={controller.actions.onSubmit} disabled={controller.isSaving}>
            Save pricing
          </PrimaryButton>
        </Stack>
      </Stack>
    </Dialog>
  );
}
