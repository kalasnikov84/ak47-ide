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
- Работает везде (Linux, Windows)

## Возможности

![Main](screens/главный.png)

- **Автодополнение** - Python keywords, встроенные функции, методы list/dict/str, магические методы классов, переменные из кода, импорты
- **Терминал** - встроенный вывод, запуск кода одной кнопкой
- **Темы** - 12 тем (Ayu Dark, Tokyo Night, Catppuccin и др.)
- **Настройки** - размер шрифта, табы, автосохранение
- **Файл браузер** - навигация по проекту

## Установка

### Linux (Ubuntu/Debian)
```bash
sudo dpkg -i "AK47 Python IDE_1.0.0_amd64.deb"
```

### Fedora/RHEL
```bash
sudo rpm -i "AK47 Python IDE-1.0.0-1.x86_64.rpm"
```

### Из исходников
```bash
git clone https://github.com/kalasnikov84/ak47-ide.git
cd ak47-ide
npm install
npm run tauri dev
```

## Горячие клавиши

| Действие | Клавиша |
|---------|---------|
| Запустить код | F5 |
| Сохранить | Ctrl+S |
| Настройки | Ctrl+, |
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
- Works everywhere (Linux, Windows)

## Features

- **Autocomplete** - Python keywords, built-in functions, list/dict/str methods, class magic methods, variables from code, imports
- **Terminal** - built-in output, run code with one button
- **Themes** - 12 themes (Ayu Dark, Tokyo Night, Catppuccin, etc.)
- **Settings** - font size, tabs, autosave
- **File browser** - navigate through your project

## Installation

### Linux (Ubuntu/Debian)
```bash
sudo dpkg -i "AK47 Python IDE_1.0.0_amd64.deb"
```

### Fedora/RHEL
```bash
sudo rpm -i "AK47 Python IDE-1.0.0-1.x86_64.rpm"
```

### From source
```bash
git clone https://github.com/kalasnikov84/ak47-ide.git
cd ak47-ide
npm install
npm run tauri dev
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Run code | F5 |
| Save | Ctrl+S |
| Settings | Ctrl+, |
| Toggle theme | Ctrl+Shift+T |

---

Version: 1.0.0
