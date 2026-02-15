import { Menu, MenuItem } from '@mui/material';
import { SORT_MENU_LABELS, type PricingSortField } from '../pricingsTab.utils';

type PricingSortMenuProps = {
  open: boolean;
  anchorEl: HTMLElement | null;
  sortBy: PricingSortField;
  onClose: () => void;
  onSelectSortBy: (sortBy: PricingSortField) => void;
};

export function PricingSortMenu(props: PricingSortMenuProps): JSX.Element {
  const { open, anchorEl, sortBy, onClose, onSelectSortBy } = props;

  return (
    <Menu open={open} anchorEl={anchorEl} onClose={onClose}>
      <MenuItem selected={sortBy === 'NAME'} onClick={() => onSelectSortBy('NAME')}>
        {SORT_MENU_LABELS.NAME}
      </MenuItem>
      <MenuItem selected={sortBy === 'PRICE'} onClick={() => onSelectSortBy('PRICE')}>
        {SORT_MENU_LABELS.PRICE}
      </MenuItem>
      <MenuItem selected={sortBy === 'SUBSCRIPTIONS'} onClick={() => onSelectSortBy('SUBSCRIPTIONS')}>
        {SORT_MENU_LABELS.SUBSCRIPTIONS}
      </MenuItem>
    </Menu>
  );
}
