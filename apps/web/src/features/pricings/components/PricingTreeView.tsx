import { Box, Checkbox, Stack } from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import { prototypeTokens } from '../../../theme/tokens';
import { TREE_SELECTION_SLOT_WIDTH, getProductTierColumnCount } from '../pricingsTab.utils';
import { PricingProductSection } from './PricingProductSection';
import type {
  DetachConfirmTarget,
  OpenEditSubscription,
  OpenEditPricing,
  ToggleExpanded,
  VisibleProduct
} from './pricingTree.types';

type PricingTreeViewProps = {
  cascadeScrollRef: React.RefObject<HTMLDivElement | null>;
  minTreeWidthPx: number;
  groupByProduct: boolean;
  visibleProducts: VisibleProduct[];
  pricingsByProductId: Map<string, PricingTreeItem[]>;
  flatPricings: PricingTreeItem[];
  flatTierColumnCount: number;
  collapsedProducts: Set<string>;
  expandedPricings: Set<string>;
  toggleExpanded: ToggleExpanded;
  setCollapsedProducts: React.Dispatch<React.SetStateAction<Set<string>>>;
  togglePricingFromCaret: (pricingId: string) => void;
  togglePricingSectionLink: (pricingId: string, section: 'subscriptions') => void;
  openEditPricing: OpenEditPricing;
  openEditSubscription: OpenEditSubscription;
  setDeletingPricing: React.Dispatch<React.SetStateAction<PricingTreeItem | null>>;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
  openCreatePricing: (productId?: string) => void;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAllSelection: () => void;
  selectedPricingIds: string[];
  onTogglePricingSelection: (pricingId: string) => void;
  canManagePricings: boolean;
};

const flatProductPlaceholder: VisibleProduct = {
  id: '__flat__',
  name: '',
  code: '__flat__'
};

export function PricingTreeView(props: PricingTreeViewProps): JSX.Element {
  const {
    cascadeScrollRef,
    minTreeWidthPx,
    groupByProduct,
    visibleProducts,
    pricingsByProductId,
    flatPricings,
    flatTierColumnCount,
    collapsedProducts,
    expandedPricings,
    toggleExpanded,
    setCollapsedProducts,
    togglePricingFromCaret,
    togglePricingSectionLink,
    openEditPricing,
    openEditSubscription,
    setDeletingPricing,
    setDetachConfirmTarget,
    openCreatePricing,
    allSelected,
    someSelected,
    onToggleAllSelection,
    selectedPricingIds,
    onTogglePricingSelection,
    canManagePricings
  } = props;

  const products = groupByProduct ? visibleProducts : [flatProductPlaceholder];

  return (
    <Box
      ref={cascadeScrollRef}
      sx={{ overflow: 'auto', minHeight: 0, flex: 1, overscrollBehavior: 'contain' }}
    >
      <Stack
        spacing={0}
        sx={{
          minWidth: minTreeWidthPx
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            minHeight: 40,
            px: 1.5,
            py: 0.5,
            borderBottom: `1px solid ${prototypeTokens.color.border.default}`,
            backgroundColor: prototypeTokens.color.bg.surface,
            position: 'sticky',
            top: 0,
            zIndex: 40
          }}
        >
          {canManagePricings ? (
            <Stack
              direction="row"
              alignItems="center"
              spacing={0}
              sx={{ cursor: 'pointer' }}
              onClick={onToggleAllSelection}
            >
              <Box sx={{ width: TREE_SELECTION_SLOT_WIDTH, display: 'flex', justifyContent: 'center' }}>
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onChange={onToggleAllSelection}
                  size="small"
                  sx={{ p: 0.5 }}
                  aria-label="Select all pricings"
                />
              </Box>
              <Box
                sx={{ pl: 1.5, fontWeight: 500, fontSize: 14, color: prototypeTokens.color.text.primary }}
              >
                Select all pricings
              </Box>
            </Stack>
          ) : (
            <Box sx={{ px: 0.75, fontWeight: 600, fontSize: 14, color: prototypeTokens.color.text.primary }}>
              Pricings
            </Box>
          )}
        </Stack>

        {products.map((product) => {
          const productPricings = groupByProduct
            ? (pricingsByProductId.get(product.id) ?? [])
            : flatPricings;
          const productTierColumnCount = groupByProduct
            ? getProductTierColumnCount(productPricings)
            : flatTierColumnCount;
          const isProductExpanded = groupByProduct ? !collapsedProducts.has(product.id) : true;

          return (
            <PricingProductSection
              key={product.id}
              product={product}
              groupByProduct={groupByProduct}
              productPricings={productPricings}
              productTierColumnCount={productTierColumnCount}
              isProductExpanded={isProductExpanded}
              expandedPricings={expandedPricings}
              toggleExpanded={toggleExpanded}
              setCollapsedProducts={setCollapsedProducts}
              togglePricingFromCaret={togglePricingFromCaret}
              togglePricingSectionLink={togglePricingSectionLink}
              openEditPricing={openEditPricing}
              openEditSubscription={openEditSubscription}
              setDeletingPricing={setDeletingPricing}
              setDetachConfirmTarget={setDetachConfirmTarget}
              openCreatePricing={openCreatePricing}
              selectedPricingIds={selectedPricingIds}
              onTogglePricingSelection={onTogglePricingSelection}
              canManagePricings={canManagePricings}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
