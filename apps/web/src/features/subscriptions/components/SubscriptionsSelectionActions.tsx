import CloseIcon from '@mui/icons-material/Close';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { SubscriptionStatus } from '../../../api';
import { AppIconButton, GhostButton } from '../../../components/buttons';

type SubscriptionsSelectionActionsProps = {
  selectedCount: number;
  statusValue: SubscriptionStatus | '';
  isStatusLoading: boolean;
  isPending: boolean;
  onSelectStatus: (status: SubscriptionStatus) => void;
  onOpenManagePricings: () => void;
  onOpenDeleteSubscriptions: () => void;
  onClearSelection: () => void;
};

const subscriptionStatusOptions: SubscriptionStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELED'];

export function SubscriptionsSelectionActions(
  props: SubscriptionsSelectionActionsProps
): JSX.Element {
  const {
    selectedCount,
    statusValue,
    isStatusLoading,
    isPending,
    onSelectStatus,
    onOpenManagePricings,
    onOpenDeleteSubscriptions,
    onClearSelection
  } = props;
  const isVisible = selectedCount > 0;
  const selectedLabel = `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected`;

  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (theme) => theme.zIndex.drawer + 40,
        px: { xs: 2, sm: 4 },
        pt: 2,
        pb: 'calc(16px + env(safe-area-inset-bottom))',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E1E7EC',
        boxShadow: '0px -10px 24px rgba(15, 23, 42, 0.12)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        transform: isVisible ? 'translateY(0)' : 'translateY(120%)',
        opacity: isVisible ? 1 : 0,
        pointerEvents: isVisible ? 'auto' : 'none',
        transition: 'transform 180ms ease, opacity 180ms ease'
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
      >
        <AppIconButton
          tone="plain"
          aria-label="Clear selection"
          onClick={onClearSelection}
          sx={{
            p: 0.75,
            borderRadius: '2px',
            backgroundColor: '#F8F9FA',
            '&:hover': { backgroundColor: '#EEF2F6' }
          }}
        >
          <CloseIcon sx={{ fontSize: 18, color: '#4B617C' }} />
        </AppIconButton>
        <Typography sx={{ color: '#212934', fontSize: 13, fontWeight: 600 }}>{selectedLabel}</Typography>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          select
          value={statusValue}
          disabled={!isVisible || isStatusLoading || isPending}
          onChange={(event) => onSelectStatus(event.target.value as SubscriptionStatus)}
          SelectProps={{
            displayEmpty: true,
            renderValue: (selected) => {
              if (isStatusLoading) {
                return (
                  <Box component="span" sx={{ color: '#6F8298' }}>
                    Loading statuses...
                  </Box>
                );
              }

              if (typeof selected !== 'string' || selected === '') {
                return (
                  <Box component="span" sx={{ color: '#6F8298' }}>
                    Change status
                  </Box>
                );
              }

              return formatStatusLabel(selected as SubscriptionStatus);
            }
          }}
          sx={{
            minWidth: 170,
            '& .MuiOutlinedInput-root': {
              minHeight: 32,
              backgroundColor: '#F8F9FA',
              '&:hover': { backgroundColor: '#EEF2F6' }
            }
          }}
        >
          <MenuItem value="" disabled>
            Change status
          </MenuItem>
          {subscriptionStatusOptions.map((status) => (
            <MenuItem key={status} value={status}>
              {formatStatusLabel(status)}
            </MenuItem>
          ))}
        </TextField>

        <GhostButton
          size="small"
          sx={{ backgroundColor: '#F8F9FA', '&:hover': { backgroundColor: '#EEF2F6' } }}
          onClick={onOpenManagePricings}
        >
          Manage pricings
        </GhostButton>
        <GhostButton
          size="small"
          sx={{
            color: '#B3261E',
            backgroundColor: '#F8F9FA',
            '&:hover': { backgroundColor: '#FDECEC' }
          }}
          onClick={onOpenDeleteSubscriptions}
        >
          Delete subscriptions
        </GhostButton>
      </Stack>
    </Box>
  );
}

function formatStatusLabel(status: SubscriptionStatus): string {
  if (status === 'DRAFT') {
    return 'Draft';
  }

  if (status === 'ACTIVE') {
    return 'Active';
  }

  if (status === 'PAUSED') {
    return 'Paused';
  }

  return 'Canceled';
}
