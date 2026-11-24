import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import {
  getMovieDetails,
  posterToDataUrl,
  searchMovies,
  type MovieDetails,
  type MoviePayload,
  type MovieSearchResult,
} from '../lib/movie';

interface MovieLookupDialogProps {
  open: boolean;
  initialTitle: string;
  onClose: () => void;
  onInsert: (payload: MoviePayload) => Promise<void> | void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function MovieLookupDialog({
  open,
  initialTitle,
  onClose,
  onInsert,
}: MovieLookupDialogProps) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSearchResult[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [searching, setSearching] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  const autoSearchRef = useRef('');
  const detailsRequest = useRef(0);

  // Reset everything each time the dialog opens.
  useEffect(() => {
    if (!open) {
      autoSearchRef.current = '';
      return;
    }
    setQuery(initialTitle);
    setResults([]);
    setSelectedId('');
    setDetails(null);
    setError('');
    setHasSearched(false);
    setSearching(false);
    setDetailsLoading(false);
    setInserting(false);
    detailsRequest.current += 1;
    // initialTitle is only read when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const runSearch = useCallback(async (term: string) => {
    const value = term.trim();
    if (!value) return;
    setSearching(true);
    setError('');
    setHasSearched(true);
    setSelectedId('');
    setDetails(null);
    try {
      const found = await searchMovies(value);
      setResults(found);
      if (found.length === 1) {
        setSelectedId(found[0].imdbID);
        setDetailsLoading(true);
        detailsRequest.current += 1;
        const request = detailsRequest.current;
        try {
          const info = await getMovieDetails(found[0].imdbID);
          if (detailsRequest.current === request) setDetails(info);
        } catch (detailError) {
          if (detailsRequest.current === request) {
            setError(errorMessage(detailError));
          }
        } finally {
          if (detailsRequest.current === request) setDetailsLoading(false);
        }
      }
    } catch (searchError) {
      setResults([]);
      setError(errorMessage(searchError));
    } finally {
      setSearching(false);
    }
  }, []);

  // A note titled "Inception" should offer Inception without extra typing.
  useEffect(() => {
    if (!open) return;
    const term = initialTitle.trim();
    if (!term) return;
    const signature = term;
    if (autoSearchRef.current === signature) return;
    autoSearchRef.current = signature;
    void runSearch(term);
  }, [open, initialTitle, runSearch]);

  const selectMovie = async (result: MovieSearchResult) => {
    setSelectedId(result.imdbID);
    setDetails(null);
    setError('');
    setDetailsLoading(true);
    detailsRequest.current += 1;
    const request = detailsRequest.current;
    try {
      const info = await getMovieDetails(result.imdbID);
      if (detailsRequest.current === request) setDetails(info);
    } catch (detailError) {
      if (detailsRequest.current === request) {
        setError(errorMessage(detailError));
      }
    } finally {
      if (detailsRequest.current === request) setDetailsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!details) return;
    setInserting(true);
    setError('');
    try {
      const poster = await posterToDataUrl(details.poster, details.title);
      await onInsert({ details, posterDataUrl: poster });
      onClose();
    } catch (insertError) {
      setError(errorMessage(insertError));
    } finally {
      setInserting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={inserting ? undefined : onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MovieOutlinedIcon color="primary" />
        <Box sx={{ flex: 1, minWidth: 0 }}>Add movie info</Box>
        <IconButton
          aria-label="Close movie lookup"
          onClick={onClose}
          size="small"
          disabled={inserting}
        >
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 1 }}>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Box
              component="form"
              onSubmit={(event) => {
                event.preventDefault();
                void runSearch(query);
              }}
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <TextField
                autoFocus
                size="small"
                label="Movie title"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                fullWidth
                slotProps={{
                  htmlInput: { 'aria-label': 'Movie search' },
                }}
              />
              <Button
                type="submit"
                variant="contained"
                startIcon={<SearchRoundedIcon />}
                disabled={!query.trim() || searching}
                sx={{ flex: '0 0 auto', minHeight: 40, whiteSpace: 'nowrap' }}
              >
                Search
              </Button>
            </Box>

            {error ? (
              <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
                {error}
              </Alert>
            ) : null}

            {searching ? (
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ py: 3, color: 'text.secondary' }}
              >
                <CircularProgress size={20} />
                <Typography variant="body2">Searching movies…</Typography>
              </Stack>
            ) : hasSearched && results.length === 0 && !error ? (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No movies matched “{query.trim()}”. Try a shorter title.
              </Typography>
            ) : results.length > 0 ? (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'minmax(0, 0.9fr) minmax(0, 1.1fr)',
                  },
                  gap: 2,
                  alignItems: 'start',
                }}
              >
                <Stack
                  spacing={1}
                  sx={{
                    maxHeight: { xs: 220, sm: 380 },
                    overflowY: 'auto',
                    pr: 0.5,
                  }}
                >
                  {results.map((result) => {
                    const selected = result.imdbID === selectedId;
                    return (
                      <Box
                        key={result.imdbID}
                        component="button"
                        type="button"
                        onClick={() => void selectMovie(result)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.25,
                          p: 0.9,
                          width: '100%',
                          textAlign: 'left',
                          font: 'inherit',
                          color: 'inherit',
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: selected
                            ? 'primary.main'
                            : theme.palette.divider,
                          borderRadius: 2,
                          bgcolor: selected
                            ? alpha(theme.palette.primary.main, 0.1)
                            : 'transparent',
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.06),
                          },
                        }}
                      >
                        {result.poster ? (
                          <Box
                            component="img"
                            src={result.poster}
                            alt=""
                            referrerPolicy="no-referrer"
                            sx={{
                              width: 40,
                              height: 60,
                              objectFit: 'cover',
                              borderRadius: 1,
                              flex: '0 0 auto',
                              bgcolor: alpha(
                                theme.palette.text.primary,
                                0.08,
                              ),
                            }}
                          />
                        ) : (
                          <Box
                            sx={{
                              width: 40,
                              height: 60,
                              borderRadius: 1,
                              flex: '0 0 auto',
                              display: 'grid',
                              placeItems: 'center',
                              bgcolor: alpha(
                                theme.palette.text.primary,
                                0.08,
                              ),
                              color: 'text.secondary',
                            }}
                          >
                            <MovieOutlinedIcon fontSize="small" />
                          </Box>
                        )}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 650, lineHeight: 1.25 }}
                          >
                            {result.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {result.year || 'Year unknown'}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>

                <Box
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 1.5,
                    minHeight: 220,
                    bgcolor: alpha(theme.palette.text.primary, 0.015),
                  }}
                >
                  {detailsLoading ? (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1.5}
                      sx={{ py: 6, color: 'text.secondary' }}
                    >
                      <CircularProgress size={24} />
                      <Typography variant="body2">
                        Loading movie details…
                      </Typography>
                    </Stack>
                  ) : details ? (
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        {details.poster ? (
                          <Box
                            component="img"
                            src={details.poster}
                            alt={`${details.title} poster`}
                            referrerPolicy="no-referrer"
                            sx={{
                              width: 104,
                              borderRadius: 1.5,
                              flex: '0 0 auto',
                              boxShadow: 2,
                              bgcolor: alpha(theme.palette.text.primary, 0.08),
                            }}
                          />
                        ) : null}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 800, lineHeight: 1.2 }}
                          >
                            {details.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.25 }}
                          >
                            {[details.year, details.rated, details.runtime]
                              .filter(Boolean)
                              .join(' · ')}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ mt: 1, flexWrap: 'wrap', gap: 0.75 }}
                          >
                            {details.imdbRating &&
                            details.imdbRating !== 'N/A' ? (
                              <Chip
                                size="small"
                                icon={<StarRoundedIcon />}
                                color="warning"
                                label={`IMDb ${details.imdbRating}/10`}
                              />
                            ) : null}
                            {details.genre && details.genre !== 'N/A' ? (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={details.genre}
                              />
                            ) : null}
                          </Stack>
                        </Box>
                      </Stack>

                      {details.director && details.director !== 'N/A' ? (
                        <Typography variant="body2">
                          <strong>Director:</strong> {details.director}
                        </Typography>
                      ) : null}
                      {details.actors && details.actors !== 'N/A' ? (
                        <Typography variant="body2" color="text.secondary">
                          <strong>Cast:</strong> {details.actors}
                        </Typography>
                      ) : null}

                      {details.plot && details.plot !== 'N/A' ? (
                        <>
                          <Divider />
                          <Typography
                            variant="body2"
                            sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                          >
                            “{details.plot}”
                          </Typography>
                        </>
                      ) : null}
                    </Stack>
                  ) : (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={1}
                      sx={{ py: 6, color: 'text.secondary', textAlign: 'center' }}
                    >
                      <MovieOutlinedIcon sx={{ fontSize: 34, opacity: 0.6 }} />
                      <Typography variant="body2">
                        Pick a movie to preview its poster and rating.
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Box>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Search for a movie to see its poster, rating and key facts.
              </Typography>
            )}

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexWrap: 'wrap',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Data from{' '}
                <Link
                  href="https://www.omdbapi.com/"
                  target="_blank"
                  rel="noreferrer"
                  color="inherit"
                >
                  OMDb
                </Link>{' '}
                · ratings from IMDb
              </Typography>
            </Box>
          </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={inserting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleAdd()}
          disabled={!details || inserting || detailsLoading}
          startIcon={
            inserting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <AddRoundedIcon />
            )
          }
        >
          {inserting ? 'Adding…' : 'Add to note'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
