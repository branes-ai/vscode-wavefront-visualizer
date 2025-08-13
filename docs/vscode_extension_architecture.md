# VS Code Extension Architecture - Quick Guide

## Core Structure

```
extension/
├── package.json          # Extension manifest (the "blueprint")
├── src/
│   ├── extension.ts      # Main extension code (Node.js process)
│   └── other-files.ts    # Additional extension logic
├── media/               # Static assets for webviews
│   └── main.js         # Frontend code (browser context)
└── out/                # Compiled JavaScript output
```

## The Two Worlds

VS Code extensions run in **two separate contexts**:

### 1. Extension Host Process (Node.js)
- **File**: `src/extension.ts`
- **Environment**: Node.js with VS Code API
- **Role**: Business logic, file system access, VS Code integration
- **Can do**: 
  - Register commands
  - Access files
  - Create UI panels
  - Communicate with VS Code
- **Cannot do**: DOM manipulation, direct user interaction

### 2. Webview Process (Browser)
- **File**: `media/main.js` 
- **Environment**: Browser/WebView with restricted APIs
- **Role**: User interface, visualization, interaction
- **Can do**:
  - DOM manipulation
  - Three.js/WebGL rendering
  - Handle user input
- **Cannot do**: File system access, VS Code API calls

## Key Files Explained

### package.json - The Extension Manifest
```json
{
  "name": "your-extension",
  "main": "./out/extension.js",           // Entry point
  "contributes": {
    "commands": [...],                    // Commands you add to VS Code
    "menus": [...],                       // Where commands appear
    "configuration": [...]                // Settings
  },
  "activationEvents": ["*"]               // When to load extension
}
```

**Purpose**: Tells VS Code what your extension provides and when to load it.

### src/extension.ts - Extension Logic
```typescript
export function activate(context: vscode.ExtensionContext) {
    // Called when extension loads
    // Register commands, create panels, etc.
}

export function deactivate() {
    // Cleanup when extension unloads
}
```

**Purpose**: The "backend" - handles VS Code integration and business logic.

### media/main.js - Webview Frontend
```javascript
// Runs in browser context inside VS Code
// Handles UI, visualization, user interaction
const vscode = acquireVsCodeApi(); // Special API for webview ↔ extension communication
```

**Purpose**: The "frontend" - creates the user interface and visualization.

## Communication Flow

```
User Action (Command Palette)
         ↓
package.json (defines command)
         ↓
extension.ts (handles command)
         ↓
Creates Webview Panel
         ↓
Loads media/main.js in webview
         ↓
webview ↔ extension (message passing)
```

## Message Passing Between Contexts

### Extension → Webview
```typescript
// In extension.ts
panel.webview.postMessage({
    command: 'loadData',
    data: myData
});
```

### Webview → Extension
```javascript
// In media/main.js
vscode.postMessage({
    command: 'requestData',
    params: {...}
});
```

### Webview receives messages
```javascript
// In media/main.js
window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'loadData':
            // Handle data from extension
            break;
    }
});
```

## In Your Wavefront Extension

### What Each File Does:

1. **package.json**: 
   - Defines "Wavefront: Open Visualization" command
   - Sets up context menu for .json files
   - Tells VS Code when to activate your extension

2. **src/extension.ts**:
   - Registers your commands
   - Handles file loading when user right-clicks .json
   - Creates and manages the webview panel
   - Sends schedule data to the webview

3. **src/wavefrontPanel.ts**:
   - Manages the webview lifecycle
   - Generates the HTML that contains Three.js
   - Handles communication with the webview

4. **media/main.js**:
   - Initializes Three.js scene
   - Renders 3D visualization
   - Handles user interaction (sliders, buttons)
   - Receives schedule data from extension

## Key Concepts

### Commands
- Functions your extension provides to VS Code
- Appear in Command Palette (`Ctrl+Shift+P`)
- Defined in package.json, implemented in extension.ts

### Webviews
- Embedded browser instances inside VS Code
- Sandboxed for security
- Can display HTML/CSS/JavaScript
- Perfect for visualizations like yours

### Activation Events
- Tell VS Code when to load your extension
- `"*"` = always load (good for development)
- `"onCommand:myCommand"` = load when command is used

### Content Security Policy (CSP)
- Security feature that restricts what webviews can do
- Controls script sources, network access, etc.
- Why we needed to allow `cdnjs.cloudflare.com` for Three.js

## Extension Lifecycle

1. **User opens VS Code** → Extension stays dormant
2. **Activation event occurs** (like running your command) → `activate()` called
3. **Extension registers commands/UI** → Available to user
4. **User interacts** → Your code responds
5. **VS Code closes** → `deactivate()` called

This architecture separates concerns cleanly: VS Code integration in Node.js, user interface in browser, with secure message passing between them.