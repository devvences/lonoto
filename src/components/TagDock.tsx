import { useEffect, useRef, useState } from 'react';
import {
  alpha,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import ClearAllRoundedIcon from '@mui/icons-material/ClearAllRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import type { TagMatchMode } from '../types';
import type { TagStat } from '../lib/tags';
import TagChip from './TagChip';

interface TagDockProps {
  stats: TagStat[];
  selected: string[];
  mode: TagMatchMode;
  totalCount: number;
  filteredCount: number;
  onToggle: (tag: string) => void;
  onClear: () => void;
  onModeChange: (mode: TagMatchMode) => void;
}

export default function TagDock({
  stats,
  selected,
  mode,
  totalCount,
  filteredCount,
  onToggle,
  onClear,
  onModeChange,
}: TagDockProps) {
  const theme = useTheme();
  const selectedSet = new Set(selected);
  const known = new Set(stats.map((stat) => stat.tag));
  const display: TagStat[] = [
    ...stats,
    ...selected
      .filter((tag) => !known.has(tag))
      .map((tag) => ({ tag, count: 0 })),
  ];

  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const tagSignature = display
    .map((stat) => `${stat.tag}:${stat.count}`)
    .join('|');

  // Only offer the "show all" control when the single row really hides tags.
  useEffect(() => {
    const row = rowRef.current;
    if (!row || expanded) return;

    const measure = () =>
      setOverflowing(row.scrollWidth > row.clientWidth + 1);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [expanded, tagSignature]);

  const canExpand = overflowing || expanded;

  const chips =
    display.length === 0 ? (
      <Typography variant="caption" color="text.secondary">
        Add tags to a note and they will show up here.
      </Typography>
    ) : (
      display.map((stat) => (
        <Box key={stat.tag} sx={{ flex: '0 0 auto' }}>
          <TagChip
            tag={stat.tag}
            count={stat.count}
            selected={selectedSet.has(stat.tag)}
            onClick={() => onToggle(stat.tag)}
          />
        </Box>
      ))
    );

  return (
    <Paper
      square
      elevation={0}
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.default, 0.9),
        backdropFilter: 'blur(18px)',
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: expanded ? 'wrap' : 'nowrap',
          alignItems: 'center',
          columnGap: 1.25,
          rowGap: 0.75,
          px: { xs: 1.5, sm: 2.5, md: 4 },
          py: 1.1,
          minHeight: 58,
        }}
      >
        {canExpand ? (
          <Tooltip
            title={
              expanded ? 'Show the tag row again' : 'Show every tag at once'
            }
          >
            <Button
              size="small"
              variant="text"
              aria-expanded={expanded}
              aria-controls="tag-dock-list"
              aria-label={`Tags (${stats.length}), ${
                expanded ? 'show less' : 'show all'
              }`}
              onClick={() => setExpanded((value) => !value)}
              startIcon={<LocalOfferOutlinedIcon sx={{ fontSize: 18 }} />}
              endIcon={
                expanded ? (
                  <KeyboardArrowDownRoundedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <KeyboardArrowUpRoundedIcon sx={{ fontSize: 18 }} />
                )
              }
              sx={{
                flex: '0 0 auto',
                whiteSpace: 'nowrap',
                fontSize: 12,
                fontWeight: 700,
                px: 0.75,
                py: 0.25,
                minWidth: 0,
                color: 'text.secondary',
                '&:hover': {
                  color: 'text.primary',
                  bgcolor: 'action.hover',
                },
                '& .MuiButton-startIcon': { mr: 0.5 },
                '& .MuiButton-endIcon': { ml: 0.25 },
              }}
            >
              Tags ({stats.length})
            </Button>
          </Tooltip>
        ) : (
          <Stack
            direction="row"
            alignItems="center"
            spacing={0.75}
            sx={{ flex: '0 0 auto', color: 'text.secondary' }}
          >
            <LocalOfferOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Tags ({stats.length})
            </Typography>
          </Stack>
        )}

        {expanded ? <Box sx={{ flex: 1 }} /> : null}

        {!expanded ? (
          <Box
            sx={{
              position: 'relative',
              flex: 1,
              minWidth: 0,
              display: 'flex',
            }}
          >
            <Box
              ref={rowRef}
              id="tag-dock-list"
              className="hide-scrollbar"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                flex: 1,
                minWidth: 0,
                py: 0.4,
                overflowX: 'auto',
              }}
            >
              {chips}
            </Box>

            {overflowing ? (
              <Box
                aria-hidden
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  width: 48,
                  pointerEvents: 'none',
                  background: `linear-gradient(to right, ${alpha(
                    theme.palette.background.default,
                    0,
                  )}, ${alpha(theme.palette.background.default, 0.92)})`,
                }}
              />
            ) : null}
          </Box>
        ) : null}

        {selected.length > 1 ? (
          <Tooltip
            title={
              mode === 'all'
                ? 'Showing notes that have every selected tag. Click to match any tag.'
                : 'Showing notes that have at least one selected tag. Click to match all tags.'
            }
          >
            <Button
              size="small"
              variant="text"
              onClick={() => onModeChange(mode === 'all' ? 'any' : 'all')}
              sx={{
                flex: '0 0 auto',
                whiteSpace: 'nowrap',
                fontSize: 12,
                px: 1,
                minWidth: 0,
                color: 'text.secondary',
              }}
            >
              Match {mode === 'all' ? 'all' : 'any'}
            </Button>
          </Tooltip>
        ) : null}

        {selected.length > 0 ? (
          <>
            <Divider orientation="vertical" flexItem sx={{ my: 0.75 }} />
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ flex: '0 0 auto' }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}
              >
                {filteredCount} of {totalCount}
              </Typography>
              <Tooltip title="Clear tag filters">
                <Button
                  size="small"
                  startIcon={<ClearAllRoundedIcon sx={{ fontSize: 17 }} />}
                  onClick={onClear}
                  sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 1.25 }}
                >
                  Clear
                </Button>
              </Tooltip>
            </Stack>
          </>
        ) : null}

        {expanded ? (
          <Box
            sx={{
              flexBasis: '100%',
              width: '100%',
              minWidth: 0,
              display: 'flex',
              pt: 0.2,
            }}
          >
            <Box
              ref={rowRef}
              id="tag-dock-list"
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                alignContent: 'flex-start',
                gap: 0.75,
                flex: 1,
                minWidth: 0,
                maxHeight: '34vh',
                overflowY: 'auto',
                pr: 0.5,
              }}
            >
              {chips}
            </Box>
          </Box>
        ) : null}
      </Box>
    </Paper>
  );
}
