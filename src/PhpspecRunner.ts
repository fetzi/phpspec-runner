'use strict';

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export class PhpspecRunner {

    private output: vscode.OutputChannel;

    private phpspecBinary: string;

    private phpspecArguments: string[];

    constructor(output: vscode.OutputChannel)
    {
        this.output = output;
        this.loadConfiguration();
    }

    public runAllTests()
    {
        let baseDir: string;
        let lookupPath: string;

        if (vscode.window.activeTextEditor) {
            lookupPath = vscode.window.activeTextEditor.document.fileName;
        } else {
            lookupPath = vscode.workspace.rootPath + path.sep + 'dummy';
        }

        let configFile = this.findClosestConfigFile(lookupPath);

        if (configFile) {
            baseDir = path.dirname(configFile);
            this.executeTests(baseDir);   
        }
    }

    public runClassTests()
    {
        if (vscode.window.activeTextEditor) {
            let specFile: string;
            let filename: string = vscode.window.activeTextEditor.document.fileName;

            if (!filename.endsWith('.php')) {
                vscode.window.showErrorMessage('Class tests can only be executed on php files');
                return;
            }
            
            let phpspecConfigFile = this.findClosestConfigFile(filename);
            let baseDir = path.dirname(phpspecConfigFile);
            
            if (phpspecConfigFile) {
                if (filename.endsWith('Spec.php')) {
                    specFile = filename.replace(baseDir + path.sep, '');    
                } else {
                    specFile = this.findSpecFile(filename, phpspecConfigFile);
                }
            } else {
                vscode.window.showErrorMessage('No phpspec configuration file is found inside the project');
                return;
            }

            if (specFile) {
                this.executeTests(path.dirname(phpspecConfigFile), [specFile]);
            } else {
                vscode.window.showWarningMessage('No specification found for class');
            }  
        } else {
            vscode.window.showWarningMessage('This command can only be exectuted on open class files');
        }
    }

    private executeTests(workingDirectory: string, params?: string[])
    {
        let args: string[] = this.phpspecArguments.slice();

        if (params) {
            args = args.concat(params);
        }

        let process = cp.spawn(this.phpspecBinary, args, { cwd: workingDirectory });
        let outputHandler = (buffer: Buffer) => {
            this.output.append(buffer.toString());
        };

        this.output.clear();
        this.output.appendLine('\nexecuting: ' + this.phpspecBinary + ' ' + args.join(' '));

        process.stderr.on('data', outputHandler);
        process.stdout.on('data', outputHandler);

        process.on('exit', (code, signal) => {
            let type = 'SUCCESS';
            let message = 'phpspec runner completed successfully';

            if (code !== 0) {
                type = 'ERROR';
                message = 'phpspec runner exited with status ' + code;
            }

            this.output.appendLine('\n[' + type + '] ' + message);
        });

        this.output.show();
    }

    private findSpecFile(filename: string, phpspecConfigFile: string)
    {
        let baseDir: string = path.dirname(phpspecConfigFile);
        let params: string[] = [];

        let relativeFile = filename.replace(baseDir, '');
        
        let config = yaml.load(fs.readFileSync(phpspecConfigFile, 'utf8'));
        
        let srcPath = 'src';
        let specPrefix = 'spec';

        for (let suiteName in config.suites) {
            let suite = config.suites[suiteName];
            
            if (suite.hasOwnProperty('src_path')) {
                srcPath = suite['src_path'];
            }

            if (suite.hasOwnProperty('spec_prefix')) {
                specPrefix = suite['spec_prefix'];
            }
            break;
        }

        relativeFile = relativeFile.replace(path.sep + srcPath, specPrefix);
        relativeFile = relativeFile.replace('.php', 'Spec.php');

        if (fs.existsSync(baseDir + path.sep + relativeFile)) {
            return relativeFile;
        }
    }

    private findClosestConfigFile(filePath: string)
    {
        let folders = filePath.split(path.sep);
        folders.pop();

        let currentFolder = folders.join(path.sep);

        if (!currentFolder) {
            return;
        }

        let configCandidates = [
            currentFolder + path.sep + 'phpspec.yml',
            currentFolder + path.sep + '.phpspec.yml',
            currentFolder + path.sep + 'phpspec.yml.dist'
        ];

        for (let candidate of configCandidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        return this.findClosestConfigFile(currentFolder);
    }

    private loadConfiguration()
    {
        let config = vscode.workspace.getConfiguration("phpspec");
        this.phpspecBinary = config.binaryPath;
        this.phpspecArguments = config.cliArguments;
        this.phpspecArguments.unshift('run');
    }
}