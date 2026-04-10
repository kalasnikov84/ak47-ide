import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentLess } from '@codemirror/commands';
import { syntaxHighlighting, HighlightStyle, indentOnInput, foldGutter, indentUnit } from '@codemirror/language';
import { linter } from '@codemirror/lint';
import { python } from '@codemirror/lang-python';
import { closeBrackets, closeBracketsKeymap, autocompletion, completionKeymap, acceptCompletion } from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { tags } from '@lezer/highlight';
import { useThemeStore } from '../../stores/themeStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { getPythonCompletions } from '../../utils/completions';
import {
  PYTHON_LIST_METHODS,
  PYTHON_DICT_METHODS,
  PYTHON_STR_METHODS,
  getCompletionsForImports,
} from '../../data/pythonCompletions';

interface CodeEditorProps {
  content: string;
  language: string;
  filePath?: string | null;
  onChange: (content: string) => void;
  onSave?: () => void;
}

function createPythonHighlightStyle(isDark: boolean): HighlightStyle {
  const colors = {
    keyword: isDark ? '#ff7b72' : '#cf222e',
    function: isDark ? '#d2a8ff' : '#8250df',
    className: isDark ? '#79c0ff' : '#0550ae',
    string: isDark ? '#a5d6ff' : '#0a3069',
    number: isDark ? '#79c0ff' : '#0550ae',
    comment: isDark ? '#8b949e' : '#6e7781',
    decorator: isDark ? '#ffa657' : '#bf8700',
    builtin: isDark ? '#ff7b72' : '#cf222e',
    property: isDark ? '#79c0ff' : '#0550ae',
    variable: isDark ? '#ffa657' : '#bf8700',
    operator: isDark ? '#ff7b72' : '#cf222e',
  };

  return HighlightStyle.define([
    { tag: tags.keyword, color: colors.keyword, fontWeight: 'bold' },
    { tag: tags.controlKeyword, color: colors.keyword, fontWeight: 'bold' },
    { tag: tags.moduleKeyword, color: colors.keyword, fontWeight: 'bold' },
    { tag: tags.operatorKeyword, color: colors.keyword },
    { tag: tags.operator, color: colors.operator },
    { tag: tags.punctuation, color: isDark ? '#c9d1d9' : '#24292f' },
    { tag: tags.bracket, color: isDark ? '#c9d1d9' : '#24292f' },
    { tag: tags.function(tags.variableName), color: colors.function },
    { tag: tags.function(tags.propertyName), color: colors.function },
    { tag: tags.definition(tags.variableName), color: colors.variable },
    { tag: tags.typeName, color: colors.className, fontWeight: 'bold' },
    { tag: tags.className, color: colors.className, fontWeight: 'bold' },
    { tag: tags.propertyName, color: colors.property },
    { tag: tags.comment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.lineComment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.blockComment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.string, color: colors.string },
    { tag: tags.special(tags.string), color: colors.string },
    { tag: tags.number, color: colors.number },
    { tag: tags.integer, color: colors.number },
    { tag: tags.float, color: colors.number },
    { tag: tags.bool, color: colors.keyword },
    { tag: tags.null, color: colors.keyword },
  ]);
}

function getLocalVariables(code: string): { label: string; type: string; detail: string }[] {
  const variables: { label: string; type: string; detail: string }[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=/);
    if (assignMatch) {
      const varName = assignMatch[1];
      let varType = 'variable';
      
      const valueMatch = trimmed.match(/=\s*(.+)$/);
      if (valueMatch) {
        const value = valueMatch[1];
        if (value.startsWith('[')) varType = 'list';
        else if (value.startsWith('{')) varType = 'dict';
        else if (value.match(/^["']/)) varType = 'str';
        else if (value === 'True' || value === 'False') varType = 'bool';
        else if (value.match(/^\d+\.?\d*$/)) varType = 'number';
        else if (value.includes('(') && !value.includes('=')) varType = 'function';
      }
      
      if (!variables.find(v => v.label === varName)) {
        variables.push({ label: varName, type: varType, detail: 'local variable' });
      }
    }
    
    const funcMatch = trimmed.match(/^def\s+([a-zA-Z_]\w*)\s*\(/);
    if (funcMatch && !variables.find(v => v.label === funcMatch[1])) {
      variables.push({ label: funcMatch[1], type: 'function', detail: 'function' });
    }
    
    const classMatch = trimmed.match(/^class\s+([a-zA-Z_]\w*)/);
    if (classMatch && !variables.find(v => v.label === classMatch[1])) {
      variables.push({ label: classMatch[1], type: 'class', detail: 'class' });
    }
  }
  
  return variables;
}

function getLocalImports(code: string): { label: string; module: string }[] {
  const imports: { label: string; module: string }[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    
    const fromMatch = trimmed.match(/^from\s+([a-zA-Z_][\w.]*)\s+import/);
    if (fromMatch) {
      imports.push({ label: fromMatch[1], module: fromMatch[1] });
      continue;
    }
    
    const importMatch = trimmed.match(/^import\s+(.+)$/);
    if (importMatch) {
      const modules = importMatch[1].split(',').map(s => s.trim().split(' as ')[0].trim());
      for (const mod of modules) {
        const modName = mod.split('.')[0];
        if (!imports.find(i => i.label === modName)) {
          imports.push({ label: modName, module: modName });
        }
      }
    }
  }
  
  return imports;
}

export function CodeEditor({ content, language, onChange, onSave }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const currentContentRef = useRef(content);
  const theme = useThemeStore((s) => s.currentTheme);
  const settings = useSettingsStore((s) => s.settings);

  const isDarkTheme = theme.name.includes('dark') || 
    ['monokai', 'dracula', 'nord', 'one-dark'].includes(theme.name);

  useEffect(() => {
    if (!editorRef.current) return;

    const pythonHighlight = createPythonHighlightStyle(isDarkTheme);

    const themeExtension = EditorView.theme({
      '&': {
        backgroundColor: theme.editor.bg,
        color: theme.editor.text,
        height: '100%',
      },
      '.cm-content': {
        fontFamily: `'${settings.appearance.fontFamily}', monospace`,
        fontSize: `${settings.appearance.fontSize}px`,
        caretColor: theme.editor.cursor,
        padding: '16px 0',
        lineHeight: `${settings.appearance.lineHeight}`,
      },
      '.cm-cursor': {
        borderLeftColor: theme.editor.cursor,
        borderLeftWidth: '3px',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: theme.editor.selection,
      },
      '.cm-activeLine': {
        backgroundColor: `${theme.editor.selection}40`,
        borderRadius: '4px',
      },
      '.cm-gutters': {
        backgroundColor: theme.editor.gutter,
        color: theme.editor.lineNumber,
        border: 'none',
        borderRight: `1px solid ${theme.colors.border}`,
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 16px 0 12px',
        minWidth: '50px',
        fontFamily: `'${settings.appearance.fontFamily}', monospace`,
        fontSize: `${settings.appearance.fontSize - 2}px`,
      },
      '.cm-tooltip': {
        backgroundColor: theme.colors.bg,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '8px',
      },
      '.cm-tooltip-autocomplete': {
        '& > ul': {
          fontFamily: `'${settings.appearance.fontFamily}', monospace`,
          fontSize: `${settings.appearance.fontSize}px`,
        },
        '& > ul > li': {
          padding: '8px 16px',
          borderRadius: '6px',
          margin: '2px 4px',
        },
        '& > ul > li[aria-selected]': {
          backgroundColor: theme.editor.selection,
        },
      },
      '.cm-completionLabel': {
        color: theme.colors.text,
      },
      '.cm-completionDetail': {
        color: theme.colors.textMuted,
        fontStyle: 'italic',
      },
    }, { dark: isDarkTheme });

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const newContent = update.state.doc.toString();
        if (newContent !== currentContentRef.current) {
          currentContentRef.current = newContent;
          onChange(newContent);
        }
      }
    });

    const pythonLinter = linter(() => []);

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter({ openText: '▼', closedText: '▶' }),
        history(),
        drawSelection(),
        indentOnInput(),
        highlightSelectionMatches({ minSelectionLength: 2 }),
        closeBrackets(),
        python(),
        autocompletion({ 
          activateOnTyping: true,
          maxRenderedOptions: 25,
          defaultKeymap: true,
          closeOnBlur: true,
          override: [
            (context) => {
              const code = context.state.doc.toString();
              const line = context.state.doc.lineAt(context.pos);
              const textBefore = line.text.slice(0, context.pos - line.from);
              
              const dotMatch = textBefore.match(/(\w+)\.(\w*)$/);
              if (dotMatch) {
                const objName = dotMatch[1];
                const prefix = dotMatch[2];
                const variables = getLocalVariables(code);
                const variable = variables.find(v => v.label === objName);
                
                if (variable) {
                  let methods: { label: string; type: string; detail: string }[] = [];
                  if (variable.type === 'list') methods = PYTHON_LIST_METHODS;
                  else if (variable.type === 'dict') methods = PYTHON_DICT_METHODS;
                  else if (variable.type === 'str') methods = PYTHON_STR_METHODS;
                  
                  const filtered = methods
                    .filter(m => m.label.toLowerCase().startsWith(prefix.toLowerCase()))
                    .map(m => ({ label: m.label, type: 'method' as const, detail: m.detail }));
                  
                  if (filtered.length > 0) {
                    return { from: context.pos - prefix.length, validFor: /^\w*$/, options: filtered.slice(0, 20) };
                  }
                }
                
                const imports = getLocalImports(code);
                const matchingImport = imports.find(i => i.label === objName || i.module === objName);
                if (matchingImport) {
                  const libCompletions = getCompletionsForImports([matchingImport.module]);
                  const filtered = libCompletions
                    .filter(c => c.label.toLowerCase().includes(prefix.toLowerCase()))
                    .map(c => ({ label: c.label.split('.').pop() || c.label, type: c.type, detail: c.detail }));
                  
                  if (filtered.length > 0) {
                    return { from: context.pos - prefix.length, validFor: /^\w*$/, options: filtered.slice(0, 20) };
                  }
                }
              }
              
              const lastWord = textBefore.match(/[\w]*$/)?.[0] || '';
              if (lastWord.length < 1) return null;
              
              let inString = false;
              for (let i = 0; i < textBefore.length; i++) {
                if (textBefore[i] === '"' || textBefore[i] === "'") {
                  if (i === 0 || textBefore[i-1] !== '\\') inString = !inString;
                }
              }
              if (inString) return null;
              
              const fromPos = context.pos - lastWord.length;
              const completions = getPythonCompletions(code, context.pos, lastWord);
              
              return {
                from: fromPos,
                validFor: /^\w*$/,
                options: completions.slice(0, 30),
              };
            }
          ]
        }),
        pythonLinter,
        syntaxHighlighting(pythonHighlight, { fallback: true }),
        keymap.of([
          ...completionKeymap,
          { key: 'Tab', run: acceptCompletion },
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          ...searchKeymap,
          {
            key: 'Shift-Tab',
            run: (view) => {
              const state = view.state;
              const pos = state.selection.main.head;
              const line = state.doc.lineAt(pos);
              const lineText = line.text;
              const spacesBeforeCursor = lineText.match(/^\s*/)?.[0].length || 0;
              
              if (spacesBeforeCursor > 0) {
                const tabSize = state.tabSize;
                const removeCount = Math.min(tabSize, spacesBeforeCursor);
                view.dispatch({
                  changes: { from: line.from, to: line.from + removeCount, insert: ' '.repeat(spacesBeforeCursor - removeCount) },
                });
                return true;
              }
              return indentLess(view);
            },
          },
          {
            key: 'Enter',
            run: (view) => {
              const pos = view.state.selection.main.head;
              const line = view.state.doc.lineAt(pos);
              const beforeCursor = line.text.slice(0, pos - line.from);
              
              let indent = beforeCursor.match(/^\s*/)?.[0] || '';
              if (beforeCursor.trimEnd().endsWith(':')) indent += '    ';
              
              view.dispatch({
                changes: { from: pos, insert: '\n' + indent },
                selection: { anchor: pos + 1 + indent.length }
              });
              return true;
            },
          },
          {
            key: 'Mod-s',
            run: () => { onSave?.(); return true; },
          },
        ]),
        themeExtension,
        updateListener,
        EditorState.tabSize.of(settings.appearance.tabSize),
        indentUnit.of(' '.repeat(settings.appearance.tabSize)),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;
    currentContentRef.current = content;

    return () => { view.destroy(); viewRef.current = null; };
  }, [language, settings.appearance.tabSize, settings.appearance.fontSize, settings.appearance.lineHeight, onSave, theme, isDarkTheme]);

  useEffect(() => {
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (content !== currentDoc && content !== currentContentRef.current) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: content },
        });
        currentContentRef.current = content;
      }
    }
  }, [content]);

  return <div ref={editorRef} className="h-full w-full overflow-hidden" style={{ backgroundColor: theme.editor.bg }} />;
}