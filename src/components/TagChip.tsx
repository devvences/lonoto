import { Chip, alpha } from '@mui/material';
import type { KeyboardEvent, MouseEvent, SyntheticEvent } from 'react';
import TagIcon from './TagIcon';
import { tagColor } from '../lib/tags';

interface TagChipProps {
  tag: string;
  count?: number;
  selected?: boolean;
  className?: string;
  onClick?: (event: MouseEvent) => void;
  onDelete?: (event: SyntheticEvent) => void;
  size?: 'small' | 'medium';
}

export default function TagChip({
  tag,
  count,
  selected = false,
  className,
  onClick,
  onDelete,
  size = 'small',
}: TagChipProps) {
  const color = tagColor(tag);

  return (
    <Chip
      className={className}
      size={size}
      clickable={Boolean(onClick)}
      onClick={onClick}
      onDelete={onDelete}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (!onDelete) return;
        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          event.stopPropagation();
          onDelete(event);
        }
      }}
      icon={<TagIcon tag={tag} sx={{ fontSize: size === 'small' ? 15 : 17 }} />}
      label={count === undefined ? tag : `${tag} (${count})`}
      aria-pressed={onClick ? selected : undefined}
      sx={{
        border: '1px solid',
        borderColor: selected ? color : alpha(color, 0.3),
        bgcolor: selected ? color : alpha(color, 0.08),
        color: selected ? '#221607' : 'text.primary',
        fontWeight: selected ? 700 : 550,
        transition: 'background-color 120ms ease, border-color 120ms ease',
        '& .MuiChip-icon': {
          color: selected ? '#221607' : color,
        },
        '& .MuiChip-deleteIcon': {
          color: selected ? 'rgba(34,22,7,0.65)' : 'text.secondary',
          '&:hover': { color: selected ? '#221607' : 'text.primary' },
        },
        '&:hover': {
          bgcolor: selected ? color : alpha(color, 0.16),
          borderColor: color,
        },
      }}
    />
  );
}
