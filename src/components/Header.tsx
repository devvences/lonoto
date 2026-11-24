import {
  AppBar,
  alpha,
  Badge,
  Box,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import type { RefObject } from 'react';
import { useThemeMode } from '../theme-mode';
import SearchBar from './SearchBar';

interface HeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
  totalCount: number;
  filteredCount: number;
  onOpenSettings: () => void;
  onNewNote: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
  online: boolean;
  doneCount: number;
  doneView: boolean;
  onToggleDoneView: () => void;
  onOpenCalendar: () => void;
}

export default function Header({
  query,
  onQueryChange,
  totalCount,
  filteredCount,
  onOpenSettings,
  onNewNote,
  searchRef,
  online,
  doneCount,
  doneView,
  onToggleDoneView,
  onOpenCalendar,
}: HeaderProps) {
  const theme = useTheme();
  const { resolved, toggle } = useThemeMode();

  const filtered = filteredCount !== totalCount;
  const countLabel = filtered
    ? `${filteredCount} of ${totalCount} notes`
    : `${totalCount} note${totalCount === 1 ? '' : 's'}`;

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: alpha(theme.palette.background.default, 0.78),
        backdropFilter: 'blur(18px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
      }}
    >
      <Toolbar
        sx={{
          gap: { xs: 1, md: 2 },
          rowGap: 1,
          minHeight: { xs: 64, md: 78 },
          px: { xs: 1.5, sm: 2.5, md: 4 },
          flexWrap: 'wrap',
          py: { xs: 1.25, md: 1 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            order: 1,
            minWidth: 0,
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: { xs: 36, md: 42 },
              height: { xs: 36, md: 42 },
              borderRadius: 2.25,
              background: 'linear-gradient(140deg, #ffd08a 0%, #ff9d3d 100%)',
              color: '#241707',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 8px 20px rgba(255,157,61,0.22)',
              flex: '0 0 auto',
            }}
          >
            <StickyNote2RoundedIcon sx={{ fontSize: { xs: 22, md: 25 } }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h1"
              sx={{
                color: 'primary.main',
                fontWeight: 850,
                fontSize: { xs: 19, md: 23 },
                lineHeight: 1.15,
                letterSpacing: '-0.025em',
                whiteSpace: 'nowrap',
              }}
            >
              My Workspace
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                fontSize: { xs: 11, md: 12 },
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {countLabel}
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                {' '}
                {doneView ? '· done, hidden from the board' : '· stored in this browser'}
              </Box>
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            flex: '1 1 320px',
            maxWidth: { xs: '100%', md: 580 },
            order: { xs: 3, md: 2 },
            minWidth: { xs: '100%', md: 220 },
          }}
        >
          <SearchBar value={query} onChange={onQueryChange} inputRef={searchRef} />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.25,
            ml: 'auto',
            order: 2,
          }}
        >
          <Tooltip
            title={
              online
                ? 'Online. Notes are still saved locally first.'
                : 'Offline. Everything you change is saved on this device.'
            }
          >
            <Box
              component="span"
              sx={{ display: 'flex', alignItems: 'center', mr: 0.5 }}
            >
              {online ? (
                <CloudDoneOutlinedIcon
                  sx={{ fontSize: 19, color: 'text.secondary' }}
                />
              ) : (
                <CloudOffOutlinedIcon sx={{ fontSize: 19, color: 'warning.main' }} />
              )}
            </Box>
          </Tooltip>

          <Tooltip title="Calendar">
            <IconButton aria-label="Open calendar" onClick={onOpenCalendar}>
              <CalendarMonthOutlinedIcon />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              doneView
                ? 'Back to the board'
                : doneCount > 0
                  ? `Done notes (${doneCount})`
                  : 'Done notes'
            }
          >
            <IconButton
              aria-label={
                doneView ? 'Back to the board' : `Show done notes (${doneCount})`
              }
              aria-pressed={doneView}
              onClick={onToggleDoneView}
              sx={{
                color: doneView ? 'primary.main' : 'text.secondary',
                bgcolor: doneView
                  ? alpha(theme.palette.primary.main, 0.14)
                  : 'transparent',
                '&:hover': {
                  bgcolor: doneView
                    ? alpha(theme.palette.primary.main, 0.2)
                    : undefined,
                },
              }}
            >
              <Badge
                badgeContent={doneCount}
                color="primary"
                max={99}
                overlap="circular"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: 10,
                    fontWeight: 700,
                    height: 16,
                    minWidth: 16,
                    px: 0.4,
                  },
                }}
              >
                {doneView ? (
                  <Inventory2RoundedIcon />
                ) : (
                  <Inventory2OutlinedIcon />
                )}
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton aria-label="Toggle color theme" onClick={toggle}>
              {resolved === 'dark' ? (
                <LightModeRoundedIcon />
              ) : (
                <DarkModeRoundedIcon />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings, backup and import">
            <IconButton aria-label="Open settings" onClick={onOpenSettings}>
              <SettingsOutlinedIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddRoundedIcon />}
            onClick={onNewNote}
            sx={{
              ml: 1,
              display: { xs: 'none', sm: 'inline-flex' },
              px: 2.25,
              py: 1,
              boxShadow: '0 8px 22px rgba(255,157,61,0.25)',
            }}
          >
            New note
          </Button>
          <Tooltip title="New note">
            <IconButton
              aria-label="New note"
              onClick={onNewNote}
              sx={{
                display: { xs: 'inline-flex', sm: 'none' },
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                ml: 0.5,
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <AddRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
