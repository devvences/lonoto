import type { LinkMatcher } from '@lexical/react/LexicalAutoLinkPlugin';

const URL_REGEX =
  /((https?:\/\/|www\.)[^\s<]+[^\s<.,:;"')\]\s])/i;
const EMAIL_REGEX = /([\w.+-]+@[\w-]+\.[\w.-]+)/i;

export const AUTO_LINK_MATCHERS: LinkMatcher[] = [
  (text) => {
    const match = URL_REGEX.exec(text);
    if (!match) return null;
    const raw = match[0];
    return {
      index: match.index,
      length: raw.length,
      text: raw,
      url: raw.startsWith('www.') ? `https://${raw}` : raw,
    };
  },
  (text) => {
    const match = EMAIL_REGEX.exec(text);
    if (!match) return null;
    return {
      index: match.index,
      length: match[0].length,
      text: match[0],
      url: `mailto:${match[0]}`,
    };
  },
];
