"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const impor = require("impor")(__dirname);
const fs = require("fs");
const path = require("path");
const uuidModule = impor("uuid/v4");
const vscode = require("vscode");
const constants = require("./common/constants");
const arduinoContentProviderModule = impor("./arduino/arduinoContentProvider");
const vscodeSettings_1 = require("./arduino/vscodeSettings");
const arduinoActivatorModule = impor("./arduinoActivator");
const arduinoContextModule = impor("./arduinoContext");
const constants_1 = require("./common/constants");
const platform_1 = require("./common/platform");
const util = require("./common/util");
const workspace_1 = require("./common/workspace");
const deviceContext_1 = require("./deviceContext");
const completionProviderModule = impor("./langService/completionProvider");
const arduino_1 = require("./arduino/arduino");
const Logger = require("./logger/logger");
const serialMonitor_1 = require("./serialmonitor/serialMonitor");
const usbDetectorModule = impor("./serialmonitor/usbDetector");
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        Logger.configure(context);
        arduinoActivatorModule.default.context = context;
        const activeGuid = uuidModule().replace(/-/g, "");
        Logger.traceUserData("start-activate-extension", { correlationId: activeGuid });
        // Show a warning message if the working file is not under the workspace folder.
        // People should know the extension might not work appropriately, they should look for the doc to get started.
        const openEditor = vscode.window.activeTextEditor;
        if (openEditor && openEditor.document.fileName.endsWith(".ino")) {
            const workingFile = path.normalize(openEditor.document.fileName);
            const workspaceFolder = (vscode.workspace && workspace_1.ArduinoWorkspace.rootPath) || "";
            if (!workspaceFolder || workingFile.indexOf(path.normalize(workspaceFolder)) < 0) {
                vscode.window.showWarningMessage(`The open file "${workingFile}" is not inside the workspace folder, ` +
                    "the arduino extension might not work properly.");
            }
        }
        const vscodeSettings = vscodeSettings_1.VscodeSettings.getInstance();
        const deviceContext = deviceContext_1.DeviceContext.getInstance();
        deviceContext.extensionPath = context.extensionPath;
        context.subscriptions.push(deviceContext);
        const commandExecution = (command, commandBody, args, getUserData) => __awaiter(this, void 0, void 0, function* () {
            const guid = uuidModule().replace(/-/g, "");
            Logger.traceUserData(`start-command-` + command, { correlationId: guid });
            const timer1 = new Logger.Timer();
            let telemetryResult;
            try {
                let result = commandBody(...args);
                if (result) {
                    result = yield Promise.resolve(result);
                }
                if (result && result.telemetry) {
                    telemetryResult = result;
                }
                else if (getUserData) {
                    telemetryResult = getUserData();
                }
            }
            catch (error) {
                Logger.traceError("executeCommandError", error, { correlationId: guid, command });
            }
            Logger.traceUserData(`end-command-` + command, Object.assign(Object.assign({}, telemetryResult), { correlationId: guid, duration: timer1.end() }));
        });
        function askSwitchToBundledCli(message) {
            return __awaiter(this, void 0, void 0, function* () {
                const result = yield vscode.window.showErrorMessage(message, "Use bundled arduino-cli", "View settings");
                switch (result) {
                    case "Use bundled arduino-cli": {
                        Logger.traceUserData("switched-to-bundled-arduino-cli");
                        yield vscodeSettings.setUseArduinoCli(true);
                        yield vscodeSettings.setArduinoPath(undefined);
                        yield vscodeSettings.setCommandPath(undefined);
                        yield vscode.commands.executeCommand("workbench.action.reloadWindow");
                        break;
                    }
                    case "View settings":
                        yield vscode.commands.executeCommand("workbench.action.openGlobalSettings");
                        break;
                }
            });
        }
        if (!vscodeSettings.useArduinoCli) {
            // This notification is intentionally a little bit annoying (popping on
            // workspace open with no permanent dismissal) because we want to move
            // users off of Arduino IDE.
            //
            // Unfortunately, we can't simply switch the default value of
            // useArduinoCli to true because that would break users that were
            // intentionally using the Arduino IDE but relied on the current default
            // value of false. A future will make this breaking change with
            // appropriate messaging.
            Logger.traceUserData("using-legacy-arduino-ide");
            void askSwitchToBundledCli(constants.messages.REMOVE_ARDUINO_IDE_SUPPORT + " " + constants.messages.SWITCH_TO_BUNDLED_CLI);
        }
        const registerArduinoCommand = (command, commandBody, getUserData) => {
            return context.subscriptions.push(vscode.commands.registerCommand(command, (...args) => __awaiter(this, void 0, void 0, function* () {
                if (!arduinoContextModule.default.initialized) {
                    yield arduinoActivatorModule.default.activate();
                }
                if (!serialMonitor_1.SerialMonitor.getInstance().initialized) {
                    serialMonitor_1.SerialMonitor.getInstance().initialize(context);
                }
                const arduinoPath = arduinoContextModule.default.arduinoApp.settings.arduinoPath;
                const commandPath = arduinoContextModule.default.arduinoApp.settings.commandPath;
                const useArduinoCli = arduinoContextModule.default.arduinoApp.settings.useArduinoCli;
                const usingBundledArduinoCli = arduinoContextModule.default.arduinoApp.settings.usingBundledArduinoCli;
                // Ask the user to switch to the bundled Arduino CLI if we can't resolve the specified path.
                if (!usingBundledArduinoCli && (!arduinoPath || !platform_1.validateArduinoPath(arduinoPath, useArduinoCli))) {
                    Logger.traceError("InvalidArduinoPath", new Error(constants.messages.INVALID_ARDUINO_PATH));
                    yield askSwitchToBundledCli(constants.messages.INVALID_ARDUINO_PATH + " " + constants.messages.SWITCH_TO_BUNDLED_CLI);
                }
                else if (!commandPath || !util.fileExistsSync(commandPath)) {
                    const error = new Error(constants.messages.INVALID_COMMAND_PATH + commandPath);
                    if (usingBundledArduinoCli) {
                        Logger.notifyUserError("InvalidCommandPath", error);
                    }
                    else {
                        Logger.traceError("InvalidCommandPath", error);
                        yield askSwitchToBundledCli(error.message + " " + constants.messages.SWITCH_TO_BUNDLED_CLI);
                    }
                }
                else {
                    yield commandExecution(command, commandBody, args, getUserData);
                }
            })));
        };
        const registerNonArduinoCommand = (command, commandBody, getUserData) => {
            return context.subscriptions.push(vscode.commands.registerCommand(command, (...args) => __awaiter(this, void 0, void 0, function* () {
                if (!serialMonitor_1.SerialMonitor.getInstance().initialized) {
                    serialMonitor_1.SerialMonitor.getInstance().initialize(context);
                }
                yield commandExecution(command, commandBody, args, getUserData);
            })));
        };
        registerArduinoCommand("arduino.initialize", () => __awaiter(this, void 0, void 0, function* () { return yield deviceContext.initialize(); }));
        registerArduinoCommand("arduino.verify", () => __awaiter(this, void 0, void 0, function* () {
            if (!arduinoContextModule.default.arduinoApp.building) {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Arduino: Verifying...",
                }, () => __awaiter(this, void 0, void 0, function* () {
                    yield arduinoContextModule.default.arduinoApp.build(arduino_1.BuildMode.Verify);
                }));
            }
        }), () => {
            return {
                board: (arduinoContextModule.default.boardManager.currentBoard === null) ? null :
                    arduinoContextModule.default.boardManager.currentBoard.name,
            };
        });
        registerArduinoCommand("arduino.upload", () => __awaiter(this, void 0, void 0, function* () {
            if (!arduinoContextModule.default.arduinoApp.building) {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Arduino: Uploading...",
                }, () => __awaiter(this, void 0, void 0, function* () {
                    yield arduinoContextModule.default.arduinoApp.build(arduino_1.BuildMode.Upload);
                }));
            }
        }), () => {
            return { board: arduinoContextModule.default.boardManager.currentBoard.name };
        });
        registerArduinoCommand("arduino.cliUpload", () => __awaiter(this, void 0, void 0, function* () {
            if (!arduinoContextModule.default.arduinoApp.building) {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Arduino: Using CLI to upload...",
                }, () => __awaiter(this, void 0, void 0, function* () {
                    yield arduinoContextModule.default.arduinoApp.build(arduino_1.BuildMode.CliUpload);
                }));
            }
        }), () => {
            return { board: arduinoContextModule.default.boardManager.currentBoard.name };
        });
        registerArduinoCommand("arduino.selectSketch", () => __awaiter(this, void 0, void 0, function* () {
            const sketchFileName = deviceContext.sketch;
            // Include any ino, cpp, or c files under the workspace folder
            const includePattern = "**/*.{ino,cpp,c}";
            // The sketchbook folder may contain hardware & library folders, any sketches under these paths
            // should be excluded
            const sketchbookPath = arduinoContextModule.default.arduinoApp.settings.sketchbookPath;
            const excludePatterns = [
                path.relative(workspace_1.ArduinoWorkspace.rootPath, sketchbookPath + "/hardware/**"),
                path.relative(workspace_1.ArduinoWorkspace.rootPath, sketchbookPath + "/libraries/**")
            ];
            // If an output path is specified, it should be excluded as well
            if (deviceContext.output) {
                const outputPath = path.relative(workspace_1.ArduinoWorkspace.rootPath, path.resolve(workspace_1.ArduinoWorkspace.rootPath, deviceContext.output));
                excludePatterns.push(`${outputPath}/**`);
            }
            const excludePattern = `{${excludePatterns.map((p) => p.replace("\\", "/")).join(",")}}`;
            const fileUris = yield vscode.workspace.findFiles(includePattern, excludePattern);
            const newSketchFileName = yield vscode.window.showQuickPick(fileUris.map((fileUri) => ({
                label: path.relative(workspace_1.ArduinoWorkspace.rootPath, fileUri.fsPath),
                description: fileUri.fsPath,
            })), { placeHolder: sketchFileName, matchOnDescription: true });
            if (!newSketchFileName) {
                return;
            }
            deviceContext.sketch = newSketchFileName.label;
            deviceContext.showStatusBar();
        }));
        registerArduinoCommand("arduino.uploadUsingProgrammer", () => __awaiter(this, void 0, void 0, function* () {
            if (!arduinoContextModule.default.arduinoApp.building) {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Arduino: Uploading (programmer)...",
                }, () => __awaiter(this, void 0, void 0, function* () {
                    yield arduinoContextModule.default.arduinoApp.build(arduino_1.BuildMode.UploadProgrammer);
                }));
            }
        }), () => {
            return { board: arduinoContextModule.default.boardManager.currentBoard.name };
        });
        registerArduinoCommand("arduino.cliUploadUsingProgrammer", () => __awaiter(this, void 0, void 0, function* () {
            if (!arduinoContextModule.default.arduinoApp.building) {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Arduino: Using CLI to upload (programmer)...",
                }, () => __awaiter(this, void 0, void 0, function* () {
                    yield arduinoContextModule.default.arduinoApp.build(arduino_1.BuildMode.CliUploadProgrammer);
                }));
            }
        }), () => {
            return { board: arduinoContextModule.default.boardManager.currentBoard.name };
        });
        registerArduinoCommand("arduino.rebuildIntelliSenseConfig", () => __awaiter(this, void 0, void 0, function* () {
            if (!arduinoContextModule.default.arduinoApp.building) {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: "Arduino: Rebuilding IS Configuration...",
                }, () => __awaiter(this, void 0, void 0, function* () {
                    yield arduinoContextModule.default.arduinoApp.build(arduino_1.BuildMode.Analyze);
                }));
            }
        }), () => {
            return { board: arduinoContextModule.default.boardManager.currentBoard.name };
        });
        registerArduinoCommand("arduino.selectProgrammer", () => __awaiter(this, void 0, void 0, function* () {
            // Note: this guard does not prevent building while setting the
            // programmer. But when looking at the code of selectProgrammer
            // it seems not to be possible to trigger building while setting
            // the programmer. If the timed IntelliSense analysis is triggered
            // this is not a problem, since it doesn't use the programmer.
            if (!arduinoContextModule.default.arduinoApp.building) {
                try {
                    yield arduinoContextModule.default.arduinoApp.programmerManager.selectProgrammer();
                }
                catch (ex) {
                }
            }
        }), () => {
            return {
                board: (arduinoContextModule.default.boardManager.currentBoard === null) ? null :
                    arduinoContextModule.default.boardManager.currentBoard.name,
            };
        });
        registerArduinoCommand("arduino.openExample", (path) => arduinoContextModule.default.arduinoApp.openExample(path));
        registerArduinoCommand("arduino.loadPackages", () => __awaiter(this, void 0, void 0, function* () { return yield arduinoContextModule.default.boardManager.loadPackages(true); }));
        registerArduinoCommand("arduino.installBoard", (packageName, arch, version = "") => __awaiter(this, void 0, void 0, function* () {
            let installed = false;
            const installedBoards = arduinoContextModule.default.boardManager.installedBoards;
            installedBoards.forEach((board, key) => {
                let _packageName;
                if (board.platform.package && board.platform.package.name) {
                    _packageName = board.platform.package.name;
                }
                else {
                    _packageName = board.platform.packageName;
                }
                if (packageName === _packageName &&
                    arch === board.platform.architecture &&
                    (!version || version === board.platform.installedVersion)) {
                    installed = true;
                }
            });
            if (!installed) {
                yield arduinoContextModule.default.boardManager.loadPackages(true);
                yield arduinoContextModule.default.arduinoApp.installBoard(packageName, arch, version);
            }
            return;
        }));
        // serial monitor commands
        const serialMonitor = serialMonitor_1.SerialMonitor.getInstance();
        context.subscriptions.push(serialMonitor);
        registerNonArduinoCommand("arduino.selectSerialPort", () => serialMonitor.selectSerialPort());
        registerNonArduinoCommand("arduino.openSerialMonitor", () => serialMonitor.openSerialMonitor());
        registerNonArduinoCommand("arduino.changeTimestampFormat", () => serialMonitor.changeTimestampFormat());
        registerNonArduinoCommand("arduino.closeSerialMonitor", (port) => serialMonitor.closeSerialMonitor(port));
        const completionProvider = new completionProviderModule.CompletionProvider();
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider(constants_1.ARDUINO_MODE, completionProvider, "<", '"', "."));
        if (workspace_1.ArduinoWorkspace.rootPath && (util.fileExistsSync(path.join(workspace_1.ArduinoWorkspace.rootPath, constants_1.ARDUINO_CONFIG_FILE))
            || (openEditor && openEditor.document.fileName.endsWith(".ino")))) {
            (() => __awaiter(this, void 0, void 0, function* () {
                if (!arduinoContextModule.default.initialized) {
                    yield arduinoActivatorModule.default.activate();
                }
                if (!serialMonitor_1.SerialMonitor.getInstance().initialized) {
                    serialMonitor_1.SerialMonitor.getInstance().initialize(context);
                }
                vscode.commands.executeCommand("setContext", "vscode-arduino:showExampleExplorer", true);
            }))();
        }
        vscode.window.onDidChangeActiveTextEditor(() => __awaiter(this, void 0, void 0, function* () {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && ((path.basename(activeEditor.document.fileName) === "arduino.json"
                && path.basename(path.dirname(activeEditor.document.fileName)) === ".vscode")
                || activeEditor.document.fileName.endsWith(".ino"))) {
                if (!arduinoContextModule.default.initialized) {
                    yield arduinoActivatorModule.default.activate();
                }
                if (!serialMonitor_1.SerialMonitor.getInstance().initialized) {
                    serialMonitor_1.SerialMonitor.getInstance().initialize(context);
                }
                vscode.commands.executeCommand("setContext", "vscode-arduino:showExampleExplorer", true);
            }
        }));
        const allowPDEFiletype = vscodeSettings.allowPDEFiletype;
        if (allowPDEFiletype) {
            vscode.workspace.onDidOpenTextDocument((document) => __awaiter(this, void 0, void 0, function* () {
                if (/\.pde$/.test(document.uri.fsPath)) {
                    const newFsName = document.uri.fsPath.replace(/\.pde$/, ".ino");
                    yield vscode.commands.executeCommand("workbench.action.closeActiveEditor");
                    fs.renameSync(document.uri.fsPath, newFsName);
                    yield vscode.commands.executeCommand("vscode.open", vscode.Uri.file(newFsName));
                }
            }));
            vscode.window.onDidChangeActiveTextEditor((editor) => __awaiter(this, void 0, void 0, function* () {
                if (!editor) {
                    return;
                }
                const document = editor.document;
                if (/\.pde$/.test(document.uri.fsPath)) {
                    const newFsName = document.uri.fsPath.replace(/\.pde$/, ".ino");
                    yield vscode.commands.executeCommand("workbench.action.closeActiveEditor");
                    fs.renameSync(document.uri.fsPath, newFsName);
                    yield vscode.commands.executeCommand("vscode.open", vscode.Uri.file(newFsName));
                }
            }));
        }
        Logger.traceUserData("end-activate-extension", { correlationId: activeGuid });
        setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            const arduinoManagerProvider = new arduinoContentProviderModule.ArduinoContentProvider(context.extensionPath);
            yield arduinoManagerProvider.initialize();
            context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(constants_1.ARDUINO_MANAGER_PROTOCOL, arduinoManagerProvider));
            registerArduinoCommand("arduino.showBoardManager", () => __awaiter(this, void 0, void 0, function* () {
                const panel = vscode.window.createWebviewPanel("arduinoBoardManager", "Arduino Board Manager", vscode.ViewColumn.Two, {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                });
                panel.webview.html = yield arduinoManagerProvider.provideTextDocumentContent(constants_1.BOARD_MANAGER_URI);
            }));
            registerArduinoCommand("arduino.showLibraryManager", () => __awaiter(this, void 0, void 0, function* () {
                const panel = vscode.window.createWebviewPanel("arduinoLibraryManager", "Arduino Library Manager", vscode.ViewColumn.Two, {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                });
                panel.webview.html = yield arduinoManagerProvider.provideTextDocumentContent(constants_1.LIBRARY_MANAGER_URI);
            }));
            registerArduinoCommand("arduino.showBoardConfig", () => __awaiter(this, void 0, void 0, function* () {
                const panel = vscode.window.createWebviewPanel("arduinoBoardConfiguration", "Arduino Board Configuration", vscode.ViewColumn.Two, {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                });
                panel.webview.html = yield arduinoManagerProvider.provideTextDocumentContent(constants_1.BOARD_CONFIG_URI);
            }));
            registerArduinoCommand("arduino.showExamples", (forceRefresh = false) => __awaiter(this, void 0, void 0, function* () {
                vscode.commands.executeCommand("setContext", "vscode-arduino:showExampleExplorer", true);
                if (forceRefresh) {
                    vscode.commands.executeCommand("arduino.reloadExample");
                }
                const panel = vscode.window.createWebviewPanel("arduinoExamples", "Arduino Examples", vscode.ViewColumn.Two, {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                });
                panel.webview.html = yield arduinoManagerProvider.provideTextDocumentContent(constants_1.EXAMPLES_URI);
            }));
            // change board type
            registerArduinoCommand("arduino.changeBoardType", () => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield arduinoContextModule.default.boardManager.changeBoardType();
                }
                catch (exception) {
                    Logger.error(exception.message);
                }
                arduinoManagerProvider.update(constants_1.LIBRARY_MANAGER_URI);
                arduinoManagerProvider.update(constants_1.EXAMPLES_URI);
            }), () => {
                return { board: arduinoContextModule.default.boardManager.currentBoard.name };
            });
            registerArduinoCommand("arduino.reloadExample", () => {
                arduinoManagerProvider.update(constants_1.EXAMPLES_URI);
            }, () => {
                return {
                    board: (arduinoContextModule.default.boardManager.currentBoard === null) ? null :
                        arduinoContextModule.default.boardManager.currentBoard.name,
                };
            });
        }), 100);
        setTimeout(() => {
            // delay to detect usb
            usbDetectorModule.UsbDetector.getInstance().initialize(context);
            usbDetectorModule.UsbDetector.getInstance().startListening();
        }, 200);
    });
}
exports.activate = activate;
function deactivate() {
    return __awaiter(this, void 0, void 0, function* () {
        const monitor = serialMonitor_1.SerialMonitor.getInstance();
        yield monitor.closeSerialMonitor(null);
        usbDetectorModule.UsbDetector.getInstance().stopListening();
        Logger.traceUserData("deactivate-extension");
    });
}
exports.deactivate = deactivate;

//# sourceMappingURL=extension.js.map

// SIG // Begin signature block
// SIG // MIInowYJKoZIhvcNAQcCoIInlDCCJ5ACAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // 75nDzhY1zHGRMJi9kh0RPz1UE3qicbTleeG2ToYzK52g
// SIG // gg2FMIIGAzCCA+ugAwIBAgITMwAAAs3zZL/41ExdUQAA
// SIG // AAACzTANBgkqhkiG9w0BAQsFADB+MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSgwJgYDVQQDEx9NaWNyb3NvZnQgQ29kZSBT
// SIG // aWduaW5nIFBDQSAyMDExMB4XDTIyMDUxMjIwNDYwMloX
// SIG // DTIzMDUxMTIwNDYwMlowdDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEeMBwGA1UEAxMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
// SIG // 6yM7GOtjJiq83q4Ju1HJ7vg7kh3YM0WVQiBovQmpRa4c
// SIG // LYivtxSA85TmG7P88x8Liwt4Yq+ecFYB6GguJYkMEOtM
// SIG // FckdexGT2uAUNvAuQEZcan7Xadx/Ea11m1cr0GlJwUFW
// SIG // TO91w8hldaFD2RhxlrYHarQVHetFY5xTyAkn/KZxYore
// SIG // ob0sR+SFViNIjp36nV2KD1lLVVDJlaltcgV9DbW0JUhy
// SIG // FOoZT76Pf7qir5IxVBQNi2wvQFkGyZh/tbjNJeJw0inw
// SIG // qnHL3SOZd84xJPclElJodSEIQxZ/uUi9iZpwhdI2RGeH
// SIG // +RxO8pAz/qIgN0Pn4SgrHoPtGhB4vg0T2QIDAQABo4IB
// SIG // gjCCAX4wHwYDVR0lBBgwFgYKKwYBBAGCN0wIAQYIKwYB
// SIG // BQUHAwMwHQYDVR0OBBYEFNFsph+Aj+7NfskJLRMG3C0L
// SIG // kfWcMFQGA1UdEQRNMEukSTBHMS0wKwYDVQQLEyRNaWNy
// SIG // b3NvZnQgSXJlbGFuZCBPcGVyYXRpb25zIExpbWl0ZWQx
// SIG // FjAUBgNVBAUTDTIzMDAxMis0NzA1MzAwHwYDVR0jBBgw
// SIG // FoAUSG5k5VAF04KqFzc3IrVtqMp1ApUwVAYDVR0fBE0w
// SIG // SzBJoEegRYZDaHR0cDovL3d3dy5taWNyb3NvZnQuY29t
// SIG // L3BraW9wcy9jcmwvTWljQ29kU2lnUENBMjAxMV8yMDEx
// SIG // LTA3LTA4LmNybDBhBggrBgEFBQcBAQRVMFMwUQYIKwYB
// SIG // BQUHMAKGRWh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9w
// SIG // a2lvcHMvY2VydHMvTWljQ29kU2lnUENBMjAxMV8yMDEx
// SIG // LTA3LTA4LmNydDAMBgNVHRMBAf8EAjAAMA0GCSqGSIb3
// SIG // DQEBCwUAA4ICAQBOy0rrjTmwgVmLrbcSQIIpVyfdhqcl
// SIG // f304slx2f/S2817PzHypz8EcnZZgNmpNKxliwxYfPcwF
// SIG // hxSPLfSS8KXf1UaFRN/lss0yLJHWwZx239co6P/tLaR5
// SIG // Z66BSXXA0jCLB/k+89wpWPulp40k3raYNWP6Szi12aWY
// SIG // 2Hl0IhcKPRuZc1HEnfGFUDT0ABiApdiUUmgjZcwHSBQh
// SIG // eTzSqF2ybRKg3D2fKA6zPSnTu06lBOVangXug4IGNbGW
// SIG // J0A/vy1pc+Q9MAq4jYBkP01lnsTMMJxKpSMH5CHDRcaN
// SIG // EDQ/+mGvQ0wFMpJNkihkj7dJC7R8TRJ9hib3DbX6IVWP
// SIG // 29LbshdOXlxN3HbWGW3hqFNcUIsT2QJU3bS5nhTZcvNr
// SIG // gVW8mwGeFLdfBf/1K7oFUPVFHStbmJnPtknUUEAnHCsF
// SIG // xjrmIGdVC1truT8n1sc6OAUfvudzgf7WV0Kc+DpIAWXq
// SIG // rPWGmCxXykZUB1bZkIIRR8web/1haJ8Q1Zbz8ctoKGtL
// SIG // vWfmZSKb6KGUb5ujrV8XQIzAXFgQLJwUa/zo+bN+ehA3
// SIG // X9pf7C8CxWBOtbfjBIjWHctKVy+oDdw8U1X9qoycVxZB
// SIG // X4404rJ3bnR7ILhDJPJhLZ78KPXzkik+qER4TPbGeB04
// SIG // P00zI1JY5jd5gWFgFiORMXQtYp7qINMaypjllTCCB3ow
// SIG // ggVioAMCAQICCmEOkNIAAAAAAAMwDQYJKoZIhvcNAQEL
// SIG // BQAwgYgxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNo
// SIG // aW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQK
// SIG // ExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xMjAwBgNVBAMT
// SIG // KU1pY3Jvc29mdCBSb290IENlcnRpZmljYXRlIEF1dGhv
// SIG // cml0eSAyMDExMB4XDTExMDcwODIwNTkwOVoXDTI2MDcw
// SIG // ODIxMDkwOVowfjELMAkGA1UEBhMCVVMxEzARBgNVBAgT
// SIG // Cldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
// SIG // BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEoMCYG
// SIG // A1UEAxMfTWljcm9zb2Z0IENvZGUgU2lnbmluZyBQQ0Eg
// SIG // MjAxMTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoC
// SIG // ggIBAKvw+nIQHC6t2G6qghBNNLrytlghn0IbKmvpWlCq
// SIG // uAY4GgRJun/DDB7dN2vGEtgL8DjCmQawyDnVARQxQtOJ
// SIG // DXlkh36UYCRsr55JnOloXtLfm1OyCizDr9mpK656Ca/X
// SIG // llnKYBoF6WZ26DJSJhIv56sIUM+zRLdd2MQuA3WraPPL
// SIG // bfM6XKEW9Ea64DhkrG5kNXimoGMPLdNAk/jj3gcN1Vx5
// SIG // pUkp5w2+oBN3vpQ97/vjK1oQH01WKKJ6cuASOrdJXtjt
// SIG // 7UORg9l7snuGG9k+sYxd6IlPhBryoS9Z5JA7La4zWMW3
// SIG // Pv4y07MDPbGyr5I4ftKdgCz1TlaRITUlwzluZH9TupwP
// SIG // rRkjhMv0ugOGjfdf8NBSv4yUh7zAIXQlXxgotswnKDgl
// SIG // mDlKNs98sZKuHCOnqWbsYR9q4ShJnV+I4iVd0yFLPlLE
// SIG // tVc/JAPw0XpbL9Uj43BdD1FGd7P4AOG8rAKCX9vAFbO9
// SIG // G9RVS+c5oQ/pI0m8GLhEfEXkwcNyeuBy5yTfv0aZxe/C
// SIG // HFfbg43sTUkwp6uO3+xbn6/83bBm4sGXgXvt1u1L50kp
// SIG // pxMopqd9Z4DmimJ4X7IvhNdXnFy/dygo8e1twyiPLI9A
// SIG // N0/B4YVEicQJTMXUpUMvdJX3bvh4IFgsE11glZo+TzOE
// SIG // 2rCIF96eTvSWsLxGoGyY0uDWiIwLAgMBAAGjggHtMIIB
// SIG // 6TAQBgkrBgEEAYI3FQEEAwIBADAdBgNVHQ4EFgQUSG5k
// SIG // 5VAF04KqFzc3IrVtqMp1ApUwGQYJKwYBBAGCNxQCBAwe
// SIG // CgBTAHUAYgBDAEEwCwYDVR0PBAQDAgGGMA8GA1UdEwEB
// SIG // /wQFMAMBAf8wHwYDVR0jBBgwFoAUci06AjGQQ7kUBU7h
// SIG // 6qfHMdEjiTQwWgYDVR0fBFMwUTBPoE2gS4ZJaHR0cDov
// SIG // L2NybC5taWNyb3NvZnQuY29tL3BraS9jcmwvcHJvZHVj
// SIG // dHMvTWljUm9vQ2VyQXV0MjAxMV8yMDExXzAzXzIyLmNy
// SIG // bDBeBggrBgEFBQcBAQRSMFAwTgYIKwYBBQUHMAKGQmh0
// SIG // dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2kvY2VydHMv
// SIG // TWljUm9vQ2VyQXV0MjAxMV8yMDExXzAzXzIyLmNydDCB
// SIG // nwYDVR0gBIGXMIGUMIGRBgkrBgEEAYI3LgMwgYMwPwYI
// SIG // KwYBBQUHAgEWM2h0dHA6Ly93d3cubWljcm9zb2Z0LmNv
// SIG // bS9wa2lvcHMvZG9jcy9wcmltYXJ5Y3BzLmh0bTBABggr
// SIG // BgEFBQcCAjA0HjIgHQBMAGUAZwBhAGwAXwBwAG8AbABp
// SIG // AGMAeQBfAHMAdABhAHQAZQBtAGUAbgB0AC4gHTANBgkq
// SIG // hkiG9w0BAQsFAAOCAgEAZ/KGpZjgVHkaLtPYdGcimwuW
// SIG // EeFjkplCln3SeQyQwWVfLiw++MNy0W2D/r4/6ArKO79H
// SIG // qaPzadtjvyI1pZddZYSQfYtGUFXYDJJ80hpLHPM8QotS
// SIG // 0LD9a+M+By4pm+Y9G6XUtR13lDni6WTJRD14eiPzE32m
// SIG // kHSDjfTLJgJGKsKKELukqQUMm+1o+mgulaAqPyprWElj
// SIG // HwlpblqYluSD9MCP80Yr3vw70L01724lruWvJ+3Q3fMO
// SIG // r5kol5hNDj0L8giJ1h/DMhji8MUtzluetEk5CsYKwsat
// SIG // ruWy2dsViFFFWDgycScaf7H0J/jeLDogaZiyWYlobm+n
// SIG // t3TDQAUGpgEqKD6CPxNNZgvAs0314Y9/HG8VfUWnduVA
// SIG // KmWjw11SYobDHWM2l4bf2vP48hahmifhzaWX0O5dY0Hj
// SIG // Wwechz4GdwbRBrF1HxS+YWG18NzGGwS+30HHDiju3mUv
// SIG // 7Jf2oVyW2ADWoUa9WfOXpQlLSBCZgB/QACnFsZulP0V3
// SIG // HjXG0qKin3p6IvpIlR+r+0cjgPWe+L9rt0uX4ut1eBrs
// SIG // 6jeZeRhL/9azI2h15q/6/IvrC4DqaTuv/DDtBEyO3991
// SIG // bWORPdGdVk5Pv4BXIqF4ETIheu9BCrE/+6jMpF3BoYib
// SIG // V3FWTkhFwELJm3ZbCoBIa/15n8G9bW1qyVJzEw16UM0x
// SIG // ghl2MIIZcgIBATCBlTB+MQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MSgwJgYDVQQDEx9NaWNyb3NvZnQgQ29kZSBTaWduaW5n
// SIG // IFBDQSAyMDExAhMzAAACzfNkv/jUTF1RAAAAAALNMA0G
// SIG // CWCGSAFlAwQCAQUAoIGuMBkGCSqGSIb3DQEJAzEMBgor
// SIG // BgEEAYI3AgEEMBwGCisGAQQBgjcCAQsxDjAMBgorBgEE
// SIG // AYI3AgEVMC8GCSqGSIb3DQEJBDEiBCCZVYFyYEoi3y7R
// SIG // DRBueLiGc5o9pbPbkGvFLdOb5I7MMTBCBgorBgEEAYI3
// SIG // AgEMMTQwMqAUgBIATQBpAGMAcgBvAHMAbwBmAHShGoAY
// SIG // aHR0cDovL3d3dy5taWNyb3NvZnQuY29tMA0GCSqGSIb3
// SIG // DQEBAQUABIIBAFc/7tNKOjsS4eWqYKDfHsYnUnEJ5/Ns
// SIG // 2bQYZvuw7/sd/RcRMUiW6wWWB4M7KGdNk6qyidJdzO0P
// SIG // cG7Aetw8AWqjXe24tLQ9crv+7BDjb75a8xW6pFV0Y61P
// SIG // C4xNGOol7a1a7TBM+Y6+wPTbx+3UhIfBk3181k+eoYjc
// SIG // +frxa8+Xowq5MBQ6OqTpzgdbNV7I3HFVXp2D7KAkWa5V
// SIG // 5034Bk1TnIl7oOnAExEKWZpPmnVCcn0oI25MiZwpbNwz
// SIG // Q8MWarMC3EaqApUj09ZyxklZKthSc8XtTL681a6VKiKh
// SIG // 9bdznFToJw/USUie2LdjPa99/JZ+Gnhc6gHwIWy0iC6K
// SIG // znChghcAMIIW/AYKKwYBBAGCNwMDATGCFuwwghboBgkq
// SIG // hkiG9w0BBwKgghbZMIIW1QIBAzEPMA0GCWCGSAFlAwQC
// SIG // AQUAMIIBUQYLKoZIhvcNAQkQAQSgggFABIIBPDCCATgC
// SIG // AQEGCisGAQQBhFkKAwEwMTANBglghkgBZQMEAgEFAAQg
// SIG // aNsPBYFU+ZVQpmwqaZonHMQxttTLqmyr5+oZ5ku1fu0C
// SIG // BmPueaDEjBgTMjAyMzAzMTUyMTA1MzQuNTAxWjAEgAIB
// SIG // 9KCB0KSBzTCByjELMAkGA1UEBhMCVVMxEzARBgNVBAgT
// SIG // Cldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
// SIG // BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjElMCMG
// SIG // A1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3BlcmF0aW9u
// SIG // czEmMCQGA1UECxMdVGhhbGVzIFRTUyBFU046NDlCQy1F
// SIG // MzdBLTIzM0MxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1l
// SIG // LVN0YW1wIFNlcnZpY2WgghFXMIIHDDCCBPSgAwIBAgIT
// SIG // MwAAAcBVpI3DZBXFSwABAAABwDANBgkqhkiG9w0BAQsF
// SIG // ADB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGlu
// SIG // Z3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV
// SIG // TWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1N
// SIG // aWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMDAeFw0y
// SIG // MjExMDQxOTAxMjVaFw0yNDAyMDIxOTAxMjVaMIHKMQsw
// SIG // CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQ
// SIG // MA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9z
// SIG // b2Z0IENvcnBvcmF0aW9uMSUwIwYDVQQLExxNaWNyb3Nv
// SIG // ZnQgQW1lcmljYSBPcGVyYXRpb25zMSYwJAYDVQQLEx1U
// SIG // aGFsZXMgVFNTIEVTTjo0OUJDLUUzN0EtMjMzQzElMCMG
// SIG // A1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2Vydmlj
// SIG // ZTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIB
// SIG // ALztYPtjYYZgUL5RpQkzjGhcN42yIVHQ06pGkIUaXR1W
// SIG // /oblP9BzYS5qEWL66e8+byKC9TDwJFQRViSJK3Bu7Eq3
// SIG // nZ8mcK3mNtOwvZ/F4ry/WQTkHolHi/0zJSelYp63Gn24
// SIG // XZ5DTuSQ5T6MwvXRskorm68nbORirbuvQ9cDWrfQyEJe
// SIG // mpRTuqZ3GSuESM37/is5DO0ZGN7x6YVdAvBBVKRfpcrG
// SIG // hiVxX/ULFFB8I/Vylh33PQX4S6AkXl1M74K7KXRZlZwP
// SIG // QE2F5onUo67IX/APhNPxaU3YVzyPV16rGQxwaq+w5WKE
// SIG // glN5b61Q0btaeaRx3+7N5DNeh6Sumqw7WN2otbKAEphK
// SIG // b9wtjf8uTAwQKQ3eEqUpCzGu/unrP3Wnku83R9anQmtk
// SIG // aCTzOhIf+mJgX6H4Xy0KHyjyZd+AC5WViuQM1bRUTTl2
// SIG // nKI+jABtnU/EXOX6Sgh9RN5+2Y3tHStuEFX0r/2DscOd
// SIG // hAmjC5VuT4R092SDTWgpkYHBwkwpTiswthTq9N2AXNsz
// SIG // zlumyFXV5aD5gTFWhPrYV6j5gDQcNGLJ3GjpFYIIw2+T
// SIG // uVajqffDJJR6SaCSOqZOcwJcfPzrQuxbra3bWDVAuspF
// SIG // 8zADxbmJFhoMf1uwNIrSlvFs2M8Dt2wIaa8M56LhmZkY
// SIG // sNpPKXp/NAc6s3cj72808ULDAgMBAAGjggE2MIIBMjAd
// SIG // BgNVHQ4EFgQUAETGePNI8KStz+qrlVlBCdHN9IUwHwYD
// SIG // VR0jBBgwFoAUn6cVXQBeYl2D9OXSZacbUzUZ6XIwXwYD
// SIG // VR0fBFgwVjBUoFKgUIZOaHR0cDovL3d3dy5taWNyb3Nv
// SIG // ZnQuY29tL3BraW9wcy9jcmwvTWljcm9zb2Z0JTIwVGlt
// SIG // ZS1TdGFtcCUyMFBDQSUyMDIwMTAoMSkuY3JsMGwGCCsG
// SIG // AQUFBwEBBGAwXjBcBggrBgEFBQcwAoZQaHR0cDovL3d3
// SIG // dy5taWNyb3NvZnQuY29tL3BraW9wcy9jZXJ0cy9NaWNy
// SIG // b3NvZnQlMjBUaW1lLVN0YW1wJTIwUENBJTIwMjAxMCgx
// SIG // KS5jcnQwDAYDVR0TAQH/BAIwADATBgNVHSUEDDAKBggr
// SIG // BgEFBQcDCDANBgkqhkiG9w0BAQsFAAOCAgEArU4dBEJ9
// SIG // epCkMgnlZPVXNdJui9BMC0aNwE0aLj+2HdoVnhAdmOGR
// SIG // eAiSnvan11hiSs1e7TFJugwLASmB/50/vMmyPLiYhxp3
// SIG // 51Yukoe4BY506X4dY9U/dB/7i3qBY6Tp//nqAqCZqK1u
// SIG // Rm9ns5U5aOSNJDQLm8bQsamy4s7jzT6G/JEQCkIL/uPw
// SIG // gtSZolBRtLiiDZSo/UrB3K1ngQUB1+tpzYM4iME+OCah
// SIG // 6wNNiOnJkAIvQWXLH+ezji6UWJc6Dx98f/pXUsklwJsi
// SIG // 6trkm1rULg/OCP9GYEvweS93sKk3YhNSmyl/PTFuSagi
// SIG // v8iP5gCEGppgJRz6lPXmWUzDzh0LNF66Qoo5ZPqsqNiW
// SIG // h4sksMOp7j6l81N7BI91VtNGIlUmsihLtSK0c819y2vK
// SIG // nujqi07yv+oLuV3Squ00/OdpweiD9EDPgbnba+BW8eP7
// SIG // L6ShxqSvf8wbmhxw11+QKEpLIf5Eg2Cn3n0CISH0CSc6
// SIG // BN1/jIpjCa4K8GV5bW+o9SC9B2N6gqWtNxoYItCE86n5
// SIG // MNzGp9xvJAdUJfknjXIj1I+9yp9r3iXpxi7U/CZFDPUV
// SIG // ItMKDtIrmOLSZ2Lkvknqmr11DlqlGFWNfRSK9Ty6qZlp
// SIG // G6zucSo5Mjh6AJi8YzWyozp5AMH7ftRtNJLpSqs6j25v
// SIG // kp/uOybBkBYTRm0wggdxMIIFWaADAgECAhMzAAAAFcXn
// SIG // a54Cm0mZAAAAAAAVMA0GCSqGSIb3DQEBCwUAMIGIMQsw
// SIG // CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQ
// SIG // MA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9z
// SIG // b2Z0IENvcnBvcmF0aW9uMTIwMAYDVQQDEylNaWNyb3Nv
// SIG // ZnQgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkgMjAx
// SIG // MDAeFw0yMTA5MzAxODIyMjVaFw0zMDA5MzAxODMyMjVa
// SIG // MHwxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5n
// SIG // dG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
// SIG // aWNyb3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1p
// SIG // Y3Jvc29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwMIICIjAN
// SIG // BgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA5OGmTOe0
// SIG // ciELeaLL1yR5vQ7VgtP97pwHB9KpbE51yMo1V/YBf2xK
// SIG // 4OK9uT4XYDP/XE/HZveVU3Fa4n5KWv64NmeFRiMMtY0T
// SIG // z3cywBAY6GB9alKDRLemjkZrBxTzxXb1hlDcwUTIcVxR
// SIG // MTegCjhuje3XD9gmU3w5YQJ6xKr9cmmvHaus9ja+NSZk
// SIG // 2pg7uhp7M62AW36MEBydUv626GIl3GoPz130/o5Tz9bs
// SIG // hVZN7928jaTjkY+yOSxRnOlwaQ3KNi1wjjHINSi947SH
// SIG // JMPgyY9+tVSP3PoFVZhtaDuaRr3tpK56KTesy+uDRedG
// SIG // bsoy1cCGMFxPLOJiss254o2I5JasAUq7vnGpF1tnYN74
// SIG // kpEeHT39IM9zfUGaRnXNxF803RKJ1v2lIH1+/NmeRd+2
// SIG // ci/bfV+AutuqfjbsNkz2K26oElHovwUDo9Fzpk03dJQc
// SIG // NIIP8BDyt0cY7afomXw/TNuvXsLz1dhzPUNOwTM5TI4C
// SIG // vEJoLhDqhFFG4tG9ahhaYQFzymeiXtcodgLiMxhy16cg
// SIG // 8ML6EgrXY28MyTZki1ugpoMhXV8wdJGUlNi5UPkLiWHz
// SIG // NgY1GIRH29wb0f2y1BzFa/ZcUlFdEtsluq9QBXpsxREd
// SIG // cu+N+VLEhReTwDwV2xo3xwgVGD94q0W29R6HXtqPnhZy
// SIG // acaue7e3PmriLq0CAwEAAaOCAd0wggHZMBIGCSsGAQQB
// SIG // gjcVAQQFAgMBAAEwIwYJKwYBBAGCNxUCBBYEFCqnUv5k
// SIG // xJq+gpE8RjUpzxD/LwTuMB0GA1UdDgQWBBSfpxVdAF5i
// SIG // XYP05dJlpxtTNRnpcjBcBgNVHSAEVTBTMFEGDCsGAQQB
// SIG // gjdMg30BATBBMD8GCCsGAQUFBwIBFjNodHRwOi8vd3d3
// SIG // Lm1pY3Jvc29mdC5jb20vcGtpb3BzL0RvY3MvUmVwb3Np
// SIG // dG9yeS5odG0wEwYDVR0lBAwwCgYIKwYBBQUHAwgwGQYJ
// SIG // KwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwCwYDVR0PBAQD
// SIG // AgGGMA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0jBBgwFoAU
// SIG // 1fZWy4/oolxiaNE9lJBb186aGMQwVgYDVR0fBE8wTTBL
// SIG // oEmgR4ZFaHR0cDovL2NybC5taWNyb3NvZnQuY29tL3Br
// SIG // aS9jcmwvcHJvZHVjdHMvTWljUm9vQ2VyQXV0XzIwMTAt
// SIG // MDYtMjMuY3JsMFoGCCsGAQUFBwEBBE4wTDBKBggrBgEF
// SIG // BQcwAoY+aHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3Br
// SIG // aS9jZXJ0cy9NaWNSb29DZXJBdXRfMjAxMC0wNi0yMy5j
// SIG // cnQwDQYJKoZIhvcNAQELBQADggIBAJ1VffwqreEsH2cB
// SIG // MSRb4Z5yS/ypb+pcFLY+TkdkeLEGk5c9MTO1OdfCcTY/
// SIG // 2mRsfNB1OW27DzHkwo/7bNGhlBgi7ulmZzpTTd2YurYe
// SIG // eNg2LpypglYAA7AFvonoaeC6Ce5732pvvinLbtg/SHUB
// SIG // 2RjebYIM9W0jVOR4U3UkV7ndn/OOPcbzaN9l9qRWqveV
// SIG // tihVJ9AkvUCgvxm2EhIRXT0n4ECWOKz3+SmJw7wXsFSF
// SIG // QrP8DJ6LGYnn8AtqgcKBGUIZUnWKNsIdw2FzLixre24/
// SIG // LAl4FOmRsqlb30mjdAy87JGA0j3mSj5mO0+7hvoyGtmW
// SIG // 9I/2kQH2zsZ0/fZMcm8Qq3UwxTSwethQ/gpY3UA8x1Rt
// SIG // nWN0SCyxTkctwRQEcb9k+SS+c23Kjgm9swFXSVRk2XPX
// SIG // fx5bRAGOWhmRaw2fpCjcZxkoJLo4S5pu+yFUa2pFEUep
// SIG // 8beuyOiJXk+d0tBMdrVXVAmxaQFEfnyhYWxz/gq77EFm
// SIG // PWn9y8FBSX5+k77L+DvktxW/tM4+pTFRhLy/AsGConsX
// SIG // HRWJjXD+57XQKBqJC4822rpM+Zv/Cuk0+CQ1ZyvgDbjm
// SIG // jJnW4SLq8CdCPSWU5nR0W2rRnj7tfqAxM328y+l7vzhw
// SIG // RNGQ8cirOoo6CGJ/2XBjU02N7oJtpQUQwXEGahC0HVUz
// SIG // WLOhcGbyoYICzjCCAjcCAQEwgfihgdCkgc0wgcoxCzAJ
// SIG // BgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAw
// SIG // DgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3Nv
// SIG // ZnQgQ29ycG9yYXRpb24xJTAjBgNVBAsTHE1pY3Jvc29m
// SIG // dCBBbWVyaWNhIE9wZXJhdGlvbnMxJjAkBgNVBAsTHVRo
// SIG // YWxlcyBUU1MgRVNOOjQ5QkMtRTM3QS0yMzNDMSUwIwYD
// SIG // VQQDExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2aWNl
// SIG // oiMKAQEwBwYFKw4DAhoDFQAQEOxMRdfSpMFS9RNwHfJN
// SIG // D3m+naCBgzCBgKR+MHwxCzAJBgNVBAYTAlVTMRMwEQYD
// SIG // VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25k
// SIG // MR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24x
// SIG // JjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1wIFBD
// SIG // QSAyMDEwMA0GCSqGSIb3DQEBBQUAAgUA57yOIDAiGA8y
// SIG // MDIzMDMxNjAyMzQwOFoYDzIwMjMwMzE3MDIzNDA4WjB3
// SIG // MD0GCisGAQQBhFkKBAExLzAtMAoCBQDnvI4gAgEAMAoC
// SIG // AQACAgZBAgH/MAcCAQACAkq3MAoCBQDnvd+gAgEAMDYG
// SIG // CisGAQQBhFkKBAIxKDAmMAwGCisGAQQBhFkKAwKgCjAI
// SIG // AgEAAgMHoSChCjAIAgEAAgMBhqAwDQYJKoZIhvcNAQEF
// SIG // BQADgYEAYgYzJFbPC1ERZa4gVEq/vhgT0WJn7GZU2SFO
// SIG // BDIXy+lc9nM0vq9+CCuhYJMyslX8nbtcpwMDWxNwj46f
// SIG // pdWZEsDgc9TgkuElfntBOMvDpuf+1B+9Uy7lJo25sX4H
// SIG // pd2tiAQQuAx478IohQ8jkVGGVeL+Q1ku9s/Clsz2bT7J
// SIG // QLUxggQNMIIECQIBATCBkzB8MQswCQYDVQQGEwJVUzET
// SIG // MBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVk
// SIG // bW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0
// SIG // aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFt
// SIG // cCBQQ0EgMjAxMAITMwAAAcBVpI3DZBXFSwABAAABwDAN
// SIG // BglghkgBZQMEAgEFAKCCAUowGgYJKoZIhvcNAQkDMQ0G
// SIG // CyqGSIb3DQEJEAEEMC8GCSqGSIb3DQEJBDEiBCB1BUX1
// SIG // v1igQ79EcMa49RNtsO5wItV3RBaYqhPLSykrMTCB+gYL
// SIG // KoZIhvcNAQkQAi8xgeowgecwgeQwgb0EIFrxWKJSCFzB
// SIG // NMyv1ul7ApJGF+5WDW/cgPCccGNOD5NPMIGYMIGApH4w
// SIG // fDELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0
// SIG // b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1p
// SIG // Y3Jvc29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWlj
// SIG // cm9zb2Z0IFRpbWUtU3RhbXAgUENBIDIwMTACEzMAAAHA
// SIG // VaSNw2QVxUsAAQAAAcAwIgQgl+nAbN6PyCLUy+wcFygw
// SIG // n40ZUtbHYbd33KUwnDX50pEwDQYJKoZIhvcNAQELBQAE
// SIG // ggIAcLfYWMfF/TFfq//h0sddVkMO9xhoK55vzufYB0ie
// SIG // hIxmF5SURcuRLed+NRKRL2OEwrZBNAU0EC1QgRSZqZkk
// SIG // YvYbr551D6QBUhNsucJwmhLc2XBnN4kyJXeIDRS/Ijoz
// SIG // yRdKMx5Uen0awH8mVUiiLxNVu465VK6sdd8Bqu6019qW
// SIG // AF1himkAVoI8qvd/qkggjmbPQHIyVny80KDNHcuujwma
// SIG // kZ81lm4JxaGiAEhJUKU1fdkt2sQ4Ehogg4hxSsi/gdC1
// SIG // L9k4jboO/x+GkS179JwhJ0J0+Bpk1kxUkzJxnmm1U6NL
// SIG // 55jhLeOeMCH9X72F/IR0dpddDHpnCWFlbR0eLX6Rc8JI
// SIG // 0lxDzcb6GsGqBC3dbCdoTkW73HgB5FnOzDXjWT89qnr/
// SIG // ysy4nnTgMoFNWnbyD2PDEIMeNyPa8xivEm2DY2fY3Ojm
// SIG // Dx1stBoZdgrFDeLp0hRKqMG2ohxgEJzxrAFptlRHhHvf
// SIG // +7ZoLk0FVa0Zsb51CpuLgxq3+QBovC2ZoNw4m+k1l998
// SIG // VsPkq5ttpkgI5irt10F/8WlXaFABSRET0lOLIVJiCDJi
// SIG // dRnkAFGnbZE8QHJiT/hr+/vNlQUg9I36c5uB0QrOlw1R
// SIG // FBGWdpe7aEnDCqeql97g1L+xSQ7ELtnaUc4dDYu+S8W6
// SIG // H8702RVHrJ29nVYxKdna+lECAk8=
// SIG // End signature block
