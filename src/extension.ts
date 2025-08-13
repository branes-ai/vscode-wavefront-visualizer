import * as vscode from 'vscode';
import * as path from 'path';
import { WavefrontPanel } from './wavefrontPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Wavefront Visualizer extension is now active');

    // Register command to open visualization
    const openVisualizationCommand = vscode.commands.registerCommand(
        'wavefrontVisualizer.openVisualization',
        () => {
            WavefrontPanel.createOrShow(context.extensionUri);
        }
    );

    // Register command to load schedule file
    const loadScheduleCommand = vscode.commands.registerCommand(
        'wavefrontVisualizer.loadSchedule',
        async (uri: vscode.Uri) => {
            try {
                const document = await vscode.workspace.openTextDocument(uri);
                const content = document.getText();
                
                // Parse schedule data
                let scheduleData;
                if (uri.fsPath.endsWith('.json')) {
                    scheduleData = JSON.parse(content);
                } else if (uri.fsPath.endsWith('.yaml')) {
                    // Would need yaml parser for full implementation
                    vscode.window.showWarningMessage('YAML parsing not implemented in this demo');
                    return;
                }

                // Create or show panel and load data
                const panel = WavefrontPanel.createOrShow(context.extensionUri);
                panel.loadScheduleData(scheduleData);

            } catch (error) {
                vscode.window.showErrorMessage(`Failed to load schedule: ${error}`);
            }
        }
    );

    context.subscriptions.push(openVisualizationCommand, loadScheduleCommand);
}

export function deactivate() {}

// Data structures for AI operator schedules
export interface IndexSpace {
    dimensions: number[];
    strides: number[];
    origin: number[];
}

export interface WavefrontData {
    timestamp: number;
    activeIndices: number[][];
    operatorType: 'Conv2D' | 'Linear' | 'MatMul' | 'Reduction';
    metadata?: Record<string, any>;
}

export interface ScheduleData {
    indexSpace: IndexSpace;
    wavefronts: WavefrontData[];
    operatorInfo: {
        type: string;
        inputShape: number[];
        outputShape: number[];
        parameters?: Record<string, any>;
    };
}