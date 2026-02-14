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
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          height: '100%'
        },
        body: {
          height: '100%',
          overflow: 'hidden'
        },
        '#root': {
          height: '100%'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: prototypeTokens.radius.r2,
          boxShadow: '0px 18px 32px rgba(0, 0, 0, 0.15)',
          backgroundImage: 'none'
        }
      }
    },
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
        },
        contained: {
          boxShadow: prototypeTokens.shadow.brandAction
        },
        outlined: {
          boxShadow: prototypeTokens.shadow.brandAction
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: prototypeTokens.radius.r2,
          backgroundColor: prototypeTokens.color.bg.surface,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#B8C4CE'
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#8FA1B3'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: prototypeTokens.color.brand.teal500
          }
        },
        input: {
          fontFamily: prototypeTokens.typography.search.family
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
