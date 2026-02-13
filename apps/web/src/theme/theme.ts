import { createTheme } from '@mui/material/styles';
import { prototypeTokens } from './tokens';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: prototypeTokens.color.brand.teal500
    },
    background: {
      default: prototypeTokens.color.bg.app,
      paper: prototypeTokens.color.bg.surface
    },
    text: {
      primary: prototypeTokens.color.text.primary,
      secondary: prototypeTokens.color.text.secondary
    },
    divider: prototypeTokens.color.border.default
  },
  shape: {
    borderRadius: prototypeTokens.radius.r4
  },
  typography: {
    fontFamily: prototypeTokens.typography.search.family,
    h4: {
      fontFamily: prototypeTokens.typography.title.family,
      fontWeight: prototypeTokens.typography.title.weight
    }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: prototypeTokens.radius.r2,
          textTransform: 'none'
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: prototypeTokens.radius.r2
        }
      }
    }
  }
});

