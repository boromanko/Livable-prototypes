import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Stack } from '@mui/material';
import { BorderedButton } from '../../../components/buttons';
import { SelectionActionBar } from '../../../components/layout';

type PricingsSelectionActionsProps = {
  selectedCount: number;
  isPending: boolean;
  onOpenDeletePricings: () => void;
  onClearSelection: () => void;
};

export function PricingsSelectionActions(props: PricingsSelectionActionsProps): JSX.Element {
  const { selectedCount, isPending, onOpenDeletePricings, onClearSelection } = props;
  const isVisible = selectedCount > 0;
  const selectedLabel = `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected`;

  return (
    <SelectionActionBar
      visible={isVisible}
      selectedCount={selectedCount}
      selectedLabel={selectedLabel}
      onClearSelection={onClearSelection}
    >
      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        <BorderedButton
          startIcon={<DeleteOutlineIcon fontSize="small" />}
          onClick={onOpenDeletePricings}
          disabled={!isVisible || isPending}
        >
          Delete pricings
        </BorderedButton>
      </Stack>
    </SelectionActionBar>
  );
}
