import {
  Alert,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Typography
} from '@mui/material';
import type { PricingItem, SubscriptionBulkAction } from '../../../api';
import { PrimaryButton, SecondaryButton } from '../../../components/buttons';
import { getBulkActionLabel } from '../subscriptionsTab.utils';

type SubscriptionsBulkDialogProps = {
  open: boolean;
  action: SubscriptionBulkAction | null;
  selectedCount: number;
  requiresPricingSelection: boolean;
  pricingIds: string[];
  pricings: PricingItem[];
  error: string | null;
  isPending: boolean;
  onPricingIdsChange: (ids: string[]) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function SubscriptionsBulkDialog(props: SubscriptionsBulkDialogProps): JSX.Element {
  const {
    open,
    action,
    selectedCount,
    requiresPricingSelection,
    pricingIds,
    pricings,
    error,
    isPending,
    onPricingIdsChange,
    onClose,
    onConfirm
  } = props;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{getBulkActionLabel(action)}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Selected subscriptions: {selectedCount}
          </Typography>

          {requiresPricingSelection ? (
            <FormControl>
              <InputLabel id="bulk-pricing-select-label">Pricings</InputLabel>
              <Select
                labelId="bulk-pricing-select-label"
                multiple
                value={pricingIds}
                onChange={(event) => onPricingIdsChange(event.target.value as string[])}
                input={<OutlinedInput label="Pricings" />}
                renderValue={(selected) => {
                  const labels = selected
                    .map((id) => pricings.find((pricing) => pricing.id === id)?.internalName ?? id)
                    .filter(Boolean);
                  return labels.join(', ');
                }}
              >
                {pricings.map((pricing) => (
                  <MenuItem key={pricing.id} value={pricing.id}>
                    <Checkbox checked={pricingIds.includes(pricing.id)} />
                    <Typography variant="body2">
                      {pricing.internalName} ({pricing.type})
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Alert severity="warning">
              This will permanently delete selected subscriptions.
            </Alert>
          )}

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton
          sx={
            action === 'DELETE_SUBSCRIPTIONS'
              ? { backgroundColor: '#B3261E', '&:hover': { backgroundColor: '#8C1D18' } }
              : undefined
          }
          onClick={onConfirm}
          disabled={isPending}
        >
          {getBulkActionLabel(action)}
        </PrimaryButton>
      </DialogActions>
    </Dialog>
  );
}
