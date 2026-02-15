import { Menu, MenuItem } from '@mui/material';
import type { PricingActionsMenuTarget } from './pricingTree.types';

type PricingActionsMenuProps = {
  target: PricingActionsMenuTarget | null;
  onClose: () => void;
  onAssignAccount: (pricingId: string) => void;
  onAssignProperty: (pricingId: string) => void;
};

export function PricingActionsMenu(props: PricingActionsMenuProps): JSX.Element {
  const { target, onClose, onAssignAccount, onAssignProperty } = props;

  return (
    <Menu open={Boolean(target)} anchorEl={target?.anchorEl ?? null} onClose={onClose}>
      <MenuItem
        onClick={() => {
          if (!target) {
            return;
          }

          onAssignAccount(target.pricingId);
        }}
      >
        Assign subscription (account-level)
      </MenuItem>
      <MenuItem
        onClick={() => {
          if (!target) {
            return;
          }

          onAssignProperty(target.pricingId);
        }}
      >
        Assign subscription (property-level)
      </MenuItem>
    </Menu>
  );
}
