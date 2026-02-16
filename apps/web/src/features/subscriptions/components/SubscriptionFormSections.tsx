import { Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import type { SubscriptionStatus } from '../../../api';
import { prototypeTokens } from '../../../theme/tokens';
import { subscriptionStatusOptions } from '../subscriptionForm.utils';
import { getFormFieldSx, sectionTitle } from './SubscriptionFormSections.shared';

export {
  SubscriptionFormAccountSection,
  SubscriptionFormPropertySection
} from './SubscriptionFormSections.account-property';

type SubscriptionFormDatesSectionProps = {
  startDate: string;
  endDate: string;
  startDateError: boolean;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
};

export function SubscriptionFormDatesSection(
  props: SubscriptionFormDatesSectionProps
): JSX.Element {
  const {
    startDate,
    endDate,
    startDateError,
    onStartDateChange,
    onEndDateChange
  } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Dates')}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={{ xs: 1.5, sm: 2 }}
        alignItems={{ xs: 'stretch', sm: 'flex-end' }}
      >
        <Stack spacing={0.75} sx={{ flex: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: prototypeTokens.color.text.secondary, fontWeight: 600 }}
          >
            Start date
          </Typography>
          <TextField
            type="date"
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
            error={startDateError}
            helperText={startDateError ? 'Start date is required.' : undefined}
            sx={{ ...getFormFieldSx(startDateError) }}
          />
        </Stack>

        <Typography
          sx={{
            display: { xs: 'none', sm: 'block' },
            color: prototypeTokens.color.text.muted,
            fontSize: 20,
            lineHeight: 1,
            pb: 1.5
          }}
        >
          -
        </Typography>

        <Stack spacing={0.75} sx={{ flex: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: prototypeTokens.color.text.secondary, fontWeight: 600 }}
          >
            End date
          </Typography>
          <TextField
            type="date"
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ ...getFormFieldSx() }}
          />
        </Stack>
      </Stack>
    </Stack>
  );
}

type SubscriptionFormStatusSectionProps = {
  status: SubscriptionStatus;
  onStatusChange: (status: SubscriptionStatus) => void;
};

export function SubscriptionFormStatusSection(
  props: SubscriptionFormStatusSectionProps
): JSX.Element {
  const { status, onStatusChange } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Status')}
      <TextField
        select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as SubscriptionStatus)}
        sx={getFormFieldSx()}
      >
        {subscriptionStatusOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

type SubscriptionFormCreateStatusSectionProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function SubscriptionFormCreateStatusSection(
  props: SubscriptionFormCreateStatusSectionProps
): JSX.Element {
  const { checked, onChange } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Status')}
      <FormControlLabel
        control={
          <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />
        }
        label="Activate subscription immediately"
        sx={{ m: 0 }}
      />
    </Stack>
  );
}

export {
  SubscriptionFormPaymentMethodSection,
  SubscriptionFormPricingsSection
} from './SubscriptionFormSections.payment-pricings';
