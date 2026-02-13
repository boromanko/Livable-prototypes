import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
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
  maxUnits: string;
  unitAmountUsd: string;
};

type PricingFormState = {
  productId: string;
  internalName: string;
  type: PricingType;
  fixedAmountUsd: string;
  minimumPriceUsd: string;
  tiers: TierDraft[];
};

type PricingFormDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialPricing: PricingItem | null;
  onClose: () => void;
};

type TierDraftErrors = {
  maxUnits?: string;
  unitAmountUsd?: string;
};

type TierValidation = {
  errors: TierDraftErrors[];
  payload: Array<{
    fromUnit: number;
    toUnit: number | null;
    unitAmountCents: number;
  }>;
  hasErrors: boolean;
};

function defaultTier(id: string, maxUnits = ''): TierDraft {
  return {
    id,
    maxUnits,
    unitAmountUsd: ''
  };
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function sanitizeIntegerInput(value: string): string {
  return value.replace(/\D/g, '');
}

function sanitizeMoneyInput(value: string): string {
  const normalized = value.replace(',', '.');
  let sanitized = '';
  let hasDot = false;

  for (const character of normalized) {
    if (/\d/.test(character)) {
      sanitized += character;
      continue;
    }

    if (character === '.' && !hasDot) {
      sanitized += '.';
      hasDot = true;
    }
  }

  if (sanitized.startsWith('.')) {
    sanitized = `0${sanitized}`;
  }

  if (!sanitized.includes('.')) {
    return sanitized;
  }

  const [integerPart, decimalPart = ''] = sanitized.split('.');
  return `${integerPart}.${decimalPart.slice(0, 2)}`;
}

function parseUsdToCents(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const normalized = trimmed.replace(',', '.');
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

function formatCentsToUsdInput(valueCents: number | null): string {
  if (valueCents === null) {
    return '';
  }

  const dollars = (valueCents / 100).toFixed(2);
  return dollars.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

function getTierStartUnits(tiers: TierDraft[]): number[] {
  const starts: number[] = [];
  let currentStart = 1;

  for (let index = 0; index < tiers.length; index += 1) {
    starts.push(currentStart);

    if (index === tiers.length - 1) {
      continue;
    }

    const maxUnits = parsePositiveInteger(tiers[index]?.maxUnits ?? '');
    if (maxUnits !== null && maxUnits >= currentStart) {
      currentStart = maxUnits + 1;
    }
  }

  return starts;
}

function getMinAllowedMaxUnits(tiers: TierDraft[], index: number): number {
  let currentStart = 1;

  for (let i = 0; i < index; i += 1) {
    const previousMax = parsePositiveInteger(tiers[i]?.maxUnits ?? '');
    if (previousMax !== null && previousMax >= currentStart) {
      currentStart = previousMax + 1;
    }
  }

  return currentStart;
}

function validateTiers(tiers: TierDraft[]): TierValidation {
  const errors: TierDraftErrors[] = tiers.map(() => ({}));
  const payload: TierValidation['payload'] = [];

  let currentFromUnit = 1;

  for (let index = 0; index < tiers.length; index += 1) {
    const tier = tiers[index];
    const isLastTier = index === tiers.length - 1;

    const unitAmountCents = parseUsdToCents(tier.unitAmountUsd);
    if (unitAmountCents === null) {
      errors[index].unitAmountUsd = 'Unit price is required (USD).';
    }

    const maxUnits = parsePositiveInteger(tier.maxUnits);

    if (isLastTier && maxUnits === null) {
      payload.push({
        fromUnit: currentFromUnit,
        toUnit: null,
        unitAmountCents: unitAmountCents ?? 0
      });
      continue;
    }

    if (maxUnits === null) {
      errors[index].maxUnits = 'Max units is required.';
      payload.push({
        fromUnit: currentFromUnit,
        toUnit: currentFromUnit,
        unitAmountCents: unitAmountCents ?? 0
      });
      continue;
    }

    if (maxUnits < currentFromUnit) {
      errors[index].maxUnits = `Must be greater than or equal to ${currentFromUnit}.`;
      payload.push({
        fromUnit: currentFromUnit,
        toUnit: currentFromUnit,
        unitAmountCents: unitAmountCents ?? 0
      });
      continue;
    }

    payload.push({
      fromUnit: currentFromUnit,
      toUnit: maxUnits,
      unitAmountCents: unitAmountCents ?? 0
    });

    currentFromUnit = maxUnits + 1;
  }

  const hasErrors = errors.some((item) => Boolean(item.maxUnits || item.unitAmountUsd));

  return {
    errors,
    payload,
    hasErrors
  };
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
      fixedAmountUsd: '',
      minimumPriceUsd: '',
      tiers: [defaultTier(crypto.randomUUID())]
    };
  }

  return {
    productId: pricing.product.id,
    internalName: pricing.internalName,
    type: pricing.type,
    fixedAmountUsd: formatCentsToUsdInput(pricing.fixedAmountCents),
    minimumPriceUsd: formatCentsToUsdInput(pricing.minimumPriceCents),
    tiers:
      pricing.tiers.length > 0
        ? pricing.tiers.map((tier) => ({
            id: tier.id,
            maxUnits: tier.toUnit === null ? '' : String(tier.toUnit),
            unitAmountUsd: formatCentsToUsdInput(tier.unitAmountCents)
          }))
        : [defaultTier(crypto.randomUUID())]
  };
}

export function PricingFormDrawer(props: PricingFormDrawerProps): JSX.Element {
  const { open, mode, initialPricing, onClose } = props;

  const [formState, setFormState] = useState<PricingFormState>(() => buildInitialState(null));
  const [formError, setFormError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const productsQuery = useProductsQuery();
  const createMutation = useCreatePricingMutation();
  const updateMutation = useUpdatePricingMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isEdit = mode === 'edit';

  const tierValidation = useMemo(() => validateTiers(formState.tiers), [formState.tiers]);
  const tierStartUnits = useMemo(() => getTierStartUnits(formState.tiers), [formState.tiers]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(buildInitialState(initialPricing));
    setFormError(null);
    setShowValidation(false);
  }, [initialPricing, open]);

  function removeTier(tierId: string): void {
    setFormState((prev) => ({
      ...prev,
      tiers: (() => {
        const nextTiers = prev.tiers.filter((tier) => tier.id !== tierId);
        if (nextTiers.length === 0) {
          return [defaultTier(crypto.randomUUID())];
        }

        const lastTier = nextTiers[nextTiers.length - 1];
        if (parsePositiveInteger(lastTier.maxUnits) !== null) {
          return [...nextTiers, defaultTier(crypto.randomUUID())];
        }

        return nextTiers;
      })()
    }));
  }

  function updateTierMaxUnits(tierId: string, value: string): void {
    const sanitizedValue = sanitizeIntegerInput(value);

    setFormState((prev) => {
      const tierIndex = prev.tiers.findIndex((tier) => tier.id === tierId);
      if (tierIndex === -1) {
        return prev;
      }

      const isEditingLastTier = tierIndex === prev.tiers.length - 1;
      const nextTiers = prev.tiers.map((tier) =>
        tier.id === tierId ? { ...tier, maxUnits: sanitizedValue } : tier
      );

      if (isEditingLastTier && parsePositiveInteger(sanitizedValue) !== null) {
        nextTiers.push(defaultTier(crypto.randomUUID()));
      }

      return {
        ...prev,
        tiers: nextTiers
      };
    });
  }

  function normalizeTierMaxUnitsOnBlur(tierId: string): void {
    setFormState((prev) => {
      const tierIndex = prev.tiers.findIndex((tier) => tier.id === tierId);
      if (tierIndex === -1) {
        return prev;
      }

      const currentValue = prev.tiers[tierIndex]?.maxUnits ?? '';
      const parsedCurrent = parsePositiveInteger(currentValue);
      if (parsedCurrent === null) {
        return prev;
      }

      const minAllowed = getMinAllowedMaxUnits(prev.tiers, tierIndex);
      if (parsedCurrent >= minAllowed) {
        return prev;
      }

      const nextTiers = prev.tiers.map((tier, index) =>
        index === tierIndex ? { ...tier, maxUnits: String(minAllowed) } : tier
      );

      return {
        ...prev,
        tiers: nextTiers
      };
    });
  }

  async function handleSubmit(): Promise<void> {
    setShowValidation(true);
    setFormError(null);

    if (!formState.productId || !formState.internalName.trim()) {
      setFormError('Product and internal pricing name are required.');
      return;
    }

    const minimumPriceCents = parseUsdToCents(formState.minimumPriceUsd);
    if (formState.minimumPriceUsd.trim() !== '' && minimumPriceCents === null) {
      setFormError('Minimum price must be a valid USD amount.');
      return;
    }

    const fixedAmountCents = parseUsdToCents(formState.fixedAmountUsd);

    if (formState.type === 'FIXED' && fixedAmountCents === null) {
      setFormError('Fixed amount must be a valid USD amount.');
      return;
    }

    if (formState.type === 'TIERED') {
      if (formState.tiers.length === 0) {
        setFormError('Add at least one tier.');
        return;
      }

      if (tierValidation.hasErrors) {
        setFormError('Fix tier errors before saving.');
        return;
      }
    }

    try {
      if (isEdit && initialPricing) {
        await updateMutation.mutateAsync({
          pricingId: initialPricing.id,
          payload: {
            internalName: formState.internalName.trim(),
            type: formState.type,
            fixedAmountCents:
              formState.type === 'FIXED' ? (fixedAmountCents ?? undefined) : null,
            minimumPriceCents:
              formState.minimumPriceUsd.trim() === '' ? null : minimumPriceCents,
            tiers: formState.type === 'TIERED' ? tierValidation.payload : []
          }
        });
      } else {
        await createMutation.mutateAsync({
          productId: formState.productId,
          internalName: formState.internalName.trim(),
          type: formState.type,
          fixedAmountCents:
            formState.type === 'FIXED' ? (fixedAmountCents ?? undefined) : null,
          minimumPriceCents:
            formState.minimumPriceUsd.trim() === '' ? null : minimumPriceCents,
          tiers: formState.type === 'TIERED' ? tierValidation.payload : []
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
              label="Fixed Amount (USD)"
              value={formState.fixedAmountUsd}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  fixedAmountUsd: sanitizeMoneyInput(event.target.value)
                }))
              }
              error={showValidation && parseUsdToCents(formState.fixedAmountUsd) === null}
              helperText={
                showValidation && parseUsdToCents(formState.fixedAmountUsd) === null
                  ? 'Fixed amount is required (USD).'
                  : undefined
              }
              inputProps={{ inputMode: 'decimal', placeholder: '0.00' }}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
          ) : (
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Tier Rules
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Enter max units. When you type max in the last row, next open-ended tier is added
                automatically.
              </Typography>

              {formState.tiers.map((tier, index) => {
                const isLastTier = index === formState.tiers.length - 1;
                const helperText = isLastTier
                  ? `Starts at ${tierStartUnits[index] ?? 1}. Leave empty for ∞.`
                  : `Starts at ${tierStartUnits[index] ?? 1}`;

                return (
                  <Stack key={tier.id} direction={{ xs: 'column', md: 'row' }} spacing={1}>
                    <TextField
                      label="Max Units"
                      value={tier.maxUnits}
                      onChange={(event) => updateTierMaxUnits(tier.id, event.target.value)}
                      onBlur={() => normalizeTierMaxUnitsOnBlur(tier.id)}
                      helperText={helperText}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9]*',
                        placeholder: isLastTier ? '∞' : undefined
                      }}
                      sx={{ flex: 1 }}
                    />

                    <TextField
                      label="Unit Price (USD)"
                      value={tier.unitAmountUsd}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          tiers: prev.tiers.map((row) =>
                            row.id === tier.id
                              ? { ...row, unitAmountUsd: sanitizeMoneyInput(event.target.value) }
                              : row
                          )
                        }))
                      }
                      error={showValidation && Boolean(tierValidation.errors[index]?.unitAmountUsd)}
                      helperText={showValidation ? tierValidation.errors[index]?.unitAmountUsd : undefined}
                      inputProps={{ inputMode: 'decimal', placeholder: '0.00' }}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>
                      }}
                      sx={{ flex: 1 }}
                    />

                    <IconButton
                      color="error"
                      onClick={() => removeTier(tier.id)}
                      disabled={formState.tiers.length === 1}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Stack>
                );
              })}
            </Stack>
          )}

          <TextField
            label="Minimum Price (USD, optional)"
            value={formState.minimumPriceUsd}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                minimumPriceUsd: sanitizeMoneyInput(event.target.value)
              }))
            }
            error={
              showValidation &&
              formState.minimumPriceUsd.trim() !== '' &&
              parseUsdToCents(formState.minimumPriceUsd) === null
            }
            helperText={
              showValidation &&
              formState.minimumPriceUsd.trim() !== '' &&
              parseUsdToCents(formState.minimumPriceUsd) === null
                ? 'Enter a valid USD amount.'
                : undefined
            }
            inputProps={{ inputMode: 'decimal', placeholder: '0.00' }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>
            }}
          />

        </Stack>

        <Divider />

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ p: 2 }}>
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={isSaving}>
            {isEdit ? 'Save changes' : 'Create pricing'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
