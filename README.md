# AK47 Python IDE

Быстрый и легкий редактор кода для Python.

[English version below](#english)

## Почему AK47?

Хотелось простой IDE без лишнего:
- Никакой тяжёлой IDE типа PyCharm
- Никакого VS Code  
- Просто пишешь код и работаешь

Что получилось:
- Запускается мгновенно
- Всё что нужно: редактор, терминал, автодополнение
- Работает на Linux, Windows, macOS
- Встроенная защита от зависаний

## Возможности

- **Автодополнение** - Pyright для анализа типов + статические подсказки
- **Терминал** - встроенный вывод, запуск кода одной кнопкой
- **Темы** - 12 тем (Ayu Dark, Tokyo Night, Catppuccin и др.)
- **Настройки** - размер шрифта, табы, автосохранение
- **Файл браузер** - навигация по проекту
- **Auto Venv** - автоматическое создание виртуального окружения
- **Мониторинг** - защита от зависаний при высокой нагрузке CPU/RAM

## Быстрый старт

### Установка зависимостей

При первом клонировании проекта:

```bash
git clone https://github.com/kalasnikov84/ak47-ide.git
cd ak47-ide
npm install
```

**Автоматически устанавливается:**
- Pyright (для автодополнения и анализа кода)
- Все npm зависимости

### Запуск в режиме разработки

```bash
npm run tauri:dev
```

### Сборка для продакшена

```bash
# Linux
npm run tauri:build:linux

# Windows  
npm run tauri:build:windows

# Сборка для текущей платформы
npm run tauri:build
```

## Требования

- Node.js 18+
- Python 3.8+
- Rust (для сборки Tauri)

## Горячие клавиши

| Действие | Клавиша |
|---------|---------|
| Запустить код | F5 |
| Сохранить | Ctrl+S |
| Настройки | ESC |
| Сменить тему | Ctrl+Shift+T |

---

# AK47 Python IDE

Fast and lightweight code editor for Python.

## Why AK47?

Wanted a simple IDE without the bloat:
- No heavy IDE like PyCharm
- No VS Code
- Just write code and work

Result:
- Launches instantly
- Everything you need: editor, terminal, autocomplete
- Works on Linux, Windows, macOS
- Built-in freeze protection

## Features

- **Autocomplete** - Pyright for type analysis + static hints
- **Terminal** - built-in output, run code with one button
- **Themes** - 12 themes (Ayu Dark, Tokyo Night, Catppuccin, etc.)
- **Settings** - font size, tabs, autosave
- **File browser** - navigate through your project
- **Auto Venv** - automatic virtual environment creation
- **Monitoring** - freeze protection with CPU/RAM monitoring

## Quick Start

### Install Dependencies

```bash
git clone https://github.com/kalasnikov84/ak47-ide.git
cd ak47-ide
npm install
```

**Automatically installs:**
- Pyright (for autocomplete and code analysis)
- All npm dependencies

### Run in Development

```bash
npm run tauri:dev
```

### Build for Production

```bash
# Linux
npm run tauri:build:linux

# Windows
npm run tauri:build:windows

# Current platform
npm run tauri:build
```

## Requirements

- Node.js 18+
- Python 3.8+
- Rust (for Tauri build)

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Run code | F5 |
| Save | Ctrl+S |
| Settings | ESC |
| Toggle theme | Ctrl+Shift+T |

---

Version: 1.0.0