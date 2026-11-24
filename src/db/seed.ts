import { createHeadlessEditor } from '@lexical/headless';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
} from 'lexical';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import {
  $createListItemNode,
  $createListNode,
  type ListType,
} from '@lexical/list';
import { $createCodeNode } from '@lexical/code';
import { $createLinkNode } from '@lexical/link';
import type { Note } from '../types';
import { ORDER_STEP, db } from './db';
import { $createImageNode } from '../editor/nodes/ImageNode';
import { NOTE_NODES } from '../editor/nodes';
import { uid } from '../lib/id';

function paragraph(...parts: Array<string | ReturnType<typeof $createLinkNode>>) {
  const node = $createParagraphNode();
  for (const part of parts) {
    node.append(typeof part === 'string' ? $createTextNode(part) : part);
  }
  return node;
}

function heading(tag: 'h1' | 'h2' | 'h3', text: string) {
  return $createHeadingNode(tag).append($createTextNode(text));
}

function list(
  type: ListType,
  items: Array<string | [string, boolean]>,
) {
  const node = $createListNode(type);
  for (const entry of items) {
    const [text, checked] = Array.isArray(entry) ? entry : [entry, false];
    const item = $createListItemNode();
    item.append($createTextNode(text));
    if (type === 'check') item.setChecked(checked);
    node.append(item);
  }
  return node;
}

function code(text: string, language = 'plain') {
  return $createCodeNode(language).append($createTextNode(text));
}

function linkParagraph(label: string, url: string, suffix = '') {
  const link = $createLinkNode(url);
  link.append($createTextNode(label));
  return paragraph(link, suffix);
}

function image(src: string, alt: string) {
  return $createImageNode(src, alt);
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function flanArt(): string {
  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22344f"/><stop offset="1" stop-color="#101a2a"/>
    </linearGradient>
    <linearGradient id="flan" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#e08b2f"/>
    </linearGradient>
  </defs>
  <rect width="640" height="420" fill="url(#bg)"/>
  <circle cx="320" cy="330" r="210" fill="#ffffff" opacity="0.05"/>
  <ellipse cx="320" cy="335" rx="200" ry="46" fill="#f3ead8"/>
  <ellipse cx="320" cy="329" rx="174" ry="34" fill="#fffaf0"/>
  <path d="M212 316 Q220 198 320 188 Q420 198 428 316 Z" fill="url(#flan)"/>
  <path d="M212 306 Q250 288 282 302 Q314 316 346 300 Q382 282 428 302 L428 318 Q382 300 346 316 Q314 332 282 318 Q250 304 212 318 Z" fill="#b35f1c" opacity="0.72"/>
  <ellipse cx="320" cy="188" rx="66" ry="16" fill="#ffe2a8"/>
  <circle cx="320" cy="188" r="9" fill="#a8471d"/>
  <text x="320" y="392" text-anchor="middle" font-family="Georgia, serif" font-size="26" fill="#f4e4c6" letter-spacing="6">FIAN</text>
</svg>`);
}

function diggerPoster(): string {
  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b5a43"/><stop offset="1" stop-color="#173426"/>
    </linearGradient>
  </defs>
  <rect width="600" height="800" fill="url(#bg)"/>
  <rect x="26" y="26" width="548" height="748" fill="none" stroke="#e9d9a7" stroke-width="3" opacity="0.65"/>
  <text x="300" y="132" text-anchor="middle" font-family="Georgia, serif" font-size="82" font-weight="bold" fill="#ffd08a" letter-spacing="4">DIGGER</text>
  <text x="300" y="178" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="16" fill="#e9d9a7" letter-spacing="5">SOMETHING IS UNDER THE SOIL</text>
  <circle cx="300" cy="420" r="150" fill="#c46a3a" opacity="0.9"/>
  <ellipse cx="300" cy="505" rx="120" ry="34" fill="#7c3b20"/>
  <rect x="258" y="300" width="84" height="96" rx="34" fill="#f0c9a2"/>
  <path d="M250 392 Q300 350 350 392 L370 540 Q300 570 230 540 Z" fill="#8e3f28"/>
  <rect x="382" y="330" width="14" height="250" rx="7" fill="#d9b77e" transform="rotate(12 389 455)"/>
  <path d="M388 575 l-34 44 l56 -6 z" fill="#b7b7b7"/>
  <text x="300" y="700" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#f4e4c6" letter-spacing="4">ONLY IN THEATERS</text>
  <text x="300" y="730" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" fill="#cdbf95" letter-spacing="2">A DARK COMEDY ABOUT DIGGING TOO DEEP</text>
</svg>`);
}

function diagramArt(): string {
  return svgDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="460" viewBox="0 0 900 460">
  <rect width="900" height="460" fill="#f4e4c6"/>
  <g font-family="Helvetica, Arial, sans-serif" font-size="15" fill="#342818">
    <rect x="40" y="60" width="180" height="64" rx="10" fill="#fffaf0" stroke="#8b6a3c"/>
    <text x="130" y="97" text-anchor="middle">Offer request</text>
    <rect x="40" y="220" width="180" height="64" rx="10" fill="#fffaf0" stroke="#8b6a3c"/>
    <text x="130" y="257" text-anchor="middle">Rate refresh</text>
    <rect x="330" y="140" width="200" height="72" rx="10" fill="#ffe1b0" stroke="#a35b1d"/>
    <text x="430" y="181" text-anchor="middle">Pricing service</text>
    <rect x="640" y="60" width="210" height="64" rx="10" fill="#fffaf0" stroke="#8b6a3c"/>
    <text x="745" y="97" text-anchor="middle">Stcc group</text>
    <rect x="640" y="220" width="210" height="64" rx="10" fill="#fffaf0" stroke="#8b6a3c"/>
    <text x="745" y="257" text-anchor="middle">Payload builder</text>
    <path d="M220 92 H330 V160" fill="none" stroke="#7a5a32" stroke-width="2"/>
    <path d="M220 252 H330 V192" fill="none" stroke="#7a5a32" stroke-width="2"/>
    <path d="M530 160 H640 V92" fill="none" stroke="#7a5a32" stroke-width="2"/>
    <path d="M530 192 H640 V252" fill="none" stroke="#7a5a32" stroke-width="2"/>
    <text x="430" y="360" text-anchor="middle" fill="#7a5a32">Input payload → lanes[] → stccGroup</text>
    <text x="450" y="400" text-anchor="middle" fill="#7a5a32" font-size="13">Sketch of the refresh flow (replace with your own diagram)</text>
  </g>
</svg>`);
}

interface Sample {
  title: string;
  tags: string[];
  pinned?: boolean;
  daysAgo: number;
  build: () => void;
}

const SAMPLES: Sample[] = [
  {
    title: 'Chicken with cinnamon',
    tags: ['food', 'recipe', 'dinner'],
    pinned: true,
    daysAgo: 0,
    build: () => {
      const root = $getRoot();
      root.append(heading('h3', 'Ingredients'));
      root.append(
        list('check', [
          ['Chicken', false],
          ['Cinnamon', false],
          ['Onion', false],
          ['Garlic', false],
          ['Olive oil', false],
        ]),
      );
      root.append(heading('h3', 'Steps'));
      root.append(
        list('number', [
          'Season the chicken with salt, pepper and cinnamon.',
          'Brown the onion and garlic in olive oil.',
          'Add the chicken and cook until golden.',
          'Simmer with a splash of stock for 15 minutes.',
          'Serve with rice and a little fresh parsley.',
        ]),
      );
      root.append(paragraph('Tip: a pinch of cinnamon goes a long way.'));
    },
  },
  {
    title: 'Rice pudding',
    tags: ['food', 'dessert', 'recipe'],
    daysAgo: 1,
    build: () => {
      const root = $getRoot();
      root.append(heading('h3', 'Ingredients'));
      root.append(
        list('check', [
          ['Rice', false],
          ['Condensed milk', false],
          ['Vanilla', false],
          ['Cinnamon stick', false],
          ['Ground cinnamon', false],
          ['Milk', false],
          ['Nuts', false],
        ]),
      );
      root.append(heading('h3', 'Steps'));
      root.append(
        list('number', [
          'Cook the rice with the cinnamon stick until tender.',
          'Add milk and condensed milk and simmer slowly.',
          'Finish with ground cinnamon and toasted nuts.',
        ]),
      );
      root.append(
        paragraph(
          'Cooking notes: keep stirring so the bottom does not catch. ',
        ),
      );
    },
  },
  {
    title: 'Fian',
    tags: ['food', 'dessert', 'recipe'],
    daysAgo: 2,
    build: () => {
      const root = $getRoot();
      root.append(image(flanArt(), 'Homemade flan with caramel'));
      root.append(heading('h3', 'Ingredients'));
      root.append(
        list('check', [
          ['6 eggs', false],
          ['1/2 can condensed milk', false],
          ['Vanilla', false],
          ['Cinnamon powder', false],
        ]),
      );
      root.append(heading('h3', 'Steps'));
      root.append(
        list('number', [
          'Make a caramel with sugar and pour it into the mold.',
          'Blend eggs, milk and vanilla until smooth.',
          'Bake in a water bath until just set.',
          'Cool completely before flipping onto a plate.',
        ]),
      );
    },
  },
  {
    title: 'Digger',
    tags: ['movie', 'important'],
    daysAgo: 3,
    build: () => {
      const root = $getRoot();
      root.append(image(diggerPoster(), 'Digger movie poster'));
      root.append(
        paragraph(
          'A dark comedy about a man who digs one hole too many. ',
          (() => {
            const imdb = $createLinkNode('https://www.imdb.com/');
            imdb.append($createTextNode('IMDb 7.5/10'));
            return imdb;
          })(),
        ),
      );
      root.append(
        paragraph(
          (() => {
            const rt = $createLinkNode('https://www.rottentomatoes.com/');
            rt.append($createTextNode('Rotten Tomatoes 52%'));
            return rt;
          })(),
        ),
      );
      root.append(heading('h3', 'Watch list'));
      root.append(
        list('check', [
          ['Watch the trailer', false],
          ['Mark as seen', false],
        ]),
      );
      root.append($createQuoteNode().append($createTextNode('“The soil remembers.”')));
    },
  },
  {
    title: 'IP Suggested rate refresh',
    tags: ['work', 'ip', 'jira', '2026-11-02t17:00'],
    daysAgo: 4,
    build: () => {
      const root = $getRoot();
      root.append(
        linkParagraph(
          'Jira: PAIR-1378',
          'https://www.atlassian.com/software/jira',
          ' — refresh the suggested rate for IP 88.',
        ),
      );
      root.append(
        paragraph(
          'The offer clone endpoint returns lanes with a stccGroup. The refresh job should rebuild the payload, recalculate the rate and keep the original stccGroup when no override exists.',
        ),
      );
      root.append(image(diagramArt(), 'Flow diagram for the rate refresh'));
      root.append(heading('h3', 'Payload sample'));
      root.append(
        code(
          `{
  "lanes": [
    {
      "laneId": "IP0001",
      "rateRequestId": "RR-26-08-12-1863",
      "annualCarloads": 50,
      "stcc": "261135",
      "notes": ["0100", "0711", "1249", "1736", "W596"],
      "equipmentOwnership": "S",
      "equipmentType": "BX",
      "originLocationGroup": {
        "name": "FT MCPHERSON",
        "state": "GA",
        "groupNumber": 908766
      }
    }
  ]
}`,
          'json',
        ),
      );
      root.append(heading('h3', 'Acceptance criteria'));
      root.append(
        list('check', [
          ['Refresh returns the same stccGroup', false],
          ['Suggested rate is recalculated', false],
          ['Add a regression test for IP 88', false],
        ]),
      );
    },
  },
  {
    title: 'TO DO',
    tags: ['work', 'todo'],
    daysAgo: 5,
    build: () => {
      const root = $getRoot();
      root.append(
        list('check', [
          ['Add description to Naveen task', true],
          ['Test refresh in test', true],
          ['Deploy refresh in QA', false],
          ['Test refresh in QA', false],
          ['Finish pricing UI refresh changes', false],
          ['Deploy pricing UI and test', false],
        ]),
      );
      root.append(
        paragraph(
          'Blocked by the pricing API deploy. Re-check the QA environment after the next release.',
        ),
      );
    },
  },
  {
    title: 'Service now ticket monday',
    tags: ['work', 'service now', 'ticket', '2026-11-03t17:00'],
    daysAgo: 6,
    build: () => {
      const root = $getRoot();
      root.append(
        linkParagraph(
          'SNOW ticket',
          'https://www.servicenow.com/',
          ' — check the request payload before the standup.',
        ),
      );
      root.append(
        code(
          `{
  "sysparm_stack": "sysparm_view",
  "sysparm_query": "active=true^assigned_to=me",
  "limit": 20
}`,
          'json',
        ),
      );
      root.append(
        paragraph(
          'Remember to attach the request id and the environment name to the ticket.',
        ),
      );
    },
  },
];

export async function seedSamples(): Promise<number> {
  const existing = await db.notes.toArray();
  const existingTitles = new Set(existing.map((note) => note.title));
  const pending = SAMPLES.filter((sample) => !existingTitles.has(sample.title));
  if (pending.length === 0) return 0;

  const editor = createHeadlessEditor({
    namespace: 'sample-seed',
    nodes: NOTE_NODES,
    onError: (error) => {
      console.error('Could not build sample note', error);
    },
  });

  const now = Date.now();
  const notes: Note[] = [];
  const maxOrder = existing.reduce(
    (max, note) => Math.max(max, note.order ?? 0),
    -ORDER_STEP,
  );

  for (const sample of pending) {
    const index = notes.length;
    editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        sample.build();
      },
      { discrete: true },
    );

    const state = editor.getEditorState();
    const body = JSON.stringify(state.toJSON());
    const plain = state.read(() => $getRoot().getTextContent()).trim();
    const createdAt = now - sample.daysAgo * 86_400_000;

    notes.push({
      id: uid(),
      title: sample.title,
      body,
      plain,
      tags: sample.tags,
      pinned: Boolean(sample.pinned),
      order: maxOrder + (index + 1) * ORDER_STEP,
      createdAt,
      updatedAt: createdAt,
    });
  }

  await db.notes.bulkAdd(notes);
  return notes.length;
}
