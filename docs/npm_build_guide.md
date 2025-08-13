# npm Build System Guide for C++ Developers

## The npm Equivalent of CMakeLists.txt

In npm projects, **`package.json`** is roughly equivalent to `CMakeLists.txt`:

```json
{
  "scripts": {
    "compile": "tsc -p ./",        // Like: g++ src/*.cpp -o bin/app
    "watch": "tsc -watch -p ./",   // Like: make watch (rebuild on change)
    "clean": "rm -rf out/*"        // Like: make clean
  },
  "devDependencies": {
    "typescript": "^4.9.4"         // Like: find_package(SomeLib)
  }
}
```

**`tsconfig.json`** is like compiler flags:
```json
{
  "compilerOptions": {
    "target": "ES2020",           // Like: -std=c++20
    "outDir": "out",              // Like: -o output/
    "sourceMap": true             // Like: -g (debug symbols)
  }
}
```

## Source vs Generated Files

### ✅ CHECK INTO SOURCE CONTROL
```
your-extension/
├── package.json              # Like CMakeLists.txt - ESSENTIAL
├── tsconfig.json             # Compiler configuration
├── .vscode/
│   ├── launch.json           # Debug configuration
│   └── tasks.json            # Build tasks
├── src/                      # Source code
│   ├── extension.ts          # Your code
│   └── wavefrontPanel.ts     # Your code
├── media/                    # Static assets
│   └── main.js               # Frontend code
├── README.md                 # Documentation
└── .gitignore                # What to ignore
```

### ❌ DON'T CHECK INTO SOURCE (Generated)
```
├── out/                      # Like build/ in C++ - compiled output
│   ├── extension.js          # Compiled from extension.ts
│   ├── extension.js.map      # Debug symbols
│   └── wavefrontPanel.js     # Compiled from wavefrontPanel.ts
├── node_modules/             # Like /usr/lib - dependencies
│   └── (thousands of files)  # Downloaded packages
└── *.vsix                    # Packaged extension (like .exe)
```

## Create a .gitignore File

Create `.gitignore` in your project root:

```gitignore
# Compiled output
out/
*.vsix

# Node.js dependencies
node_modules/

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/settings.json
.idea/

# Temporary files
*.tmp
*.temp
```

## npm Scripts Analogy to make/CMake

| C++/CMake | npm | Purpose |
|-----------|-----|---------|
| `cmake .` | `npm install` | Setup build environment |
| `make` | `npm run compile` | Build project |
| `make clean` | `npm run clean` | Clean build artifacts |
| `make install` | `npm run package` | Create distributable |
| `make -j$(nproc)` | `npm run watch` | Build continuously |

## Key npm Commands

```bash
# Initial setup (like cmake .)
npm install                   # Downloads dependencies to node_modules/

# Build commands
npm run compile              # Compile TypeScript → JavaScript
npm run watch               # Compile and watch for changes
npm run clean               # Remove compiled files

# Package for distribution
vsce package                # Creates .vsix file (like make install)

# Development
npm run lint                # Check code style (like clang-format)
npm test                    # Run tests
```

## Dependency Management

### package.json dependencies sections:
```json
{
  "dependencies": {
    "three": "^0.158.0"           // Runtime dependency (like linking against libGL)
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",   // Build-time only (like development headers)
    "typescript": "^4.9.4"        // Build tool (like g++ itself)
  }
}
```

**Dependencies** = Libraries your app needs at runtime
**DevDependencies** = Tools needed only for building/development

## Understanding the Build Process

1. **TypeScript Compilation**:
   ```
   src/extension.ts  →  out/extension.js
   src/panel.ts      →  out/panel.js
   ```
   (Like: `g++ src/main.cpp -o bin/main`)

2. **Source Maps**:
   ```
   src/extension.ts  →  out/extension.js.map
   ```
   (Like: debug symbols for debugging compiled code)

3. **Module Resolution**:
   ```
   import * as vscode from 'vscode'  →  Finds in node_modules/
   ```
   (Like: `#include <iostream>` finding system headers)

## Clean Development Workflow

```bash
# 1. Clone repository
git clone <your-repo>
cd your-extension

# 2. Install dependencies (downloads to node_modules/)
npm install

# 3. Build
npm run compile

# 4. Development mode (auto-rebuild on changes)
npm run watch

# 5. Test in VS Code
# Press F5 to launch Extension Development Host
```

## File Sizes Reality Check

Don't panic about `node_modules/` size:
- **node_modules/**: 50-200MB (dependencies)
- **out/**: 1-10MB (your compiled code)
- **src/**: <1MB (your source code)

Only `src/`, `package.json`, and config files go in git.

## VS Code Extension Packaging

When ready to distribute:
```bash
# Install packaging tool
npm install -g vsce

# Create .vsix package
vsce package

# Install in VS Code
code --install-extension your-extension-0.1.0.vsix
```

## Summary for C++ Developers

| Concept | C++ Equivalent | npm/Node.js |
|---------|----------------|-------------|
| Build system | CMake/Make | npm scripts + TypeScript |
| Dependencies | apt/vcpkg | npm install |
| Build artifacts | build/ directory | out/ directory |
| Libraries | /usr/lib, static libs | node_modules/ |
| Compiler | g++/clang++ | tsc (TypeScript compiler) |
| Executable | ./my_app | node out/extension.js |
| Package | .deb/.rpm | .vsix |

The key insight: `package.json` + `tsconfig.json` together serve the role of CMakeLists.txt, defining what to build and how to build it.