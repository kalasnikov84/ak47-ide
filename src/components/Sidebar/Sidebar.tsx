import { useState, useCallback, useEffect } from 'react';
import { useThemeStore } from '../../stores/themeStore';
import { useEditorStore } from '../../stores/editorStore';
import { getFileName } from '../../utils/helpers';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { readDir, remove, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { 
  FolderOpen, 
  Folder, 
  File,
  FileCode,
  ChevronRight,
  FolderPlus,
  FilePlus,
  Trash2,
  Search,
  RefreshCw,
  Package,
  Code2
} from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileItem[];
}

interface SidebarProps {
  onOpenFile: (path: string) => void;
  width?: number;
}

export function Sidebar({ onOpenFile, width = 260 }: SidebarProps) {
  const theme = useThemeStore((s) => s.currentTheme);
  const globalProjectPath = useEditorStore((s) => s.projectPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<string[]>([]);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; isDir: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (globalProjectPath) {
      setProjectPath(globalProjectPath);
      loadDirectory(globalProjectPath).then(setFiles);
    }
  }, [globalProjectPath]);

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileItem[]> => {
    try {
      const entries = await readDir(dirPath);
      const items: FileItem[] = [];
      for (const entry of entries) {
        if (!entry.name.startsWith('.')) {
          items.push({
            name: entry.name,
            path: dirPath + '/' + entry.name,
            isDirectory: entry.isDirectory,
          });
        }
      }
      return items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (e) {
      console.error('loadDirectory error:', e);
      return [];
    }
  }, []);

  const refreshDirectory = useCallback(async () => {
    if (projectPath) {
      setIsLoading(true);
      const entries = await loadDirectory(projectPath);
      setFiles(entries);
      setIsLoading(false);
    }
  }, [projectPath, loadDirectory]);

  const openFolder = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Open Python Project',
      });
      
      if (selected && typeof selected === 'string') {
        setProjectPath(selected);
        useEditorStore.getState().setProjectPath(selected);
        setExpandedDirs([]);
        setIsLoading(true);
        const entries = await loadDirectory(selected);
        setFiles(entries);
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Failed to open folder:', e);
      setIsLoading(false);
    }
  }, [loadDirectory]);

  const createItem = useCallback(async (parentPath: string, isDirectory: boolean) => {
    const name = prompt(isDirectory ? 'Folder name:' : 'File name (e.g., main.py):', isDirectory ? 'new_folder' : 'main.py');
    if (!name) return;
    
    try {
      const newPath = `${parentPath}/${name}`;
      if (isDirectory) {
        await mkdir(newPath, { recursive: true });
      } else {
        await writeTextFile(newPath, '# ' + name + '\n');
      }
      
      const entries = await loadDirectory(parentPath);
      if (parentPath === projectPath) {
        setFiles(entries);
      } else {
        setFiles(prev => updateFileChildren(prev, parentPath, entries));
      }
    } catch (e) {
      console.error('Failed to create:', e);
      alert('Failed to create: ' + e);
    }
  }, [loadDirectory, projectPath]);

  const deleteItem = useCallback(async (path: string, isDirectory: boolean) => {
    const itemName = getFileName(path);
    if (!confirm(`Delete "${itemName}"?`)) return;
    
    try {
      await remove(path, { recursive: isDirectory });
      if (projectPath) {
        const entries = await loadDirectory(projectPath);
        setFiles(entries);
        setExpandedDirs(prev => prev.filter(p => p !== path));
      }
    } catch (e) {
      console.error('Failed to delete:', e);
      alert('Failed to delete: ' + e);
    }
  }, [loadDirectory, projectPath]);

  const updateFileChildren = (items: FileItem[], dirPath: string, children: FileItem[]): FileItem[] => {
    return items.map((item) => {
      if (item.path === dirPath) {
        return { ...item, children };
      }
      if (item.children) {
        return { ...item, children: updateFileChildren(item.children, dirPath, children) };
      }
      return item;
    });
  };

  const handleToggleDir = useCallback(async (dirPath: string) => {
    const isExpanded = expandedDirs.includes(dirPath);
    
    if (isExpanded) {
      setExpandedDirs(prev => prev.filter(p => p !== dirPath));
    } else {
      setExpandedDirs(prev => [...prev, dirPath]);
      const children = await loadDirectory(dirPath);
      setFiles(prev => updateFileChildren(prev, dirPath, children));
    }
  }, [expandedDirs, loadDirectory]);

  const handleFileClick = useCallback(async (_e: React.MouseEvent, path: string, isDirectory: boolean) => {
    if (isDirectory) {
      await handleToggleDir(path);
    } else {
      onOpenFile(path);
    }
  }, [onOpenFile, handleToggleDir]);

  const handleContextMenu = (e: React.MouseEvent, path: string, isDir: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, path, isDir });
  };

  const renderFile = (file: FileItem, depth: number = 0) => {
    const isExpanded = expandedDirs.includes(file.path);
    const isPython = file.name.endsWith('.py');
    const Icon = file.isDirectory ? Folder : (isPython ? FileCode : File);
    const paddingLeft = 8 + depth * 14;
    const matchesSearch = searchQuery && file.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (searchQuery && !matchesSearch && !file.isDirectory) return null;

    return (
      <div key={file.path}>
        <div
          className="sidebar-file"
          style={{ paddingLeft }}
          onClick={(e) => handleFileClick(e, file.path, file.isDirectory)}
          onContextMenu={(e) => handleContextMenu(e, file.path, file.isDirectory)}
        >
          {file.isDirectory && (
            <span 
              className="w-4 flex items-center justify-center transition-transform duration-200"
              style={{ 
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                color: isExpanded ? theme.colors.accent : theme.colors.textMuted 
              }}
            >
              <ChevronRight size={14} />
            </span>
          )}
          <Icon 
            size={15} 
            className="flex-shrink-0 transition-colors duration-150"
            style={{ color: isPython ? '#3FB950' : (file.isDirectory ? theme.colors.warning : theme.colors.textMuted) }} 
          />
          <span className="text-sm truncate flex-1 transition-colors duration-150" style={{ color: theme.colors.text }}>
            {file.name}
          </span>
        </div>
        {file.isDirectory && isExpanded && (
          <div className="transition-all duration-200">
            {file.children?.map((child) => renderFile(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        className="h-full flex flex-col rounded-tr-2xl transition-all duration-300"
        style={{
          backgroundColor: theme.colors.bgSecondary,
          width: width,
          minWidth: 180,
          maxWidth: 500,
          boxShadow: `inset -1px 0 0 ${theme.colors.border}`,
        }}
      >
        <div
          className="flex items-center gap-3 px-4 py-3 border-b transition-all duration-200"
          style={{ borderColor: theme.colors.border }}
        >
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110"
            style={{ 
              background: `linear-gradient(135deg, ${theme.colors.accent}30, ${theme.colors.accent}10)`,
              boxShadow: `0 0 20px ${theme.colors.accent}20`,
            }}
          >
            <Code2 size={20} style={{ color: theme.colors.accent }} />
          </div>
          <div className="flex flex-col">
            <div className="text-sm font-black tracking-tight" style={{ color: theme.colors.text }}>
              AK47 <span style={{ color: theme.colors.accent }}>Python</span>
            </div>
            <div className="text-[10px] font-medium tracking-widest uppercase" style={{ color: theme.colors.textMuted }}>
              Lightweight IDE
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-3 py-3 border-b" style={{ borderColor: theme.colors.border }}>
          {projectPath && (
            <button
              onClick={refreshDirectory}
              className="sidebar-btn"
              style={{ color: theme.colors.textMuted }}
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
          <button
            onClick={() => projectPath ? createItem(projectPath, true) : alert('Open a project first')}
            className="sidebar-btn"
            style={{ color: theme.colors.textMuted }}
            title="New Folder"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={() => projectPath ? createItem(projectPath, false) : alert('Open a project first')}
            className="sidebar-btn"
            style={{ color: theme.colors.textMuted }}
            title="New File"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={openFolder}
            className="sidebar-btn"
            style={{ color: theme.colors.textMuted }}
            title="Open Folder"
          >
            <FolderOpen size={16} />
          </button>
        </div>

        {projectPath && (
          <div className="px-3 py-2 border-b" style={{ borderColor: theme.colors.border }}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: theme.colors.bg }}>
              <Search size={12} style={{ color: theme.colors.textMuted }} />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-xs"
                style={{ color: theme.colors.text }}
              />
            </div>
          </div>
        )}

        {projectPath && (
          <div className="px-3 py-2 text-xs truncate flex items-center gap-2" style={{ color: theme.colors.textMuted }}>
            <Folder size={12} />
            <span className="font-medium">{getFileName(projectPath)}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-1">
          {files.length === 0 && !projectPath && (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: theme.colors.bgTertiary }}>
                <FolderOpen size={32} style={{ color: theme.colors.textMuted }} />
              </div>
              <p className="text-sm text-center font-medium" style={{ color: theme.colors.textMuted }}>
                No project opened
              </p>
              <div className="flex flex-col gap-2 w-full">
                <button
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: theme.colors.accent, color: '#fff' }}
                  onClick={openFolder}
                >
                  Open Project
                </button>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div 
                    className="flex flex-col items-center p-2 rounded-lg border"
                    style={{ backgroundColor: `${theme.colors.success}10`, borderColor: theme.colors.border }}
                  >
                    <FolderPlus size={14} style={{ color: theme.colors.success }} />
                    <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>New folder</span>
                  </div>
                  <div 
                    className="flex flex-col items-center p-2 rounded-lg border"
                    style={{ backgroundColor: `${theme.colors.accent}10`, borderColor: theme.colors.border }}
                  >
                    <FilePlus size={14} style={{ color: theme.colors.accent }} />
                    <span className="text-[10px]" style={{ color: theme.colors.textMuted }}>New file</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {files.map((file) => renderFile(file))}
        </div>
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 py-1 rounded-xl shadow-xl border"
            style={{ 
              left: Math.min(contextMenu.x, window.innerWidth - 180), 
              top: contextMenu.y,
              backgroundColor: theme.colors.bg,
              borderColor: theme.colors.border,
              minWidth: 160,
            }}
          >
            <button
              className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-[--bg-tertiary] transition-colors"
              style={{ color: theme.colors.text }}
              onClick={() => {
                createItem(contextMenu.path, contextMenu.isDir);
                setContextMenu(null);
              }}
            >
              {contextMenu.isDir ? <FolderPlus size={14} /> : <FilePlus size={14} />}
              New {contextMenu.isDir ? 'Folder' : 'File'}
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-[--bg-tertiary] transition-colors"
              style={{ color: theme.colors.error }}
              onClick={() => {
                deleteItem(contextMenu.path, contextMenu.isDir);
                setContextMenu(null);
              }}
            >
              <Trash2 size={14} />
              Delete
            </button>
            {contextMenu.isDir && (
              <button
                className="w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-[--bg-tertiary] transition-colors"
                style={{ color: theme.colors.success }}
                onClick={async () => {
                  try {
                    await invoke('create_python_venv', { projectPath: contextMenu.path });
                    refreshDirectory();
                  } catch (e) {
                    console.error('Failed to create venv:', e);
                  }
                  setContextMenu(null);
                }}
              >
                <Package size={14} />
                Create venv
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
