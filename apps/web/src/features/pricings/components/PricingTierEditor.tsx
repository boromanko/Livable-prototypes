import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Box, InputBase, Stack, Typography } from '@mui/material';
import { AppIconButton, SecondaryButton } from '../../../components/buttons';
import { prototypeTokens } from '../../../theme/tokens';
import type { TierDraft, TierDraftErrors } from '../pricingForm.utils';

type PricingTierEditorProps = {
  tiers: TierDraft[];
  tierStartUnits: number[];
  tierValidationErrors: TierDraftErrors[];
  showValidation: boolean;
  hasTierErrors: boolean;
  disabled?: boolean;
  onAddTier: () => void;
  onRemoveTier: (tierId: string) => void;
  onUpdateTierMaxUnits: (tierId: string, value: string) => void;
  onNormalizeTierMaxUnitsOnBlur: (tierId: string) => void;
  onUpdateTierUnitPrice: (tierId: string, value: string) => void;
  onNormalizeTierUnitPriceOnBlur: (tierId: string) => void;
};

const tableColumnTemplate = '64px minmax(240px, 1fr) minmax(240px, 1fr) 48px';
const errorTint = prototypeTokens.color.bg.errorTint;
const focusTint = prototypeTokens.color.bg.focusTint;

export function PricingTierEditor(props: PricingTierEditorProps): JSX.Element {
  const {
    tiers,
    tierStartUnits,
    tierValidationErrors,
    showValidation,
    hasTierErrors,
    disabled = false,
    onAddTier,
    onRemoveTier,
    onUpdateTierMaxUnits,
    onNormalizeTierMaxUnitsOnBlur,
    onUpdateTierUnitPrice,
    onNormalizeTierUnitPriceOnBlur
  } = props;

  return (
    <>
      <Box sx={{ overflowX: 'auto' }}>
        <Box
          sx={{
            minWidth: 620,
            border: `1px solid ${prototypeTokens.color.border.default}`,
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: tableColumnTemplate,
              backgroundColor: prototypeTokens.color.bg.surfaceMuted,
              borderBottom: `1px solid ${prototypeTokens.color.border.default}`
            }}
          >
            <Box sx={{ px: 1, py: 1.5, fontSize: 13, fontWeight: 600, color: prototypeTokens.color.text.primary }}>
              Tier
            </Box>
            <Box sx={{ px: 1, py: 1.5, fontSize: 13, fontWeight: 600, color: prototypeTokens.color.text.primary }}>
              Units quantity
            </Box>
            <Box sx={{ px: 1, py: 1.5, fontSize: 13, fontWeight: 600, color: prototypeTokens.color.text.primary }}>
              Price per unit
            </Box>
            <Box sx={{ px: 1, py: 1.5 }} />
          </Box>

          {tiers.map((tier, index) => {
            const isLastTier = index === tiers.length - 1;
            const start = tierStartUnits[index] ?? 1;
            const unitsError = showValidation ? tierValidationErrors[index]?.maxUnits : undefined;
            const priceError = showValidation
              ? tierValidationErrors[index]?.unitAmountUsd
              : undefined;

            return (
              <Box
                key={tier.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: tableColumnTemplate,
                  minHeight: 48,
                  borderTop: index === 0 ? 'none' : `1px solid ${prototypeTokens.color.border.default}`
                }}
              >
                <Stack
                  justifyContent="center"
                  sx={{
                    px: 1,
                    py: 1.25,
                    backgroundColor: prototypeTokens.color.bg.surfaceMuted,
                    color: prototypeTokens.color.text.primary
                  }}
                >
                  <Typography sx={{ fontSize: 15 }}>{index + 1}</Typography>
                </Stack>

                <Stack
                  justifyContent="center"
                  sx={{
                    px: 1,
                    py: 0.5,
                    backgroundColor: unitsError ? errorTint : prototypeTokens.color.bg.surface,
                    boxShadow: unitsError
                      ? `inset 0 0 0 1px ${prototypeTokens.color.status.dangerStrong}`
                      : 'none',
                    transition: 'background-color 120ms ease, box-shadow 120ms ease',
                    '&:focus-within': {
                      backgroundColor: unitsError ? errorTint : focusTint,
                      boxShadow: unitsError
                        ? `inset 0 0 0 1.5px ${prototypeTokens.color.status.dangerStrong}`
                        : `inset 0 0 0 2px ${prototypeTokens.color.brand.teal500}`
                    }
                  }}
                >
                  <InputBase
                    value={tier.maxUnits}
                    disabled={disabled}
                    onChange={(event) => onUpdateTierMaxUnits(tier.id, event.target.value)}
                    onBlur={() => onNormalizeTierMaxUnitsOnBlur(tier.id)}
                    placeholder={isLastTier ? `> ${Math.max(0, start - 1)}` : `${start}`}
                    inputProps={{
                      inputMode: 'numeric',
                      pattern: '[0-9]*',
                      'aria-label': `Tier ${index + 1} units quantity`,
                      'aria-invalid': Boolean(unitsError)
                    }}
                    sx={{
                      fontSize: 15,
                      px: 0.5,
                      '& input::placeholder': {
                        color: isLastTier
                          ? prototypeTokens.color.border.strong
                          : prototypeTokens.color.icon.muted,
                        opacity: 1
                      }
                    }}
                  />
                </Stack>

                <Stack
                  justifyContent="center"
                  sx={{
                    px: 1,
                    py: 0.5,
                    backgroundColor: priceError ? errorTint : prototypeTokens.color.bg.surface,
                    boxShadow: priceError
                      ? `inset 0 0 0 1px ${prototypeTokens.color.status.dangerStrong}`
                      : 'none',
                    transition: 'background-color 120ms ease, box-shadow 120ms ease',
                    '&:focus-within': {
                      backgroundColor: priceError ? errorTint : focusTint,
                      boxShadow: priceError
                        ? `inset 0 0 0 1.5px ${prototypeTokens.color.status.dangerStrong}`
                        : `inset 0 0 0 2px ${prototypeTokens.color.brand.teal500}`
                    }
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Typography sx={{ color: prototypeTokens.color.icon.muted, fontSize: 18 }}>$</Typography>
                    <InputBase
                      value={tier.unitAmountUsd}
                      disabled={disabled}
                      onChange={(event) => onUpdateTierUnitPrice(tier.id, event.target.value)}
                      onBlur={() => onNormalizeTierUnitPriceOnBlur(tier.id)}
                      placeholder="0.00"
                      inputProps={{
                        inputMode: 'decimal',
                        'aria-label': `Tier ${index + 1} unit price`,
                        'aria-invalid': Boolean(priceError)
                      }}
                      sx={{
                        width: '100%',
                        fontSize: 15,
                        '& input::placeholder': { color: prototypeTokens.color.icon.muted, opacity: 1 }
                      }}
                    />
                  </Stack>
                </Stack>

                <Stack
                  justifyContent="center"
                  alignItems="center"
                  sx={{ backgroundColor: prototypeTokens.color.bg.surfaceMuted }}
                >
                  {!isLastTier ? (
                    <AppIconButton
                      aria-label={`Remove tier ${index + 1}`}
                      disabled={disabled}
                      onClick={() => onRemoveTier(tier.id)}
                      tone="ghost"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </AppIconButton>
                  ) : null}
                </Stack>
              </Box>
            );
          })}
        </Box>
      </Box>

      <SecondaryButton
        startIcon={<AddIcon />}
        disabled={disabled}
        onClick={onAddTier}
        sx={{
          width: 'fit-content',
          px: 1.5,
          py: 0.75
        }}
      >
        Add tier
      </SecondaryButton>

      {showValidation && hasTierErrors ? (
        <Typography sx={{ color: prototypeTokens.color.status.dangerStrong, fontSize: 12 }}>
          Fill highlighted tier fields.
        </Typography>
      ) : null}
    </>
  );
}
