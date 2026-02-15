import type { PricingTreeItem, ProductItem } from '../../api';
import { BASE_TREE_MIN_WIDTH } from './pricingsTab.constants';
import { getProductMinRowWidth, getProductTierColumnCount } from './pricingsTab.tiers';

type GetPricingTreeMinWidthArgs = {
  groupByProduct: boolean;
  flatTierColumnCount: number;
  visibleProducts: ProductItem[];
  pricingsByProductId: Map<string, PricingTreeItem[]>;
};

export function getPricingTreeMinWidth(args: GetPricingTreeMinWidthArgs): number {
  const { groupByProduct, flatTierColumnCount, visibleProducts, pricingsByProductId } = args;
  if (!groupByProduct) {
    return Math.max(BASE_TREE_MIN_WIDTH, getProductMinRowWidth(flatTierColumnCount));
  }

  return visibleProducts.reduce((maxWidth, product) => {
    const productPricings = pricingsByProductId.get(product.id) ?? [];
    const tierColumnCount = getProductTierColumnCount(productPricings);
    return Math.max(maxWidth, getProductMinRowWidth(tierColumnCount));
  }, BASE_TREE_MIN_WIDTH);
}
