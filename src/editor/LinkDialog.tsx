import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useEffect, useState, type FormEvent } from 'react';
import { normalizeUrl } from '../lib/url';

interface LinkDialogProps {
  open: boolean;
  initialUrl: string;
  initialText: string;
  existing: boolean;
  onClose: () => void;
  onSubmit: (url: string, text: string) => void;
  onRemove: () => void;
}

export default function LinkDialog({
  open,
  initialUrl,
  initialText,
  existing,
  onClose,
  onSubmit,
  onRemove,
}: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [text, setText] = useState(initialText);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setText(initialText);
      setError('');
    }
  }, [open, initialUrl, initialText]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError('Enter a valid URL, for example https://example.com');
      return;
    }
    onSubmit(normalized, text.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{existing ? 'Edit link' : 'Add link'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField
              autoFocus
              label="URL"
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError('');
              }}
              error={Boolean(error)}
              helperText={error || 'example.com works too — https:// is added.'}
              size="small"
              fullWidth
            />
            <TextField
              label="Label"
              value={text}
              onChange={(event) => setText(event.target.value)}
              helperText="Only used when you add a new link. Select text first to label it."
              size="small"
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          {existing ? (
            <Button color="error" onClick={onRemove} sx={{ mr: 'auto' }}>
              Remove link
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {existing ? 'Update' : 'Add link'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
