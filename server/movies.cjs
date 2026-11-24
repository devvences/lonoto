/*
 * Server-side OMDb proxy. The API key stays in the server environment and is
 * never sent to the browser.
 *
 * This file is used directly by the local dev server and is inlined into the
 * Lambda function by scripts/render-template.mjs during deployment. Keep it
 * dependency-free and CommonJS so Lambda's inline ZipFile entry point works.
 */

'use strict';

const OMDB_ENDPOINT = 'https://www.omdbapi.com/';
const REQUEST_TIMEOUT = 12_000;
const MAX_QUERY_LENGTH = 120;

class MovieApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
    body: JSON.stringify(body),
  };
}

function header(headers, name) {
  if (!headers) return '';
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return String(value ?? '');
  }
  return '';
}

function poster(value) {
  return value && value !== 'N/A' ? value : '';
}

function text(value) {
  return value && value !== 'N/A' ? value : '';
}

async function omdbGet(params, apiKey) {
  const url = new URL(OMDB_ENDPOINT);
  url.searchParams.set('apikey', apiKey);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  let response;
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new MovieApiError(
        504,
        'The movie service took too long to answer. Try again.',
      );
    }
    console.error('OMDb request failed', error?.message ?? error);
    throw new MovieApiError(
      502,
      'Could not reach the movie service. Try again in a moment.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new MovieApiError(
      502,
      `The movie service returned ${response.status}.`,
    );
  }

  try {
    return await response.json();
  } catch {
    throw new MovieApiError(502, 'The movie service returned an invalid reply.');
  }
}

function omdbFailure(data, scope) {
  const message = typeof data?.Error === 'string' ? data.Error : '';
  if (/invalid api key/i.test(message)) {
    return new MovieApiError(
      502,
      'Movie lookup is not configured correctly on this server.',
    );
  }
  if (/request limit/i.test(message)) {
    return new MovieApiError(
      429,
      'The movie service is over its daily limit. Try again later.',
    );
  }
  if (scope === 'search') {
    return null; // An empty search is a normal result, not an error.
  }
  return new MovieApiError(404, 'No movie matched that IMDb id.');
}

async function search(apiKey, query) {
  const data = await omdbGet({ s: query, type: 'movie' }, apiKey);
  if (data?.Response === 'False') {
    const failure = omdbFailure(data, 'search');
    if (failure) throw failure;
    return [];
  }
  const items = Array.isArray(data?.Search) ? data.Search : [];
  return items
    .filter((item) => item && item.imdbID && item.Title)
    .map((item) => ({
      imdbID: item.imdbID,
      title: item.Title,
      year: item.Year || '',
      poster: poster(item.Poster),
    }));
}

async function details(apiKey, imdbID) {
  const data = await omdbGet({ i: imdbID, plot: 'short' }, apiKey);
  if (data?.Response === 'False') {
    throw omdbFailure(data, 'details');
  }
  return {
    imdbID: data?.imdbID || imdbID,
    title: data?.Title || 'Untitled movie',
    year: data?.Year || '',
    rated: text(data?.Rated),
    runtime: text(data?.Runtime),
    genre: text(data?.Genre),
    director: text(data?.Director),
    actors: text(data?.Actors),
    plot: text(data?.Plot),
    imdbRating: text(data?.imdbRating),
    imdbVotes: text(data?.imdbVotes),
    poster: poster(data?.Poster),
    released: text(data?.Released),
  };
}

async function handle(event) {
  const method =
    event?.requestContext?.http?.method || event?.httpMethod || 'GET';
  if (method !== 'GET') {
    return json(405, { error: 'Method not allowed.' });
  }

  const expectedSecret = (process.env.MOVIE_ORIGIN_SECRET || '').trim();
  if (
    expectedSecret &&
    header(event?.headers, 'x-origin-secret') !== expectedSecret
  ) {
    return json(403, { error: 'Forbidden.' });
  }

  const apiKey = (process.env.OMDB_API_KEY || '').trim();
  if (!apiKey) {
    return json(503, {
      error: 'Movie lookup is not configured on this server.',
    });
  }

  const params = event?.queryStringParameters || {};
  const query = String(params.query || '').trim();
  const imdbID = String(params.id || '').trim();

  if (!query && !imdbID) {
    return json(400, { error: 'Provide a movie query or IMDb id.' });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return json(400, { error: 'That movie search is too long.' });
  }
  if (imdbID && !/^tt\d{5,10}$/i.test(imdbID)) {
    return json(400, { error: 'That IMDb id is not valid.' });
  }

  try {
    if (imdbID) {
      return json(200, { movie: await details(apiKey, imdbID) });
    }
    return json(200, { results: await search(apiKey, query) });
  } catch (error) {
    if (error instanceof MovieApiError) {
      return json(error.status, { error: error.message });
    }
    console.error('Movie API failed', error?.message ?? error);
    return json(500, { error: 'Movie lookup failed unexpectedly.' });
  }
}

exports.handler = async (event) => handle(event);
exports.handle = handle;
