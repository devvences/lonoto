import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createListItemNode,
  $isListItemNode,
  $isListNode,
  type ListNode,
} from '@lexical/list';
import {
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  type EditorState,
} from 'lexical';

interface ChecklistInfo {
  hasChecklist: boolean;
  checklistOnly: boolean;
  checkedCount: number;
}

function countChecked(list: ListNode): number {
  let count = 0;
  for (const item of list.getChildren()) {
    if (!$isListItemNode(item)) continue;
    if (item.getChecked()) count += 1;
    for (const nested of item.getChildren()) {
      if ($isListNode(nested) && nested.getListType() === 'check') {
        count += countChecked(nested);
      }
    }
  }
  return count;
}

function readInfo(state: EditorState): ChecklistInfo {
  return state.read(() => {
    const root = $getRoot();
    let hasChecklist = false;
    let checkedCount = 0;
    let onlyChecklist = true;

    for (const child of root.getChildren()) {
      if ($isListNode(child) && child.getListType() === 'check') {
        hasChecklist = true;
        checkedCount += countChecked(child);
      } else if ($isParagraphNode(child)) {
        // A trailing empty paragraph is just how Lexical pads the document.
        if (child.getTextContent().trim() !== '') onlyChecklist = false;
      } else {
        onlyChecklist = false;
      }
    }

    return {
      hasChecklist,
      checkedCount,
      checklistOnly: hasChecklist && onlyChecklist,
    };
  });
}

function sameInfo(a: ChecklistInfo, b: ChecklistInfo): boolean {
  return (
    a.hasChecklist === b.hasChecklist &&
    a.checklistOnly === b.checklistOnly &&
    a.checkedCount === b.checkedCount
  );
}

interface ChecklistToolsProps {
  onChange: (body: string, plain: string) => void;
}

/**
 * Inline checklist affordances for the board card. Rendered inside the
 * composer so edits go through the same Lexical state the preview shows.
 * The preview positions the row under the last checklist.
 */
export default function ChecklistTools({ onChange }: ChecklistToolsProps) {
  const [editor] = useLexicalComposerContext();
  const [info, setInfo] = useState<ChecklistInfo>(() =>
    readInfo(editor.getEditorState()),
  );
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      const next = readInfo(editorState);
      setInfo((previous) => (sameInfo(previous, next) ? previous : next));
    });
  }, [editor]);

  const commit = useCallback(() => {
    const state = editor.getEditorState();
    const body = JSON.stringify(state.toJSON());
    const plain = state.read(() => $getRoot().getTextContent()).trim();
    onChange(body, plain);
  }, [editor, onChange]);

  const addItem = useCallback(() => {
    const text = draft.trim();
    if (!text) return;

    editor.update(
      () => {
        const root = $getRoot();
        let target: ListNode | null = null;
        for (const child of root.getChildren()) {
          if ($isListNode(child) && child.getListType() === 'check') {
            target = child;
          }
        }
        if (!target) return;

        const item = $createListItemNode();
        item.append($createTextNode(text));
        item.setChecked(false);
        target.append(item);
      },
      { discrete: true, onUpdate: commit },
    );

    setDraft('');
    inputRef.current?.focus();
  }, [commit, draft, editor]);

  const uncheckAll = useCallback(() => {
    editor.update(
      () => {
        const root = $getRoot();
        const reset = (list: ListNode) => {
          for (const item of list.getChildren()) {
            if (!$isListItemNode(item)) continue;
            item.setChecked(false);
            for (const nested of item.getChildren()) {
              if ($isListNode(nested) && nested.getListType() === 'check') {
                reset(nested);
              }
            }
          }
        };

        for (const child of root.getChildren()) {
          if ($isListNode(child) && child.getListType() === 'check') {
            reset(child);
          }
        }
      },
      { discrete: true, onUpdate: commit },
    );
  }, [commit, editor]);

  if (!info.hasChecklist) return null;
  if (!info.checklistOnly && info.checkedCount === 0) return null;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      sx={{ minHeight: 30 }}
    >
      {info.checklistOnly ? (
        <>
          <Box
            aria-hidden
            sx={{
              width: 18,
              height: 18,
              flex: '0 0 auto',
              borderRadius: '5px',
              border: '1.5px solid',
              borderColor: 'divider',
            }}
          />
          <TextField
            inputRef={inputRef}
            variant="standard"
            placeholder="Add item…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                addItem();
              }
            }}
            slotProps={{
              htmlInput: {
                'aria-label': 'Add checklist item',
              },
            }}
            sx={{
              flex: 1,
              minWidth: 0,
              '& .MuiInputBase-root': { fontSize: { xs: 14.5, sm: 15 } },
              '& .MuiInputBase-input': { py: 0.25 },
              '& .MuiInputBase-input::placeholder': {
                color: 'text.disabled',
                opacity: 1,
              },
              '& .MuiInput-underline:before': {
                borderBottomColor: 'divider',
              },
            }}
          />
          <Tooltip title="Add item">
            <span>
              <IconButton
                aria-label="Add checklist item"
                size="small"
                onClick={addItem}
                disabled={!draft.trim()}
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <AddRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </>
      ) : null}

      {info.checkedCount > 0 ? (
        <Tooltip title="Uncheck every checklist item">
          <Button
            size="small"
            startIcon={<RestartAltRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={uncheckAll}
            sx={{
              flex: '0 0 auto',
              minWidth: 0,
              px: 0.75,
              fontSize: 12,
              whiteSpace: 'nowrap',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main' },
            }}
          >
            Uncheck all
          </Button>
        </Tooltip>
      ) : null}
    </Stack>
  );
}
