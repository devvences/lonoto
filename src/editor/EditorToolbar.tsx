import {
  alpha,
  Box,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  useTheme,
  type SelectChangeEvent,
} from '@mui/material';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import RedoRoundedIcon from '@mui/icons-material/RedoRounded';
import FormatBoldRoundedIcon from '@mui/icons-material/FormatBoldRounded';
import FormatItalicRoundedIcon from '@mui/icons-material/FormatItalicRounded';
import FormatUnderlinedRoundedIcon from '@mui/icons-material/FormatUnderlinedRounded';
import StrikethroughSRoundedIcon from '@mui/icons-material/StrikethroughSRounded';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import FormatListBulletedRoundedIcon from '@mui/icons-material/FormatListBulletedRounded';
import FormatListNumberedRoundedIcon from '@mui/icons-material/FormatListNumberedRounded';
import ChecklistRoundedIcon from '@mui/icons-material/ChecklistRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded';
import FormatClearRoundedIcon from '@mui/icons-material/FormatClearRounded';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type TextFormatType,
} from 'lexical';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from '@lexical/rich-text';
import {
  $isListNode,
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  type ListType,
} from '@lexical/list';
import { $createCodeNode, $isCodeNode } from '@lexical/code';
import { $createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $setBlocksType } from '@lexical/selection';
import { $getNodeByKey } from 'lexical';
import { INSERT_IMAGE_COMMAND } from './plugins/ImagesPlugin';
import { prepareImage } from '../lib/image';
import LinkDialog from './LinkDialog';
import { CODE_LANGUAGES } from './codeLanguages';

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'quote' | 'code';

interface ToolbarState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  inlineCode: boolean;
  blockType: BlockType;
  listType: ListType | null;
  isLink: boolean;
  codeKey: string | null;
  codeLanguage: string;
}

const INITIAL_STATE: ToolbarState = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  inlineCode: false,
  blockType: 'paragraph',
  listType: null,
  isLink: false,
  codeKey: null,
  codeLanguage: 'plain',
};

function ToolbarButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          aria-pressed={active}
          onClick={onClick}
          sx={{
            width: 34,
            height: 34,
            color: active ? 'primary.main' : 'text.secondary',
            bgcolor: active
              ? alpha(theme.palette.primary.main, 0.14)
              : 'transparent',
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, active ? 0.2 : 0.08),
              color: active ? 'primary.main' : 'text.primary',
            },
          }}
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

interface EditorToolbarProps {
  onNotify: (message: string, severity?: 'success' | 'error' | 'info') => void;
}

export default function EditorToolbar({ onNotify }: EditorToolbarProps) {
  const [editor] = useLexicalComposerContext();
  const theme = useTheme();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ToolbarState>(INITIAL_STATE);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [linkExisting, setLinkExisting] = useState(false);

  useEffect(() => {
    const refresh = (editorState = editor.getEditorState()) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          setState((previous) => ({ ...previous, ...INITIAL_STATE }));
          return;
        }
        const anchor = selection.anchor.getNode();
        const heading = $findMatchingParent(anchor, $isHeadingNode);
        const quote = $findMatchingParent(anchor, $isQuoteNode);
        const codeNode = $findMatchingParent(anchor, $isCodeNode);
        const listNode = $findMatchingParent(anchor, $isListNode);
        const link = $findMatchingParent(anchor, $isLinkNode);

        let blockType: BlockType = 'paragraph';
        if (heading) blockType = heading.getTag() as BlockType;
        else if (quote) blockType = 'quote';
        else if (codeNode) blockType = 'code';

        setState({
          bold: selection.hasFormat('bold'),
          italic: selection.hasFormat('italic'),
          underline: selection.hasFormat('underline'),
          strikethrough: selection.hasFormat('strikethrough'),
          inlineCode: selection.hasFormat('code'),
          blockType,
          listType: listNode ? listNode.getListType() : null,
          isLink: Boolean(link),
          codeKey: codeNode ? codeNode.getKey() : null,
          codeLanguage: codeNode?.getLanguage() || 'plain',
        });
      });
    };

    refresh();
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => refresh(editorState)),
    );
  }, [editor]);

  const format = (type: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
  };

  const applyBlockType = (type: BlockType) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (type === 'code') {
        $setBlocksType(selection, () => $createCodeNode('javascript'));
        return;
      }
      $setBlocksType(selection, () => {
        switch (type) {
          case 'h1':
          case 'h2':
          case 'h3':
            return $createHeadingNode(type);
          case 'quote':
            return $createQuoteNode();
          default:
            return $createParagraphNode();
        }
      });
    });
  };

  const toggleList = (type: ListType) => {
    if (state.listType === type) {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
      return;
    }
    const command =
      type === 'check'
        ? INSERT_CHECK_LIST_COMMAND
        : type === 'number'
          ? INSERT_ORDERED_LIST_COMMAND
          : INSERT_UNORDERED_LIST_COMMAND;
    editor.dispatchCommand(command, undefined);
  };

  const clearFormatting = () => {
    if (state.listType) editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    if (state.blockType !== 'paragraph') applyBlockType('paragraph');
    if (state.bold) format('bold');
    if (state.italic) format('italic');
    if (state.underline) format('underline');
    if (state.strikethrough) format('strikethrough');
    if (state.inlineCode) format('code');
  };

  const openLinkDialog = () => {
    let url = '';
    let text = '';
    let existing = false;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const link = $findMatchingParent(selection.anchor.getNode(), $isLinkNode);
      if (link) {
        url = link.getURL();
        existing = true;
      }
      if (!selection.isCollapsed()) text = selection.getTextContent();
    });
    setLinkUrl(url);
    setLinkText(text);
    setLinkExisting(existing);
    setLinkOpen(true);
  };

  const submitLink = (url: string, text: string) => {
    let collapsed = true;
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) collapsed = selection.isCollapsed();
    });

    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const existing = $findMatchingParent(selection.anchor.getNode(), $isLinkNode);
      if (existing && collapsed) {
        existing.setURL(url);
        return;
      }
      if (collapsed) {
        const link = $createLinkNode(url);
        link.append($createTextNode(text || url));
        selection.insertNodes([link]);
      }
    });

    if (!collapsed) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    }
    setLinkOpen(false);
  };

  const removeLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    setLinkOpen(false);
  };

  const handleImageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    for (const file of files) {
      try {
        const prepared = await prepareImage(file);
        editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
          src: prepared.src,
          alt: prepared.alt,
        });
      } catch (error) {
        onNotify(
          error instanceof Error ? error.message : 'Could not add that image.',
          'error',
        );
      }
    }
  };

  const changeCodeLanguage = (event: SelectChangeEvent) => {
    if (!state.codeKey) return;
    const value = event.target.value;
    editor.update(() => {
      const node = $getNodeByKey(state.codeKey!);
      if ($isCodeNode(node)) node.setLanguage(value === 'plain' ? null : value);
    });
  };

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 64,
        zIndex: 4,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0.35,
        p: 0.7,
        mb: 2,
        borderRadius: 2.5,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.background.paper, 0.94),
        backdropFilter: 'blur(14px)',
        boxShadow:
          theme.palette.mode === 'dark'
            ? '0 10px 26px rgba(0,0,0,0.2)'
            : '0 8px 22px rgba(30,40,60,0.08)',
      }}
    >
      <ToolbarButton
        label="Undo (Ctrl/Cmd+Z)"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      >
        <UndoRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo (Ctrl/Cmd+Shift+Z)"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      >
        <RedoRoundedIcon fontSize="small" />
      </ToolbarButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.5 }} />

      <Select
        size="small"
        value={state.blockType}
        onChange={(event) => applyBlockType(event.target.value as BlockType)}
        aria-label="Block type"
        sx={{
          minWidth: 122,
          height: 34,
          fontSize: 13,
          '& .MuiSelect-select': { py: 0.7 },
        }}
      >
        <MenuItem value="paragraph">Paragraph</MenuItem>
        <MenuItem value="h1">Heading 1</MenuItem>
        <MenuItem value="h2">Heading 2</MenuItem>
        <MenuItem value="h3">Heading 3</MenuItem>
        <MenuItem value="quote">Quote</MenuItem>
        <MenuItem value="code">Code block</MenuItem>
      </Select>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.5 }} />

      <ToolbarButton
        label="Bold (Ctrl/Cmd+B)"
        active={state.bold}
        onClick={() => format('bold')}
      >
        <FormatBoldRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic (Ctrl/Cmd+I)"
        active={state.italic}
        onClick={() => format('italic')}
      >
        <FormatItalicRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline (Ctrl/Cmd+U)"
        active={state.underline}
        onClick={() => format('underline')}
      >
        <FormatUnderlinedRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strikethrough}
        onClick={() => format('strikethrough')}
      >
        <StrikethroughSRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={state.inlineCode}
        onClick={() => format('code')}
      >
        <CodeRoundedIcon fontSize="small" />
      </ToolbarButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.5 }} />

      <ToolbarButton
        label="Bulleted list"
        active={state.listType === 'bullet'}
        onClick={() => toggleList('bullet')}
      >
        <FormatListBulletedRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.listType === 'number'}
        onClick={() => toggleList('number')}
      >
        <FormatListNumberedRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        active={state.listType === 'check'}
        onClick={() => toggleList('check')}
      >
        <ChecklistRoundedIcon fontSize="small" />
      </ToolbarButton>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.5 }} />

      <ToolbarButton label="Add link" active={state.isLink} onClick={openLinkDialog}>
        <LinkRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label="Insert image"
        onClick={() => imageInputRef.current?.click()}
      >
        <ImageOutlinedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton
        label={state.blockType === 'code' ? 'Turn code block into paragraph' : 'Insert code block'}
        active={state.blockType === 'code'}
        onClick={() =>
          applyBlockType(state.blockType === 'code' ? 'paragraph' : 'code')
        }
      >
        <DataObjectRoundedIcon fontSize="small" />
      </ToolbarButton>
      <ToolbarButton label="Clear formatting" onClick={clearFormatting}>
        <FormatClearRoundedIcon fontSize="small" />
      </ToolbarButton>

      {state.codeKey ? (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.35, my: 0.5 }} />
          <Select
            size="small"
            value={state.codeLanguage}
            onChange={changeCodeLanguage}
            aria-label="Code language"
            sx={{
              minWidth: 142,
              height: 34,
              fontSize: 13,
              '& .MuiSelect-select': { py: 0.7 },
            }}
          >
            {CODE_LANGUAGES.map((language) => (
              <MenuItem key={language.value} value={language.value}>
                {language.label}
              </MenuItem>
            ))}
          </Select>
        </>
      ) : null}

      <Box sx={{ flex: 1 }} />

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = '';
          void handleImageFiles(files);
        }}
      />

      <LinkDialog
        open={linkOpen}
        initialUrl={linkUrl}
        initialText={linkText}
        existing={linkExisting}
        onClose={() => setLinkOpen(false)}
        onSubmit={submitLink}
        onRemove={removeLink}
      />
    </Box>
  );
}
