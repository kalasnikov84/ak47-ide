import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../stores/settingsStore';

export interface PyrightCompletion {
  label: string;
  insertText?: string;
  kind?: number;
  detail?: string;
  documentation?: string;
  sortText?: string;
}

export type PyrightStatus = 'idle' | 'loading' | 'ready' | 'error' | 'disabled';

interface PyrightCache {
  [key: string]: PyrightCompletion[];
}

export function usePyright(filePath: string | null) {
  const settings = useSettingsStore((s) => s.settings);
  const [status, setStatus] = useState<PyrightStatus>('idle');
  const cacheRef = useRef<PyrightCache>({});
  const versionRef = useRef(1);
  const isInitializedRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const enabled = settings.pyright?.enabled ?? true;
  const pythonPath = settings.pyright?.pythonPath || 'python3';

  const getCacheKey = (line: number, col: number) => `${filePath}:${line}:${col}`;

  const checkInstalled = useCallback(async () => {
    if (!enabled) {
      setStatus('disabled');
      return false;
    }
    try {
      let installed = await invoke<boolean>('check_pyright_installed');
      
      if (!installed) {
        installed = await invoke<boolean>('check_and_install_pyright');
      }
      
      if (installed) {
        setStatus('idle');
        return true;
      }
      setStatus('error');
      return false;
    } catch {
      setStatus('error');
      return false;
    }
  }, [enabled]);

  const openDocument = useCallback(async (content: string) => {
    if (!filePath || !enabled) return;
    
    try {
      await invoke('pyright_open_document', {
        filePath,
        content,
        pythonPath: pythonPath || null,
      });
      isInitializedRef.current = true;
      setStatus('ready');
    } catch (e) {
      console.error('Failed to open document:', e);
      setStatus('error');
    }
  }, [filePath, enabled, pythonPath]);

  const changeDocument = useCallback(async (content: string) => {
    if (!filePath || !enabled || !isInitializedRef.current) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      try {
        versionRef.current += 1;
        await invoke('pyright_change_document', {
          filePath,
          content,
          version: versionRef.current,
        });
      } catch (e) {
        console.error('Failed to change document:', e);
      }
    }, 300);
  }, [filePath, enabled]);

  const requestCompletions = useCallback(async (line: number, column: number, content: string): Promise<PyrightCompletion[]> => {
    if (!filePath || !enabled) return [];

    const cacheKey = getCacheKey(line, column);
    if (cacheRef.current[cacheKey]) {
      return cacheRef.current[cacheKey];
    }

    setStatus('loading');

    try {
      if (!isInitializedRef.current) {
        await openDocument(content);
      }

      const result = await invoke<{ items: PyrightCompletion[] }>('pyright_get_completions', {
        filePath,
        content,
        line,
        column,
        pythonPath: pythonPath || null,
      });

      const items = result?.items || [];
      cacheRef.current[cacheKey] = items;
      
      if (items.length > 0) {
        setStatus('ready');
      } else {
        setStatus('idle');
      }
      
      return items;
    } catch (e) {
      console.error('Failed to get completions:', e);
      setStatus('error');
      return [];
    }
  }, [filePath, enabled, pythonPath, openDocument]);

  const closeDocument = useCallback(async () => {
    if (!filePath || !enabled) return;
    
    try {
      await invoke('pyright_close_document', { filePath });
      isInitializedRef.current = false;
      cacheRef.current = {};
      versionRef.current = 1;
      setStatus('idle');
    } catch (e) {
      console.error('Failed to close document:', e);
    }
  }, [filePath, enabled]);

  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  useEffect(() => {
    checkInstalled();
  }, [checkInstalled]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    status,
    requestCompletions,
    openDocument,
    changeDocument,
    closeDocument,
    clearCache,
    enabled,
  };
}
