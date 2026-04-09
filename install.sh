#!/bin/bash

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              AK47 Python IDE - Installer                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            echo "$ID"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

check_python() {
    echo "🔍 Checking Python..."
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
        echo "   ✓ Python $PYTHON_VERSION found"
        return 0
    elif command -v python &> /dev/null; then
        PYTHON_VERSION=$(python --version 2>&1 | awk '{print $2}')
        echo "   ✓ Python $PYTHON_VERSION found"
        return 0
    else
        echo "   ✗ Python not found. Please install Python 3.8+"
        return 1
    fi
}

check_node() {
    echo "🔍 Checking Node.js..."
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo "   ✓ Node.js $NODE_VERSION found"
        return 0
    else
        echo "   ✗ Node.js not found. Please install Node.js 18+"
        return 1
    fi
}

check_rust() {
    echo "🔍 Checking Rust..."
    if command -v cargo &> /dev/null; then
        RUST_VERSION=$(rustc --version | awk '{print $2}')
        echo "   ✓ Rust $RUST_VERSION found"
        return 0
    else
        echo "   ⚠ Rust not found. Installing..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        echo "   ✓ Rust installed"
        return 0
    fi
}

install_pyright() {
    echo "📦 Installing Pyright..."
    
    if command -v pyright &> /dev/null; then
        echo "   ✓ Pyright already installed"
        return 0
    fi
    
    if command -v pip3 &> /dev/null; then
        pip3 install pyright --user 2>/dev/null || pip install pyright --user 2>/dev/null
    elif command -v pip &> /dev/null; then
        pip install pyright --user 2>/dev/null
    fi
    
    if command -v pyright &> /dev/null; then
        echo "   ✓ Pyright installed"
    else
        echo "   ⚠ Pyright installation failed, will be installed by npm"
    fi
}

install_dependencies() {
    echo "📦 Installing npm dependencies..."
    npm install
    echo "   ✓ Dependencies installed"
}

build_ide() {
    echo "🔨 Building AK47 IDE..."
    
    read -p "   Build for production? [y/N]: " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npm run tauri:build
        echo "   ✓ Build complete! Executable in src-tauri/target/release/"
    else
        echo "   To run in development mode: npm run tauri:dev"
    fi
}

main() {
    OS=$(detect_os)
    echo "   Detected OS: $OS"
    echo ""

    if ! check_python; then
        exit 1
    fi
    echo ""

    if ! check_node; then
        exit 1
    fi
    echo ""

    if ! check_rust; then
        exit 1
    fi
    echo ""

    install_pyright
    echo ""

    install_dependencies
    echo ""

    build_ide
    echo ""

    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                   Installation complete!                     ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Run: npm run tauri:dev"
    echo ""
}

main "$@"