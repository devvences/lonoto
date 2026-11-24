import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $isElementNode, type LexicalNode } from 'lexical';
import { $isCodeNode, registerCodeHighlighting } from '@lexical/code';

// Prism is already a dependency of @lexical/code. Register the languages we
// expose in the toolbar so highlighting works for seeded notes and pasted code.
import 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-docker';
import 'prismjs/components/prism-groovy';
import 'prismjs/components/prism-graphql';
import 'prismjs/components/prism-ini';
import 'prismjs/components/prism-nginx';
import 'prismjs/components/prism-http';

function markCodeBlocks(node: LexicalNode): void {
  if ($isCodeNode(node)) {
    node.markDirty();
    return;
  }
  if ($isElementNode(node)) {
    node.getChildren().forEach(markCodeBlocks);
  }
}

export default function CodeHighlightPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const unregister = registerCodeHighlighting(editor);

    // Highlight code that was loaded from storage, not typed in this session.
    editor.update(() => {
      markCodeBlocks($getRoot());
    });

    return unregister;
  }, [editor]);

  return null;
}
