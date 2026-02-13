import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import DnsRoundedIcon from '@mui/icons-material/DnsRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { Box, IconButton, Stack } from '@mui/material';
import { Outlet } from 'react-router-dom';
import livableLogo from '../assets/livable-logo.svg';
import { prototypeTokens } from '../theme/tokens';

type RailItemProps = {
  active?: boolean;
  children: JSX.Element;
};

function RailItem({ active = false, children }: RailItemProps): JSX.Element {
  return (
    <IconButton
      size="small"
      sx={{
        width: 40,
        height: 40,
        borderRadius: `${prototypeTokens.radius.r2}px`,
        bgcolor: active ? prototypeTokens.color.bg.navActive : 'transparent',
        color: active ? prototypeTokens.color.text.secondary : prototypeTokens.color.icon.muted
      }}
    >
      {children}
    </IconButton>
  );
}

export function AppShell(): JSX.Element {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        bgcolor: prototypeTokens.color.bg.app
      }}
    >
      <Box
        component="aside"
        sx={{
          width: `${prototypeTokens.size.sidebarWidth}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 2,
          pb: 1.5,
          gap: 3
        }}
      >
        <IconButton size="small" sx={{ color: prototypeTokens.color.text.secondary }}>
          <MenuRoundedIcon />
        </IconButton>

        <Box
          sx={{
            width: 40,
            height: 36,
            borderRadius: `${prototypeTokens.radius.r2}px`,
            background: prototypeTokens.color.brand.gradientPrimary,
            boxShadow: prototypeTokens.shadow.brandAction,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <AddRoundedIcon sx={{ color: '#fff' }} />
        </Box>

        <Stack spacing={0.5} alignItems="center">
          <RailItem>
            <HomeRoundedIcon fontSize="small" />
          </RailItem>
          <RailItem>
            <BarChartRoundedIcon fontSize="small" />
          </RailItem>
          <RailItem>
            <AssignmentRoundedIcon fontSize="small" />
          </RailItem>
          <RailItem>
            <DnsRoundedIcon fontSize="small" />
          </RailItem>
          <RailItem>
            <FolderRoundedIcon fontSize="small" />
          </RailItem>
          <RailItem>
            <KeyRoundedIcon fontSize="small" />
          </RailItem>
          <RailItem active>
            <LocalOfferRoundedIcon fontSize="small" />
          </RailItem>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box
          component="header"
          sx={{
            height: 72,
            pl: 0,
            pr: { xs: 1.25, sm: 2, md: 3 },
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          <Box
            component="img"
            src={livableLogo}
            alt="Livable"
            sx={{ width: 120, height: 32, display: 'block', flexShrink: 0 }}
          />

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" sx={{ color: prototypeTokens.color.text.secondary }}>
              <NotificationsRoundedIcon />
            </IconButton>
            <IconButton size="small" sx={{ color: prototypeTokens.color.text.secondary }}>
              <PersonRoundedIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              height: '100%',
              minHeight: 0,
              bgcolor: prototypeTokens.color.bg.surface,
              border: `1px solid ${prototypeTokens.color.border.default}`,
              borderRadius: `${prototypeTokens.radius.r4}px`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <Outlet />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
