"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// The list of supported extensions in the project
const supportedExtensions = ['.js', '.jsx', '.ts', '.tsx'];
function activate(context) {
    vscode.workspace.onDidSaveTextDocument((document) => {
        if (supportedExtensions.includes(path.extname(document.fileName))) {
            vscode.commands.executeCommand('extension.checkUnusedFiles');
        }
    });
    let disposable = vscode.commands.registerCommand('extension.checkUnusedFiles', () => {
        vscode.window.showInformationMessage('Checking for unused files...');
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const projectRoot = workspaceFolders[0].uri.fsPath;
            const allFiles = getFilesInDirectory(projectRoot, supportedExtensions);
            const usedFiles = new Set();
            // For every file, check the imports and mark used files
            allFiles.forEach(file => {
                const content = fs.readFileSync(file, 'utf8');
                const importedFiles = extractImports(content, path.dirname(file));
                importedFiles.forEach(importedFile => {
                    usedFiles.add(importedFile);
                });
            });
            // Find unused files
            const unusedFiles = allFiles.filter(file => !usedFiles.has(file));
            const outputChannel = vscode.window.createOutputChannel('Unused Files');
            outputChannel.show();
            if (unusedFiles.length > 0) {
                outputChannel.appendLine(`Found ${unusedFiles.length} unused files:`);
                unusedFiles.forEach(file => outputChannel.appendLine(file));
            }
            else {
                outputChannel.appendLine('No unused files found!');
            }
        }
        else {
            vscode.window.showErrorMessage('No workspace folder open.');
        }
    });
    context.subscriptions.push(disposable);
}
function getFilesInDirectory(dir, extensions) {
    let results = [];
    const config = vscode.workspace.getConfiguration('unusedFilesChecker');
    const ignoredPaths = config.get('ignoredPaths', []);
    fs.readdirSync(dir).forEach((file) => {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            // Ignore the node_modules directory
            if (ignoredPaths.includes(path.basename(file))) {
                return;
            }
            results = results.concat(getFilesInDirectory(file, extensions));
        }
        else if (extensions.includes(path.extname(file))) {
            results.push(file);
        }
    });
    return results;
}
function extractImports(fileContent, fileDirectory) {
    const regex = /import\s+(?:[\w{}\*\s,\n]+from\s+)?['"]([^'"]+)['"]/g;
    const imports = [];
    let match;
    while ((match = regex.exec(fileContent)) !== null) {
        let importPath = match[1];
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            // Ignore external packages
            continue;
        }
        const fullImportPath = path.resolve(fileDirectory, importPath);
        if (fullImportPath.includes('node_modules')) {
            // Ignore imports from node_modules
            continue;
        }
        const fileWithExtension = resolveFileWithExtension(fullImportPath);
        if (fileWithExtension) {
            imports.push(fileWithExtension);
        }
    }
    return imports;
}
function resolveFileWithExtension(filePath) {
    for (const ext of supportedExtensions) {
        if (fs.existsSync(filePath + ext)) {
            return filePath + ext;
        }
    }
    return null;
}
function deactivate() { }
