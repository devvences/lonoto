import {
  alpha,
  IconButton,
  InputAdornment,
  TextField,
  useTheme,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { RefObject } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  inputRef,
  placeholder = 'Search title, description, tags…',
  autoFocus,
}: SearchBarProps) {
  const theme = useTheme();

  return (
    <TextField
      inputRef={inputRef}
      value={value}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onChange('');
          (event.target as HTMLInputElement).blur();
        }
      }}
      placeholder={placeholder}
      size="small"
      fullWidth
      slotProps={{ htmlInput: { 'aria-label': 'Search notes' } }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 999,
          bgcolor: alpha(theme.palette.text.primary, 0.045),
          pl: 0.5,
          '& fieldset': {
            borderColor: alpha(theme.palette.text.primary, 0.12),
          },
          '&:hover fieldset': {
            borderColor: alpha(theme.palette.text.primary, 0.22),
          },
          '&.Mui-focused': {
            bgcolor: alpha(theme.palette.background.paper, 0.75),
          },
          '&.Mui-focused fieldset': {
            borderColor: theme.palette.primary.main,
            borderWidth: 1.5,
          },
        },
        '& .MuiInputBase-input': {
          py: 1.05,
          fontSize: 14.5,
        },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchRoundedIcon
              sx={{ fontSize: 20, color: 'text.secondary' }}
            />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {value ? (
              <IconButton
                size="small"
                aria-label="Clear search"
                onClick={() => onChange('')}
                edge="end"
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            ) : (
              <kbd
                style={{
                  fontFamily: 'inherit',
                  fontSize: 11,
                  padding: '2px 7px',
                  borderRadius: 6,
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.16)}`,
                  color: theme.palette.text.secondary,
                  lineHeight: 1.5,
                }}
              >
                /
              </kbd>
            )}
          </InputAdornment>
        ),
      }}
    />
  );
}
