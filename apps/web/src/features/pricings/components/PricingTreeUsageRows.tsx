import AddIcon from '@mui/icons-material/Add';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Link, Stack, Tooltip, Typography } from '@mui/material';
import type { PricingTreeAccountUsage, PricingTreeItem } from '../../../api';
import { AppIconButton, GhostButton } from '../../../components/buttons';
import { EntityTypeIndicator, TierMatchIndicator } from './PricingTreeIndicators';
import type {
  DetachConfirmTarget,
  OpenCreateSubscription,
  SpecificPropertyRow,
  ToggleExpanded
} from './pricingTree.types';
import {
  ACTIONS_COLUMN_WIDTH,
  CLICKABLE_ENTITY_LINK_SX,
  LEFT_CONTENT_MIN_WIDTH,
  PROPERTIES_COLUMN_WIDTH,
  TABLE_GHOST_BUTTON_SX,
  TIER_COLUMN_MIN_WIDTH,
  TREE_INDENT_STEP,
  TREE_LABEL_GAP,
  TREE_TOGGLE_SLOT_WIDTH,
  UNITS_COLUMN_WIDTH,
  getActiveTierColumnIndex
} from '../pricingsTab.utils';

type PricingTreeUsageRowsProps = {
  pricing: PricingTreeItem;
  productTierColumnCount: number;
  accountRows: PricingTreeAccountUsage[];
  specificPropertyRows: SpecificPropertyRow[];
  showAccountsSectionHeader: boolean;
  showPropertiesSectionHeader: boolean;
  isAccountsCollapsed: boolean;
  isSpecificPropertiesCollapsed: boolean;
  isAccountsVisible: boolean;
  isSpecificPropertiesVisible: boolean;
  accountsSectionKey: string;
  specificPropertiesSectionKey: string;
  setCollapsedUsageSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleExpanded: ToggleExpanded;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
  openCreateSubscription: OpenCreateSubscription;
};

export function PricingTreeUsageRows(props: PricingTreeUsageRowsProps): JSX.Element {
  const {
    pricing,
    productTierColumnCount,
    accountRows,
    specificPropertyRows,
    showAccountsSectionHeader,
    showPropertiesSectionHeader,
    isAccountsCollapsed,
    isSpecificPropertiesCollapsed,
    isAccountsVisible,
    isSpecificPropertiesVisible,
    accountsSectionKey,
    specificPropertiesSectionKey,
    setCollapsedUsageSections,
    toggleExpanded,
    setDetachConfirmTarget,
    openCreateSubscription
  } = props;

  return (
    <Stack spacing={0}>
      {showAccountsSectionHeader ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0}
          role="button"
          tabIndex={0}
          onClick={() => toggleExpanded(setCollapsedUsageSections, accountsSectionKey)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleExpanded(setCollapsedUsageSections, accountsSectionKey);
            }
          }}
          sx={{
            minHeight: 34,
            px: 1.5,
            borderTop: '1px dashed #E1E7EC',
            backgroundColor: '#F8F9FA',
            cursor: 'pointer'
          }}
        >
          <Box sx={{ width: TREE_INDENT_STEP * 2 }} />
          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: TREE_TOGGLE_SLOT_WIDTH,
                height: TREE_TOGGLE_SLOT_WIDTH,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                transition: 'background-color 120ms ease',
                '&:hover': { backgroundColor: '#EAF0F5' }
              }}
              aria-label={isAccountsCollapsed ? 'Expand accounts section' : 'Collapse accounts section'}
            >
              {isAccountsCollapsed ? (
                <ChevronRightIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </Box>
          </Box>
          <Box sx={{ width: TREE_LABEL_GAP }} />
          <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#212934' }}>
            {accountRows.length} accounts
          </Typography>
        </Stack>
      ) : null}

      {isAccountsVisible
        ? accountRows.map((accountUsage) => {
            const activeTierColumnIndex = getActiveTierColumnIndex(
              pricing,
              productTierColumnCount,
              accountUsage.currentTier
            );

            return (
              <Box key={`${pricing.id}:${accountUsage.account.id}`}>
                <Stack
                  direction="row"
                  alignItems="stretch"
                  spacing={0}
                  sx={{ minHeight: 34, px: 1.5, borderTop: '1px dashed #E1E7EC' }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0}
                    sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}
                  >
                    <Box sx={{ width: TREE_INDENT_STEP * (showAccountsSectionHeader ? 3 : 2) }} />
                    <Box sx={{ width: showAccountsSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
                    <Box sx={{ width: TREE_LABEL_GAP }} />
                    <Box sx={{ mr: 1 }}>
                      <EntityTypeIndicator type="ACCOUNT" />
                    </Box>
                    <Link
                      href="#"
                      onClick={(event) => event.preventDefault()}
                      sx={{ ...CLICKABLE_ENTITY_LINK_SX, minWidth: 260, fontSize: 14 }}
                    >
                      {accountUsage.account.companyName}
                    </Link>
                  </Stack>

                  <Box
                    sx={{
                      ml: 'auto',
                      flexShrink: 0,
                      display: 'grid',
                      gridTemplateColumns: `${PROPERTIES_COLUMN_WIDTH}px ${UNITS_COLUMN_WIDTH}px`
                    }}
                  >
                    <Box
                      sx={{
                        minHeight: 34,
                        px: 1.25,
                        borderLeft: '1px solid #E1E7EC',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#212934',
                        fontSize: 13,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {accountUsage.inheritedPropertiesCount}/{accountUsage.totalProperties} properties
                    </Box>
                    <Box
                      sx={{
                        minHeight: 34,
                        px: 1.25,
                        borderLeft: '1px solid #E1E7EC',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#212934',
                        fontSize: 13,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums'
                      }}
                    >
                      {accountUsage.totalBillableUnits} units
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      flexShrink: 0,
                      display: 'grid',
                      gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(${TIER_COLUMN_MIN_WIDTH}px, 1fr))`
                    }}
                  >
                    {Array.from({ length: productTierColumnCount }).map((_, columnIndex) => (
                      <Box
                        key={`${pricing.id}:${accountUsage.account.id}:tier-check:${columnIndex}`}
                        sx={{
                          minHeight: 34,
                          borderLeft: '1px solid #E1E7EC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {columnIndex === activeTierColumnIndex ? <TierMatchIndicator /> : null}
                      </Box>
                    ))}
                  </Box>

                  <Box
                    sx={{
                      width: ACTIONS_COLUMN_WIDTH,
                      pl: 0.75,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      borderLeft: '1px solid #E1E7EC'
                    }}
                  >
                    {accountUsage.accountSubscriptionId ? (
                      <Tooltip title="Detach pricing from account">
                        <AppIconButton
                          tone="ghost"
                          aria-label={`Detach pricing from ${accountUsage.account.companyName}`}
                          onClick={() =>
                            setDetachConfirmTarget({
                              pricingId: pricing.id,
                              subscriptionId: accountUsage.accountSubscriptionId ?? '',
                              title: `Detach pricing from ${accountUsage.account.companyName}`
                            })
                          }
                        >
                          <CancelOutlinedIcon fontSize="small" />
                        </AppIconButton>
                      </Tooltip>
                    ) : null}
                  </Box>
                </Stack>
              </Box>
            );
          })
        : null}

      {isAccountsVisible ? (
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            minHeight: 48,
            pl: 0,
            pr: 1.5,
            py: 0.75,
            borderTop: '1px dashed #E1E7EC',
            backgroundColor: '#FFFFFF'
          }}
        >
          <Box sx={{ width: TREE_INDENT_STEP * (showAccountsSectionHeader ? 3 : 2) }} />
          <Box sx={{ width: showAccountsSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
          <Box sx={{ width: TREE_LABEL_GAP }} />
          <GhostButton
            size="small"
            startIcon={<AddIcon />}
            sx={{
              ...TABLE_GHOST_BUTTON_SX,
              '& .MuiButton-startIcon': {
                marginLeft: 0,
                marginRight: `${TREE_LABEL_GAP}px`,
                width: TREE_TOGGLE_SLOT_WIDTH,
                display: 'flex',
                justifyContent: 'center'
              }
            }}
            onClick={() => openCreateSubscription(pricing.id, { scope: 'ACCOUNT' })}
          >
            Assign account
          </GhostButton>
        </Stack>
      ) : null}

      {showPropertiesSectionHeader ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0}
          role="button"
          tabIndex={0}
          onClick={() =>
            toggleExpanded(setCollapsedUsageSections, specificPropertiesSectionKey)
          }
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleExpanded(setCollapsedUsageSections, specificPropertiesSectionKey);
            }
          }}
          sx={{
            minHeight: 34,
            px: 1.5,
            borderTop: '1px dashed #E1E7EC',
            backgroundColor: '#F8F9FA',
            cursor: 'pointer'
          }}
        >
          <Box sx={{ width: TREE_INDENT_STEP * 2 }} />
          <Box sx={{ width: TREE_TOGGLE_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
            <Box
              sx={{
                width: TREE_TOGGLE_SLOT_WIDTH,
                height: TREE_TOGGLE_SLOT_WIDTH,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                transition: 'background-color 120ms ease',
                '&:hover': { backgroundColor: '#EAF0F5' }
              }}
              aria-label={
                isSpecificPropertiesCollapsed
                  ? 'Expand specific properties section'
                  : 'Collapse specific properties section'
              }
            >
              {isSpecificPropertiesCollapsed ? (
                <ChevronRightIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
            </Box>
          </Box>
          <Box sx={{ width: TREE_LABEL_GAP }} />
          <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#212934' }}>
            {specificPropertyRows.length} specific properties
          </Typography>
        </Stack>
      ) : null}

      {isSpecificPropertiesVisible
        ? specificPropertyRows.map(({ accountUsage, propertyUsage }) => {
            const activeTierColumnIndex = getActiveTierColumnIndex(
              pricing,
              productTierColumnCount,
              propertyUsage.currentTier
            );

            return (
              <Stack
                key={`${pricing.id}:${accountUsage.account.id}:${propertyUsage.property.id}`}
                direction="row"
                alignItems="stretch"
                spacing={0}
                sx={{ minHeight: 44, px: 1.5, borderTop: '1px dotted #E1E7EC' }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0}
                  sx={{ flex: 1, minWidth: LEFT_CONTENT_MIN_WIDTH }}
                >
                  <Box
                    sx={{ width: TREE_INDENT_STEP * (showPropertiesSectionHeader ? 3 : 2) }}
                  />
                  <Box sx={{ width: showPropertiesSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
                  <Box sx={{ width: TREE_LABEL_GAP }} />
                  <Box sx={{ mr: 1 }}>
                    <EntityTypeIndicator type="PROPERTY" />
                  </Box>

                  <Stack spacing={0} sx={{ py: 0.5 }}>
                    <Link
                      href="#"
                      onClick={(event) => event.preventDefault()}
                      sx={{ ...CLICKABLE_ENTITY_LINK_SX, fontSize: 13, lineHeight: 1.1 }}
                    >
                      {propertyUsage.property.address}
                    </Link>
                    <Link
                      href="#"
                      onClick={(event) => event.preventDefault()}
                      sx={{
                        ...CLICKABLE_ENTITY_LINK_SX,
                        fontSize: 11,
                        lineHeight: 1.1,
                        color: '#7A8EA8'
                      }}
                    >
                      {accountUsage.account.companyName}
                    </Link>
                  </Stack>
                </Stack>

                <Box
                  sx={{
                    ml: 'auto',
                    flexShrink: 0,
                    display: 'grid',
                    gridTemplateColumns: `${PROPERTIES_COLUMN_WIDTH}px ${UNITS_COLUMN_WIDTH}px`
                  }}
                >
                  <Box
                    sx={{
                      minHeight: 44,
                      px: 1.25,
                      borderLeft: '1px solid #E1E7EC'
                    }}
                  />
                  <Box
                    sx={{
                      minHeight: 44,
                      px: 1.25,
                      borderLeft: '1px solid #E1E7EC',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#212934',
                      fontSize: 13,
                      fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums'
                    }}
                  >
                    {propertyUsage.property.billableUnits} units
                  </Box>
                </Box>

                <Box
                  sx={{
                    flexShrink: 0,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${productTierColumnCount}, minmax(${TIER_COLUMN_MIN_WIDTH}px, 1fr))`
                  }}
                >
                  {Array.from({ length: productTierColumnCount }).map((_, columnIndex) => (
                    <Box
                      key={`${pricing.id}:${propertyUsage.property.id}:tier-check:${columnIndex}`}
                      sx={{
                        minHeight: 44,
                        borderLeft: '1px solid #E1E7EC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {columnIndex === activeTierColumnIndex ? <TierMatchIndicator /> : null}
                    </Box>
                  ))}
                </Box>

                <Box
                  sx={{
                    width: ACTIONS_COLUMN_WIDTH,
                    pl: 0.75,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    borderLeft: '1px solid #E1E7EC'
                  }}
                >
                  {propertyUsage.resolvedBySubscriptionId ? (
                    <Tooltip title="Detach pricing from property">
                      <AppIconButton
                        tone="ghost"
                        aria-label={`Detach pricing from ${propertyUsage.property.address}`}
                        onClick={() =>
                          setDetachConfirmTarget({
                            pricingId: pricing.id,
                            subscriptionId: propertyUsage.resolvedBySubscriptionId ?? '',
                            title: `Detach override from ${propertyUsage.property.address}`
                          })
                        }
                      >
                        <CancelOutlinedIcon fontSize="small" />
                      </AppIconButton>
                    </Tooltip>
                  ) : null}
                </Box>
              </Stack>
            );
          })
        : null}

      {isSpecificPropertiesVisible ? (
        <Stack
          direction="row"
          alignItems="center"
          sx={{
            minHeight: 48,
            pl: 0,
            pr: 1.5,
            py: 0.75,
            borderTop: '1px dashed #E1E7EC',
            backgroundColor: '#FFFFFF'
          }}
        >
          <Box sx={{ width: TREE_INDENT_STEP * (showPropertiesSectionHeader ? 3 : 2) }} />
          <Box sx={{ width: showPropertiesSectionHeader ? TREE_TOGGLE_SLOT_WIDTH : 0 }} />
          <Box sx={{ width: TREE_LABEL_GAP }} />
          <GhostButton
            size="small"
            startIcon={<AddIcon />}
            sx={{
              ...TABLE_GHOST_BUTTON_SX,
              '& .MuiButton-startIcon': {
                marginLeft: 0,
                marginRight: `${TREE_LABEL_GAP}px`,
                width: TREE_TOGGLE_SLOT_WIDTH,
                display: 'flex',
                justifyContent: 'center'
              }
            }}
            onClick={() => openCreateSubscription(pricing.id, { scope: 'PROPERTY' })}
          >
            Assign property
          </GhostButton>
        </Stack>
      ) : null}
    </Stack>
  );
}
