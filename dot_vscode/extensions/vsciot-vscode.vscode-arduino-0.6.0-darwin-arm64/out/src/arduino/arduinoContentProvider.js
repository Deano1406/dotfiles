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
exports.ArduinoContentProvider = void 0;
const path = require("path");
const Uuid = require("uuid/v4");
const vscode = require("vscode");
const arduinoActivator_1 = require("../arduinoActivator");
const arduinoContext_1 = require("../arduinoContext");
const Constants = require("../common/constants");
const JSONHelper = require("../common/cycle");
const deviceContext_1 = require("../deviceContext");
const Logger = require("../logger/logger");
const localWebServer_1 = require("./localWebServer");
class ArduinoContentProvider {
    constructor(_extensionPath) {
        this._extensionPath = _extensionPath;
        this._onDidChange = new vscode.EventEmitter();
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this._webserver = new localWebServer_1.default(this._extensionPath);
            // Arduino Boards Manager
            this.addHandlerWithLogger("show-boardmanager", "/boardmanager", (req, res) => this.getHtmlView(req, res));
            this.addHandlerWithLogger("show-packagemanager", "/api/boardpackages", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.getBoardPackages(req, res); }));
            this.addHandlerWithLogger("install-board", "/api/installboard", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.installPackage(req, res); }), true);
            this.addHandlerWithLogger("uninstall-board", "/api/uninstallboard", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.uninstallPackage(req, res); }), true);
            this.addHandlerWithLogger("open-link", "/api/openlink", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.openLink(req, res); }), true);
            this.addHandlerWithLogger("open-settings", "/api/opensettings", (req, res) => this.openSettings(req, res), true);
            // Arduino Libraries Manager
            this.addHandlerWithLogger("show-librarymanager", "/librarymanager", (req, res) => this.getHtmlView(req, res));
            this.addHandlerWithLogger("load-libraries", "/api/libraries", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.getLibraries(req, res); }));
            this.addHandlerWithLogger("install-library", "/api/installlibrary", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.installLibrary(req, res); }), true);
            this.addHandlerWithLogger("uninstall-library", "/api/uninstalllibrary", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.uninstallLibrary(req, res); }), true);
            this.addHandlerWithLogger("add-libpath", "/api/addlibpath", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.addLibPath(req, res); }), true);
            // Arduino Board Config
            this.addHandlerWithLogger("show-boardconfig", "/boardconfig", (req, res) => this.getHtmlView(req, res));
            this.addHandlerWithLogger("load-installedboards", "/api/installedboards", (req, res) => this.getInstalledBoards(req, res));
            this.addHandlerWithLogger("load-configitems", "/api/configitems", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.getBoardConfig(req, res); }));
            this.addHandlerWithLogger("update-selectedboard", "/api/updateselectedboard", (req, res) => this.updateSelectedBoard(req, res), true);
            this.addHandlerWithLogger("update-config", "/api/updateconfig", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.updateConfig(req, res); }), true);
            this.addHandlerWithLogger("run-command", "/api/runcommand", (req, res) => this.runCommand(req, res), true);
            // Arduino Examples TreeView
            this.addHandlerWithLogger("show-examplesview", "/examples", (req, res) => this.getHtmlView(req, res));
            this.addHandlerWithLogger("load-examples", "/api/examples", (req, res) => __awaiter(this, void 0, void 0, function* () { return yield this.getExamples(req, res); }));
            this.addHandlerWithLogger("open-example", "/api/openexample", (req, res) => this.openExample(req, res), true);
            yield this._webserver.start();
        });
    }
    provideTextDocumentContent(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!arduinoContext_1.default.initialized) {
                yield arduinoActivator_1.default.activate();
            }
            let type = "";
            if (uri.toString() === Constants.BOARD_MANAGER_URI.toString()) {
                type = "boardmanager";
            }
            else if (uri.toString() === Constants.LIBRARY_MANAGER_URI.toString()) {
                type = "librarymanager";
            }
            else if (uri.toString() === Constants.BOARD_CONFIG_URI.toString()) {
                type = "boardConfig";
            }
            else if (uri.toString() === Constants.EXAMPLES_URI.toString()) {
                type = "examples";
            }
            const timeNow = new Date().getTime();
            return `
        <html>
        <head>
            <script type="text/javascript">
                window.onload = function() {
                    console.log('reloaded results window at time ${timeNow}ms');
                    var doc = document.documentElement;
                    var styles = window.getComputedStyle(doc);
                    var backgroundcolor = styles.getPropertyValue('--background-color') || '#1e1e1e';
                    var color = styles.getPropertyValue('--color') || '#d4d4d4';
                    var theme = document.body.className || 'vscode-dark';
                    var url = "${(yield vscode.env.asExternalUri(this._webserver.getEndpointUri(type))).toString()}?" +
                            "theme=" + encodeURIComponent(theme.trim()) +
                            "&backgroundcolor=" + encodeURIComponent(backgroundcolor.trim()) +
                            "&color=" + encodeURIComponent(color.trim());
                    document.getElementById('frame').src = url;
                };
            </script>
        </head>
        <body style="margin: 0; padding: 0; height: 100%; overflow: hidden;">
            <iframe id="frame" width="100%" height="100%" frameborder="0" style="position:absolute; left: 0; right: 0; bottom: 0; top: 0px;"/>
        </body>
        </html>`;
        });
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    update(uri) {
        this._onDidChange.fire(uri);
    }
    getHtmlView(req, res) {
        return res.sendFile(path.join(this._extensionPath, "./out/views/index.html"));
    }
    getBoardPackages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            yield arduinoContext_1.default.boardManager.loadPackages(req.query.update === "true");
            return res.json({
                platforms: JSONHelper.decycle(arduinoContext_1.default.boardManager.platforms, undefined),
            });
        });
    }
    installPackage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.packageName || !req.body.arch) {
                return res.status(400).send("BAD Request! Missing { packageName, arch } parameters!");
            }
            else {
                try {
                    yield arduinoContext_1.default.arduinoApp.installBoard(req.body.packageName, req.body.arch, req.body.version);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Install board failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    uninstallPackage(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.packagePath) {
                return res.status(400).send("BAD Request! Missing { packagePath } parameter!");
            }
            else {
                try {
                    yield arduinoContext_1.default.arduinoApp.uninstallBoard(req.body.boardName, req.body.packagePath);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Uninstall board failed with message "${error}"`);
                }
            }
        });
    }
    openLink(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.link) {
                return res.status(400).send("BAD Request! Missing { link } parameter!");
            }
            else {
                try {
                    yield vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(req.body.link));
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Cannot open the link with error message "${error}"`);
                }
            }
        });
    }
    openSettings(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.query) {
                return res.status(400).send("BAD Request! Missing { query } parameter!");
            }
            else {
                try {
                    yield vscode.commands.executeCommand("workbench.action.openGlobalSettings", { query: req.body.query });
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Cannot open the setting with error message "${error}"`);
                }
            }
        });
    }
    runCommand(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.command) {
                return res.status(400).send("BAD Request! Missing { command } parameter!");
            }
            else {
                try {
                    yield vscode.commands.executeCommand(req.body.command);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Cannot run command with error message "${error}"`);
                }
            }
        });
    }
    getLibraries(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            yield arduinoContext_1.default.arduinoApp.libraryManager.loadLibraries(req.query.update === "true");
            return res.json({
                libraries: arduinoContext_1.default.arduinoApp.libraryManager.libraries,
            });
        });
    }
    installLibrary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.libraryName) {
                return res.status(400).send("BAD Request! Missing { libraryName } parameters!");
            }
            else {
                try {
                    yield arduinoContext_1.default.arduinoApp.installLibrary(req.body.libraryName, req.body.version);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Install library failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    uninstallLibrary(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.libraryPath) {
                return res.status(400).send("BAD Request! Missing { libraryPath } parameters!");
            }
            else {
                try {
                    yield arduinoContext_1.default.arduinoApp.uninstallLibrary(req.body.libraryName, req.body.libraryPath);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Uninstall library failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    addLibPath(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.libraryPath) {
                return res.status(400).send("BAD Request! Missing { libraryPath } parameters!");
            }
            else {
                try {
                    yield arduinoContext_1.default.arduinoApp.includeLibrary(req.body.libraryPath);
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Add library path failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    getInstalledBoards(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const installedBoards = [];
            arduinoContext_1.default.boardManager.installedBoards.forEach((b) => {
                const isSelected = arduinoContext_1.default.boardManager.currentBoard ? b.key === arduinoContext_1.default.boardManager.currentBoard.key : false;
                installedBoards.push({
                    key: b.key,
                    name: b.name,
                    platform: b.platform.name,
                    isSelected,
                });
            });
            return res.json({
                installedBoards: JSONHelper.decycle(installedBoards, undefined),
            });
        });
    }
    getBoardConfig(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            return res.json({
                configitems: (arduinoContext_1.default.boardManager.currentBoard === null) ? null : arduinoContext_1.default.boardManager.currentBoard.configItems,
            });
        });
    }
    updateSelectedBoard(req, res) {
        if (!req.body.boardId) {
            return res.status(400).send("BAD Request! Missing parameters!");
        }
        else {
            try {
                const bd = arduinoContext_1.default.boardManager.installedBoards.get(req.body.boardId);
                arduinoContext_1.default.boardManager.doChangeBoardType(bd);
                return res.json({
                    status: "OK",
                });
            }
            catch (error) {
                return res.status(500).send(`Update board config failed with message "code:${error.code}, err:${error.stderr}"`);
            }
        }
    }
    updateConfig(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!req.body.configId || !req.body.optionId) {
                return res.status(400).send("BAD Request! Missing parameters!");
            }
            else {
                try {
                    arduinoContext_1.default.boardManager.currentBoard.updateConfig(req.body.configId, req.body.optionId);
                    const dc = deviceContext_1.DeviceContext.getInstance();
                    dc.configuration = arduinoContext_1.default.boardManager.currentBoard.customConfig;
                    return res.json({
                        status: "OK",
                    });
                }
                catch (error) {
                    return res.status(500).send(`Update board config failed with message "code:${error.code}, err:${error.stderr}"`);
                }
            }
        });
    }
    getExamples(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const examples = yield arduinoContext_1.default.arduinoApp.exampleManager.loadExamples();
            return res.json({
                examples,
            });
        });
    }
    openExample(req, res) {
        if (!req.body.examplePath) {
            return res.status(400).send("BAD Request! Missing { examplePath } parameter!");
        }
        else {
            try {
                arduinoContext_1.default.arduinoApp.openExample(req.body.examplePath);
                return res.json({
                    status: "OK",
                });
            }
            catch (error) {
                return res.status(500).send(`Cannot open the example folder with error message "${error}"`);
            }
        }
    }
    addHandlerWithLogger(handlerName, url, handler, post = false) {
        const wrappedHandler = (req, res) => __awaiter(this, void 0, void 0, function* () {
            const guid = Uuid().replace(/-/g, "");
            let properties = {};
            if (post) {
                properties = Object.assign({}, req.body);
                // Removal requirement for GDPR
                if ("install-board" === handlerName) {
                    const packageNameKey = "packageName";
                    delete properties[packageNameKey];
                }
            }
            Logger.traceUserData(`start-` + handlerName, Object.assign({ correlationId: guid }, properties));
            const timer1 = new Logger.Timer();
            try {
                yield Promise.resolve(handler(req, res));
            }
            catch (error) {
                Logger.traceError("expressHandlerError", error, Object.assign({ correlationId: guid, handlerName }, properties));
            }
            Logger.traceUserData(`end-` + handlerName, { correlationId: guid, duration: timer1.end() });
        });
        if (post) {
            this._webserver.addPostHandler(url, wrappedHandler);
        }
        else {
            this._webserver.addHandler(url, wrappedHandler);
        }
    }
}
exports.ArduinoContentProvider = ArduinoContentProvider;

//# sourceMappingURL=arduinoContentProvider.js.map

// SIG // Begin signature block
// SIG // MIInoAYJKoZIhvcNAQcCoIInkTCCJ40CAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // wDDx049HCH3V4HJF6brhG1ZyBw7NiC8pAkfmf4SFSFeg
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
// SIG // ghlzMIIZbwIBATCBlTB+MQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MSgwJgYDVQQDEx9NaWNyb3NvZnQgQ29kZSBTaWduaW5n
// SIG // IFBDQSAyMDExAhMzAAACzfNkv/jUTF1RAAAAAALNMA0G
// SIG // CWCGSAFlAwQCAQUAoIGuMBkGCSqGSIb3DQEJAzEMBgor
// SIG // BgEEAYI3AgEEMBwGCisGAQQBgjcCAQsxDjAMBgorBgEE
// SIG // AYI3AgEVMC8GCSqGSIb3DQEJBDEiBCDvaSnttQpFweeE
// SIG // CiKmcEOWo0Hgugjxme7enEB3C2u0STBCBgorBgEEAYI3
// SIG // AgEMMTQwMqAUgBIATQBpAGMAcgBvAHMAbwBmAHShGoAY
// SIG // aHR0cDovL3d3dy5taWNyb3NvZnQuY29tMA0GCSqGSIb3
// SIG // DQEBAQUABIIBAJN93tzWl5bBWF1Lyl6YaLh+TwXR6d6E
// SIG // oAmB3JrE8zcXQg3HG6s7IGY6nIROfiGT4aH3AF/xEHgA
// SIG // yrkZnPrOkf0mkeFwKOPlTijLUFeyZO1TWwuXXNJVz1SE
// SIG // 3v+aiSerW5+41s9rAn1fgWPpnzxZkKw9DakcWn5qTTt0
// SIG // CSmt1vTWCtLGXoWH/up+X/HzWtCx9pw7D2qTdb14CqYK
// SIG // L5XclGXV5twT4xSKUDR99rK1eUX6AeFXRYXg2UbQ0uDU
// SIG // zf4z9j2Dz8TKhHeILKvbWJvPNb9gKScillTQmAXYo1oz
// SIG // ZCX1sfns9aMqamZ/e8aWPKdro7kG4LclVJQ/COOtQIH3
// SIG // xwGhghb9MIIW+QYKKwYBBAGCNwMDATGCFukwghblBgkq
// SIG // hkiG9w0BBwKgghbWMIIW0gIBAzEPMA0GCWCGSAFlAwQC
// SIG // AQUAMIIBUQYLKoZIhvcNAQkQAQSgggFABIIBPDCCATgC
// SIG // AQEGCisGAQQBhFkKAwEwMTANBglghkgBZQMEAgEFAAQg
// SIG // GJooYeFgeRtJZkOG2Wvip5ceK4VsMMor8J1BEvslFWcC
// SIG // BmPuGFiM1BgTMjAyMzAzMTUyMTA1MzUuMjM4WjAEgAIB
// SIG // 9KCB0KSBzTCByjELMAkGA1UEBhMCVVMxEzARBgNVBAgT
// SIG // Cldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
// SIG // BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjElMCMG
// SIG // A1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3BlcmF0aW9u
// SIG // czEmMCQGA1UECxMdVGhhbGVzIFRTUyBFU046REQ4Qy1F
// SIG // MzM3LTJGQUUxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1l
// SIG // LVN0YW1wIFNlcnZpY2WgghFUMIIHDDCCBPSgAwIBAgIT
// SIG // MwAAAcUDzc0hofTvOQABAAABxTANBgkqhkiG9w0BAQsF
// SIG // ADB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGlu
// SIG // Z3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV
// SIG // TWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1N
// SIG // aWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMDAeFw0y
// SIG // MjExMDQxOTAxMzJaFw0yNDAyMDIxOTAxMzJaMIHKMQsw
// SIG // CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQ
// SIG // MA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9z
// SIG // b2Z0IENvcnBvcmF0aW9uMSUwIwYDVQQLExxNaWNyb3Nv
// SIG // ZnQgQW1lcmljYSBPcGVyYXRpb25zMSYwJAYDVQQLEx1U
// SIG // aGFsZXMgVFNTIEVTTjpERDhDLUUzMzctMkZBRTElMCMG
// SIG // A1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2Vydmlj
// SIG // ZTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIB
// SIG // AKtIXbO9Hl9tye6WqaWil0Yc/k0+ySdzr1X9/jfHzacU
// SIG // bOY2OIRL9wVf8ORFl22XTuJt8Y9NZUyP8Q5KvsrY7oj3
// SIG // vMRl7GcQ57b+y9RMzHeYyEqifnmLvJIFdOepqrPHQaOe
// SIG // cWTzz3MX+btfc59OGjEBeT11fwuGS0oxWvSBTXK4m3Tp
// SIG // t5Rlta0ERWto1LLqeoL+t+KuVMB9PVhhrtM/PUW7W8jO
// SIG // eb5gYFlfHnem2Qma3KGCIzC/BUU7xpc56puh7cGXVzMC
// SIG // h092v5C1Ej4hgLKyIBM8+zaQaXjrILPU68Mlk2QTWwcM
// SIG // iAApkN+I/rkeHrdoWZPjR+PSoRCcmA9vnTiGgxgdhFDR
// SIG // UmHMtTJILWbdXkagQdJvmD2M+x46HD8pCmDUGe07/s4J
// SIG // Tn3womsdYzm9LuiGAuV9Sa/AME3LGg8rt6gIcfHBUDfQ
// SIG // w4IlWcPlERWfKMqA5OrCFdZ8ec2S8voTbWpHj1/Uu2PJ
// SIG // 9alnwI6FzxOitP3W08POxDiS/wZSRnCqBU8ra9Mz4PzD
// SIG // SUm+n9mv8A5F6BghliYkKxk8Yzj/kfev5yCBtOXhNS6Z
// SIG // MthTnWDDweA4Vu7QXWWrrXqU07koZoJ/hihEfAKANYEk
// SIG // pNRAuWV+HKaVZ4CaW5TAbvK/7QoXx1XV74mOoQ0oR8EA
// SIG // pmamXm4EmB5x5eLqxPuCumQvAgMBAAGjggE2MIIBMjAd
// SIG // BgNVHQ4EFgQUVOq7OL9ZsTWBv67aS8K1cHpNBWswHwYD
// SIG // VR0jBBgwFoAUn6cVXQBeYl2D9OXSZacbUzUZ6XIwXwYD
// SIG // VR0fBFgwVjBUoFKgUIZOaHR0cDovL3d3dy5taWNyb3Nv
// SIG // ZnQuY29tL3BraW9wcy9jcmwvTWljcm9zb2Z0JTIwVGlt
// SIG // ZS1TdGFtcCUyMFBDQSUyMDIwMTAoMSkuY3JsMGwGCCsG
// SIG // AQUFBwEBBGAwXjBcBggrBgEFBQcwAoZQaHR0cDovL3d3
// SIG // dy5taWNyb3NvZnQuY29tL3BraW9wcy9jZXJ0cy9NaWNy
// SIG // b3NvZnQlMjBUaW1lLVN0YW1wJTIwUENBJTIwMjAxMCgx
// SIG // KS5jcnQwDAYDVR0TAQH/BAIwADATBgNVHSUEDDAKBggr
// SIG // BgEFBQcDCDANBgkqhkiG9w0BAQsFAAOCAgEAjKjefH6z
// SIG // BzknHIivgnZ6+nSvH07IEA3mfW70IwrsTSCWSfdvsaXi
// SIG // kQn916uO6nUcpJClJ2QunR4S8LdX4cMosvy33VUPcn9Y
// SIG // WGf0aU0vs9IZ2qCvj/yAwIlDZt9jVy4QwbtD+Em/7gle
// SIG // IzrjVHJiYaaQUIEFYRcf+eyWJNSwnYyHnv/xq3H25ELY
// SIG // mKG/Tmvdw0o27A9Y6monBJ5HJVDf5hJvWbJwpwNfvzkA
// SIG // 6f/EOHD3x/eCzOCel9DbTQXlcsL1h9MLjGjicx4Aywni
// SIG // VJBRPRxPLAQ1XnZo+szyQCPu6My42KsO4uERW4krX1mU
// SIG // ho8LfpSyUGUVlAnE92h2L06NWFg2bJKIVoO+8PXxdkG4
// SIG // jvQ356qGe0KMx4u0Yj6W44JCTAIa4aXk3/2rdnvfh2JC
// SIG // jm1JoDwKx9Vo4r8JtXez2FrGqy+7uambpN+hm9ZhE0ta
// SIG // ANl19/gt64Lc0aIT/PamVX+/ZVb45oN+DbSAiv6TJPfU
// SIG // gbrYIbYqRUjEHW11J0tqHi7fXCrr9TCbvoCfN6l0zZEN
// SIG // kKocbTUb2xPUKpqiUMOVVv+Emc3taT18cjkzucg6vokS
// SIG // FLm6nkM5lHApIsjbgix1ofDiwiOZiDgtYi7VQ39pcPXl
// SIG // q6KcLuUgybU/2cKiFNam9lPjY5DXI9YWzgwURC2k01nf
// SIG // dUSYlCPZ3CZBoP4wggdxMIIFWaADAgECAhMzAAAAFcXn
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
// SIG // WLOhcGbyoYICyzCCAjQCAQEwgfihgdCkgc0wgcoxCzAJ
// SIG // BgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAw
// SIG // DgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3Nv
// SIG // ZnQgQ29ycG9yYXRpb24xJTAjBgNVBAsTHE1pY3Jvc29m
// SIG // dCBBbWVyaWNhIE9wZXJhdGlvbnMxJjAkBgNVBAsTHVRo
// SIG // YWxlcyBUU1MgRVNOOkREOEMtRTMzNy0yRkFFMSUwIwYD
// SIG // VQQDExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2aWNl
// SIG // oiMKAQEwBwYFKw4DAhoDFQAhABr2F2SSu3FKOtvi7xGE
// SIG // BMe/56CBgzCBgKR+MHwxCzAJBgNVBAYTAlVTMRMwEQYD
// SIG // VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25k
// SIG // MR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24x
// SIG // JjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1wIFBD
// SIG // QSAyMDEwMA0GCSqGSIb3DQEBBQUAAgUA57wr7zAiGA8y
// SIG // MDIzMDMxNTE5MzUxMVoYDzIwMjMwMzE2MTkzNTExWjB0
// SIG // MDoGCisGAQQBhFkKBAExLDAqMAoCBQDnvCvvAgEAMAcC
// SIG // AQACAhjjMAcCAQACAhFAMAoCBQDnvX1vAgEAMDYGCisG
// SIG // AQQBhFkKBAIxKDAmMAwGCisGAQQBhFkKAwKgCjAIAgEA
// SIG // AgMHoSChCjAIAgEAAgMBhqAwDQYJKoZIhvcNAQEFBQAD
// SIG // gYEAhXavzt1ZAkuXj0GEFv3h41DTGxCL4Wq91pVEXBXp
// SIG // Z0CRnzvkFbkie0B+rbqX7eaIDiNi+YEuEt+TR1dtLtkZ
// SIG // ma4lCZr7MtFY3ZwvPMnuGxZ3ujdpyA2ayQrZ43qgA32X
// SIG // xmKWCX35jIaBuzZ+GSFvGtWXAZqrHKvWYxyF2C5DwNox
// SIG // ggQNMIIECQIBATCBkzB8MQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQ
// SIG // Q0EgMjAxMAITMwAAAcUDzc0hofTvOQABAAABxTANBglg
// SIG // hkgBZQMEAgEFAKCCAUowGgYJKoZIhvcNAQkDMQ0GCyqG
// SIG // SIb3DQEJEAEEMC8GCSqGSIb3DQEJBDEiBCCzZETbqzff
// SIG // d3uoZUC7WheiZKHHmFY555ap+n8GSMVTZDCB+gYLKoZI
// SIG // hvcNAQkQAi8xgeowgecwgeQwgb0EIBkBsZH2JHdMCvld
// SIG // PcDtLDvrJvIADMo+RLij6rzUP3yxMIGYMIGApH4wfDEL
// SIG // MAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24x
// SIG // EDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jv
// SIG // c29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9z
// SIG // b2Z0IFRpbWUtU3RhbXAgUENBIDIwMTACEzMAAAHFA83N
// SIG // IaH07zkAAQAAAcUwIgQgmPZ3pTQH8qX2PKfHX6/Ak8re
// SIG // VHfZY8NVJ9qLnMdl8D8wDQYJKoZIhvcNAQELBQAEggIA
// SIG // UMRlPtzoVxPJe27X7aMqYsMsUuUY6JG808fwMs9sq16K
// SIG // YFQpyr/GqNgxkrJjL6X8fHxSuWtdCW9TgdTYkY3xqRvG
// SIG // e3nCKXdZ9j8F8fuOAa8tYA1TznnlYsqav3k5NjcfHhuN
// SIG // gqmsCqHV7vvFv1hiMSaC//g8oQoOv2rfJJE5kAQ6XJ6G
// SIG // hrnsG2mzlw7Uh1edBoFGN6ZvV8Kvti32r5RFaXlV5isP
// SIG // PCTer97fBHoVko+O5ZEemg/j2+76Rno9mb+DzGb42f6f
// SIG // vRPH9Zo/ujmjl7jaH2y8q64OFPG/Id7c1hIzGufyid5+
// SIG // 06vdF0/hnLfvnQ9nlh1EyMDz90lHTULV3tnh6YlzRAOX
// SIG // iv0GJgBzLK+j9hu2se0VKnjQPYqLmbWRNcvnM4y7LeFY
// SIG // RBKleztuBmR8Mo2bay5UMyKpTJ076m688SIe0WmOfsQE
// SIG // 9Y8/plzHeYuRQlZzv2E+V1Iuz78EHQp4mgx0nz3mLr5e
// SIG // 88jOTNPwYosgwbiZzWCot5GxMyhDakWshAcH38DwO+YX
// SIG // NS5R2rVuX86/D+u/RJAjaqXpDOLIWIxj76FvV9i2r4Rt
// SIG // P4ukk+ywZg/KJF5PwhV9ec58rg3QuufNHmjf9Xv7OsFU
// SIG // QgqzgCjxUdPPuCo7MV0OdRErvlaHuobf9/dDcf3Pnxch
// SIG // RlnvmW2Tb1+1zUjc9J1PIGI=
// SIG // End signature block
