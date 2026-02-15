import {
  Box,
  Checkbox,
  FormControl,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import type { PaymentMethodItem, PricingItem } from '../../../api';
import { getFormFieldSx, sectionTitle } from './SubscriptionFormSections.shared';

type SubscriptionFormPaymentMethodSectionProps = {
  accountId: string;
  value: string;
  loading: boolean;
  methods: PaymentMethodItem[];
  onChange: (paymentMethodId: string) => void;
};

export function SubscriptionFormPaymentMethodSection(
  props: SubscriptionFormPaymentMethodSectionProps
): JSX.Element {
  const { accountId, value, loading, methods, onChange } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Payment method', 'Optional')}
      <TextField
        select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!accountId || loading}
        SelectProps={{
          displayEmpty: true,
          renderValue: (selected) => {
            if (typeof selected !== 'string' || selected === '') {
              return (
                <Box component="span" sx={{ color: '#4B617C' }}>
                  Use fallback/default behavior
                </Box>
              );
            }

            const selectedMethod = methods.find((method) => method.id === selected);
            if (!selectedMethod) {
              return selected;
            }

            return `${selectedMethod.label}${selectedMethod.isDefault ? ' (default)' : ''}`;
          }
        }}
        sx={getFormFieldSx()}
      >
        <MenuItem value="">Use fallback/default behavior</MenuItem>
        {methods.map((method) => (
          <MenuItem key={method.id} value={method.id}>
            {method.label}
            {method.isDefault ? ' (default)' : ''}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}

type SubscriptionFormPricingsSectionProps = {
  value: string[];
  pricings: PricingItem[];
  onChange: (pricingIds: string[]) => void;
};

export function SubscriptionFormPricingsSection(
  props: SubscriptionFormPricingsSectionProps
): JSX.Element {
  const { value, pricings, onChange } = props;

  return (
    <Stack spacing={2}>
      {sectionTitle('Pricings')}
      <FormControl sx={getFormFieldSx()}>
        <Select
          multiple
          displayEmpty
          value={value}
          onChange={(event) => onChange(event.target.value as string[])}
          input={<OutlinedInput />}
          renderValue={(selected) => {
            const ids = selected as string[];
            if (ids.length === 0) {
              return <Box sx={{ color: '#4B617C' }}>Select one or more pricings</Box>;
            }

            const labels = ids
              .map((id) => pricings.find((pricing) => pricing.id === id)?.internalName ?? id)
              .filter(Boolean);
            return labels.join(', ');
          }}
        >
          {pricings.map((pricing) => (
            <MenuItem key={pricing.id} value={pricing.id}>
              <Checkbox checked={value.includes(pricing.id)} />
              <Typography variant="body2">
                {pricing.internalName} ({pricing.type})
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
