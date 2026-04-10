import { CompletionItem, 
  PYTHON_KEYWORDS, 
  PYTHON_BUILTINS, 
  PYTHON_LIST_METHODS,
  PYTHON_DICT_METHODS,
  PYTHON_STR_METHODS,
  PYTHON_SET_METHODS,
  PYTHON_FILE_METHODS,
  PYTHON_MAGIC_METHODS,
  getCompletionsForImports,
  STANDARD_LIBRARY_COMPLETIONS } from '../data/pythonCompletions';

export interface VariableInfo {
  name: string;
  type: string;
  detail: string;
}

export function extractVariables(code: string): VariableInfo[] {
  const variables: VariableInfo[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) continue;
    
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=/);
    if (assignMatch) {
      const varName = assignMatch[1];
      let inferredType = 'variable';
      
      const valueMatch = trimmed.match(/=\s*(.+)$/);
      if (valueMatch) {
        const value = valueMatch[1].trim();
        if (value.startsWith('[')) inferredType = 'list';
        else if (value.startsWith('{')) inferredType = 'dict';
        else if (value.startsWith('(')) inferredType = 'tuple';
        else if (value === 'True' || value === 'False') inferredType = 'bool';
        else if (value === 'None') inferredType = 'None';
        else if (value.match(/^["']/)) inferredType = 'str';
        else if (value.match(/^\d+\.?\d*$/)) inferredType = 'number';
        else if (value.includes('(') && !value.includes('=')) inferredType = 'function';
        else if (value.startsWith('open(')) inferredType = 'file';
        else if (value.startsWith('{"')) inferredType = 'dict';
        else if (value.startsWith('[')) inferredType = 'list';
      }
      
      if (!variables.find(v => v.name === varName)) {
        variables.push({ name: varName, type: inferredType, detail: `local ${inferredType}` });
      }
    }
  }
  
  return variables;
}

export function extractImports(code: string): { name: string; module: string }[] {
  const imports: { name: string; module: string }[] = [];
  const lines = code.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) continue;
    
    const fromMatch = trimmed.match(/^from\s+([a-zA-Z_][\w.]*)\s+import\s+(.+)$/);
    if (fromMatch) {
      const module = fromMatch[1];
      const imported = fromMatch[2].split(',').map(s => s.trim());
      for (const name of imported) {
        const cleanName = name.replace(/ as \w+/, '').trim();
        if (cleanName !== '*') {
          imports.push({ name: cleanName, module });
        }
      }
      continue;
    }
    
    const importMatch = trimmed.match(/^import\s+(.+)$/);
    if (importMatch) {
      const modules = importMatch[1].split(',').map(s => s.trim().split(' as ')[0].trim());
      for (const mod of modules) {
        const parts = mod.split('.');
        const name = parts[0];
        if (!imports.find(i => i.name === name)) {
          imports.push({ name, module: name });
        }
      }
    }
  }
  
  return imports;
}

export function getVariableMethods(varType: string): CompletionItem[] {
  const methodMap: Record<string, CompletionItem[]> = {
    'list': PYTHON_LIST_METHODS,
    'dict': PYTHON_DICT_METHODS,
    'str': PYTHON_STR_METHODS,
    'set': PYTHON_SET_METHODS,
    'file': PYTHON_FILE_METHODS,
  };
  
  return methodMap[varType] || [];
}

export function isInsideClass(code: string, pos: number): boolean {
  const lines = code.slice(0, pos).split('\n');
  let inClass = false;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('class ')) {
      inClass = true;
      break;
    }
    if (line.match(/^def\s/) && !line.startsWith('class ')) {
      break;
    }
  }
  
  return inClass;
}

export function getPythonCompletions(
  code: string, 
  cursorPosition: number,
  prefix: string
): CompletionItem[] {
  const results: CompletionItem[] = [];
  
  const imports = extractImports(code);
  const variables = extractVariables(code);
  const inClass = isInsideClass(code, cursorPosition);
  const isMagic = prefix.startsWith('__');
  
  results.push(...PYTHON_KEYWORDS);
  results.push(...PYTHON_BUILTINS);
  
  const importCompletions = getCompletionsForImports(imports.map(i => i.module));
  results.push(...importCompletions);
  
  for (const variable of variables) {
    if (variable.name.toLowerCase().startsWith(prefix.toLowerCase())) {
      results.push({
        label: variable.name,
        type: variable.type === 'function' ? 'function' : 'property',
        detail: variable.detail,
      });
      
      const methods = getVariableMethods(variable.type);
      for (const method of methods) {
        if (method.label.toLowerCase().startsWith(prefix.toLowerCase())) {
          results.push({
            ...method,
            label: `${variable.name}.${method.label}`,
          });
        }
      }
    }
  }
  
  if (inClass || isMagic) {
    results.push(...PYTHON_MAGIC_METHODS);
  }
  
  const moduleNames = Object.keys(STANDARD_LIBRARY_COMPLETIONS);
  for (const modName of moduleNames) {
    if (modName.toLowerCase().startsWith(prefix.toLowerCase())) {
      results.push({
        label: modName,
        type: 'module',
        detail: `${modName} module`,
      });
    }
  }
  
  return results.filter(item => 
    item.label.toLowerCase().startsWith(prefix.toLowerCase())
  ).slice(0, 30);
}