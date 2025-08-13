# Directory Structure for VS Code Extension

Create the following directory structure:

```
wavefront-visualizer/
├── package.json
├── tsconfig.json
├── .vscode/
│   ├── launch.json
│   └── tasks.json
├── src/
│   ├── extension.ts
│   └── wavefrontPanel.ts
├── media/
│   └── main.js
└── out/ (created by compilation)
```

## Setup Steps

1. **Create the directory structure**:
   ```bash
   mkdir wavefront-visualizer
   cd wavefront-visualizer
   mkdir src media out .vscode
   ```

2. **Create the files**:
   - Copy the `package.json` content to the root
   - Copy the `tsconfig.json` content to the root
   - Copy the launch configuration to `.vscode/launch.json`
   - Copy the tasks configuration to `.vscode/tasks.json`
   - Copy the "src/extension.ts" content to `src/extension.ts`
   - Copy the "src/wavefrontPanel.ts" content to `src/wavefrontPanel.ts`
   - Copy the "Webview Main JavaScript" content to `media/main.js`

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Compile**:
   ```bash
   npm run compile
   ```

## Running the Extension

### Method 1: Using F5 (Recommended)
1. Open the `wavefront-visualizer` folder in VS Code
2. Press `F5` (or go to Run → Start Debugging)
3. Select "Run Extension" from the dropdown if prompted
4. A new VS Code window will open with "[Extension Development Host]" in the title

### Method 2: Using Command Palette
1. Open VS Code in the extension folder
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
3. Type "Debug: Start Debugging"
4. Select "Run Extension"

### Method 3: Manual Command Line
```bash
# From the extension directory
code --extensionDevelopmentPath=. .
```

## What is the Extension Development Host?

The "Extension Development Host" is a special VS Code window that:
- Runs your extension in development mode
- Has your extension loaded and active
- Shows debug output in the original VS Code window
- Allows you to test extension functionality
- Has "[Extension Development Host]" in the window title

## Testing Your Extension

In the Extension Development Host window:

1. **Open Command Palette** (`Ctrl+Shift+P`)
2. **Type "Wavefront"** - you should see:
   - "Wavefront: Open Wavefront Visualization"
   - "Wavefront: Load Schedule File"

3. **Test the visualization**:
   - Run "Open Wavefront Visualization" to see the 3D viewer
   - Create a sample JSON file and right-click → "Load Schedule File"

## File Mapping

- `extension_main` artifact → `src/extension.ts`
- `wavefront_panel` artifact → `src/wavefrontPanel.ts`
- `webview_main_js` artifact → `media/main.js`
- `vscode_extension_package` artifact → `package.json`
- `tsconfig` artifact → `tsconfig.json`
- `vscode_launch_config` artifact → `.vscode/launch.json`
- `vscode_tasks_config` artifact → `.vscode/tasks.json`

## Common Issues

### "No configurations available" when pressing F5
- Make sure `.vscode/launch.json` exists in your workspace
- Ensure you opened the extension folder (not a parent folder) in VS Code

### Import errors during compilation
1. File names match exactly (case-sensitive)
2. All files are in the correct directories
3. TypeScript can find the type definitions

### Extension not appearing in Development Host
- Check the Debug Console in the original VS Code window for errors
- Ensure `package.json` has correct activation events
- Verify the extension compiled successfully (`out/extension.js` exists)

## Debugging Tips

1. **Debug Console**: Check the original VS Code window's Debug Console for extension logs
2. **Developer Tools**: In the Extension Development Host, use `Help → Toggle Developer Tools`
3. **Reload**: Use `Ctrl+R` in the Extension Development Host to reload your extension after changes