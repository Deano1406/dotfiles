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
exports.ArduinoSettings = void 0;
const fs_1 = require("fs");
const os = require("os");
const path = require("path");
const WinReg = require("winreg");
const util = require("../common/util");
const constants_1 = require("../common/constants");
const platform_1 = require("../common/platform");
const Logger = require("../logger/logger");
const vscodeSettings_1 = require("./vscodeSettings");
class ArduinoSettings {
    constructor(_context) {
        this._context = _context;
        this._usingBundledArduinoCli = false;
        this.bundledArduinoCliName = {
            "darwin-arm64": "arduino-cli.app",
            "darwin-x64": "arduino-cli.app",
            "linux-arm64": "arduino-cli.app",
            "linux-armhf": "arduino-cli.app",
            "linux-x64": "arduino-cli.app",
            "win32-ia32": "arduino-cli.exe",
            "win32-x64": "arduino-cli.exe",
        };
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            const platform = os.platform();
            this._commandPath = vscodeSettings_1.VscodeSettings.getInstance().commandPath;
            this._useArduinoCli = vscodeSettings_1.VscodeSettings.getInstance().useArduinoCli;
            yield this.tryResolveArduinoPath();
            if (platform === "win32") {
                yield this.updateWindowsPath();
                if (this._commandPath === "") {
                    this._useArduinoCli ? this._commandPath = "arduino-cli.exe" : this._commandPath = "arduino_debug.exe";
                }
            }
            else if (platform === "linux") {
                if (util.directoryExistsSync(path.join(this._arduinoPath, "portable"))) {
                    this._packagePath = path.join(this._arduinoPath, "portable");
                }
                else {
                    this._packagePath = path.join(process.env.HOME, ".arduino15");
                }
                if (this.preferences.get("sketchbook.path")) {
                    if (util.directoryExistsSync(path.join(this._arduinoPath, "portable"))) {
                        this._sketchbookPath = path.join(this._arduinoPath, "portable", this.preferences.get("sketchbook.path"));
                    }
                    else {
                        this._sketchbookPath = this.preferences.get("sketchbook.path");
                    }
                }
                else {
                    this._sketchbookPath = path.join(process.env.HOME, "Arduino");
                }
                if (this._commandPath === "" && !this._useArduinoCli) {
                    this._commandPath = "arduino";
                }
            }
            else if (platform === "darwin") {
                if (util.directoryExistsSync(path.join(this._arduinoPath, "portable"))) {
                    this._packagePath = path.join(this._arduinoPath, "portable");
                }
                else {
                    this._packagePath = path.join(process.env.HOME, "Library/Arduino15");
                }
                if (this.preferences.get("sketchbook.path")) {
                    if (util.directoryExistsSync(path.join(this._arduinoPath, "portable"))) {
                        this._sketchbookPath = path.join(this._arduinoPath, "portable", this.preferences.get("sketchbook.path"));
                    }
                    else {
                        this._sketchbookPath = this.preferences.get("sketchbook.path");
                    }
                }
                else {
                    this._sketchbookPath = path.join(process.env.HOME, "Documents/Arduino");
                }
                if (this._commandPath === "" && !this._useArduinoCli) {
                    this._commandPath = "/Contents/MacOS/Arduino";
                }
            }
        });
    }
    get arduinoPath() {
        return this._arduinoPath;
    }
    get defaultExamplePath() {
        if (os.platform() === "darwin") {
            return path.join(util.resolveMacArduinoAppPath(this._arduinoPath, this._useArduinoCli), "/Contents/Java/examples");
        }
        else {
            return path.join(this._arduinoPath, "examples");
        }
    }
    get packagePath() {
        return this._packagePath;
    }
    get defaultPackagePath() {
        if (os.platform() === "darwin") {
            return path.join(util.resolveMacArduinoAppPath(this._arduinoPath, this._useArduinoCli), "/Contents/Java/hardware");
        }
        else { // linux and win32.
            return path.join(this._arduinoPath, "hardware");
        }
    }
    get defaultLibPath() {
        if (os.platform() === "darwin") {
            return path.join(util.resolveMacArduinoAppPath(this._arduinoPath, this._useArduinoCli), "/Contents/Java/libraries");
        }
        else { // linux and win32
            return path.join(this._arduinoPath, "libraries");
        }
    }
    get commandPath() {
        const platform = os.platform();
        if (platform === "darwin" && !this._usingBundledArduinoCli) {
            return path.join(util.resolveMacArduinoAppPath(this._arduinoPath, this._useArduinoCli), path.normalize(this._commandPath));
        }
        else {
            return path.join(this._arduinoPath, path.normalize(this._commandPath));
        }
    }
    get sketchbookPath() {
        return this._sketchbookPath;
    }
    get preferencePath() {
        return path.join(this.packagePath, "preferences.txt");
    }
    get preferences() {
        if (!this._preferences) {
            this._preferences = util.parseConfigFile(this.preferencePath);
        }
        return this._preferences;
    }
    get useArduinoCli() {
        return this._useArduinoCli;
    }
    get usingBundledArduinoCli() {
        return this._usingBundledArduinoCli;
    }
    get analyzeOnSettingChange() {
        return vscodeSettings_1.VscodeSettings.getInstance().analyzeOnSettingChange;
    }
    reloadPreferences() {
        this._preferences = util.parseConfigFile(this.preferencePath);
        if (this.preferences.get("sketchbook.path")) {
            if (util.directoryExistsSync(path.join(this._arduinoPath, "portable"))) {
                this._sketchbookPath = path.join(this._arduinoPath, "portable", this.preferences.get("sketchbook.path"));
            }
            else {
                this._sketchbookPath = this.preferences.get("sketchbook.path");
            }
        }
    }
    /**
     * For Windows platform, there are two situations here:
     *  - User change the location of the default *Documents* folder.
     *  - Use the windows store Arduino app.
     */
    updateWindowsPath() {
        return __awaiter(this, void 0, void 0, function* () {
            let folder;
            try {
                folder = yield util.getRegistryValues(WinReg.HKCU, "\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders", "Personal");
            }
            catch (ex) {
            }
            if (!folder) {
                folder = path.join(process.env.USERPROFILE, "Documents");
            }
            // For some case, docFolder parsed from win32 registry looks like "%USERPROFILE%\Documents,
            // Should replace the environment variables with actual value.
            folder = folder.replace(/%([^%]+)%/g, (match, p1) => {
                return process.env[p1];
            });
            if (util.directoryExistsSync(path.join(this._arduinoPath, "portable"))) {
                this._packagePath = path.join(this._arduinoPath, "portable");
            }
            else if (util.fileExistsSync(path.join(this._arduinoPath, "AppxManifest.xml"))) {
                this._packagePath = path.join(folder, "ArduinoData");
            }
            else {
                this._packagePath = path.join(process.env.LOCALAPPDATA, "Arduino15");
            }
            if (this.preferences.get("sketchbook.path")) {
                if (util.directoryExistsSync(path.join(this._arduinoPath, "portable"))) {
                    this._sketchbookPath = path.join(this._arduinoPath, "portable", this.preferences.get("sketchbook.path"));
                }
                else {
                    this._sketchbookPath = this.preferences.get("sketchbook.path");
                }
            }
            else {
                this._sketchbookPath = path.join(folder, "Arduino");
            }
        });
    }
    bundledArduinoCliPath() {
        return __awaiter(this, void 0, void 0, function* () {
            const platform = yield util.getPlatform();
            const name = this.bundledArduinoCliName[platform];
            if (!name) {
                return undefined;
            }
            return this._context.asAbsolutePath(path.join("assets", "platform", platform, "arduino-cli", name));
        });
    }
    tryResolveArduinoPath() {
        return __awaiter(this, void 0, void 0, function* () {
            // Query arduino path sequentially from the following places such as "vscode user settings", "system environment variables",
            // "usual software installation directory for each os".
            // 1. Search vscode user settings first.
            const configValue = vscodeSettings_1.VscodeSettings.getInstance().arduinoPath;
            if (!configValue || !configValue.trim()) {
                // 2. Resolve arduino path from the bundled arduino-cli, if CLI support is enabled.
                const bundledPath = yield this.bundledArduinoCliPath();
                if (bundledPath && this._useArduinoCli && !this._commandPath) {
                    // The extension VSIX stripped the executable bit, so we need to set it.
                    // 0x755 means rwxr-xr-x (read and execute for everyone, write for owner).
                    // There have been reports of the executable bit already being set on M1
                    // Macs, but this call failing, so first check to see if the file is
                    // already executable.
                    // https://github.com/microsoft/vscode-arduino/issues/1599
                    let isExecutable = false;
                    try {
                        yield fs_1.promises.access(bundledPath, fs_1.constants.X_OK);
                        isExecutable = true;
                    }
                    catch (_a) {
                        // Nothing to do. isExecutable is already false.
                    }
                    if (!isExecutable) {
                        try {
                            yield fs_1.promises.chmod(bundledPath, 0o755);
                        }
                        catch (e) {
                            Logger.notifyUserError("arduino-cli-not-executable", e, constants_1.messages.ARDUINO_CLI_NOT_EXECUTABLE + " " + bundledPath);
                        }
                    }
                    this._usingBundledArduinoCli = true;
                    Logger.traceUserData("using-bundled-arduino-cli");
                    this._arduinoPath = path.dirname(bundledPath);
                    this._commandPath = path.basename(bundledPath);
                }
                else {
                    // 3 & 4. Resolve arduino path from system environment variables and usual software installation directory.
                    this._arduinoPath = yield Promise.resolve(platform_1.resolveArduinoPath());
                }
            }
            else {
                this._arduinoPath = configValue;
            }
        });
    }
}
exports.ArduinoSettings = ArduinoSettings;

//# sourceMappingURL=arduinoSettings.js.map

// SIG // Begin signature block
// SIG // MIInoAYJKoZIhvcNAQcCoIInkTCCJ40CAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // jBp9qIU/R1PDkcCDWprw1jcGNCXW0CCxuJG5FsrqOD+g
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
// SIG // AYI3AgEVMC8GCSqGSIb3DQEJBDEiBCC/s3pcv19YFG6P
// SIG // nn4PZywFh4bzI4DObWxocU+cQXdBYzBCBgorBgEEAYI3
// SIG // AgEMMTQwMqAUgBIATQBpAGMAcgBvAHMAbwBmAHShGoAY
// SIG // aHR0cDovL3d3dy5taWNyb3NvZnQuY29tMA0GCSqGSIb3
// SIG // DQEBAQUABIIBAMiT6+jBwN+nPdkNgjdtGnXbvKnDZZ0Y
// SIG // d6ErjmhMjY/ZGGS7X+IBUgDH69gdQBuRs6xAhlqtGmgl
// SIG // Ncoh2dqTqYMZWb+dVYBXmZBCCiBQWOdDIlt6TKI7CD3s
// SIG // qz8aFt5+x1eZm9hDzkJNszjc6XenAVEQKorqXcdU8z2w
// SIG // vKvlrRHv09Mq00S/X+7FdXumDPCQREpSLYVEvmeWIt59
// SIG // /41B4dJUXoFJbzF5I515EdjzxR3E317DNoaMrLfTbr73
// SIG // XTIqBbAlV0asPrEwV8MzaebD9N1DdT8OaLBqH01vgq9X
// SIG // oOsdEBkyOxsgwWoUTN8i/DLP6sZyZ59orR0WpovekFdu
// SIG // k5uhghb9MIIW+QYKKwYBBAGCNwMDATGCFukwghblBgkq
// SIG // hkiG9w0BBwKgghbWMIIW0gIBAzEPMA0GCWCGSAFlAwQC
// SIG // AQUAMIIBUQYLKoZIhvcNAQkQAQSgggFABIIBPDCCATgC
// SIG // AQEGCisGAQQBhFkKAwEwMTANBglghkgBZQMEAgEFAAQg
// SIG // l/BGQKZR+jihqQNqeFclZxBDW5QtPeKPE34+r14xVmsC
// SIG // BmPuZNDTMhgTMjAyMzAzMTUyMTA1MzUuOTMxWjAEgAIB
// SIG // 9KCB0KSBzTCByjELMAkGA1UEBhMCVVMxEzARBgNVBAgT
// SIG // Cldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
// SIG // BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjElMCMG
// SIG // A1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3BlcmF0aW9u
// SIG // czEmMCQGA1UECxMdVGhhbGVzIFRTUyBFU046RTVBNi1F
// SIG // MjdDLTU5MkUxJTAjBgNVBAMTHE1pY3Jvc29mdCBUaW1l
// SIG // LVN0YW1wIFNlcnZpY2WgghFUMIIHDDCCBPSgAwIBAgIT
// SIG // MwAAAb70IKLultYg1gABAAABvjANBgkqhkiG9w0BAQsF
// SIG // ADB8MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGlu
// SIG // Z3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV
// SIG // TWljcm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1N
// SIG // aWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMDAeFw0y
// SIG // MjExMDQxOTAxMjJaFw0yNDAyMDIxOTAxMjJaMIHKMQsw
// SIG // CQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQ
// SIG // MA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9z
// SIG // b2Z0IENvcnBvcmF0aW9uMSUwIwYDVQQLExxNaWNyb3Nv
// SIG // ZnQgQW1lcmljYSBPcGVyYXRpb25zMSYwJAYDVQQLEx1U
// SIG // aGFsZXMgVFNTIEVTTjpFNUE2LUUyN0MtNTkyRTElMCMG
// SIG // A1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAgU2Vydmlj
// SIG // ZTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIB
// SIG // AKVf8ts+w2u5zLtLcpC2PKJYe2dNxKhTc94hZTKfYDn1
// SIG // ZmQAZoXgnPO0bj3UNj/jh1CYqgkAFjbjUqCP0NYsRMPQ
// SIG // AOue5XQ/Gd/xJLaZsShx2rzocEEhT3KUxhVVyMSgsKDv
// SIG // NuIIshzxvOHX4XYullO3+w/vOS2jwdHTrDxyijBpQvae
// SIG // ui7/ckM7wIWRhZhYZbrAsv3oK8+iV/zhzk/agsLoIay9
// SIG // CD3+O1C3taUEhBIocuN/CcEvq2VOAFcr0HM5TAtul7E7
// SIG // gz4BECpc8fa7uxLzVffZfyglPW2xX+Up5DdZqFIClKtP
// SIG // TVpSscyxhL4ZHtkDTKKZ/OiYdX5fz1Xrzf8a2UqVdt6z
// SIG // OJQe5Ye10rAj3hbJU2KIyjdoqDguqdwcu5BJr2QoeqwL
// SIG // DyrAESSEncykAjKvpqg7oj+pq/y77liopz/tmRpivwtf
// SIG // 7JL5U47SHobudMqFzQ5YdQjfQd0C4JUGPlAgRKiaIPwc
// SIG // QJ96VnUdNaP+ulyGnIFyP3dMBtv8dDrW4xBgJGnH0JZs
// SIG // NGw3NNnYUBZIv9UPVW8IeJAu1YAIiQPGwucxCGFhzVOw
// SIG // vh3uvQeP9nWaUY4HeaRKR2xfTmIgH+7OTJ2BJxzf+aP2
// SIG // xjtGowG+1SOH/Wr+trAusb4SkweUeJYcRDFhdM+L+wUO
// SIG // Qh8jDZC/qE58yS6py1XV57jNAgMBAAGjggE2MIIBMjAd
// SIG // BgNVHQ4EFgQU6yogFqGEQaDxrW8L24YV+mtvoqowHwYD
// SIG // VR0jBBgwFoAUn6cVXQBeYl2D9OXSZacbUzUZ6XIwXwYD
// SIG // VR0fBFgwVjBUoFKgUIZOaHR0cDovL3d3dy5taWNyb3Nv
// SIG // ZnQuY29tL3BraW9wcy9jcmwvTWljcm9zb2Z0JTIwVGlt
// SIG // ZS1TdGFtcCUyMFBDQSUyMDIwMTAoMSkuY3JsMGwGCCsG
// SIG // AQUFBwEBBGAwXjBcBggrBgEFBQcwAoZQaHR0cDovL3d3
// SIG // dy5taWNyb3NvZnQuY29tL3BraW9wcy9jZXJ0cy9NaWNy
// SIG // b3NvZnQlMjBUaW1lLVN0YW1wJTIwUENBJTIwMjAxMCgx
// SIG // KS5jcnQwDAYDVR0TAQH/BAIwADATBgNVHSUEDDAKBggr
// SIG // BgEFBQcDCDANBgkqhkiG9w0BAQsFAAOCAgEAx5X7vXNC
// SIG // JoXQYrNco+emwbzkshqQv60krcvtRePU3+n5hRHqsYcE
// SIG // 0x1RzniETXfIHAy0s9He/ZlwqqvMp6uoCYMtruC8sgK9
// SIG // i5sMxVbrsaBlUfGLlJ0bb7Ax+Sfrp8nv5zJMB4gvhvNo
// SIG // d7kPH3Bo/th9Jyj5lKVLX0K7jFF78y41eTckYw4gi+XP
// SIG // 3+XnJs9NXZ6ZwrxOpCM/xU6ZLznlSZNtiNmpBWYT89uA
// SIG // +jk+ipE7cAUaUhBw2KgkOHGfu0l8e4883e2/tKfbw26K
// SIG // gsu0sFoCqRkBvsFWyq05uISpGQ83HQBIGKnoV8+/BtNJ
// SIG // mCC4g08lIpMEKaGe2pvaQOgXUz2PqNb+gkc3J3iDpyWG
// SIG // px1s9EfihEf2URbSwsgTLy80hxJ9LEdPtJC5JZ3CoxnQ
// SIG // NWAONszm+tdVHiBsrWfVYTcJ+MLORiep+jyZjDzvsjxJ
// SIG // Dstn/DgYroWqpYqYlocxrbeVLAtIHhtLFvasGuEAFtbE
// SIG // FiK4UpduDDjlcDZfwJvf2ary0Vq9ceJ7qXkfBu/gzcp+
// SIG // DE4NvMhWUVNZLUr8gTFErzdivfQTuqdYEsf8L0rEeOXR
// SIG // t9zwxuXyqhzoA8XLYwVOW1+PXiaozS+0v1J3Sxe0tDli
// SIG // /ZnZP4z1Rz9iOl7TdCuFY3UcLyIK94zYm9xmchiZzkaf
// SIG // 2TG2Ng79ZinMe3UwggdxMIIFWaADAgECAhMzAAAAFcXn
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
// SIG // YWxlcyBUU1MgRVNOOkU1QTYtRTI3Qy01OTJFMSUwIwYD
// SIG // VQQDExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2aWNl
// SIG // oiMKAQEwBwYFKw4DAhoDFQBorVpS97z7vBDTgHvotvuM
// SIG // H0zAe6CBgzCBgKR+MHwxCzAJBgNVBAYTAlVTMRMwEQYD
// SIG // VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25k
// SIG // MR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24x
// SIG // JjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1wIFBD
// SIG // QSAyMDEwMA0GCSqGSIb3DQEBBQUAAgUA57x5UzAiGA8y
// SIG // MDIzMDMxNjAxMDUyM1oYDzIwMjMwMzE3MDEwNTIzWjB0
// SIG // MDoGCisGAQQBhFkKBAExLDAqMAoCBQDnvHlTAgEAMAcC
// SIG // AQACAhJjMAcCAQACAhLdMAoCBQDnvcrTAgEAMDYGCisG
// SIG // AQQBhFkKBAIxKDAmMAwGCisGAQQBhFkKAwKgCjAIAgEA
// SIG // AgMHoSChCjAIAgEAAgMBhqAwDQYJKoZIhvcNAQEFBQAD
// SIG // gYEAaac5SpYbWOqIImr/CtSuIEDqdF9kT32Nwshg7zNf
// SIG // Bp3wHhIgiUo3hh54wDlk2f3QS3Zs3geQo+Nbyc2BIslR
// SIG // gj+6xAfQVgDYn6MLH4Q0nYS7aWUjgXACBbtjAuwXm3FY
// SIG // tOSXbqRhfWq/xj1bMR1/puywMm76BiHwfMuojiqtu+gx
// SIG // ggQNMIIECQIBATCBkzB8MQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1TdGFtcCBQ
// SIG // Q0EgMjAxMAITMwAAAb70IKLultYg1gABAAABvjANBglg
// SIG // hkgBZQMEAgEFAKCCAUowGgYJKoZIhvcNAQkDMQ0GCyqG
// SIG // SIb3DQEJEAEEMC8GCSqGSIb3DQEJBDEiBCAiS86wmLoL
// SIG // XBiB6Rum5opSMElgaM+4opthnJgtSeLwVjCB+gYLKoZI
// SIG // hvcNAQkQAi8xgeowgecwgeQwgb0EIJTuiq+t9vzsvWW1
// SIG // z64RD4nTQIPxXn+yt0mYPg8Y4QwvMIGYMIGApH4wfDEL
// SIG // MAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24x
// SIG // EDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jv
// SIG // c29mdCBDb3Jwb3JhdGlvbjEmMCQGA1UEAxMdTWljcm9z
// SIG // b2Z0IFRpbWUtU3RhbXAgUENBIDIwMTACEzMAAAG+9CCi
// SIG // 7pbWINYAAQAAAb4wIgQgoAelnOlOzGxHp/ARCTxcexJs
// SIG // BpXHhCgPnDxMyEadmgswDQYJKoZIhvcNAQELBQAEggIA
// SIG // XY0ubhjSSMHAss8N1g6yuSP2qWj2oD0IRQ9s6CLjj7BL
// SIG // iWaRS/DeH3tJmq1Yn7ZYKaz0gHQIgGbIQHZ43TW/8tCX
// SIG // LQyMLMVrFaQO44gZ/vF/Xw4tqRjm+WzgQnCN6xfXlF9U
// SIG // uLJ3bmlNXIsDCwEGGbH015BJNmFa/b9fkNKFoXj7RbuV
// SIG // ts3U1N5eVcRy0c23TqyvnNb1ncbpOl5tjwTE1NLi7BrY
// SIG // bQq3ahyIOYV8CI+0FtZQgRGZorQrvcyCgBJQL1OW4ko4
// SIG // N482rWZh5n9qS4TGw7cKOFxitHC/eTFLgrXSDsm8Vaxz
// SIG // aKDdWeb0wqiN8PHzPi04ZVvJhFfhrlj3qc2eV8CWCT7T
// SIG // 9QQ8edEi6fqofqTlWzji+cp8oHgnJHHUOUSRl9ibl8Mu
// SIG // uOiFvfNjeUYfsoFlYSXwiDyLFIKsp6U7Ztzun/awg65y
// SIG // ly7DD9Wk9rHBRVEHgmu5gZz/wvd6gMMf4gzgA0/vhiHS
// SIG // gDsv6p8yaOvUaa2BievNA1k4i54kLFyg1nDarc/M/0n7
// SIG // ZQnpp7PTwldQ9oAiwkkilxYK50ObOMpfmMZrysewg9N9
// SIG // DpcFSEpZhPgsFzKqnnmxyEA0KAbuh003A6C12aik6uoA
// SIG // P2LSLJ6ye/4BtMc6g8ror2NibTr0qau2LPFK9SX2kWPM
// SIG // XKdYXwaMQvPuSUqhBf44gxY=
// SIG // End signature block
