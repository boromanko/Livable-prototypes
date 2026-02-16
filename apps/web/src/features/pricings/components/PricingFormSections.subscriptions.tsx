import {
  Autocomplete,
  Box,
  Divider,
  MenuItem,
  Paper,
  type PaperProps,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import type { BillingScope, SubscriptionStatus } from '../../../api';
import { SelectionListItemCard } from '../../../components/layout';
import { prototypeTokens } from '../../../theme/tokens';
import { sectionTitle, AUTOCOMPLETE_PAPER_SX, AUTOCOMPLETE_TEXTFIELD_SX } from './PricingFormSections.shared';

type PricingFormSubscriptionsSectionProps = {
  value: string[];
  subscriptions: PricingFormSubscriptionOption[];
  loading: boolean;
  hasLoadingError?: boolean;
  blockedSubscriptionIds: string[];
  selectedSubscriptionConflictIds: string[];
  canCreateSubscription: boolean;
  onCreateSubscription: () => void;
  onEditSubscription?: (subscriptionId: string) => void;
  onChange: (subscriptionIds: string[]) => void;
};

export type PricingFormSubscriptionOption = {
  id: string;
  accountName: string;
  scope: BillingScope;
  status: SubscriptionStatus;
  propertiesLabel: string;
};

export function PricingFormSubscriptionsSection(
  props: PricingFormSubscriptionsSectionProps
): JSX.Element {
  const {
    value,
    subscriptions,
    loading,
    hasLoadingError = false,
    blockedSubscriptionIds,
    selectedSubscriptionConflictIds,
    canCreateSubscription,
    onCreateSubscription,
    onEditSubscription,
    onChange
  } = props;
  const subscriptionById = new Map(subscriptions.map((subscription) => [subscription.id, subscription]));
  const selectedSubscriptions = value
    .map((subscriptionId) => subscriptionById.get(subscriptionId))
    .filter(
      (subscription): subscription is PricingFormSubscriptionOption => Boolean(subscription)
    );
  const missingSelectedSubscriptionIds = value.filter(
    (subscriptionId) => !subscriptionById.has(subscriptionId)
  );
  const availableSubscriptions = subscriptions.filter(
    (subscription) => !value.includes(subscription.id)
  );
  const blockedSubscriptionIdSet = new Set(blockedSubscriptionIds);
  const selectedConflictIdSet = new Set(selectedSubscriptionConflictIds);

  return (
    <Stack spacing={2}>
      {sectionTitle('Subscriptions')}
      <Autocomplete<PricingFormSubscriptionOption, true, true, false>
        multiple
        disableClearable
        openOnFocus
        options={availableSubscriptions}
        value={selectedSubscriptions}
        loading={loading}
        onChange={(_event, selected) =>
          onChange([
            ...missingSelectedSubscriptionIds,
            ...selected.map((subscription) => subscription.id)
          ])
        }
        getOptionLabel={(option) => option.accountName}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        getOptionDisabled={(option) => blockedSubscriptionIdSet.has(option.id)}
        noOptionsText={
          hasLoadingError
            ? 'Failed to load subscriptions'
            : loading
            ? 'Loading subscriptions...'
            : availableSubscriptions.length === 0
              ? 'No more subscriptions to add'
              : 'No subscriptions found'
        }
        PaperComponent={(paperProps: PaperProps) => (
          <Paper
            {...paperProps}
            sx={AUTOCOMPLETE_PAPER_SX}
          >
            {paperProps.children}
            {canCreateSubscription ? (
              <>
                <Divider />
                <MenuItem
                  sx={{ minHeight: 48, fontWeight: 500 }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={onCreateSubscription}
                >
                  + Add new subscription
                </MenuItem>
              </>
            ) : null}
          </Paper>
        )}
        slotProps={{
          listbox: {
            sx: {
              py: 0,
              '& .MuiAutocomplete-option': {
                minHeight: 52,
                alignItems: 'center'
              }
            }
          }
        }}
        renderTags={() => null}
        renderOption={(optionProps, option) => (
          <Box
            component="li"
            {...optionProps}
            key={option.id}
            sx={{
              minHeight: 48,
              px: 1.5,
              py: 0.75,
              alignItems: 'center'
            }}
          >
            <Stack spacing={0.25} sx={{ py: 0.25 }}>
              <Typography variant="body2">{option.accountName}</Typography>
              {blockedSubscriptionIdSet.has(option.id) ? (
                <Typography variant="caption" sx={{ color: prototypeTokens.color.status.danger }}>
                  Already has pricing for selected product.
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: prototypeTokens.color.text.muted }}>
                  {getPricingSubscriptionScopeLabel(option.scope)} -{' '}
                  {option.propertiesLabel} - {option.status}
                </Typography>
              )}
            </Stack>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Add subscriptions"
            sx={AUTOCOMPLETE_TEXTFIELD_SX}
          />
        )}
      />

      {value.length > 0 ? (
        <Stack spacing={1}>
          {value.map((subscriptionId) => {
            const subscription = subscriptionById.get(subscriptionId);
            const isEditable = Boolean(onEditSubscription);

            return (
              <SelectionListItemCard
                key={subscriptionId}
                hasError={selectedConflictIdSet.has(subscriptionId)}
                onRemove={() => onChange(value.filter((id) => id !== subscriptionId))}
                removeAriaLabel="Remove subscription"
                sx={
                  selectedConflictIdSet.has(subscriptionId)
                    ? {
                        borderColor: prototypeTokens.color.border.danger,
                        backgroundColor: prototypeTokens.color.bg.errorSurfaceAlt
                      }
                    : undefined
                }
              >
                {isEditable ? (
                  <Typography
                    component="button"
                    type="button"
                    onClick={() => {
                      onEditSubscription?.(subscriptionId);
                    }}
                    variant="body2"
                    sx={{
                      all: 'unset',
                      color: prototypeTokens.color.text.primary,
                      fontWeight: 500,
                      cursor: 'pointer',
                      '&:hover': {
                        color: prototypeTokens.color.text.link,
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {subscription?.accountName ?? subscriptionId}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{ color: prototypeTokens.color.text.primary, fontWeight: 500 }}
                  >
                    {subscription?.accountName ?? subscriptionId}
                  </Typography>
                )}
                {subscription ? (
                  <Typography variant="caption" sx={{ color: prototypeTokens.color.text.muted }}>
                    {getPricingSubscriptionScopeLabel(subscription.scope)} - {subscription.propertiesLabel} -{' '}
                    {subscription.status}
                  </Typography>
                ) : null}
                {selectedConflictIdSet.has(subscriptionId) ? (
                  <Typography variant="caption" sx={{ color: prototypeTokens.color.status.danger }}>
                    Already has pricing for selected product.
                  </Typography>
                ) : null}
              </SelectionListItemCard>
            );
          })}
        </Stack>
      ) : null}
    </Stack>
  );
}

function getPricingSubscriptionScopeLabel(scope: BillingScope): string {
  return scope === 'ACCOUNT' ? 'Account level' : 'Property level';
}
