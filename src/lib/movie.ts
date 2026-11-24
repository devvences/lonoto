import { createHeadlessEditor } from '@lexical/headless';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalNode,
} from 'lexical';
import { $createQuoteNode } from '@lexical/rich-text';
import { $createLinkNode } from '@lexical/link';
import { NOTE_NODES } from '../editor/nodes';
import { $createImageNode } from '../editor/nodes/ImageNode';
import { prepareImage } from './image';

const MOVIE_API_ENDPOINT = '/api/movies';
const REQUEST_TIMEOUT = 12_000;

export const MOVIE_TAG = 'movie';

export interface MovieSearchResult {
  imdbID: string;
  title: string;
  year: string;
  poster: string;
}

export interface MovieDetails {
  imdbID: string;
  title: string;
  year: string;
  rated: string;
  runtime: string;
  genre: string;
  director: string;
  actors: string;
  plot: string;
  imdbRating: string;
  imdbVotes: string;
  poster: string;
  released: string;
}

export interface MoviePayload {
  details: MovieDetails;
  /** Poster already downscaled and embedded as a data URL, when available. */
  posterDataUrl: string | null;
}

export function isMovieTag(tag: string): boolean {
  return tag.trim().toLowerCase() === MOVIE_TAG;
}

interface MovieApiError {
  error?: string;
}

async function movieApiRequest(
  params: Record<string, string>,
): Promise<Record<string, unknown>> {
  const url = new URL(MOVIE_API_ENDPOINT, window.location.origin);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  let response: Response;
  try {
    response = await fetch(url.toString(), { signal: controller.signal });
  } catch {
    if (controller.signal.aborted) {
      throw new Error('The movie service took too long to answer. Try again.');
    }
    throw new Error(
      'Could not reach the movie service. Check your connection and try again.',
    );
  } finally {
    window.clearTimeout(timer);
  }

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    // A proxy or host may return an HTML error page; keep the status below.
  }

  if (!response.ok) {
    const message = (data as MovieApiError).error;
    throw new Error(
      message || `The movie service returned ${response.status}.`,
    );
  }

  return data;
}

export async function searchMovies(
  query: string,
): Promise<MovieSearchResult[]> {
  const data = await movieApiRequest({ query: query.trim() });
  const results = Array.isArray(data.results)
    ? (data.results as MovieSearchResult[])
    : [];
  return results
    .filter((item) => Boolean(item?.imdbID && item?.title))
    .map((item) => ({
      imdbID: item.imdbID,
      title: item.title,
      year: item.year ?? '',
      poster: item.poster ?? '',
    }));
}

export async function getMovieDetails(
  imdbID: string,
): Promise<MovieDetails> {
  const data = await movieApiRequest({ id: imdbID });
  const movie = data.movie as MovieDetails | undefined;
  if (!movie) throw new Error('The movie service returned no details.');
  return {
    imdbID: movie.imdbID || imdbID,
    title: movie.title || 'Untitled movie',
    year: movie.year || '',
    rated: movie.rated || '',
    runtime: movie.runtime || '',
    genre: movie.genre || '',
    director: movie.director || '',
    actors: movie.actors || '',
    plot: movie.plot || '',
    imdbRating: movie.imdbRating || '',
    imdbVotes: movie.imdbVotes || '',
    poster: movie.poster || '',
    released: movie.released || '',
  };
}

function extensionFor(type: string): string {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  if (type === 'image/svg+xml') return 'svg';
  return 'jpg';
}

/**
 * Download a remote poster and turn it into a compact data URL so the note
 * stays self-contained. Returns null when the image cannot be embedded; the
 * rest of the movie info is still worth adding.
 */
export async function posterToDataUrl(
  posterUrl: string,
  title: string,
): Promise<string | null> {
  if (!posterUrl || posterUrl === 'N/A') return null;
  try {
    const response = await fetch(posterUrl, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const file = new File(
      [blob],
      `${(title || 'poster').replace(/[^\w.-]+/g, '-').slice(0, 40)}.${extensionFor(blob.type)}`,
      { type: blob.type },
    );
    const prepared = await prepareImage(file);
    return prepared.src;
  } catch {
    return null;
  }
}

function useful(value: string): boolean {
  return Boolean(value && value !== 'N/A');
}

function join(parts: string[]): string {
  return parts.filter(useful).join(' · ');
}

function shortActors(actors: string): string {
  if (!useful(actors)) return '';
  return actors
    .split(',')
    .map((actor) => actor.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');
}

/**
 * Build the nodes that get prepended to a note: poster, title, key facts and
 * a short plot quote. Must run inside a Lexical update.
 */
export function buildMovieNodes(payload: MoviePayload): LexicalNode[] {
  const { details, posterDataUrl } = payload;
  const nodes: LexicalNode[] = [];

  if (posterDataUrl) {
    nodes.push(
      $createImageNode(posterDataUrl, `${details.title} poster`),
    );
  }

  const title = $createParagraphNode();
  title.append($createTextNode(details.title).toggleFormat('bold'));
  if (useful(details.year)) {
    title.append($createTextNode(` (${details.year})`));
  }
  nodes.push(title);

  const facts = $createParagraphNode();
  let hasFact = false;
  if (useful(details.imdbRating)) {
    const link = $createLinkNode(
      `https://www.imdb.com/title/${details.imdbID}/`,
    );
    link.append($createTextNode(`IMDb ${details.imdbRating}/10`));
    facts.append(link);
    hasFact = true;
  }
  const extras = join([details.rated, details.runtime, details.genre]);
  if (extras) {
    if (hasFact) facts.append($createTextNode(' · '));
    facts.append($createTextNode(extras));
    hasFact = true;
  }
  if (hasFact) nodes.push(facts);

  const credits = join([
    useful(details.director) ? `Dir. ${details.director}` : '',
    shortActors(details.actors),
  ]);
  if (credits) {
    nodes.push($createParagraphNode().append($createTextNode(credits)));
  }

  if (useful(details.plot)) {
    nodes.push($createQuoteNode().append($createTextNode(details.plot)));
  }

  return nodes;
}

/**
 * Prepend the movie block to an existing serialized Lexical body using a
 * headless editor, returning the new body and its plain-text projection.
 */
export function buildMovieBody(
  body: string,
  payload: MoviePayload,
): { body: string; plain: string } {
  const editor = createHeadlessEditor({
    namespace: 'movie-enrichment',
    nodes: NOTE_NODES,
    onError: (error) => {
      console.error('Could not build the movie block', error);
    },
  });

  let parsed: ReturnType<typeof editor.parseEditorState> | null = null;
  if (body) {
    try {
      parsed = editor.parseEditorState(body);
    } catch {
      parsed = null;
    }
  }
  if (parsed) editor.setEditorState(parsed);

  editor.update(
    () => {
      const root = $getRoot();
      if (!parsed) root.clear();
      root.splice(0, 0, buildMovieNodes(payload));
    },
    { discrete: true },
  );

  const state = editor.getEditorState();
  return {
    body: JSON.stringify(state.toJSON()),
    plain: state.read(() => $getRoot().getTextContent()).trim(),
  };
}
