import * as vscode from 'vscode';
import * as path from 'path';
import { ScheduleData } from './extension';

export class WavefrontPanel {
    public static currentPanel: WavefrontPanel | undefined;
    public static readonly viewType = 'wavefrontVisualizer';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (WavefrontPanel.currentPanel) {
            WavefrontPanel.currentPanel._panel.reveal(column);
            return WavefrontPanel.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            WavefrontPanel.viewType,
            'Wavefront Visualization',
            column || vscode.ViewColumn.One,
            {
                // Enable JavaScript in the webview
                enableScripts: true,
                // And restrict the webview to only loading content from our extension's directory
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'out')
                ]
            }
        );

        WavefrontPanel.currentPanel = new WavefrontPanel(panel, extensionUri);
        return WavefrontPanel.currentPanel;
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        WavefrontPanel.currentPanel = new WavefrontPanel(panel, extensionUri);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed (user closes it)
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                    case 'ready':
                        // Webview is ready, can send initial data
                        this._sendInitialData();
                        return;
                    case 'requestData':
                        // Handle data requests from webview
                        this._handleDataRequest(message.params);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public loadScheduleData(data: ScheduleData) {
        // Send schedule data to webview
        this._panel.webview.postMessage({
            command: 'loadSchedule',
            data: data
        });
    }

    private _sendInitialData() {
        // Send sample data for demonstration
        const sampleData: ScheduleData = {
            indexSpace: {
                dimensions: [64, 64, 32],
                strides: [1, 64, 4096],
                origin: [0, 0, 0]
            },
            wavefronts: this._generateSampleWavefronts(),
            operatorInfo: {
                type: 'Conv2D',
                inputShape: [1, 64, 64, 32],
                outputShape: [1, 62, 62, 64],
                parameters: {
                    kernelSize: [3, 3],
                    stride: [1, 1],
                    padding: 'valid'
                }
            }
        };

        this.loadScheduleData(sampleData);
    }

    private _generateSampleWavefronts(): any[] {
        const wavefronts = [];
        const timeSteps = 50;
        
        for (let t = 0; t < timeSteps; t++) {
            const activeIndices = [];
            // Generate wavefront pattern for Conv2D
            const wavefrontRadius = t * 0.5;
            
            for (let x = 0; x < 64; x++) {
                for (let y = 0; y < 64; y++) {
                    for (let z = 0; z < 32; z++) {
                        const distance = Math.sqrt(
                            Math.pow(x - 32, 2) + 
                            Math.pow(y - 32, 2) + 
                            Math.pow(z - 16, 2) * 0.25
                        );
                        
                        if (distance <= wavefrontRadius && distance > wavefrontRadius - 2) {
                            activeIndices.push([x, y, z]);
                        }
                    }
                }
            }

            wavefronts.push({
                timestamp: t,
                activeIndices: activeIndices,
                operatorType: 'Conv2D' as const,
                metadata: {
                    wavefrontRadius: wavefrontRadius,
                    activeCount: activeIndices.length
                }
            });
        }

        return wavefronts;
    }

    private _handleDataRequest(params: any) {
        // Handle specific data requests from the visualization
        // This could include requesting different time ranges, 
        // operator types, or analysis data
    }

    public dispose() {
        WavefrontPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = 'Wavefront Visualization';
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Get the local path to main script run in the webview
        const scriptPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
        const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

        // Try to load Three.js from CDN since local node_modules might not work
        const threeJsCdnUrl = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdnjs.cloudflare.com;">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Wavefront Visualization</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background-color: #1e1e1e;
                        color: #cccccc;
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        overflow: hidden;
                    }
                    #container {
                        position: relative;
                        width: 100vw;
                        height: 100vh;
                    }
                    #visualization {
                        width: 100%;
                        height: 100%;
                    }
                    #controls {
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        background: rgba(30, 30, 30, 0.8);
                        padding: 15px;
                        border-radius: 5px;
                        z-index: 100;
                        min-width: 200px;
                    }
                    #info {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: rgba(30, 30, 30, 0.8);
                        padding: 15px;
                        border-radius: 5px;
                        z-index: 100;
                        min-width: 200px;
                        font-size: 12px;
                    }
                    .control-group {
                        margin-bottom: 15px;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: 500;
                    }
                    input[type="range"] {
                        width: 100%;
                        margin: 5px 0;
                    }
                    button {
                        background: #007acc;
                        color: white;
                        border: none;
                        padding: 8px 15px;
                        border-radius: 3px;
                        cursor: pointer;
                        margin-right: 5px;
                        margin-bottom: 5px;
                    }
                    button:hover {
                        background: #005a9e;
                    }
                    button:disabled {
                        background: #555;
                        cursor: not-allowed;
                    }
                    #debug {
                        position: absolute;
                        bottom: 10px;
                        left: 10px;
                        background: rgba(30, 30, 30, 0.8);
                        padding: 10px;
                        border-radius: 5px;
                        z-index: 100;
                        font-size: 10px;
                        max-width: 300px;
                        max-height: 200px;
                        overflow-y: auto;
                    }
                </style>
            </head>
            <body>
                <div id="container">
                    <div id="visualization"></div>
                    
                    <div id="controls">
                        <div class="control-group">
                            <label for="timeSlider">Time Step:</label>
                            <input type="range" id="timeSlider" min="0" max="49" value="0" step="1">
                            <span id="timeValue">0</span>
                        </div>
                        
                        <div class="control-group">
                            <button id="playBtn">Play</button>
                            <button id="pauseBtn">Pause</button>
                            <button id="resetBtn">Reset</button>
                        </div>
                        
                        <div class="control-group">
                            <label for="speedSlider">Speed:</label>
                            <input type="range" id="speedSlider" min="0.1" max="3.0" value="1.0" step="0.1">
                            <span id="speedValue">1.0x</span>
                        </div>
                        
                        <div class="control-group">
                            <label for="renderMode">Render Mode:</label>
                            <select id="renderMode">
                                <option value="points">Points</option>
                                <option value="cubes">Cubes</option>
                                <option value="spheres">Spheres</option>
                            </select>
                        </div>
                    </div>
                    
                    <div id="info">
                        <h4>Operator Info</h4>
                        <div id="operatorDetails">Loading...</div>
                        <h4>Current Frame</h4>
                        <div id="frameDetails">Time: 0<br>Active: 0</div>
                    </div>
                    
                    <div id="debug">
                        <h4>Debug Log</h4>
                        <div id="debugLog">Initializing...</div>
                    </div>
                </div>

                <script nonce="${nonce}" src="${threeJsCdnUrl}"></script>
                <script nonce="${nonce}">
                    // Debug logging function
                    function debugLog(message) {
                        console.log('[Wavefront Debug]', message);
                        const debugElement = document.getElementById('debugLog');
                        if (debugElement) {
                            debugElement.innerHTML += '<br>' + new Date().toLocaleTimeString() + ': ' + message;
                            debugElement.scrollTop = debugElement.scrollHeight;
                        }
                    }
                    
                    // Check if Three.js loaded
                    if (typeof THREE === 'undefined') {
                        debugLog('ERROR: Three.js failed to load from CDN');
                    } else {
                        debugLog('Three.js loaded successfully');
                    }
                    
                    // Wrap the main script in error handling
                    try {
                        debugLog('Starting main script execution...');
                    } catch (error) {
                        debugLog('ERROR in main script: ' + error.message);
                    }
                </script>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}