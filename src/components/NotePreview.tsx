import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { Box, IconButton, Tooltip, Typography, alpha, useTheme } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { $getNearestNodeFromDOMNode, $getRoot } from 'lexical';
import { $isListItemNode } from '@lexical/list';
import { NOTE_NODES } from '../editor/nodes';
import { lexicalTheme } from '../editor/lexical-theme';
import CodeHighlightPlugin from '../editor/plugins/CodeHighlightPlugin';
import NoteLightbox, { type LightboxMedia } from './NoteLightbox';
import ChecklistTools from './ChecklistTools';

function isValidBody(body: string): boolean {
  if (!body) return false;
  try {
    const parsed = JSON.parse(body) as { root?: { children?: unknown } };
    return Boolean(parsed?.root && Array.isArray(parsed.root.children));
  } catch {
    return false;
  }
}

class PreviewErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

interface PreviewInteractionsProps {
  onChange: (body: string, plain: string) => void;
}

/**
 * Read-only editors block Lexical's built-in checklist toggling, so the board
 * preview handles checkbox clicks itself and reports the new body upwards.
 */
function PreviewInteractions({ onChange }: PreviewInteractionsProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || target.tagName !== 'LI') {
        return;
      }
      const parent = target.parentElement;
      if (!parent || !parent.classList.contains('editor-checklist')) {
        return;
      }
      // Leave nested lists alone; their first child is another list.
      const firstChild = target.firstChild;
      if (
        firstChild instanceof HTMLElement &&
        (firstChild.tagName === 'UL' || firstChild.tagName === 'OL')
      ) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const before = window.getComputedStyle(target, '::before');
      const boxWidth = Number.parseFloat(before.width) || 0;
      const boxLeft = Number.parseFloat(before.left) || 0;
      const pointerType = (event as PointerEvent).pointerType;
      const pad = pointerType === 'touch' ? 24 : 6;
      const x = event.clientX;
      const start = rect.left + boxLeft - pad;
      const end = rect.left + boxLeft + boxWidth + pad;
      if (x < start || x > end) return;

      event.preventDefault();
      editor.update(
        () => {
          const node = $getNearestNodeFromDOMNode(target);
          if ($isListItemNode(node)) node.toggleChecked();
        },
        {
          discrete: true,
          onUpdate: () => {
            const state = editor.getEditorState();
            const body = JSON.stringify(state.toJSON());
            const plain = state.read(() => $getRoot().getTextContent()).trim();
            onChange(body, plain);
          },
        },
      );
    };

    return editor.registerRootListener((rootElement, previousRootElement) => {
      if (previousRootElement) {
        previousRootElement.removeEventListener('click', handleClick);
      }
      if (rootElement) {
        rootElement.addEventListener('click', handleClick);
      }
    });
  }, [editor, onChange]);

  return null;
}

interface NotePreviewProps {
  body: string;
  plain: string;
  onChange?: (body: string, plain: string) => void;
}

interface CodeOverlay {
  key: number;
  el: HTMLElement;
  top: number;
  left: number;
}

interface ToolsBox {
  top: number;
  left: number;
  width: number;
  visible: boolean;
}

export default function NotePreview({ body, plain, onChange }: NotePreviewProps) {
  const theme = useTheme();
  const valid = useMemo(() => isValidBody(body), [body]);
  const [media, setMedia] = useState<LightboxMedia | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [codeOverlays, setCodeOverlays] = useState<CodeOverlay[]>([]);
  const codeKeys = useRef(new WeakMap<HTMLElement, number>());
  const nextCodeKey = useRef(0);
  const toolsRef = useRef<HTMLDivElement | null>(null);
  const toolsListRef = useRef<HTMLElement | null>(null);
  const [toolsBox, setToolsBox] = useState<ToolsBox | null>(null);

  const openCode = (code: HTMLElement) => {
    setMedia({
      type: 'code',
      html: code.innerHTML,
      text: code.textContent ?? '',
      language: code.getAttribute('data-language') ?? undefined,
    });
  };

  // The code blocks are rendered by Lexical, so the expand buttons are laid
  // over them from the outside instead of being injected into the editor DOM.
  const measureCode = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const rootRect = root.getBoundingClientRect();
    const found: CodeOverlay[] = [];
    root.querySelectorAll<HTMLElement>('.editor-code').forEach((el) => {
      let key = codeKeys.current.get(el);
      if (key === undefined) {
        key = nextCodeKey.current;
        nextCodeKey.current += 1;
        codeKeys.current.set(el, key);
      }
      const rect = el.getBoundingClientRect();
      found.push({
        key,
        el,
        top: Math.round((rect.top - rootRect.top + 6) * 2) / 2,
        left: Math.round((rect.right - rootRect.left - 30) * 2) / 2,
      });
    });
    setCodeOverlays((previous) => {
      const unchanged =
        previous.length === found.length &&
        previous.every(
          (item, index) =>
            item.el === found[index].el &&
            item.top === found[index].top &&
            item.left === found[index].left,
        );
      return unchanged ? previous : found;
    });

    // The inline checklist tools render right below the last checklist.
    // Lexical owns the contenteditable, so the row is placed just outside it
    // and the list reserves matching padding for the row.
    const content = root.querySelector<HTMLElement>('.note-preview-content');
    const lists = content?.querySelectorAll<HTMLElement>(
      ':scope > .editor-checklist',
    );
    const list = lists && lists.length > 0 ? lists[lists.length - 1] : null;
    const previousList = toolsListRef.current;
    if (previousList && previousList !== list) {
      previousList.style.removeProperty('padding-bottom');
    }
    toolsListRef.current = list;

    const tools = toolsRef.current;
    if (!list || !tools) {
      list?.style.removeProperty('padding-bottom');
      setToolsBox(null);
      return;
    }

    const items = list.querySelectorAll<HTMLElement>(':scope > .editor-li');
    const lastItem = items.length > 0 ? items[items.length - 1] : list;
    const itemRect = lastItem.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const inner = tools.firstElementChild;
    const hasTools = inner instanceof HTMLElement && inner.offsetHeight > 0;
    const rowHeight = Math.ceil(tools.getBoundingClientRect().height);
    const padding = hasTools ? `${rowHeight + 4}px` : '';
    if (list.style.paddingBottom !== padding) {
      list.style.paddingBottom = padding;
    }

    const next: ToolsBox = {
      top: Math.round((itemRect.bottom - rootRect.top) * 2) / 2,
      left: Math.round((listRect.left - rootRect.left) * 2) / 2,
      width: Math.round(listRect.width * 2) / 2,
      visible: hasTools,
    };
    setToolsBox((previous) =>
      previous &&
      previous.top === next.top &&
      previous.left === next.left &&
      previous.width === next.width &&
      previous.visible === next.visible
        ? previous
        : next,
    );
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measureCode();
      });
    };

    const mutations = new MutationObserver(schedule);
    mutations.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    if (toolsRef.current) resize.observe(toolsRef.current);

    const images = Array.from(root.querySelectorAll('img'));
    images.forEach((image) => image.addEventListener('load', schedule));
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule).catch(() => {});

    schedule();

    return () => {
      mutations.disconnect();
      resize.disconnect();
      images.forEach((image) => image.removeEventListener('load', schedule));
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [measureCode, valid]);

  const handlePreviewClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const imageWrap = target.closest('.editor-image-wrap');
    if (imageWrap) {
      const image = imageWrap.querySelector('img.editor-image');
      if (image instanceof HTMLImageElement) {
        setMedia({ type: 'image', src: image.src, alt: image.alt });
      }
    }
  };

  const initialConfig = useMemo(
    () => ({
      namespace: 'note-preview',
      editable: false,
      nodes: NOTE_NODES,
      theme: lexicalTheme,
      editorState: valid ? body : undefined,
      onError: (error: Error) => {
        // A malformed note should never take the whole board down.
        console.error('Could not render note preview', error);
      },
    }),
    [body, valid],
  );

  const fallbackText = plain.replace(/\s+/g, ' ').trim();
  const fallback = (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ whiteSpace: 'pre-wrap' }}
    >
      {fallbackText
        ? `${fallbackText.slice(0, 360).trimEnd()}${
            fallbackText.length > 360 ? '…' : ''
          }`
        : 'This note has no preview.'}
    </Typography>
  );

  if (!valid) return fallback;

  return (
    <Box
      ref={containerRef}
      className="note-preview"
      onClick={handlePreviewClick}
      sx={{
        position: 'relative',
        '--note-accent': theme.palette.primary.main,
        '--note-check-border': alpha(theme.palette.text.primary, 0.42),
      }}
    >
      <PreviewErrorBoundary fallback={fallback}>
        <LexicalComposer initialConfig={initialConfig}>
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="note-content note-preview-content"
                aria-label="Note content"
              />
            }
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <CodeHighlightPlugin />
          {onChange ? (
            <>
              <PreviewInteractions onChange={onChange} />
              <Box
                ref={toolsRef}
                className="note-preview-tools"
                sx={{
                  position: 'absolute',
                  top: toolsBox?.top ?? 0,
                  left: toolsBox?.left ?? 0,
                  width: toolsBox?.width ?? '100%',
                  pt: 0.75,
                  visibility: toolsBox?.visible ? 'visible' : 'hidden',
                  pointerEvents: toolsBox?.visible ? 'auto' : 'none',
                }}
              >
                <ChecklistTools onChange={onChange} />
              </Box>
            </>
          ) : null}
        </LexicalComposer>
      </PreviewErrorBoundary>
      {codeOverlays.map(({ key, el, top, left }) => (
        <Tooltip key={key} title="Open code">
          <IconButton
            className="note-code-expand"
            aria-label="Open code in large view"
            onClick={(event) => {
              event.stopPropagation();
              openCode(el);
            }}
            sx={{
              position: 'absolute',
              top,
              left,
              zIndex: 4,
              width: 24,
              height: 24,
              p: 0,
              color: '#342818',
              bgcolor: 'rgba(52, 40, 24, 0.08)',
              border: '1px solid rgba(52, 40, 24, 0.18)',
              transition: 'background-color 120ms ease, border-color 120ms ease',
              '&:hover': {
                bgcolor: 'rgba(52, 40, 24, 0.18)',
                borderColor: 'rgba(52, 40, 24, 0.3)',
              },
              '& svg': { fontSize: 14 },
            }}
          >
            <OpenInFullRoundedIcon />
          </IconButton>
        </Tooltip>
      ))}
      <NoteLightbox media={media} onClose={() => setMedia(null)} />
    </Box>
  );
}
