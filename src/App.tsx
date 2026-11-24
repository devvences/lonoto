import { lazy, Suspense } from 'react';
import { Alert, Box, Button, CircularProgress, Snackbar } from '@mui/material';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import BoardPage from './pages/BoardPage';

const EditorPage = lazy(() => import('./pages/EditorPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));

function PageFallback() {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function PwaStatus() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <>
      <Snackbar
        open={offlineReady}
        autoHideDuration={4500}
        onClose={() => setOfflineReady(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 7 }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setOfflineReady(false)}
          sx={{ borderRadius: 2 }}
        >
          Ready to work offline. The app is cached on this device.
        </Alert>
      </Snackbar>

      <Snackbar
        open={needRefresh}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ mb: 7 }}
        message="A new version is available."
        action={
          <>
            <Button
              color="inherit"
              size="small"
              onClick={() => setNeedRefresh(false)}
            >
              Later
            </Button>
            <Button
              color="inherit"
              size="small"
              onClick={() => void updateServiceWorker(true)}
            >
              Reload
            </Button>
          </>
        }
      />
    </>
  );
}

export default function App() {
  return (
    <>
      <HashRouter>
        <Routes>
          <Route path="/" element={<BoardPage />} />
          <Route
            path="/calendar"
            element={
              <Suspense fallback={<PageFallback />}>
                <CalendarPage />
              </Suspense>
            }
          />
          <Route
            path="/n/:id"
            element={
              <Suspense fallback={<PageFallback />}>
                <EditorPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <PwaStatus />
    </>
  );
}
