import { Box, Stack } from '@mui/material';
import type { PricingTreeItem } from '../../../api';
import { getProductTierColumnCount } from '../pricingsTab.utils';
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
              toggleExpanded={toggleExpanded}
              setCollapsedProducts={setCollapsedProducts}
              togglePricingFromCaret={togglePricingFromCaret}
              togglePricingSectionLink={togglePricingSectionLink}
              openEditPricing={openEditPricing}
              openEditSubscription={openEditSubscription}
              setDeletingPricing={setDeletingPricing}
              setDetachConfirmTarget={setDetachConfirmTarget}
              openCreatePricing={openCreatePricing}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
