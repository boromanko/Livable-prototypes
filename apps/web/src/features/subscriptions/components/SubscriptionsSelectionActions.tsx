import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import { Box, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import type { SubscriptionStatus } from '../../../api';
import { AppIconButton, BorderedButton } from '../../../components/buttons';

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

const subscriptionStatusOptions: SubscriptionStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELED'];

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
      : formatStatusLabel(statusValue);

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
        <BorderedButton
          type="button"
          onClick={(event) => {
            setStatusMenuAnchor(event.currentTarget);
          }}
          disabled={!isVisible || isStatusLoading || isPending}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{
            ...getStatusButtonSx(statusValue),
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
            {formatStatusLabel(status)}
          </MenuItem>
        ))}
      </Menu>
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

function getStatusButtonSx(status: SubscriptionStatus | ''): Record<string, unknown> {
  if (status === 'ACTIVE') {
    return {
      color: '#1F9D55',
      backgroundColor: '#E8F7EF',
      '&:hover': {
        backgroundColor: '#D8F0E2'
      }
    };
  }

  if (status === 'DRAFT') {
    return {
      color: '#2B6CB0',
      backgroundColor: '#E9F2FC',
      '&:hover': {
        backgroundColor: '#D9EAFB'
      }
    };
  }

  if (status === 'PAUSED') {
    return {
      color: '#B7791F',
      backgroundColor: '#FFF5E5',
      '&:hover': {
        backgroundColor: '#FDECCF'
      }
    };
  }

  if (status === 'CANCELED') {
    return {
      color: '#4B617C',
      backgroundColor: '#EEF2F6',
      '&:hover': {
        backgroundColor: '#E2E8EF'
      }
    };
  }

  return {
    color: '#212934',
    backgroundColor: '#F8F9FA',
    '&:hover': {
      backgroundColor: '#EEF2F6'
    }
  };
}
