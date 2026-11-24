import { $applyNodeReplacement, DecoratorNode, type DOMExportOutput, type EditorConfig, type LexicalNode, type NodeKey, type SerializedLexicalNode, type Spread } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useLexicalNodeSelection } from '@lexical/react/useLexicalNodeSelection';
import { $getNodeByKey } from 'lexical';
import { Box, IconButton, Tooltip } from '@mui/material';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import type { JSX } from 'react';

export type SerializedImageNode = Spread<
  {
    src: string;
    alt: string;
  },
  SerializedLexicalNode
>;

function ImageComponent({
  src,
  alt,
  nodeKey,
}: {
  src: string;
  alt: string;
  nodeKey: NodeKey;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [selected, setSelected] = useLexicalNodeSelection(nodeKey);
  const editable = editor.isEditable();

  const remove = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node) node.remove();
    });
  };

  return (
    <Box
      className={`editor-image-wrap${selected ? ' is-selected' : ''}`}
      contentEditable={false}
      onClick={(event) => {
        if (!editable) return;
        event.preventDefault();
        event.stopPropagation();
        setSelected(!selected);
      }}
      sx={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}
    >
      <img
        className="editor-image"
        src={src}
        alt={alt}
        draggable={false}
        loading="lazy"
      />
      {editable && selected ? (
        <Tooltip title="Remove image">
          <IconButton
            size="small"
            aria-label="Remove image"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              remove();
            }}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: 'rgba(10,16,28,0.82)',
              color: '#fff',
              '&:hover': { bgcolor: 'rgba(10,16,28,0.95)' },
            }}
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
}

export class ImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __alt: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__key);
  }

  constructor(src: string, alt: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__alt = alt;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('div');
    element.className = config.theme.image ?? 'editor-image-node';
    element.contentEditable = 'false';
    return element;
  }

  updateDOM(): false {
    return false;
  }

  exportDOM(): DOMExportOutput {
    const image = document.createElement('img');
    image.src = this.__src;
    image.alt = this.__alt;
    return { element: image };
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      alt: this.__alt,
    };
  }

  static importJSON(serialized: SerializedImageNode): ImageNode {
    return $createImageNode(serialized.src, serialized.alt);
  }

  isInline(): false {
    return false;
  }

  isKeyboardSelectable(): true {
    return true;
  }

  getTextContent(): string {
    return this.__alt;
  }

  getSrc(): string {
    return this.__src;
  }

  getAlt(): string {
    return this.__alt;
  }

  decorate(): JSX.Element {
    return <ImageComponent src={this.__src} alt={this.__alt} nodeKey={this.__key} />;
  }
}

export function $createImageNode(src: string, alt: string): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, alt));
}

export function $isImageNode(
  node: LexicalNode | null | undefined,
): node is ImageNode {
  return node instanceof ImageNode;
}
