import { Box, Stack } from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import { getProductTierColumnCount } from '../pricingsTab.utils';
import { PricingProductSection } from './PricingProductSection';
import type {
  DetachConfirmTarget,
  OpenCreateSubscription,
  OpenEditPricing,
  PricingActionsMenuTarget,
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
  collapsedUsageSections: Set<string>;
  toggleExpanded: ToggleExpanded;
  setCollapsedProducts: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCollapsedUsageSections: React.Dispatch<React.SetStateAction<Set<string>>>;
  togglePricingFromCaret: (pricingId: string) => void;
  togglePricingSectionLink: (pricingId: string, section: 'accounts' | 'specific-properties') => void;
  openEditPricing: OpenEditPricing;
  setDeletingPricing: React.Dispatch<React.SetStateAction<PricingTreeItem | null>>;
  setPricingActionsTarget: React.Dispatch<React.SetStateAction<PricingActionsMenuTarget | null>>;
  setDetachConfirmTarget: React.Dispatch<React.SetStateAction<DetachConfirmTarget | null>>;
  openCreateSubscription: OpenCreateSubscription;
  openCreatePricing: (productId?: string) => void;
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

  const products = groupByProduct ? visibleProducts : [flatProductPlaceholder];

  return (
    <Box
      ref={cascadeScrollRef}
      sx={{ overflow: 'auto', minHeight: 0, flex: 1, overscrollBehavior: 'contain' }}
    >
      <Stack
        spacing={0}
        sx={{
          minWidth: minTreeWidthPx,
          border: '1px solid #E1E7EC',
          borderRadius: 1
        }}
      >
        {products.map((product, productIndex) => {
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
              productIndex={productIndex}
              groupByProduct={groupByProduct}
              productPricings={productPricings}
              productTierColumnCount={productTierColumnCount}
              isProductExpanded={isProductExpanded}
              expandedPricings={expandedPricings}
              collapsedUsageSections={collapsedUsageSections}
              toggleExpanded={toggleExpanded}
              setCollapsedProducts={setCollapsedProducts}
              setCollapsedUsageSections={setCollapsedUsageSections}
              togglePricingFromCaret={togglePricingFromCaret}
              togglePricingSectionLink={togglePricingSectionLink}
              openEditPricing={openEditPricing}
              setDeletingPricing={setDeletingPricing}
              setPricingActionsTarget={setPricingActionsTarget}
              setDetachConfirmTarget={setDetachConfirmTarget}
              openCreateSubscription={openCreateSubscription}
              openCreatePricing={openCreatePricing}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
