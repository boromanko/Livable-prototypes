import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  useCreatePricingMutation,
  useProductsQuery,
  useUpdatePricingMutation,
  type PricingItem,
  type PricingType
} from '../../api';

type TierDraft = {
  id: string;
  fromUnit: number;
  toUnit: string;
  unitAmountCents: number;
};

type PricingFormState = {
  productId: string;
  internalName: string;
  type: PricingType;
  fixedAmountCents: string;
  minimumPriceCents: string;
  currency: string;
  billingInterval: string;
  isActive: boolean;
  tiers: TierDraft[];
};

type PricingFormDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialPricing: PricingItem | null;
  onClose: () => void;
};

function defaultTier(id: string): TierDraft {
  return {
    id,
    fromUnit: 1,
    toUnit: '',
    unitAmountCents: 0
  };
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (
      error.payload &&
      typeof error.payload === 'object' &&
      'message' in error.payload &&
      typeof error.payload.message === 'string'
    ) {
      return error.payload.message;
    }
    return `Request failed with status ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected error';
}

function buildInitialState(pricing?: PricingItem | null): PricingFormState {
  if (!pricing) {
    return {
      productId: '',
      internalName: '',
      type: 'FIXED',
      fixedAmountCents: '',
      minimumPriceCents: '',
      currency: 'usd',
      billingInterval: 'month',
      isActive: true,
      tiers: [defaultTier(crypto.randomUUID())]
    };
  }

  return {
    productId: pricing.product.id,
    internalName: pricing.internalName,
    type: pricing.type,
    fixedAmountCents: pricing.fixedAmountCents === null ? '' : String(pricing.fixedAmountCents),
    minimumPriceCents:
      pricing.minimumPriceCents === null ? '' : String(pricing.minimumPriceCents),
    currency: pricing.currency,
    billingInterval: pricing.billingInterval,
    isActive: pricing.isActive,
    tiers:
      pricing.tiers.length > 0
        ? pricing.tiers.map((tier) => ({
            id: tier.id,
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit === null ? '' : String(tier.toUnit),
            unitAmountCents: tier.unitAmountCents
          }))
        : [defaultTier(crypto.randomUUID())]
  };
}

export function PricingFormDrawer(props: PricingFormDrawerProps): JSX.Element {
  const { open, mode, initialPricing, onClose } = props;

  const [formState, setFormState] = useState<PricingFormState>(() => buildInitialState(null));
  const [formError, setFormError] = useState<string | null>(null);

  const productsQuery = useProductsQuery();
  const createMutation = useCreatePricingMutation();
  const updateMutation = useUpdatePricingMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) {
      return;
    }
    setFormState(buildInitialState(initialPricing));
    setFormError(null);
  }, [initialPricing, open]);

  const canSubmit = useMemo(() => {
    if (!formState.productId || !formState.internalName.trim()) {
      return false;
    }
    if (formState.type === 'FIXED') {
      const fixedAmount = parseNumber(formState.fixedAmountCents);
      return fixedAmount !== null && fixedAmount >= 0;
    }
    if (formState.tiers.length === 0) {
      return false;
    }
    return formState.tiers.every((tier) => tier.fromUnit > 0 && tier.unitAmountCents >= 0);
  }, [formState]);

  function addTier(): void {
    setFormState((prev) => ({
      ...prev,
      tiers: [...prev.tiers, defaultTier(crypto.randomUUID())]
    }));
  }

  function removeTier(tierId: string): void {
    setFormState((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((tier) => tier.id !== tierId)
    }));
  }

  async function handleSubmit(): Promise<void> {
    setFormError(null);

    const minimumPrice = parseNumber(formState.minimumPriceCents);
    const fixedAmount = parseNumber(formState.fixedAmountCents);

    try {
      if (isEdit && initialPricing) {
        await updateMutation.mutateAsync({
          pricingId: initialPricing.id,
          payload: {
            internalName: formState.internalName.trim(),
            type: formState.type,
            fixedAmountCents:
              formState.type === 'FIXED' ? (fixedAmount ?? undefined) : null,
            minimumPriceCents: minimumPrice,
            currency: formState.currency.toLowerCase(),
            billingInterval: formState.billingInterval,
            isActive: formState.isActive,
            tiers:
              formState.type === 'TIERED'
                ? formState.tiers.map((tier) => ({
                    fromUnit: tier.fromUnit,
                    toUnit: tier.toUnit === '' ? null : Number(tier.toUnit),
                    unitAmountCents: tier.unitAmountCents
                  }))
                : []
          }
        });
      } else {
        await createMutation.mutateAsync({
          productId: formState.productId,
          internalName: formState.internalName.trim(),
          type: formState.type,
          fixedAmountCents:
            formState.type === 'FIXED' ? (fixedAmount ?? undefined) : null,
          minimumPriceCents: minimumPrice,
          currency: formState.currency.toLowerCase(),
          billingInterval: formState.billingInterval,
          isActive: formState.isActive,
          tiers:
            formState.type === 'TIERED'
              ? formState.tiers.map((tier) => ({
                  fromUnit: tier.fromUnit,
                  toUnit: tier.toUnit === '' ? null : Number(tier.toUnit),
                  unitAmountCents: tier.unitAmountCents
                }))
              : []
        });
      }

      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 560 }
        }
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ p: 2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {isEdit ? 'Edit Pricing' : 'Create Pricing'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure fixed or tiered pricing for a selected product.
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close drawer">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Divider />

        <Stack spacing={2} sx={{ p: 2, overflowY: 'auto' }}>
          {formError ? <Alert severity="error">{formError}</Alert> : null}

          <TextField
            select
            label="Product"
            value={formState.productId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                productId: event.target.value
              }))
            }
            disabled={productsQuery.isPending || isEdit}
            helperText={isEdit ? 'Product is fixed for existing pricing.' : undefined}
          >
            {(productsQuery.data?.items ?? []).map((product) => (
              <MenuItem key={product.id} value={product.id}>
                {product.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Internal Pricing Name"
            value={formState.internalName}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                internalName: event.target.value
              }))
            }
          />

          <TextField
            select
            label="Pricing Type"
            value={formState.type}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                type: event.target.value as PricingType
              }))
            }
          >
            <MenuItem value="FIXED">FIXED</MenuItem>
            <MenuItem value="TIERED">TIERED</MenuItem>
          </TextField>

          {formState.type === 'FIXED' ? (
            <TextField
              label="Fixed Amount (cents)"
              type="number"
              value={formState.fixedAmountCents}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  fixedAmountCents: event.target.value
                }))
              }
            />
          ) : (
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Tier Rules
              </Typography>
              {formState.tiers.map((tier, index) => (
                <Stack key={tier.id} direction={{ xs: 'column', md: 'row' }} spacing={1}>
                  <TextField
                    label="From"
                    type="number"
                    value={tier.fromUnit}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        tiers: prev.tiers.map((row) =>
                          row.id === tier.id
                            ? { ...row, fromUnit: Number(event.target.value || 0) }
                            : row
                        )
                      }))
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="To (empty = open-ended)"
                    type="number"
                    value={tier.toUnit}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        tiers: prev.tiers.map((row) =>
                          row.id === tier.id ? { ...row, toUnit: event.target.value } : row
                        )
                      }))
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Unit Amount (cents)"
                    type="number"
                    value={tier.unitAmountCents}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        tiers: prev.tiers.map((row) =>
                          row.id === tier.id
                            ? { ...row, unitAmountCents: Number(event.target.value || 0) }
                            : row
                        )
                      }))
                    }
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    color="error"
                    onClick={() => removeTier(tier.id)}
                    disabled={formState.tiers.length === 1 && index === 0}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              ))}

              <Button startIcon={<AddIcon />} onClick={addTier}>
                Add Tier
              </Button>
            </Stack>
          )}

          <TextField
            label="Minimum Price (cents, optional)"
            type="number"
            value={formState.minimumPriceCents}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                minimumPriceCents: event.target.value
              }))
            }
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Currency"
              value={formState.currency}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  currency: event.target.value
                }))
              }
              sx={{ flex: 1 }}
            />
            <TextField
              label="Billing Interval"
              value={formState.billingInterval}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  billingInterval: event.target.value
                }))
              }
              sx={{ flex: 1 }}
            />
          </Stack>

          <FormControlLabel
            control={
              <Switch
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: event.target.checked
                  }))
                }
              />
            }
            label="Active pricing"
          />
        </Stack>

        <Divider />

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ p: 2 }}>
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || isSaving}>
            {isEdit ? 'Save changes' : 'Create pricing'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
