import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import { Menu, MenuItem, Stack } from '@mui/material';
import { useState } from 'react';
import type { SubscriptionStatus } from '../../../api';
import { BorderedButton } from '../../../components/buttons';
import { SelectionActionBar } from '../../../components/layout';
import {
  formatSubscriptionStatusLabel,
  getSubscriptionStatusButtonSx,
  subscriptionStatusOptions
} from '../../../lib/subscriptions/status';

type SubscriptionsSelectionActionsProps = {
  selectedCount: number;
  canManageSubscriptions: boolean;
  statusValue: SubscriptionStatus | '';
  isStatusLoading: boolean;
  isPending: boolean;
  onSelectStatus: (status: SubscriptionStatus) => void;
  onOpenManagePricings: () => void;
  onOpenDeleteSubscriptions: () => void;
  onClearSelection: () => void;
};

export function SubscriptionsSelectionActions(
  props: SubscriptionsSelectionActionsProps
): JSX.Element {
  const {
    selectedCount,
    canManageSubscriptions,
    statusValue,
    isStatusLoading,
    isPending,
    onSelectStatus,
    onOpenManagePricings,
    onOpenDeleteSubscriptions,
    onClearSelection
  } = props;
  const isVisible = canManageSubscriptions && selectedCount > 0;
  const selectedLabel = `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected`;
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<HTMLElement | null>(null);
  const statusLabel = isStatusLoading
    ? 'Loading statuses...'
    : statusValue === ''
      ? 'Change status'
      : formatSubscriptionStatusLabel(statusValue);

  return (
    <>
      <SelectionActionBar
        visible={isVisible}
        selectedCount={selectedCount}
        selectedLabel={selectedLabel}
        onClearSelection={onClearSelection}
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
          <BorderedButton
            type="button"
            onClick={(event) => {
              setStatusMenuAnchor(event.currentTarget);
            }}
            disabled={!isVisible || isStatusLoading || isPending}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              ...getSubscriptionStatusButtonSx(statusValue),
              '& .MuiButton-endIcon': {
                ml: 0.5,
                mr: -0.25
              },
              '& .MuiSvgIcon-root': {
                color: 'inherit'
              }
            }}
          >
            {statusLabel}
          </BorderedButton>

          <BorderedButton
            startIcon={<SellOutlinedIcon fontSize="small" />}
            onClick={onOpenManagePricings}
          >
            Manage pricings
          </BorderedButton>
          <BorderedButton
            startIcon={<DeleteOutlineIcon fontSize="small" />}
            onClick={onOpenDeleteSubscriptions}
          >
            Delete subscriptions
          </BorderedButton>
        </Stack>
      </SelectionActionBar>

      <Menu
        anchorEl={statusMenuAnchor}
        open={Boolean(statusMenuAnchor)}
        onClose={() => {
          setStatusMenuAnchor(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {subscriptionStatusOptions.map((status) => (
          <MenuItem
            key={status}
            selected={statusValue === status}
            onClick={() => {
              onSelectStatus(status);
              setStatusMenuAnchor(null);
            }}
          >
            {formatSubscriptionStatusLabel(status)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
