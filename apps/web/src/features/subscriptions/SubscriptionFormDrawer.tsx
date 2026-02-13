import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  useAccountsQuery,
  useCreateSubscriptionMutation,
  usePaymentMethodsQuery,
  usePricingsQuery,
  usePropertiesQuery,
  useUpdateSubscriptionMutation,
  type BillingScope,
  type SubscriptionItem,
  type SubscriptionStatus
} from '../../api';

type SubscriptionFormDrawerProps = {
  open: boolean;
  mode: 'create' | 'edit';
  initialSubscription: SubscriptionItem | null;
  defaultAccountId?: string;
  defaultPricingIds?: string[];
  defaultScope?: BillingScope;
  onClose: () => void;
};

type FormState = {
  accountId: string;
  scope: BillingScope;
  propertyId: string;
  startDate: string;
  endDate: string;
  hasEndDate: boolean;
  status: SubscriptionStatus;
  paymentMethodId: string;
  pricingIds: string[];
};

const statusOptions: SubscriptionStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELED'];
const scopeOptions: BillingScope[] = ['ACCOUNT', 'PROPERTY'];

function toDateInputValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
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

function initialFormState(
  defaultAccountId?: string,
  defaultPricingIds?: string[],
  defaultScope: BillingScope = 'ACCOUNT'
): FormState {
  return {
    accountId: defaultAccountId ?? '',
    scope: defaultScope,
    propertyId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    hasEndDate: false,
    status: 'DRAFT',
    paymentMethodId: '',
    pricingIds: defaultPricingIds ?? []
  };
}

export function SubscriptionFormDrawer(props: SubscriptionFormDrawerProps): JSX.Element {
  const {
    open,
    mode,
    initialSubscription,
    defaultAccountId,
    defaultPricingIds,
    defaultScope,
    onClose
  } = props;

  const [formState, setFormState] = useState<FormState>(() =>
    initialFormState(defaultAccountId, defaultPricingIds, defaultScope)
  );
  const [formError, setFormError] = useState<string | null>(null);

  const isEdit = mode === 'edit';

  const accountsQuery = useAccountsQuery({ page: 1, pageSize: 100 });
  const propertiesQuery = usePropertiesQuery(
    { accountId: formState.accountId, page: 1, pageSize: 200 },
    { enabled: Boolean(formState.accountId) }
  );
  const paymentMethodsQuery = usePaymentMethodsQuery(
    { accountId: formState.accountId },
    { enabled: Boolean(formState.accountId) }
  );
  const pricingsQuery = usePricingsQuery({ page: 1, pageSize: 100 });

  const createMutation = useCreateSubscriptionMutation();
  const updateMutation = useUpdateSubscriptionMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const selectedProperty = useMemo(
    () =>
      (propertiesQuery.data?.items ?? []).find((property) => property.id === formState.propertyId) ??
      null,
    [formState.propertyId, propertiesQuery.data?.items]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialSubscription) {
      setFormState({
        accountId: initialSubscription.account.id,
        scope: initialSubscription.scope,
        propertyId: initialSubscription.property?.id ?? '',
        startDate: toDateInputValue(initialSubscription.startDate),
        endDate: toDateInputValue(initialSubscription.endDate),
        hasEndDate: Boolean(initialSubscription.endDate),
        status: initialSubscription.status,
        paymentMethodId: initialSubscription.paymentMethod?.id ?? '',
        pricingIds: initialSubscription.pricings.map((pricing) => pricing.id)
      });
    } else {
      setFormState(initialFormState(defaultAccountId, defaultPricingIds, defaultScope));
    }

    setFormError(null);
  }, [defaultAccountId, defaultPricingIds, defaultScope, initialSubscription, open]);

  const canSubmit = useMemo(() => {
    if (!formState.accountId) {
      return false;
    }

    if (!formState.startDate) {
      return false;
    }

    if (formState.scope === 'PROPERTY' && !formState.propertyId) {
      return false;
    }

    if (formState.pricingIds.length === 0) {
      return false;
    }

    if (formState.hasEndDate && !formState.endDate) {
      return false;
    }

    return true;
  }, [formState]);

  const title = isEdit ? 'Edit Subscription' : 'Create Subscription';

  async function handleSubmit(): Promise<void> {
    setFormError(null);

    try {
      if (isEdit && initialSubscription) {
        await updateMutation.mutateAsync({
          subscriptionId: initialSubscription.id,
          payload: {
            scope: formState.scope,
            propertyId: formState.scope === 'PROPERTY' ? formState.propertyId : null,
            startDate: formState.startDate,
            endDate: formState.hasEndDate ? formState.endDate : null,
            status: formState.status,
            paymentMethodId: formState.paymentMethodId || null,
            pricingIds: formState.pricingIds
          }
        });
      } else {
        await createMutation.mutateAsync({
          accountId: formState.accountId,
          scope: formState.scope,
          propertyId: formState.scope === 'PROPERTY' ? formState.propertyId : null,
          startDate: formState.startDate,
          endDate: formState.hasEndDate ? formState.endDate : null,
          status: formState.status,
          paymentMethodId: formState.paymentMethodId || null,
          pricingIds: formState.pricingIds
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
          width: { xs: '100%', sm: 540 }
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
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure account/property scope, dates, payment method and pricing set.
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
            label="Account"
            value={formState.accountId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                accountId: event.target.value,
                propertyId: '',
                paymentMethodId: ''
              }))
            }
            disabled={isEdit || accountsQuery.isPending}
            helperText={isEdit ? 'Account is fixed for existing subscriptions.' : undefined}
          >
            {(accountsQuery.data?.items ?? []).map((account) => (
              <MenuItem key={account.id} value={account.id}>
                {account.companyName} ({account.email}) - {account.totalBillableUnits} units
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Scope"
            value={formState.scope}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                scope: event.target.value as BillingScope,
                propertyId: ''
              }))
            }
          >
            {scopeOptions.map((scope) => (
              <MenuItem key={scope} value={scope}>
                {scope}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Property"
            value={formState.propertyId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                propertyId: event.target.value
              }))
            }
            disabled={
              formState.scope !== 'PROPERTY' || !formState.accountId || propertiesQuery.isPending
            }
            helperText={
              formState.scope === 'PROPERTY'
                ? selectedProperty
                  ? `Required for property-level subscriptions. Selected property has ${selectedProperty.billableUnits} units.`
                  : 'Required for property-level subscriptions.'
                : 'Not used for account-level subscriptions.'
            }
          >
            {(propertiesQuery.data?.items ?? []).map((property) => (
              <MenuItem key={property.id} value={property.id}>
                {property.name} - {property.billableUnits} units
              </MenuItem>
            ))}
          </TextField>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start Date"
              type="date"
              value={formState.startDate}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  startDate: event.target.value
                }))
              }
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              select
              label="Status"
              value={formState.status}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  status: event.target.value as SubscriptionStatus
                }))
              }
              sx={{ flex: 1 }}
            >
              {statusOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <FormControlLabel
            control={
              <Checkbox
                checked={formState.hasEndDate}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    hasEndDate: event.target.checked,
                    endDate: event.target.checked ? prev.endDate : ''
                  }))
                }
              />
            }
            label="Set end date (disable Forever mode)"
          />

          <TextField
            label="End Date"
            type="date"
            value={formState.endDate}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                endDate: event.target.value
              }))
            }
            disabled={!formState.hasEndDate}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            select
            label="Payment Method (Optional)"
            value={formState.paymentMethodId}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                paymentMethodId: event.target.value
              }))
            }
            disabled={!formState.accountId || paymentMethodsQuery.isPending}
          >
            <MenuItem value="">Use fallback/default behavior</MenuItem>
            {(paymentMethodsQuery.data?.items ?? []).map((method) => (
              <MenuItem key={method.id} value={method.id}>
                {method.label}
                {method.isDefault ? ' (default)' : ''}
              </MenuItem>
            ))}
          </TextField>

          <FormControl>
            <InputLabel id="pricing-multi-label">Pricings</InputLabel>
            <Select
              labelId="pricing-multi-label"
              multiple
              value={formState.pricingIds}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  pricingIds: event.target.value as string[]
                }))
              }
              input={<OutlinedInput label="Pricings" />}
              renderValue={(selected) => {
                const items = pricingsQuery.data?.items ?? [];
                const labels = selected
                  .map((id) => items.find((item) => item.id === id)?.internalName ?? id)
                  .filter(Boolean);
                return labels.join(', ');
              }}
            >
              {(pricingsQuery.data?.items ?? []).map((pricing) => (
                <MenuItem key={pricing.id} value={pricing.id}>
                  <Checkbox checked={formState.pricingIds.includes(pricing.id)} />
                  <Typography variant="body2">
                    {pricing.internalName} ({pricing.type})
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

        </Stack>

        <Divider />

        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ p: 2 }}>
          <Button variant="text" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit || isSaving}>
            {isEdit ? 'Save changes' : 'Create subscription'}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
