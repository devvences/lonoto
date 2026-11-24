import { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { copyText } from '../lib/clipboard';

export type LightboxMedia =
  | { type: 'image'; src: string; alt: string }
  | { type: 'code'; html: string; text: string; language?: string };

interface NoteLightboxProps {
  media: LightboxMedia | null;
  onClose: () => void;
}

export default function NoteLightbox({ media, onClose }: NoteLightboxProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!media) setCopied(false);
  }, [media]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyCode = async () => {
    if (media?.type !== 'code') return;
    const copied = await copyText(media.text);
    // Clipboard access can be denied; the code stays selectable either way.
    if (copied) setCopied(true);
  };

  const language =
    media?.type === 'code' && media.language && media.language !== 'plain'
      ? media.language.toUpperCase()
      : 'CODE';

  return (
    <Dialog
      open={Boolean(media)}
      onClose={onClose}
      maxWidth={media?.type === 'code' ? 'md' : false}
      fullWidth={media?.type === 'code'}
      aria-label={media?.type === 'code' ? 'Code preview' : 'Image preview'}
      slotProps={{
        paper: {
          'aria-label':
            media?.type === 'code' ? 'Code preview' : 'Image preview',
          sx:
            media?.type === 'image'
              ? {
                  bgcolor: 'transparent',
                  backgroundImage: 'none',
                  boxShadow: 'none',
                  overflow: 'visible',
                  m: 2,
                }
              : {
                  bgcolor: 'background.paper',
                  backgroundImage: 'none',
                  borderRadius: 2,
                  overflow: 'hidden',
                },
        },
      }}
    >
      {media?.type === 'image' ? (
        <>
          <IconButton
            aria-label="Close image preview"
            onClick={onClose}
            sx={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 1,
              color: '#fff',
              bgcolor: 'rgba(8, 12, 20, 0.62)',
              '&:hover': { bgcolor: 'rgba(8, 12, 20, 0.85)' },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
          <Box
            component="img"
            src={media.src}
            alt={media.alt || 'Note image'}
            sx={{
              display: 'block',
              maxWidth: '92vw',
              maxHeight: '86vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 1,
              bgcolor: 'background.paper',
              boxShadow: '0 28px 90px rgba(0, 0, 0, 0.6)',
            }}
          />
        </>
      ) : media?.type === 'code' ? (
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              px: 2,
              py: 1.1,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 750, letterSpacing: '0.06em' }}
            >
              {language}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={copied ? 'Copied' : 'Copy code'}>
                <IconButton
                  size="small"
                  aria-label="Copy code"
                  onClick={() => void copyCode()}
                >
                  {copied ? (
                    <CheckRoundedIcon fontSize="small" />
                  ) : (
                    <ContentCopyRoundedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                aria-label="Close code preview"
                onClick={onClose}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
          <Box
            className="note-content"
            sx={{
              p: 2,
              maxHeight: '72vh',
              overflow: 'auto',
              '& .editor-code': {
                m: 0,
                maxHeight: 'none',
                overflow: 'visible',
                fontSize: 13.5,
              },
            }}
          >
            <code
              className="editor-code"
              dangerouslySetInnerHTML={{ __html: media.html }}
            />
          </Box>
        </Box>
      ) : null}
    </Dialog>
  );
}
