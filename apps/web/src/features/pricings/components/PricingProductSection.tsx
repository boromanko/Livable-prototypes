import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Stack, Typography } from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import { GhostButton } from '../../../components/buttons';
import { PricingTreePricingRow } from './PricingTreePricingRow';
import { PricingTreeUsageRows } from './PricingTreeUsageRows';
import type {
  DetachConfirmTarget,
  OpenCreateSubscription,
  OpenEditPricing,
  PricingActionsMenuTarget,
  ToggleExpanded,
  VisibleProduct
} from './pricingTree.types';
import {
  PRODUCT_ROW_STICKY_TOP,
  TABLE_GHOST_BUTTON_SX,
  TREE_INDENT_STEP,
  TREE_LABEL_GAP,
  TREE_TOGGLE_SLOT_WIDTH
} from '../pricingsTab.utils';

type PricingProductSectionProps = {
  product: VisibleProduct;
  productIndex: number;
  groupByProduct: boolean;
  productPricings: PricingTreeItem[];
  productTierColumnCount: number;
  isProductExpanded: boolean;
  expandedPricings: Set<string>;
  collapsedUsageSections: Set<string>;
  toggleExpanded: ToggleExpanded;
  setCollapsedProducts: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCollapsedUsageSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  togglePricingFromCaret: (pricingId: string) => void;
  togglePricingSectionLink: (pricingId: string, section: 'subscriptions') => void;
  openEditPricing: OpenEditPricing;
  setDeletingPricing: React.Dispatch<React.SetStateAction<PricingTreeItem | null>>;
  setPricingActionsTarget: React.Dispatch<React.SetStateAction<PricingActionsMenuTarget | null>>;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
  openCreateSubscription: OpenCreateSubscription;
  openCreatePricing: (productId?: string) => void;
};

export function PricingProductSection(props: PricingProductSectionProps): JSX.Element {
  const {
    product,
    productIndex,
    groupByProduct,
    productPricings,
    productTierColumnCount,
    isProductExpanded,
    expandedPricings,
    collapsedUsageSections,
    toggleExpanded,
    setCollapsedProducts,
    setCollapsedUsageSections,
    togglePricingFromCaret,
    togglePricingSectionLink,
    openEditPricing,
    setDeletingPricing,
    setPricingActionsTarget,
    setDetachConfirmTarget,
    openCreateSubscription,
    openCreatePricing
  } = props;

  return (
    <Box>
      {groupByProduct ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={0}
          role="button"
          tabIndex={0}
          onClick={() => toggleExpanded(setCollapsedProducts, product.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              toggleExpanded(setCollapsedProducts, product.id);
            }
          }}
          sx={{
            minHeight: 40,
            px: 1.5,
            py: 0.5,
            backgroundColor: '#EEF2F6',
            borderTop: productIndex === 0 ? 'none' : '1px solid #E1E7EC',
            cursor: 'pointer',
            position: 'sticky',
            top: PRODUCT_ROW_STICKY_TOP,
            zIndex: 30
          }}
        >
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
              aria-label={isProductExpanded ? 'Collapse product' : 'Expand product'}
            >
              {isProductExpanded ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )}
            </Box>
          </Box>
          <Box sx={{ width: TREE_LABEL_GAP }} />
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Typography sx={{ fontWeight: 500, fontSize: 14, color: '#212934' }}>
              {product.name}
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 16, lineHeight: 1, color: '#B8C4CE' }}>
              |
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#98A4B3' }}>
              {productPricings.length} pricings
            </Typography>
          </Stack>
        </Stack>
      ) : null}

      {isProductExpanded ? (
        <Stack spacing={0}>
          {productPricings.map((pricing, pricingIndex) => {
            const pricingKey = `pricing:${pricing.id}`;
            const isPricingExpanded = expandedPricings.has(pricingKey);
            const subscriptionsSectionKey = `subscriptions:${pricing.id}`;
            const isSubscriptionsCollapsed = collapsedUsageSections.has(subscriptionsSectionKey);
            const subscriptions = pricing.subscriptions;
            const subscriptionsCount = subscriptions.length;
            const hasSubscriptions = subscriptionsCount > 0;
            const showSubscriptionsSectionHeader = hasSubscriptions;
            const isSubscriptionsVisible =
              hasSubscriptions && (!showSubscriptionsSectionHeader || !isSubscriptionsCollapsed);

            return (
              <Box key={pricing.id}>
                <PricingTreePricingRow
                  pricing={pricing}
                  pricingIndex={pricingIndex}
                  groupByProduct={groupByProduct}
                  productTierColumnCount={productTierColumnCount}
                  isPricingExpanded={isPricingExpanded}
                  hasSubscriptions={hasSubscriptions}
                  subscriptionsCount={subscriptionsCount}
                  togglePricingFromCaret={togglePricingFromCaret}
                  togglePricingSectionLink={togglePricingSectionLink}
                  openEditPricing={openEditPricing}
                  setDeletingPricing={setDeletingPricing}
                  setPricingActionsTarget={setPricingActionsTarget}
                />

                {isPricingExpanded ? (
                  <PricingTreeUsageRows
                    pricing={pricing}
                    productTierColumnCount={productTierColumnCount}
                    subscriptions={subscriptions}
                    showSubscriptionsSectionHeader={showSubscriptionsSectionHeader}
                    isSubscriptionsCollapsed={isSubscriptionsCollapsed}
                    isSubscriptionsVisible={isSubscriptionsVisible}
                    subscriptionsSectionKey={subscriptionsSectionKey}
                    setCollapsedUsageSections={setCollapsedUsageSections}
                    toggleExpanded={toggleExpanded}
                    setDetachConfirmTarget={setDetachConfirmTarget}
                    openCreateSubscription={openCreateSubscription}
                  />
                ) : null}
              </Box>
            );
          })}

          {groupByProduct ? (
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                minHeight: 48,
                pl: 0,
                pr: 1.5,
                py: 0.75,
                borderTop: '1px solid #E1E7EC',
                backgroundColor: '#FFFFFF'
              }}
            >
              <Box sx={{ width: TREE_INDENT_STEP }} />
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
                onClick={() => openCreatePricing(product.id)}
              >
                Add pricing
              </GhostButton>
            </Stack>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
