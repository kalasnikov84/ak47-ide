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

interface CodeEditorProps {
  content: string;
  language: string;
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
    { tag: tags.atom, color: colors.keyword },
    { tag: tags.definition(tags.variableName), color: colors.variable },
    { tag: tags.macroName, color: colors.decorator },
    { tag: tags.definition(tags.variableName), color: colors.variable },
    { tag: tags.special(tags.variableName), color: colors.builtin },
  ]);
}

function extractVariables(code: string): { label: string; type: string; detail: string }[] {
  const variables: { label: string; type: string; detail: string }[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) continue;
    
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=/);
    if (assignMatch) {
      const varName = assignMatch[1];
      let varType = 'variable';
      let detail = 'local variable';
      
      const valueMatch = trimmed.match(/=\s*(.+)$/);
      if (valueMatch) {
        const value = valueMatch[1];
        if (value.match(/^["']/)) varType = 'string';
        else if (value.match(/^\d+\.?\d*$/)) varType = 'number';
        else if (value === 'True' || value === 'False') varType = 'boolean';
        else if (value === 'None') varType = 'null';
        else if (value.startsWith('[')) { varType = 'array'; detail = 'list'; }
        else if (value.startsWith('{')) { varType = 'object'; detail = 'dict'; }
        else if (value.includes('(')) { varType = 'function'; detail = 'function call'; }
      }
      
      if (!variables.find(v => v.label === varName)) {
        variables.push({ label: varName, type: varType, detail });
      }
    }
    
    const funcMatch = trimmed.match(/^def\s+([a-zA-Z_]\w*)\s*\(/);
    if (funcMatch && !variables.find(v => v.label === funcMatch[1])) {
      variables.push({ label: funcMatch[1], type: 'function', detail: 'user defined function' });
    }
    
    const classMatch = trimmed.match(/^class\s+([a-zA-Z_]\w*)/);
    if (classMatch && !variables.find(v => v.label === classMatch[1])) {
      variables.push({ label: classMatch[1], type: 'class', detail: 'user defined class' });
    }
    
    const importMatch = trimmed.match(/^import\s+([a-zA-Z_]\w*)/);
    if (importMatch && !variables.find(v => v.label === importMatch[1])) {
      variables.push({ label: importMatch[1], type: 'module', detail: 'import' });
    }
    
    const fromImportMatch = trimmed.match(/^from\s+([a-zA-Z_]\w*)\s+import/);
    if (fromImportMatch && !variables.find(v => v.label === fromImportMatch[1])) {
      variables.push({ label: fromImportMatch[1], type: 'module', detail: 'from import' });
    }
  }
  
  return variables;
}

function extractImports(code: string): { label: string; type: string; detail: string }[] {
  const imports: { label: string; type: string; detail: string }[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    
    const fromMatch = trimmed.match(/^from\s+([a-zA-Z_][\w.]*)\s+import\s+(.+)$/);
    if (fromMatch) {
      const module = fromMatch[1];
      const imported = fromMatch[2].split(',').map(s => s.trim()).filter(s => s);
      for (const name of imported) {
        const actualName = name.replace(/ as \w+/, '').trim();
        if (!imports.find(i => i.label === actualName)) {
          imports.push({ label: actualName, type: 'import', detail: `from ${module}` });
        }
      }
      continue;
    }
    
    const importMatch = trimmed.match(/^import\s+(.+)$/);
    if (importMatch) {
      const modules = importMatch[1].split(',').map(s => s.trim().split(' as ')[0].trim());
      for (const mod of modules) {
        const modName = mod.split('.')[0];
        if (!imports.find(i => i.label === modName)) {
          imports.push({ label: modName, type: 'module', detail: 'import' });
        }
      }
    }
  }
  
  return imports;
}

function isInsideClass(code: string, pos: number): boolean {
  const lines = code.slice(0, pos).split('\n');
  let indentLevel = 0;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('class ')) {
      const classIndent = lines[i].search(/\S/);
      if (indentLevel <= classIndent) return true;
    }
    if (line.match(/^def\s/)) {
      const defIndent = lines[i].search(/\S/);
      if (indentLevel <= defIndent) return false;
    }
    if (line && !line.startsWith('#')) {
      const currentIndent = line.search(/\S/);
      indentLevel = currentIndent;
    }
  }
  return false;
}

const MAGIC_METHODS = [
  { label: '__init__', type: 'method', detail: 'self, *args, **kwargs' },
  { label: '__str__', type: 'method', detail: 'self' },
  { label: '__repr__', type: 'method', detail: 'self' },
  { label: '__len__', type: 'method', detail: 'self' },
  { label: '__getitem__', type: 'method', detail: 'self, key' },
  { label: '__setitem__', type: 'method', detail: 'self, key, value' },
  { label: '__delitem__', type: 'method', detail: 'self, key' },
  { label: '__call__', type: 'method', detail: 'self, *args, **kwargs' },
  { label: '__enter__', type: 'method', detail: 'self' },
  { label: '__exit__', type: 'method', detail: 'self, exc_type, exc_val, exc_tb' },
  { label: '__iter__', type: 'method', detail: 'self' },
  { label: '__next__', type: 'method', detail: 'self' },
  { label: '__contains__', type: 'method', detail: 'self, item' },
  { label: '__add__', type: 'method', detail: 'self, other' },
  { label: '__sub__', type: 'method', detail: 'self, other' },
  { label: '__mul__', type: 'method', detail: 'self, other' },
  { label: '__truediv__', type: 'method', detail: 'self, other' },
  { label: '__eq__', type: 'method', detail: 'self, other' },
  { label: '__ne__', type: 'method', detail: 'self, other' },
  { label: '__lt__', type: 'method', detail: 'self, other' },
  { label: '__le__', type: 'method', detail: 'self, other' },
  { label: '__gt__', type: 'method', detail: 'self, other' },
  { label: '__ge__', type: 'method', detail: 'self, other' },
  { label: '__hash__', type: 'method', detail: 'self' },
  { label: '__setattr__', type: 'method', detail: 'self, name, value' },
  { label: '__getattr__', type: 'method', detail: 'self, name' },
  { label: '__delattr__', type: 'method', detail: 'self, name' },
  { label: '__getattribute__', type: 'method', detail: 'self, name' },
  { label: '__new__', type: 'method', detail: 'cls, *args, **kwargs' },
  { label: '__class__', type: 'property', detail: 'class of instance' },
  { label: '__name__', type: 'property', detail: 'class name' },
  { label: '__doc__', type: 'property', detail: 'class docstring' },
  { label: '__module__', type: 'property', detail: 'module name' },
  { label: '__bases__', type: 'property', detail: 'parent classes' },
  { label: '__mro__', type: 'property', detail: 'method resolution order' },
];

const PYTHON_KEYWORDS = [
  { label: 'if', type: 'keyword' },
  { label: 'else', type: 'keyword' },
  { label: 'elif', type: 'keyword' },
  { label: 'for', type: 'keyword' },
  { label: 'while', type: 'keyword' },
  { label: 'def', type: 'keyword', detail: 'define function' },
  { label: 'class', type: 'keyword', detail: 'define class' },
  { label: 'return', type: 'keyword' },
  { label: 'import', type: 'keyword' },
  { label: 'from', type: 'keyword' },
  { label: 'as', type: 'keyword' },
  { label: 'try', type: 'keyword' },
  { label: 'except', type: 'keyword' },
  { label: 'finally', type: 'keyword' },
  { label: 'raise', type: 'keyword' },
  { label: 'pass', type: 'keyword' },
  { label: 'break', type: 'keyword' },
  { label: 'continue', type: 'keyword' },
  { label: 'with', type: 'keyword' },
  { label: 'lambda', type: 'keyword' },
  { label: 'yield', type: 'keyword' },
  { label: 'global', type: 'keyword' },
  { label: 'nonlocal', type: 'keyword' },
  { label: 'assert', type: 'keyword' },
  { label: 'del', type: 'keyword' },
  { label: 'in', type: 'keyword' },
  { label: 'not', type: 'keyword' },
  { label: 'and', type: 'keyword' },
  { label: 'or', type: 'keyword' },
  { label: 'is', type: 'keyword' },
  { label: 'None', type: 'constant' },
  { label: 'True', type: 'constant' },
  { label: 'False', type: 'constant' },
  { label: 'self', type: 'variable', detail: 'instance reference' },
];

const PYTHON_BUILTINS = [
  { label: 'print', type: 'function', detail: 'print(*objects, sep, end, file, flush)' },
  { label: 'len', type: 'function', detail: 'len(s)' },
  { label: 'range', type: 'function', detail: 'range(start, stop, step)' },
  { label: 'str', type: 'function', detail: 'str(object)' },
  { label: 'int', type: 'function', detail: 'int(x, base)' },
  { label: 'float', type: 'function', detail: 'float(x)' },
  { label: 'bool', type: 'function', detail: 'bool(x)' },
  { label: 'list', type: 'function', detail: 'list(iterable)' },
  { label: 'dict', type: 'function', detail: 'dict(**kwargs)' },
  { label: 'set', type: 'function', detail: 'set(iterable)' },
  { label: 'tuple', type: 'function', detail: 'tuple(iterable)' },
  { label: 'input', type: 'function', detail: 'input(prompt)' },
  { label: 'open', type: 'function', detail: 'open(file, mode, ...)' },
  { label: 'type', type: 'function', detail: 'type(object)' },
  { label: 'isinstance', type: 'function', detail: 'isinstance(obj, classinfo)' },
  { label: 'hasattr', type: 'function', detail: 'hasattr(obj, name)' },
  { label: 'getattr', type: 'function', detail: 'getattr(obj, name, default)' },
  { label: 'setattr', type: 'function', detail: 'setattr(obj, name, value)' },
  { label: 'delattr', type: 'function', detail: 'delattr(obj, name)' },
  { label: 'enumerate', type: 'function', detail: 'enumerate(iterable, start)' },
  { label: 'zip', type: 'function', detail: 'zip(*iterables)' },
  { label: 'map', type: 'function', detail: 'map(func, *iterables)' },
  { label: 'filter', type: 'function', detail: 'filter(function, iterable)' },
  { label: 'sorted', type: 'function', detail: 'sorted(iterable, key, reverse)' },
  { label: 'reversed', type: 'function', detail: 'reversed(seq)' },
  { label: 'sum', type: 'function', detail: 'sum(iterable, start)' },
  { label: 'min', type: 'function', detail: 'min(arg1, *args, key)' },
  { label: 'max', type: 'function', detail: 'max(arg1, *args, key)' },
  { label: 'abs', type: 'function', detail: 'abs(x)' },
  { label: 'round', type: 'function', detail: 'round(number, ndigits)' },
  { label: 'pow', type: 'function', detail: 'pow(x, y, z)' },
  { label: 'divmod', type: 'function', detail: 'divmod(a, b)' },
  { label: 'ord', type: 'function', detail: 'ord(c)' },
  { label: 'chr', type: 'function', detail: 'chr(i)' },
  { label: 'hex', type: 'function', detail: 'hex(i)' },
  { label: 'oct', type: 'function', detail: 'oct(i)' },
  { label: 'bin', type: 'function', detail: 'bin(i)' },
  { label: 'id', type: 'function', detail: 'id(object)' },
  { label: 'hash', type: 'function', detail: 'hash(object)' },
  { label: 'repr', type: 'function', detail: 'repr(object)' },
  { label: 'format', type: 'function', detail: 'format(value, format_spec)' },
  { label: 'vars', type: 'function', detail: 'vars(object)' },
  { label: 'dir', type: 'function', detail: 'dir(object)' },
  { label: 'help', type: 'function', detail: 'help(object)' },
  { label: 'callable', type: 'function', detail: 'callable(object)' },
  { label: 'issubclass', type: 'function', detail: 'issubclass(cls, classinfo)' },
  { label: 'super', type: 'function', detail: 'super() - parent class' },
  { label: 'property', type: 'function', detail: 'property(fget, fset, fdel, doc)' },
  { label: 'staticmethod', type: 'function', detail: 'staticmethod(func)' },
  { label: 'classmethod', type: 'function', detail: 'classmethod(func)' },
  { label: 'compile', type: 'function', detail: 'compile(source, filename, mode)' },
  { label: 'eval', type: 'function', detail: 'eval(expression, globals, locals)' },
  { label: 'exec', type: 'function', detail: 'exec(object, globals, locals)' },
  { label: '__import__', type: 'function', detail: '__import__(name, globals, locals, fromlist)' },
];

const PYTHON_METHODS = [
  { label: 'append', type: 'method', detail: 'list.append(x)' },
  { label: 'extend', type: 'method', detail: 'list.extend(iterable)' },
  { label: 'insert', type: 'method', detail: 'list.insert(i, x)' },
  { label: 'remove', type: 'method', detail: 'list.remove(x)' },
  { label: 'pop', type: 'method', detail: 'list.pop(i)' },
  { label: 'clear', type: 'method', detail: 'list.clear()' },
  { label: 'index', type: 'method', detail: 'list.index(x, start, end)' },
  { label: 'count', type: 'method', detail: 'list.count(x)' },
  { label: 'sort', type: 'method', detail: 'list.sort(*, key, reverse)' },
  { label: 'reverse', type: 'method', detail: 'list.reverse()' },
  { label: 'copy', type: 'method', detail: 'list.copy()' },
  { label: 'split', type: 'method', detail: 'str.split(sep, maxsplit)' },
  { label: 'join', type: 'method', detail: 'str.join(iterable)' },
  { label: 'strip', type: 'method', detail: 'str.strip([chars])' },
  { label: 'lstrip', type: 'method', detail: 'str.lstrip([chars])' },
  { label: 'rstrip', type: 'method', detail: 'str.rstrip([chars])' },
  { label: 'upper', type: 'method', detail: 'str.upper()' },
  { label: 'lower', type: 'method', detail: 'str.lower()' },
  { label: 'capitalize', type: 'method', detail: 'str.capitalize()' },
  { label: 'title', type: 'method', detail: 'str.title()' },
  { label: 'replace', type: 'method', detail: 'str.replace(old, new, count)' },
  { label: 'startswith', type: 'method', detail: 'str.startswith(prefix, start, end)' },
  { label: 'endswith', type: 'method', detail: 'str.endswith(suffix, start, end)' },
  { label: 'find', type: 'method', detail: 'str.find(sub, start, end)' },
  { label: 'rfind', type: 'method', detail: 'str.rfind(sub, start, end)' },
  { label: 'index', type: 'method', detail: 'str.index(sub, start, end)' },
  { label: 'rindex', type: 'method', detail: 'str.rindex(sub, start, end)' },
  { label: 'count', type: 'method', detail: 'str.count(sub, start, end)' },
  { label: 'isalpha', type: 'method', detail: 'str.isalpha()' },
  { label: 'isdigit', type: 'method', detail: 'str.isdigit()' },
  { label: 'isalnum', type: 'method', detail: 'str.isalnum()' },
  { label: 'isspace', type: 'method', detail: 'str.isspace()' },
  { label: 'splitlines', type: 'method', detail: 'str.splitlines(keepends)' },
  { label: 'encode', type: 'method', detail: 'str.encode(encoding, errors)' },
  { label: 'decode', type: 'method', detail: 'bytes.decode(encoding, errors)' },
  { label: 'format', type: 'method', detail: 'str.format(*args, **kwargs)' },
  { label: 'keys', type: 'method', detail: 'dict.keys()' },
  { label: 'values', type: 'method', detail: 'dict.values()' },
  { label: 'items', type: 'method', detail: 'dict.items()' },
  { label: 'get', type: 'method', detail: 'dict.get(key, default)' },
  { label: 'setdefault', type: 'method', detail: 'dict.setdefault(key, default)' },
  { label: 'update', type: 'method', detail: 'dict.update(other)' },
  { label: 'pop', type: 'method', detail: 'dict.pop(key, default)' },
  { label: 'popitem', type: 'method', detail: 'dict.popitem()' },
  { label: 'copy', type: 'method', detail: 'dict.copy()' },
  { label: 'add', type: 'method', detail: 'set.add(elem)' },
  { label: 'remove', type: 'method', detail: 'set.remove(elem)' },
  { label: 'discard', type: 'method', detail: 'set.discard(elem)' },
  { label: 'pop', type: 'method', detail: 'set.pop()' },
  { label: 'clear', type: 'method', detail: 'set.clear()' },
  { label: 'union', type: 'method', detail: 'set.union(*others)' },
  { label: 'intersection', type: 'method', detail: 'set.intersection(*others)' },
  { label: 'difference', type: 'method', detail: 'set.difference(*others)' },
  { label: 'symmetric_difference', type: 'method', detail: 'set.symmetric_difference(other)' },
  { label: 'issubset', type: 'method', detail: 'set.issubset(other)' },
  { label: 'issuperset', type: 'method', detail: 'set.issuperset(other)' },
  { label: 'isdisjoint', type: 'method', detail: 'set.isdisjoint(other)' },
  { label: 'read', type: 'method', detail: 'file.read(size)' },
  { label: 'readline', type: 'method', detail: 'file.readline(size)' },
  { label: 'readlines', type: 'method', detail: 'file.readlines(hint)' },
  { label: 'write', type: 'method', detail: 'file.write(s)' },
  { label: 'writelines', type: 'method', detail: 'file.writelines(lines)' },
  { label: 'close', type: 'method', detail: 'file.close()' },
  { label: 'seek', type: 'method', detail: 'file.seek(pos, whence)' },
  { label: 'tell', type: 'method', detail: 'file.tell()' },
  { label: 'flush', type: 'method', detail: 'file.flush()' },
];

const ALL_COMPLETIONS = [...PYTHON_KEYWORDS, ...PYTHON_BUILTINS, ...PYTHON_METHODS];

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
        letterSpacing: '0.3px',
      },
      '.cm-cursor': {
        borderLeftColor: theme.editor.cursor,
        borderLeftWidth: '3px',
      },
      '.cm-cursorLayer span': {
        animation: 'blink 1s step-end infinite',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: theme.editor.selection,
      },
      '.cm-focused .cm-selectionBackground': {
        backgroundColor: theme.editor.selection,
      },
      '.cm-activeLine': {
        backgroundColor: `${theme.editor.selection}40`,
        borderRadius: '4px',
      },
      '.cm-activeLineGutter': {
        backgroundColor: `${theme.editor.selection}30`,
      },
      '.cm-gutters': {
        backgroundColor: theme.editor.gutter,
        color: theme.editor.lineNumber,
        border: 'none',
        borderRight: `1px solid ${theme.colors.border}`,
        paddingRight: '8px',
      },
      '.cm-lineNumbers .cm-gutterElement': {
        padding: '0 16px 0 12px',
        minWidth: '50px',
        fontFamily: `'${settings.appearance.fontFamily}', monospace`,
        fontSize: `${settings.appearance.fontSize - 2}px`,
      },
      '.cm-lineNumbers .cm-gutterElement:hover': {
        color: theme.editor.lineNumberActive,
      },
      '.cm-foldGutter .cm-gutterElement': {
        padding: '0 4px',
        color: theme.colors.textMuted,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: theme.colors.bgTertiary,
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        color: theme.colors.textMuted,
      },
      '.cm-tooltip': {
        backgroundColor: theme.colors.bg,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
      '.cm-searchMatch': {
        backgroundColor: `${theme.colors.warning}50`,
        outline: `2px solid ${theme.colors.warning}`,
        borderRadius: '2px',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: theme.editor.selection,
      },
      '.cm-matchingBracket': {
        backgroundColor: `${theme.colors.accent}40`,
        outline: `2px solid ${theme.colors.accent}`,
        borderRadius: '4px',
      },
      '.cm-panels': {
        backgroundColor: theme.colors.bgSecondary,
        borderTop: `1px solid ${theme.colors.border}`,
        padding: '8px',
      },
      '.cm-line': {
        padding: '0 16px 0 0',
      },
      '.cm-scroller': {
        fontFamily: `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`,
        lineHeight: `${settings.appearance.lineHeight}`,
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

    const pythonLinter = linter((_view) => {
      return [];
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        foldGutter({
          openText: '▼',
          closedText: '▶',
        }),
        history(),
        drawSelection(),
        indentOnInput(),
        highlightSelectionMatches({
          minSelectionLength: 2,
        }),
        closeBrackets(),
        python(),
        autocompletion({ 
          activateOnTyping: true,
          maxRenderedOptions: 20,
          defaultKeymap: true,
          closeOnBlur: true,
          override: [
            (context) => {
              const code = context.state.doc.toString();
              const line = context.state.doc.lineAt(context.pos);
              const textBefore = line.text.slice(0, context.pos - line.from);
              const lastWord = textBefore.match(/[\w]*$/)?.[0] || '';
              
              let inString = false;
              for (let i = 0; i < textBefore.length; i++) {
                if (textBefore[i] === '"' || textBefore[i] === "'") {
                  if (i === 0 || textBefore[i-1] !== '\\') {
                    inString = !inString;
                  }
                }
              }
              if (inString) return null;
              
              if (lastWord.length < 1) return null;
              
              const fromPos = context.pos - lastWord.length;
              
              const variables = extractVariables(code);
              const imports = extractImports(code);
              const inClass = isInsideClass(code, context.pos);
              const isMagic = lastWord.startsWith('__');
              
              let options = [
                ...variables,
                ...imports,
                ...ALL_COMPLETIONS,
              ];
              
              if (inClass || isMagic) {
                options = [
                  ...options,
                  ...MAGIC_METHODS,
                ];
              }
              
              return {
                from: fromPos,
                validFor: /^\w*$/,
                options: options.filter(k => k.label.toLowerCase().startsWith(lastWord.toLowerCase()))
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
              const tabSize = state.tabSize;
              
              const lineStart = line.from;
              const lineText = line.text;
              const spacesBeforeCursor = lineText.match(/^\s*/)?.[0].length || 0;
              
              if (spacesBeforeCursor > 0) {
                const removeCount = Math.min(tabSize, spacesBeforeCursor);
                const newIndent = spacesBeforeCursor - removeCount;
                view.dispatch({
                  changes: { from: lineStart, to: lineStart + removeCount, insert: ' '.repeat(newIndent) },
                  selection: { anchor: pos - removeCount }
                });
                return true;
              }
              return indentLess(view);
            },
          },
          {
            key: 'Enter',
            run: (view) => {
              const state = view.state;
              const pos = state.selection.main.head;
              const line = state.doc.lineAt(pos);
              const lineText = line.text;
              
              const beforeCursor = lineText.slice(0, pos - line.from);
              const afterCursor = lineText.slice(pos - line.from);
              
              let indent = beforeCursor.match(/^\s*/)?.[0] || '';
              
              if (beforeCursor.trimEnd().endsWith(':')) {
                indent += '    '; // 4 spaces
              } else if (beforeCursor.trim() === '' && afterCursor.trim() === '') {
                return false;
              } else {
                const trimmed = beforeCursor.trimEnd();
                if (trimmed.endsWith('\\')) {
                  indent += '    ';
                }
              }
              
              view.dispatch({
                changes: { from: pos, insert: '\n' + indent },
                selection: { anchor: pos + 1 + indent.length }
              });
              return true;
            },
          },
          {
            key: 'Mod-s',
            run: () => {
              onSave?.();
              return true;
            },
          },
        ]),
        themeExtension,
        updateListener,
        EditorState.tabSize.of(settings.appearance.tabSize),
        indentUnit.of(' '.repeat(settings.appearance.tabSize)),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    currentContentRef.current = content;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, settings.appearance.tabSize, settings.appearance.fontSize, settings.appearance.lineHeight, onSave, theme, isDarkTheme]);

  useEffect(() => {
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (content !== currentDoc && content !== currentContentRef.current) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentDoc.length,
            insert: content,
          },
        });
        currentContentRef.current = content;
      }
    }
  }, [content]);

  return (
    <div
      ref={editorRef}
      className="h-full w-full overflow-hidden"
      style={{ backgroundColor: theme.editor.bg }}
    />
  );
}
