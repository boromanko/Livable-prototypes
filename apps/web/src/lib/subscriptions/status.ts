import type { SubscriptionStatus } from '../../api';

type StatusPalette = {
  text: string;
  background: string;
  hover: string;
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  CANCELED: 'Canceled'
};

export const subscriptionStatusOptions: SubscriptionStatus[] = [
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'CANCELED'
];

const STATUS_PALETTE: Record<SubscriptionStatus, StatusPalette> = {
  ACTIVE: {
    text: '#1F9D55',
    background: '#E8F7EF',
    hover: '#D8F0E2'
  },
  DRAFT: {
    text: '#2B6CB0',
    background: '#E9F2FC',
    hover: '#D9EAFB'
  },
  PAUSED: {
    text: '#B7791F',
    background: '#FFF5E5',
    hover: '#FDECCF'
  },
  CANCELED: {
    text: '#4B617C',
    background: '#EEF2F6',
    hover: '#E2E8EF'
  }
};

export function formatSubscriptionStatusLabel(status: SubscriptionStatus): string {
  return STATUS_LABELS[status];
}

export function getSubscriptionStatusTagSx(
  status: SubscriptionStatus
): Record<string, string | number> {
  const palette = STATUS_PALETTE[status];

  return {
    color: palette.text,
    backgroundColor: palette.background,
    py: '2px',
    px: '4px',
    borderRadius: '2px',
    fontWeight: 600,
    fontSize: 14,
    lineHeight: 1.1
  };
}

export function getSubscriptionStatusButtonSx(
  status: SubscriptionStatus | ''
): Record<string, unknown> {
  if (status === '') {
    return {
      color: '#212934',
      backgroundColor: '#F8F9FA',
      '&:hover': {
        backgroundColor: '#EEF2F6'
      }
    };
  }

  const palette = STATUS_PALETTE[status];
  return {
    color: palette.text,
    backgroundColor: palette.background,
    '&:hover': {
      backgroundColor: palette.hover
    }
  };
}
