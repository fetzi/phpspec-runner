'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PhpspecRunner } from './PhpspecRunner';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    let output = vscode.window.createOutputChannel('phpspec');
    let phpspecRunner: PhpspecRunner = new PhpspecRunner(output);

    context.subscriptions.push(vscode.commands.registerCommand('phpspec.runAllTests', () => {
        phpspecRunner.runAllTests();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('phpspec.runClassTests', () => {
        phpspecRunner.runClassTests();
    }));
}

// this method is called when your extension is deactivated
export function deactivate() {
}