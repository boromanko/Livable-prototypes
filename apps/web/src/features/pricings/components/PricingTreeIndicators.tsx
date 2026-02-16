import CheckIcon from '@mui/icons-material/Check';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import { Box } from '@mui/material';
import { prototypeTokens } from '../../../theme/tokens';

export function TierMatchIndicator(): JSX.Element {
  return (
    <Box
      sx={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        backgroundColor: prototypeTokens.color.brand.teal500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 0 1px rgba(0, 146, 153, 0.18)'
      }}
    >
      <CheckIcon sx={{ fontSize: 13, color: prototypeTokens.color.text.inverse }} />
    </Box>
  );
}

export function EntityTypeIndicator(props: { type: 'ACCOUNT' | 'PROPERTY' }): JSX.Element {
  const Icon = props.type === 'ACCOUNT' ? PersonIcon : HomeIcon;

  return (
    <Box
      sx={{
        width: 20,
        height: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <Icon sx={{ fontSize: 17, color: prototypeTokens.color.text.secondary }} />
    </Box>
  );
}
