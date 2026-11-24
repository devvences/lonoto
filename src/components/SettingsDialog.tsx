import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  LinearProgress,
  Radio,
  RadioGroup,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import UploadRoundedIcon from '@mui/icons-material/UploadRounded';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import InstallMobileRoundedIcon from '@mui/icons-material/InstallMobileRounded';
import StorageRoundedIcon from '@mui/icons-material/StorageRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import SettingsBrightnessRoundedIcon from '@mui/icons-material/SettingsBrightnessRounded';
import { useEffect, useRef, useState } from 'react';
import type { Note } from '../types';
import { useThemeMode, type ThemePreference } from '../theme-mode';
import { useInstallPrompt, useOnlineStatus } from '../hooks/useEnvironment';
import {
  downloadBackup,
  importBackup,
  parseBackup,
  type ImportMode,
} from '../lib/backup';
import { formatBytes } from '../lib/time';
import { ensurePersistentStorage } from '../db/db';
import { seedSamples } from '../db/seed';
import { db } from '../db/db';
import ConfirmDialog from './ConfirmDialog';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  notes: Note[];
  notify: (message: string, severity?: 'success' | 'error' | 'info') => void;
}

interface StorageInfo {
  usage: number;
  quota: number;
  persisted: boolean;
}

export default function SettingsDialog({
  open,
  onClose,
  notes,
  notify,
}: SettingsDialogProps) {
  const theme = useTheme();
  const { preference, setPreference } = useThemeMode();
  const online = useOnlineStatus();
  const { canInstall, install } = useInstallPrompt();
  const fileRef = useRef<HTMLInputElement>(null);

  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    notes: Note[];
  } | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [importOpen, setImportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshStorage = async () => {
    const info: StorageInfo = { usage: 0, quota: 0, persisted: false };
    try {
      const estimate = await navigator.storage?.estimate?.();
      info.usage = estimate?.usage ?? 0;
      info.quota = estimate?.quota ?? 0;
      info.persisted = (await navigator.storage?.persisted?.()) ?? false;
    } catch {
      // storage API is optional
    }
    setStorage(info);
  };

  useEffect(() => {
    if (open) {
      void refreshStorage();
    }
  }, [open]);

  const serviceWorkerReady =
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    Boolean(navigator.serviceWorker.controller);

  const handleExport = () => {
    if (notes.length === 0) {
      notify('There are no notes to export yet.', 'info');
      return;
    }
    downloadBackup(notes);
    notify(`Backup with ${notes.length} notes downloaded.`, 'success');
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackup(text);
      setPendingImport({ fileName: file.name, notes: parsed });
      setImportMode('merge');
      setImportOpen(true);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Could not read that backup.',
        'error',
      );
    }
  };

  const handleImport = async () => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      const result = await importBackup(pendingImport.notes, importMode);
      notify(
        `Import finished: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped.`,
        'success',
      );
      setImportOpen(false);
      setPendingImport(null);
      await refreshStorage();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Import failed.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSeed = async () => {
    setBusy(true);
    try {
      const added = await seedSamples();
      notify(
        added > 0
          ? `Added ${added} sample notes. Edit or delete them as you like.`
          : 'Sample notes are already in your workspace.',
        added > 0 ? 'success' : 'info',
      );
      await refreshStorage();
    } catch (error) {
      notify(
        error instanceof Error ? error.message : 'Could not add samples.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    setBusy(true);
    try {
      await db.notes.clear();
      notify('All notes were deleted from this browser.', 'success');
      await refreshStorage();
    } finally {
      setBusy(false);
    }
  };

  const handlePersist = async () => {
    const persisted = await ensurePersistentStorage();
    await refreshStorage();
    notify(
      persisted
        ? 'The browser agreed to keep this workspace on this device.'
        : 'The browser did not grant persistent storage. Export backups to be safe.',
      persisted ? 'success' : 'info',
    );
  };

  const usagePercent =
    storage && storage.quota > 0
      ? Math.min(100, Math.max(1, (storage.usage / storage.quota) * 100))
      : 0;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ flex: 1 }}>Settings</Box>
          <IconButton aria-label="Close settings" onClick={onClose} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" color="text.secondary">
                Appearance
              </Typography>
              <ToggleButtonGroup
                value={preference}
                exclusive
                fullWidth
                size="small"
                onChange={(_, value: ThemePreference | null) => {
                  if (value) setPreference(value);
                }}
                sx={{ mt: 0.75 }}
              >
                <ToggleButton value="system">
                  <SettingsBrightnessRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                  System
                </ToggleButton>
                <ToggleButton value="dark">
                  <DarkModeRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Dark
                </ToggleButton>
                <ToggleButton value="light">
                  <LightModeRoundedIcon fontSize="small" sx={{ mr: 0.75 }} />
                  Light
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" color="text.secondary">
                Your data
              </Typography>
              <Alert
                severity="warning"
                variant="outlined"
                sx={{ mt: 0.75, borderRadius: 2 }}
              >
                Notes live only in this browser. Clearing site data deletes them,
                so export a backup regularly. Images are stored inside the note.
              </Alert>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ mt: 1.5 }}
              >
                <Button
                  variant="outlined"
                  startIcon={<DownloadRoundedIcon />}
                  onClick={handleExport}
                >
                  Export backup
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UploadRoundedIcon />}
                  onClick={() => fileRef.current?.click()}
                >
                  Import backup
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesomeOutlinedIcon />}
                  onClick={() => void handleSeed()}
                  disabled={busy}
                >
                  Add samples
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteForeverOutlinedIcon />}
                  onClick={() => setClearOpen(true)}
                  disabled={notes.length === 0}
                >
                  Delete all
                </Button>
              </Stack>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1 }}
              >
                Backups are plain JSON files and can be imported on another
                device or browser.
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography variant="overline" color="text.secondary">
                Storage & offline
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                  mt: 0.75,
                }}
              >
                <Chip
                  size="small"
                  icon={
                    online ? (
                      <CloudDoneOutlinedIcon />
                    ) : (
                      <CloudOffOutlinedIcon />
                    )
                  }
                  label={online ? 'Online' : 'Offline'}
                  variant="outlined"
                />
                <Chip
                  size="small"
                  icon={
                    serviceWorkerReady ? (
                      <CloudDoneOutlinedIcon />
                    ) : (
                      <CloudOffOutlinedIcon />
                    )
                  }
                  label={
                    serviceWorkerReady
                      ? 'App cached for offline'
                      : 'Offline cache not active yet'
                  }
                  variant="outlined"
                />
                <Chip
                  size="small"
                  icon={<StorageRoundedIcon />}
                  label={
                    storage?.persisted ? 'Persistent storage' : 'Best-effort storage'
                  }
                  variant="outlined"
                />
              </Box>

              <Box sx={{ mt: 1.75 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="baseline"
                  sx={{ mb: 0.5 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Used by this site
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 650 }}>
                    {storage
                      ? `${formatBytes(storage.usage)}${
                          storage.quota ? ` of ${formatBytes(storage.quota)}` : ''
                        }`
                      : '…'}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={usagePercent}
                  sx={{
                    height: 8,
                    borderRadius: 999,
                    bgcolor: alpha(theme.palette.text.primary, 0.08),
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.75 }}
                >
                  Notes and images are saved in IndexedDB. The app shell is cached
                  by a service worker, so it keeps working without a connection.
                </Typography>
                {!storage?.persisted ? (
                  <Button
                    size="small"
                    onClick={() => void handlePersist()}
                    sx={{ mt: 0.5, px: 0 }}
                  >
                    Ask the browser to keep this data
                  </Button>
                ) : null}
              </Box>
            </Box>

            {canInstall ? (
              <>
                <Divider />
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Install
                  </Typography>
                  <Box sx={{ mt: 0.75 }}>
                    <Button
                      variant="outlined"
                      startIcon={<InstallMobileRoundedIcon />}
                      onClick={() => void install()}
                    >
                      Install as an app
                    </Button>
                  </Box>
                </Box>
              </>
            ) : null}

            <Divider />
            <Box>
              <Typography variant="overline" color="text.secondary">
                About
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                My Workspace 1.0 · local-first notes. No account and no
                tracking. Notes stay in this browser; movie lookup goes through
                the app's server only when you use it. Built with React,
                Material UI, Lexical and IndexedDB.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Done</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Import backup</DialogTitle>
        <DialogContent>
          {pendingImport ? (
            <>
              <Typography variant="body2" color="text.secondary">
                <strong>{pendingImport.fileName}</strong> contains{' '}
                {pendingImport.notes.length} note
                {pendingImport.notes.length === 1 ? '' : 's'}.
              </Typography>
              <RadioGroup
                value={importMode}
                onChange={(event) =>
                  setImportMode(event.target.value as ImportMode)
                }
                sx={{ mt: 1.5 }}
              >
                <FormControlLabel
                  value="merge"
                  control={<Radio size="small" />}
                  label="Merge with my notes (keep the newest copy)"
                />
                <FormControlLabel
                  value="replace"
                  control={<Radio size="small" />}
                  label="Replace everything in this browser"
                />
              </RadioGroup>
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setImportOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleImport()}
            disabled={busy}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        title="Delete all notes?"
        message={
          <>
            This removes every note from this browser. It cannot be undone unless
            you exported a backup first.
          </>
        }
        confirmLabel="Delete everything"
        destructive
        onConfirm={() => void handleClear()}
      />
    </>
  );
}
