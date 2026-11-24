import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  PASTE_COMMAND,
  createCommand,
} from 'lexical';
import { DRAG_DROP_PASTE } from '@lexical/rich-text';
import { $findMatchingParent, $insertNodeToNearestRoot, mergeRegister } from '@lexical/utils';
import { $isCodeNode } from '@lexical/code';
import { $createImageNode } from '../nodes/ImageNode';
import { prepareImage } from '../../lib/image';

export interface ImagePayload {
  src: string;
  alt: string;
}

export const INSERT_IMAGE_COMMAND = createCommand<ImagePayload>(
  'INSERT_IMAGE_COMMAND',
);

interface ImagesPluginProps {
  onError?: (message: string) => void;
}

export default function ImagesPlugin({ onError }: ImagesPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const insertFiles = async (files: File[]) => {
      const images = files.filter((file) => file.type.startsWith('image/'));
      for (const file of images) {
        try {
          const prepared = await prepareImage(file);
          editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
            src: prepared.src,
            alt: prepared.alt,
          });
        } catch (error) {
          onError?.(
            error instanceof Error ? error.message : 'Could not add that image.',
          );
        }
      }
    };

    return mergeRegister(
      editor.registerCommand(
        INSERT_IMAGE_COMMAND,
        (payload) => {
          const image = $createImageNode(payload.src, payload.alt);
          const selection = $getSelection();
          const codeNode =
            $isRangeSelection(selection) &&
            $findMatchingParent(selection.anchor.getNode(), $isCodeNode);
          if (codeNode) {
            // Keep the code block intact; place the image right after it.
            codeNode.insertAfter(image);
          } else if ($isRangeSelection(selection)) {
            $insertNodeToNearestRoot(image);
          } else {
            $getRoot().append(image);
          }
          const paragraph = $createParagraphNode();
          image.insertAfter(paragraph);
          paragraph.select();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        DRAG_DROP_PASTE,
        (files) => {
          const images = files.filter((file) =>
            file.type.startsWith('image/'),
          );
          if (images.length === 0) return false;
          void insertFiles(images);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const clipboardEvent = event as ClipboardEvent;
          const files = Array.from(
            clipboardEvent.clipboardData?.files ?? [],
          ).filter((file) => file.type.startsWith('image/'));
          if (files.length === 0) return false;
          clipboardEvent.preventDefault();
          void insertFiles(files);
          return true;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, onError]);

  return null;
}
