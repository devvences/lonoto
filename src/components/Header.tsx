import {
  AppBar,
  alpha,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import StickyNote2RoundedIcon from '@mui/icons-material/StickyNote2Rounded';
import { useState, type RefObject } from 'react';
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const closeMenu = () => setMenuAnchor(null);

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
              role="img"
              aria-label={online ? 'Online' : 'Offline'}
              sx={{
                width: 8,
                height: 8,
                flex: '0 0 auto',
                mr: 0.75,
                borderRadius: '50%',
                bgcolor: online ? 'success.main' : 'warning.main',
                boxShadow: `0 0 0 3px ${alpha(
                  online
                    ? theme.palette.success.main
                    : theme.palette.warning.main,
                  0.16,
                )}`,
              }}
            />
          </Tooltip>

          <Tooltip title="Calendar">
            <IconButton aria-label="Open calendar" onClick={onOpenCalendar}>
              <CalendarMonthOutlinedIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="More actions">
            <IconButton
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={Boolean(menuAnchor)}
              aria-controls={menuAnchor ? 'header-more-menu' : undefined}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              <MoreVertRoundedIcon />
            </IconButton>
          </Tooltip>
          <Menu
            id="header-more-menu"
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: { sx: { mt: 1, minWidth: 248, borderRadius: 2 } },
            }}
          >
            <MenuItem
              selected={doneView}
              onClick={() => {
                closeMenu();
                onToggleDoneView();
              }}
            >
              <ListItemIcon>
                {doneView ? (
                  <Inventory2RoundedIcon fontSize="small" />
                ) : (
                  <Inventory2OutlinedIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={doneView ? 'Back to the board' : 'Done notes'}
                secondary={
                  !doneView && doneCount > 0
                    ? `${doneCount} hidden from the board`
                    : undefined
                }
              />
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                closeMenu();
                toggle();
              }}
            >
              <ListItemIcon>
                {resolved === 'dark' ? (
                  <LightModeRoundedIcon fontSize="small" />
                ) : (
                  <DarkModeRoundedIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  resolved === 'dark'
                    ? 'Switch to light mode'
                    : 'Switch to dark mode'
                }
              />
            </MenuItem>
            <MenuItem
              onClick={() => {
                closeMenu();
                onOpenSettings();
              }}
            >
              <ListItemIcon>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Settings"
                secondary="Backup, import and appearance"
              />
            </MenuItem>
          </Menu>

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
