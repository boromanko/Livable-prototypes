import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography
} from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

const drawerWidth = 260;

export function AppShell(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid #d9e0ea'
          }
        }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Stripe Integration V2.1
          </Typography>
        </Toolbar>
        <Divider />
        <List>
          <ListItemButton
            selected={location.pathname === '/products-pricing'}
            onClick={() => navigate('/products-pricing')}
          >
            <ListItemIcon>
              <Inventory2OutlinedIcon />
            </ListItemIcon>
            <ListItemText primary="Products & Pricing" />
          </ListItemButton>
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: `calc(100% - ${drawerWidth}px)`
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
