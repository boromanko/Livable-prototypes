import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { Checkbox, Stack, TableCell, TableRow, Tooltip, Typography } from '@mui/material';
import type { SubscriptionItem } from '../../../api';
import { AppIconButton } from '../../../components/buttons';
import { formatDateLabel } from '../../../lib/format/date';
import { formatMoneyCents } from '../../../lib/format/money';
import {
  formatSubscriptionStatusLabel,
  getSubscriptionStatusTagSx
} from '../../../lib/subscriptions/status';
import { getSubscriptionProperties } from '../subscriptionsTab.utils';
import { PricingValueCard } from './PricingValueCard';

type SubscriptionsTableRowProps = {
  subscription: SubscriptionItem;
  isSelected: boolean;
  accountPropertiesCountById: Record<string, number>;
  accountTotalBillableUnitsById: Record<string, number>;
  isAccountPropertiesCountPending: boolean;
  canManageSubscriptions: boolean;
  canOpenPricingEditor: boolean;
  onToggleRowSelection: (subscriptionId: string) => void;
  onEditSubscription: (subscription: SubscriptionItem) => void;
  onEditPricing?: (pricing: SubscriptionItem['pricings'][number]) => void;
  onDeleteSubscription: (subscription: SubscriptionItem) => void;
};

export function SubscriptionsTableRowItem(props: SubscriptionsTableRowProps): JSX.Element {
  const {
    subscription,
    isSelected,
    accountPropertiesCountById,
    accountTotalBillableUnitsById,
    isAccountPropertiesCountPending,
    canManageSubscriptions,
    canOpenPricingEditor,
    onToggleRowSelection,
    onEditSubscription,
    onEditPricing,
    onDeleteSubscription
  } = props;

  const subscriptionProperties = getSubscriptionProperties(subscription);

  return (
    <TableRow
      hover={canManageSubscriptions}
      onClick={() => {
        if (canManageSubscriptions) {
          onEditSubscription(subscription);
        }
      }}
      sx={{
        cursor: canManageSubscriptions ? 'pointer' : 'default'
      }}
    >
      <TableCell
        padding="checkbox"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Checkbox
          checked={isSelected}
          disabled={!canManageSubscriptions}
          onChange={() => onToggleRowSelection(subscription.id)}
          size="small"
          sx={{ p: 0.5 }}
        />
      </TableCell>

      <TableCell>
        <Stack spacing={0.25}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {subscription.account.companyName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subscription.account.email}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {getScopeLabel(subscription.scope)}
        </Typography>
      </TableCell>

      <TableCell sx={{ width: 92, minWidth: 92, maxWidth: 92 }}>
        {subscription.scope === 'ACCOUNT' ? (
          <Typography variant="body2" color="text.secondary">
            {getAccountPropertiesCountLabel(
              subscription.account.id,
              accountPropertiesCountById,
              isAccountPropertiesCountPending
            )}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {subscriptionProperties.length}
          </Typography>
        )}
      </TableCell>

      <TableCell>
        <Typography variant="body2" color="text.secondary">
          {getSubscriptionUnitsLabel(
            subscription,
            accountTotalBillableUnitsById,
            isAccountPropertiesCountPending
          )}
        </Typography>
      </TableCell>

      <TableCell>{formatDateLabel(subscription.startDate)}</TableCell>
      <TableCell>{formatDateLabel(subscription.endDate, { fallback: '—' })}</TableCell>

      <TableCell>
        <Typography
          component="span"
          sx={{
            ...getSubscriptionStatusTagSx(subscription.status),
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          {formatSubscriptionStatusLabel(subscription.status)}
        </Typography>
      </TableCell>

      <TableCell>
        {subscription.pricings.length > 0 ? (
          <Stack spacing={0.5}>
            {subscription.pricings.map((pricing) => (
              <PricingValueCard
                key={pricing.id}
                title={pricing.internalName}
                subtitle={`${pricing.product.code} - ${pricing.type}`}
                amountLabel={getSubscriptionPricingAmountLabel(pricing)}
                variant="table"
                onTitleClick={() => {
                  if (canOpenPricingEditor) {
                    onEditPricing?.(pricing);
                  }
                }}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>

      <TableCell align="right">
        <Stack direction="row" justifyContent="flex-end" alignItems="flex-start" spacing={0.25}>
          {canManageSubscriptions ? (
            <>
              <Tooltip title="Edit subscription">
                <AppIconButton
                  tone="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditSubscription(subscription);
                  }}
                >
                  <EditIcon fontSize="small" />
                </AppIconButton>
              </Tooltip>

              <Tooltip title="Delete subscription">
                <AppIconButton
                  tone="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteSubscription(subscription);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </AppIconButton>
              </Tooltip>
            </>
          ) : null}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

function getScopeLabel(scope: SubscriptionItem['scope']): string {
  return scope === 'ACCOUNT' ? 'Account level' : 'Property level';
}

function getAccountPropertiesCountLabel(
  accountId: string,
  accountPropertiesCountById: Record<string, number>,
  isPending: boolean
): string {
  const count = accountPropertiesCountById[accountId];
  if (typeof count !== 'number') {
    return isPending ? '...' : '-';
  }

  return String(count);
}

function getSubscriptionUnitsLabel(
  subscription: SubscriptionItem,
  accountTotalBillableUnitsById: Record<string, number>,
  isPending: boolean
): string {
  if (subscription.scope === 'ACCOUNT') {
    const totalUnits = accountTotalBillableUnitsById[subscription.account.id];
    if (typeof totalUnits !== 'number') {
      return isPending ? '...' : '-';
    }

    return String(totalUnits);
  }

  const totalUnits = subscription.properties.reduce((sum, property) => sum + property.billableUnits, 0);
  return String(totalUnits);
}

function getSubscriptionPricingAmountLabel(
  pricing: SubscriptionItem['pricings'][number]
): string {
  if (pricing.type === 'FIXED') {
    return formatMoneyCents(pricing.fixedAmountCents, pricing.currency);
  }

  const amounts = pricing.tiers.map((tier) => tier.unitAmountCents).filter((amount) => amount >= 0);
  if (amounts.length === 0) {
    return formatMoneyCents(pricing.minimumPriceCents, pricing.currency);
  }

  const minAmount = Math.min(...amounts);
  const maxAmount = Math.max(...amounts);
  if (minAmount === maxAmount) {
    return formatMoneyCents(minAmount, pricing.currency);
  }

  return `${formatMoneyCents(minAmount, pricing.currency)} - ${formatMoneyCents(
    maxAmount,
    pricing.currency
  )}`;
}
