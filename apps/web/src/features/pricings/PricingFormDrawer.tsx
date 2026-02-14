import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Dialog,
  IconButton,
  InputAdornment,
  InputBase,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError,
  useCreatePricingMutation,
  usePricingsQuery,
  useProductsQuery,
  useUpdatePricingMutation,
  type PricingItem,
  type PricingType
} from '../../api';
import { PrimaryButton, SecondaryButton } from '../../components/buttons';

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
  defaultProductId?: string;
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

type FormValidationState = {
  internalNameError: boolean;
  productError: boolean;
  fixedAmountError: boolean;
  minimumPriceError: boolean;
  tiersError: boolean;
  hasErrors: boolean;
};

const tableColumnTemplate = '64px minmax(240px, 1fr) minmax(240px, 1fr) 48px';
const errorTint = '#FFF1F1';
const focusTint = '#EEF8F8';

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

function formatUsdInputOnBlur(value: string): string {
  if (value.trim() === '') {
    return '';
  }

  const parsedCents = parseUsdToCents(value);
  if (parsedCents === null) {
    return value;
  }

  return (parsedCents / 100).toFixed(2);
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
      continue;
    }

    // Keep placeholder starts monotonic even for empty/invalid draft rows.
    currentStart += 1;
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

function getFormValidationState(
  formState: PricingFormState,
  tierValidation: TierValidation
): FormValidationState {
  const internalNameError = formState.internalName.trim() === '';
  const productError = formState.productId === '';

  const minimumPriceCents = parseUsdToCents(formState.minimumPriceUsd);
  const minimumPriceError =
    formState.type === 'TIERED' &&
    formState.minimumPriceUsd.trim() !== '' &&
    minimumPriceCents === null;

  const fixedAmountCents = parseUsdToCents(formState.fixedAmountUsd);
  const fixedAmountError = formState.type === 'FIXED' && fixedAmountCents === null;

  const tiersError =
    formState.type === 'TIERED' && (formState.tiers.length === 0 || tierValidation.hasErrors);

  const hasErrors =
    internalNameError || productError || minimumPriceError || fixedAmountError || tiersError;

  return {
    internalNameError,
    productError,
    fixedAmountError,
    minimumPriceError,
    tiersError,
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

function buildDefaultPricingName(pricings: PricingItem[] | undefined): string {
  const maxPriceIndex = (pricings ?? []).reduce((acc, pricing) => {
    const match = pricing.internalName.trim().match(/^Price\s+(\d+)$/i);
    if (!match) {
      return acc;
    }

    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed)) {
      return acc;
    }

    return Math.max(acc, parsed);
  }, 0);

  return `Price ${maxPriceIndex + 1}`;
}

function buildInitialState(
  pricing?: PricingItem | null,
  defaultPricingName = 'Price 1',
  defaultProductId = ''
): PricingFormState {
  if (!pricing) {
    return {
      productId: defaultProductId,
      internalName: defaultPricingName,
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

function sectionTitle(title: string, subtitle?: string): JSX.Element {
  return (
    <Stack spacing={0.5}>
      <Typography sx={{ fontSize: 32 / 2, fontWeight: 600, color: '#212934' }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography sx={{ fontSize: 14, color: '#4B617C' }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}

function getFormFieldSx(hasError: boolean): Record<string, unknown> {
  return {
    '& .MuiOutlinedInput-root': {
      height: 48,
      alignItems: 'center',
      ...(hasError ? { backgroundColor: errorTint } : {})
    },
    '& .MuiOutlinedInput-input': {
      py: '12px'
    },
    '& .MuiSelect-select': {
      py: '12px'
    }
  };
}

export function PricingFormDrawer(props: PricingFormDrawerProps): JSX.Element {
  const { open, mode, initialPricing, defaultProductId, onClose } = props;

  const [formState, setFormState] = useState<PricingFormState>(() =>
    buildInitialState(null, 'Price 1')
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const productsQuery = useProductsQuery();
  const pricingsQuery = usePricingsQuery({
    page: 1,
    pageSize: 100
  });
  const createMutation = useCreatePricingMutation();
  const updateMutation = useUpdatePricingMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isEdit = mode === 'edit';
  const internalNameFieldRef = useRef<HTMLDivElement | null>(null);
  const productFieldRef = useRef<HTMLDivElement | null>(null);
  const fixedAmountFieldRef = useRef<HTMLDivElement | null>(null);
  const tierSectionRef = useRef<HTMLDivElement | null>(null);
  const minimumPriceFieldRef = useRef<HTMLDivElement | null>(null);

  const tierValidation = useMemo(() => validateTiers(formState.tiers), [formState.tiers]);
  const tierStartUnits = useMemo(() => getTierStartUnits(formState.tiers), [formState.tiers]);
  const defaultPricingName = useMemo(
    () => buildDefaultPricingName(pricingsQuery.data?.items),
    [pricingsQuery.data?.items]
  );
  const formValidation = useMemo(
    () => getFormValidationState(formState, tierValidation),
    [formState, tierValidation]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormState(buildInitialState(initialPricing, defaultPricingName, defaultProductId));
    setFormError(null);
    setShowValidation(false);
  }, [defaultPricingName, defaultProductId, initialPricing, open]);

  useEffect(() => {
    if (!open || isEdit) {
      return;
    }

    setFormState((prev) => {
      const currentName = prev.internalName.trim();
      const isAutoName = /^Price\s+\d+$/i.test(currentName);

      if (currentName !== '' && !isAutoName) {
        return prev;
      }

      return {
        ...prev,
        internalName: defaultPricingName
      };
    });
  }, [defaultPricingName, isEdit, open]);

  function addTier(): void {
    setFormState((prev) => ({
      ...prev,
      tiers: [...prev.tiers, defaultTier(crypto.randomUUID())]
    }));
  }

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

  function updateTierUnitPrice(tierId: string, value: string): void {
    setFormState((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) =>
        tier.id === tierId ? { ...tier, unitAmountUsd: sanitizeMoneyInput(value) } : tier
      )
    }));
  }

  function normalizeTierUnitPriceOnBlur(tierId: string): void {
    setFormState((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier) =>
        tier.id === tierId
          ? { ...tier, unitAmountUsd: formatUsdInputOnBlur(tier.unitAmountUsd) }
          : tier
      )
    }));
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

  function normalizeFixedAmountOnBlur(): void {
    setFormState((prev) => ({
      ...prev,
      fixedAmountUsd: formatUsdInputOnBlur(prev.fixedAmountUsd)
    }));
  }

  function normalizeMinimumPriceOnBlur(): void {
    setFormState((prev) => ({
      ...prev,
      minimumPriceUsd: formatUsdInputOnBlur(prev.minimumPriceUsd)
    }));
  }

  function scrollToFirstValidationError(): void {
    const scrollOptions: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' };

    if (formValidation.internalNameError) {
      internalNameFieldRef.current?.scrollIntoView(scrollOptions);
      return;
    }

    if (formValidation.productError) {
      productFieldRef.current?.scrollIntoView(scrollOptions);
      return;
    }

    if (formValidation.fixedAmountError) {
      fixedAmountFieldRef.current?.scrollIntoView(scrollOptions);
      return;
    }

    if (formValidation.tiersError) {
      tierSectionRef.current?.scrollIntoView(scrollOptions);
      return;
    }

    if (formValidation.minimumPriceError) {
      minimumPriceFieldRef.current?.scrollIntoView(scrollOptions);
    }
  }

  async function handleSubmit(): Promise<void> {
    setShowValidation(true);
    setFormError(null);

    if (formValidation.hasErrors) {
      setFormError('Fix highlighted fields before saving.');
      scrollToFirstValidationError();
      return;
    }

    const minimumPriceCents =
      formState.type === 'TIERED' ? parseUsdToCents(formState.minimumPriceUsd) : null;
    const fixedAmountCents = parseUsdToCents(formState.fixedAmountUsd);

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
              formState.type === 'TIERED' && formState.minimumPriceUsd.trim() !== ''
                ? minimumPriceCents
                : null,
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
            formState.type === 'TIERED' && formState.minimumPriceUsd.trim() !== ''
              ? minimumPriceCents
              : null,
          tiers: formState.type === 'TIERED' ? tierValidation.payload : []
        });
      }

      onClose();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  }

  const title = isEdit ? 'Edit pricing' : 'Add pricing';
  const hasTierErrors = formValidation.tiersError;
  const pricingNameError = showValidation && formValidation.internalNameError;
  const productError = showValidation && formValidation.productError;
  const fixedAmountError = showValidation && formValidation.fixedAmountError;
  const minimumPriceError = showValidation && formValidation.minimumPriceError;
  const productItems = productsQuery.data?.items ?? [];

  return (
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
          <Typography sx={{ color: '#212934', fontSize: 40 / 2, fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton onClick={onClose} aria-label="Close dialog">
            <CloseIcon sx={{ color: '#4B617C' }} />
          </IconButton>
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
          {formError ? <Alert severity="error">{formError}</Alert> : null}

          <Stack spacing={2} ref={internalNameFieldRef}>
            {sectionTitle('Pricing name')}
            <TextField
              placeholder="Add pricing name"
              value={formState.internalName}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  internalName: event.target.value
                }))
              }
              error={pricingNameError}
              helperText={
                pricingNameError ? 'Pricing name is required.' : undefined
              }
              sx={getFormFieldSx(pricingNameError)}
            />
          </Stack>

          <Stack spacing={2} ref={productFieldRef}>
            {sectionTitle('Product')}
            <TextField
              select
              value={formState.productId}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  productId: event.target.value
                }))
              }
              disabled={productsQuery.isPending}
              error={productError}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (typeof selected !== 'string' || selected === '') {
                    return <Box component="span" sx={{ color: '#4B617C' }}>Select product</Box>;
                  }

                  return productItems.find((product) => product.id === selected)?.name ?? selected;
                }
              }}
              helperText={
                productError
                  ? 'Product is required.'
                  : undefined
              }
              sx={getFormFieldSx(productError)}
            >
              <MenuItem value="" disabled>
                Select product
              </MenuItem>
              {productItems.map((product) => (
                <MenuItem key={product.id} value={product.id}>
                  {product.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack spacing={2}>
            {sectionTitle('Pricing type')}
            <Stack
              direction="row"
              sx={{
                width: 'fit-content',
                border: '1px solid #009299',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              <PrimaryButton
                onClick={() => setFormState((prev) => ({ ...prev, type: 'FIXED' }))}
                variant={formState.type === 'FIXED' ? 'contained' : 'text'}
                sx={{
                  borderRadius: 0,
                  ...(formState.type === 'FIXED'
                    ? {}
                    : {
                        backgroundColor: 'transparent',
                        color: '#009299',
                        '&:hover': { backgroundColor: '#EAF6F6' }
                      })
                }}
              >
                Fixed price
              </PrimaryButton>
              <PrimaryButton
                onClick={() => setFormState((prev) => ({ ...prev, type: 'TIERED' }))}
                variant={formState.type === 'TIERED' ? 'contained' : 'text'}
                sx={{
                  borderRadius: 0,
                  ...(formState.type === 'TIERED'
                    ? {}
                    : {
                        backgroundColor: 'transparent',
                        color: '#009299',
                        '&:hover': { backgroundColor: '#EAF6F6' }
                      })
                }}
              >
                Tiered price
              </PrimaryButton>
            </Stack>
          </Stack>

          {formState.type === 'FIXED' ? (
            <Stack spacing={2} ref={fixedAmountFieldRef}>
              {sectionTitle('Fixed price')}
              <TextField
                placeholder="0.00"
                value={formState.fixedAmountUsd}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    fixedAmountUsd: sanitizeMoneyInput(event.target.value)
                  }))
                }
                onBlur={normalizeFixedAmountOnBlur}
                error={fixedAmountError}
                helperText={
                  fixedAmountError
                    ? 'Fixed amount is required (USD).'
                    : undefined
                }
                inputProps={{ inputMode: 'decimal' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
                sx={{ maxWidth: 220, ...getFormFieldSx(fixedAmountError) }}
              />
            </Stack>
          ) : (
            <Stack spacing={2} ref={tierSectionRef}>
              {sectionTitle('Tiered pricing', 'Define quantity tiers and pricing')}

              <Box sx={{ overflowX: 'auto' }}>
                <Box
                  sx={{
                    minWidth: 620,
                    border: '1px solid #E1E7EC',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: tableColumnTemplate,
                      backgroundColor: '#F8F9FA',
                      borderBottom: '1px solid #E1E7EC'
                    }}
                  >
                    <Box sx={{ px: 1, py: 1.5, fontSize: 13, fontWeight: 600, color: '#212934' }}>Tier</Box>
                    <Box sx={{ px: 1, py: 1.5, fontSize: 13, fontWeight: 600, color: '#212934' }}>
                      Units quantity
                    </Box>
                    <Box sx={{ px: 1, py: 1.5, fontSize: 13, fontWeight: 600, color: '#212934' }}>
                      Price per unit
                    </Box>
                    <Box sx={{ px: 1, py: 1.5 }} />
                  </Box>

                  {formState.tiers.map((tier, index) => {
                    const isLastTier = index === formState.tiers.length - 1;
                    const start = tierStartUnits[index] ?? 1;
                    const unitsError = showValidation ? tierValidation.errors[index]?.maxUnits : undefined;
                    const priceError = showValidation
                      ? tierValidation.errors[index]?.unitAmountUsd
                      : undefined;

                    return (
                      <Box
                        key={tier.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: tableColumnTemplate,
                          minHeight: 48,
                          borderTop: index === 0 ? 'none' : '1px solid #E1E7EC'
                        }}
                      >
                        <Stack
                          justifyContent="center"
                          sx={{ px: 1, py: 1.25, backgroundColor: '#F8F9FA', color: '#212934' }}
                        >
                          <Typography sx={{ fontSize: 15 }}>{index + 1}</Typography>
                        </Stack>

                        <Stack
                          justifyContent="center"
                          sx={{
                            px: 1,
                            py: 0.5,
                            backgroundColor: unitsError ? errorTint : '#FFFFFF',
                            boxShadow: unitsError ? 'inset 0 0 0 1px #D32F2F' : 'none',
                            transition: 'background-color 120ms ease, box-shadow 120ms ease',
                            '&:focus-within': {
                              backgroundColor: unitsError ? errorTint : focusTint,
                              boxShadow: unitsError
                                ? 'inset 0 0 0 1.5px #D32F2F'
                                : 'inset 0 0 0 2px #009299'
                            }
                          }}
                        >
                          <InputBase
                            value={tier.maxUnits}
                            onChange={(event) => updateTierMaxUnits(tier.id, event.target.value)}
                            onBlur={() => normalizeTierMaxUnitsOnBlur(tier.id)}
                            placeholder={isLastTier ? `${start} - ∞` : `${start}`}
                            inputProps={{
                              inputMode: 'numeric',
                              pattern: '[0-9]*',
                              'aria-label': `Tier ${index + 1} units quantity`,
                              'aria-invalid': Boolean(unitsError)
                            }}
                            sx={{
                              fontSize: 15,
                              px: 0.5,
                              '& input::placeholder': {
                                color: isLastTier ? '#B8C4CE' : '#8895A7',
                                opacity: 1
                              }
                            }}
                          />
                        </Stack>

                        <Stack
                          justifyContent="center"
                          sx={{
                            px: 1,
                            py: 0.5,
                            backgroundColor: priceError ? errorTint : '#FFFFFF',
                            boxShadow: priceError ? 'inset 0 0 0 1px #D32F2F' : 'none',
                            transition: 'background-color 120ms ease, box-shadow 120ms ease',
                            '&:focus-within': {
                              backgroundColor: priceError ? errorTint : focusTint,
                              boxShadow: priceError
                                ? 'inset 0 0 0 1.5px #D32F2F'
                                : 'inset 0 0 0 2px #009299'
                            }
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Typography sx={{ color: '#8895A7', fontSize: 18 }}>$</Typography>
                            <InputBase
                              value={tier.unitAmountUsd}
                              onChange={(event) => updateTierUnitPrice(tier.id, event.target.value)}
                              onBlur={() => normalizeTierUnitPriceOnBlur(tier.id)}
                              placeholder="0.00"
                              inputProps={{
                                inputMode: 'decimal',
                                'aria-label': `Tier ${index + 1} unit price`,
                                'aria-invalid': Boolean(priceError)
                              }}
                              sx={{
                                width: '100%',
                                fontSize: 15,
                                '& input::placeholder': { color: '#8895A7', opacity: 1 }
                              }}
                            />
                          </Stack>
                        </Stack>

                        <Stack justifyContent="center" alignItems="center" sx={{ backgroundColor: '#F8F9FA' }}>
                          {!isLastTier ? (
                            <IconButton
                              aria-label={`Remove tier ${index + 1}`}
                              onClick={() => removeTier(tier.id)}
                              size="small"
                              sx={{ color: '#4B617C' }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              <SecondaryButton
                startIcon={<AddIcon />}
                onClick={addTier}
                sx={{
                  width: 'fit-content',
                  px: 1.5,
                  py: 0.75
                }}
              >
                Add tier
              </SecondaryButton>

              {showValidation && hasTierErrors ? (
                <Typography sx={{ color: '#d32f2f', fontSize: 12 }}>
                  Fill highlighted tier fields.
                </Typography>
              ) : null}
            </Stack>
          )}

          {formState.type === 'TIERED' ? (
            <Stack spacing={2} ref={minimumPriceFieldRef}>
              {sectionTitle(
                'Minimum price',
                'Minimum total charge per billing period for this tiered pricing.'
              )}
              <TextField
                placeholder="0.00"
                value={formState.minimumPriceUsd}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    minimumPriceUsd: sanitizeMoneyInput(event.target.value)
                  }))
                }
                onBlur={normalizeMinimumPriceOnBlur}
                error={minimumPriceError}
                helperText={
                  minimumPriceError ? 'Enter a valid USD amount.' : undefined
                }
                inputProps={{ inputMode: 'decimal' }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
                sx={{ maxWidth: 220, ...getFormFieldSx(minimumPriceError) }}
              />
            </Stack>
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
          <SecondaryButton onClick={onClose} disabled={isSaving}>
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={isSaving}>
            {isEdit ? 'Save pricing' : 'Save pricing'}
          </PrimaryButton>
        </Stack>
      </Stack>
    </Dialog>
  );
}
