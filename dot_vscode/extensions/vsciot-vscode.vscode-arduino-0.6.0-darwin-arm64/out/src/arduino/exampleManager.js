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
exports.ExampleManager = void 0;
const fs = require("fs");
const glob = require("glob");
const path = require("path");
const util = require("../common/util");
class ExampleManager {
    constructor(_settings, _arduinoApp) {
        this._settings = _settings;
        this._arduinoApp = _arduinoApp;
    }
    loadExamples() {
        return __awaiter(this, void 0, void 0, function* () {
            const examples = [];
            // load Built-in Examples from examples folder under arduino installation directory.
            examples.push({
                name: "Built-in Examples",
                path: this._settings.defaultExamplePath,
                children: this.parseExamples(this._settings.defaultExamplePath),
            });
            // load Examples from default libraries under arduino installation directory.
            const examplesFromDefaultLibraries = yield this.parseExamplesFromLibrary(this._settings.defaultLibPath, true);
            if (examplesFromDefaultLibraries.length) {
                examples.push({
                    name: "Examples for any board",
                    path: this._settings.defaultLibPath,
                    children: examplesFromDefaultLibraries,
                });
            }
            // load Examples from current board's firmware package directory.
            if (this._arduinoApp.boardManager.currentBoard) {
                const currentBoard = this._arduinoApp.boardManager.currentBoard;
                const currentBoardLibrariesPath = path.join(currentBoard.platform.rootBoardPath, "libraries");
                const examplesFromCurrentBoard = yield this.parseExamplesFromLibrary(currentBoardLibrariesPath, false);
                if (examplesFromCurrentBoard.length) {
                    examples.push({
                        name: `Examples for ${currentBoard.name}`,
                        path: currentBoardLibrariesPath,
                        children: examplesFromCurrentBoard,
                    });
                }
            }
            // load Examples from Custom Libraries
            const customLibrariesPath = path.join(this._settings.sketchbookPath, "libraries");
            const examplesFromCustomLibraries = yield this.parseExamplesFromLibrary(customLibrariesPath, true, true);
            if (examplesFromCustomLibraries.length) {
                examples.push({
                    name: "Examples from Custom Libraries",
                    path: customLibrariesPath,
                    children: examplesFromCustomLibraries,
                });
            }
            // load Examples from user's workspace
            const sketchesPath = path.join(this._settings.sketchbookPath, "sketches");
            const examplesFromSketches = yield this.parseExamples(sketchesPath);
            if (examplesFromSketches.length) {
                examples.push({
                    name: "Workspace",
                    path: sketchesPath,
                    children: examplesFromSketches,
                });
            }
            return examples;
        });
    }
    parseExamples(rootPath) {
        if (!util.directoryExistsSync(rootPath)) {
            return [];
        }
        const exampleFolders = glob.sync(path.join(rootPath, "**/**/"));
        // exampleFolders looks like as follows:
        // ["C:/Program Files (x86)/Arduino/examples/",
        //  "C:/Program Files (x86)/Arduino/examples/01.Basics/",
        //  "C:/Program Files (x86)/Arduino/examples/01.Basics/AnalogReadSerial/",
        //  "C:/Program Files (x86)/Arduino/examples/01.Basics/BareMinimum/",
        //  "C:/Program Files (x86)/Arduino/examples/01.Basics/Blink/",
        //  "C:/Program Files (x86)/Arduino/examples/01.Basics/DigitalReadSerial/",
        //  "C:/Program Files (x86)/Arduino/examples/01.Basics/Fade/",
        //  "C:/Program Files (x86)/Arduino/examples/01.Basics/ReadAnalogVoltage/",
        //  "C:/Program Files (x86)/Arduino/examples/02.Digital/",
        // ]
        const rootNode = {
            children: [],
        };
        const exampleMap = new Map();
        exampleMap.set(path.resolve(exampleFolders[0]), rootNode);
        for (let i = 1; i < exampleFolders.length; i++) {
            const currentPath = path.resolve(exampleFolders[i]);
            const parentPath = path.resolve(path.dirname(exampleFolders[i]));
            const parentExample = exampleMap.get(parentPath);
            if (parentExample && !parentExample.isLeaf) {
                const currentExample = {
                    name: path.basename(exampleFolders[i]),
                    path: currentPath,
                    // If there is *.ino files existing in current folder, then mark this folder as leaf node.
                    isLeaf: this.isExampleFolder(currentPath),
                    children: [],
                };
                exampleMap.set(currentPath, currentExample);
                parentExample.children.push(currentExample);
            }
        }
        return rootNode.children;
    }
    parseExamplesFromLibrary(rootPath, checkCompatibility, categorizeIncompatible = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const examples = [];
            const inCompatibles = [];
            if (!util.directoryExistsSync(rootPath)) {
                return [];
            }
            const libraries = util.readdirSync(rootPath, true);
            for (const library of libraries) {
                const propertiesFile = path.join(rootPath, library, "library.properties");
                if (checkCompatibility && util.fileExistsSync(propertiesFile)) {
                    const properties = yield util.parseProperties(propertiesFile);
                    const children = this.parseExamples(path.join(rootPath, library, "examples"));
                    if (children.length) {
                        // When missing architectures field in library.properties, fall it back to "*".
                        if (this.isSupported(properties.architectures || "*")) {
                            examples.push({
                                name: library,
                                path: path.join(rootPath, library),
                                children,
                            });
                        }
                        else if (categorizeIncompatible) {
                            inCompatibles.push({
                                name: library,
                                path: path.join(rootPath, library),
                                children,
                            });
                        }
                    }
                }
                else {
                    const children = this.parseExamples(path.join(rootPath, library, "examples"));
                    if (children.length) {
                        examples.push({
                            name: library,
                            path: path.join(rootPath, library),
                            children,
                        });
                    }
                }
            }
            if (categorizeIncompatible && inCompatibles.length) {
                examples.push({
                    name: "INCOMPATIBLE",
                    path: "INCOMPATIBLE",
                    children: inCompatibles,
                });
            }
            return examples;
        });
    }
    isExampleFolder(dirname) {
        const items = fs.readdirSync(dirname);
        const ino = items.find((item) => {
            return util.isArduinoFile(path.join(dirname, item));
        });
        return !!ino;
    }
    isSupported(architectures) {
        if (!architectures) {
            return false;
        }
        const currentBoard = this._arduinoApp.boardManager.currentBoard;
        if (!currentBoard) {
            return true;
        }
        const targetArch = currentBoard.platform.architecture;
        return architectures.indexOf(targetArch) >= 0 || architectures.indexOf("*") >= 0;
    }
}
exports.ExampleManager = ExampleManager;

//# sourceMappingURL=exampleManager.js.map

// SIG // Begin signature block
// SIG // MIInkQYJKoZIhvcNAQcCoIIngjCCJ34CAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // bi6BbHWHBdikY7s9aRPwUZoHN2t1fT5qc2K5jJyhfhyg
// SIG // gg12MIIF9DCCA9ygAwIBAgITMwAAAsu3dTn7AnFCNgAA
// SIG // AAACyzANBgkqhkiG9w0BAQsFADB+MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSgwJgYDVQQDEx9NaWNyb3NvZnQgQ29kZSBT
// SIG // aWduaW5nIFBDQSAyMDExMB4XDTIyMDUxMjIwNDU1OVoX
// SIG // DTIzMDUxMTIwNDU1OVowdDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEeMBwGA1UEAxMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
// SIG // t7DdFnHRqRlz2SG+YjXxQdMWfK5yb2J8Q+lH9gR14JaW
// SIG // 0xH6Hvpjv/6C1pEcQMKaXYrbElTg9KIJSm7Z4fVqdgwE
// SIG // S3MWxmluGGpzlkgdS8i0aR550OTzpYdlOba4ON4EI75T
// SIG // WZUAd5S/s6z7WzbzAOxNFpJqPmemBZ7H+2npPihs2hm6
// SIG // AHhTuLimY0F2OUZjMxO9AcGs+4bwNOYw1EXUSh9Iv9ci
// SIG // vekw7j+yckRSzrwN1FzVs9NEfcO6aTA3DZV7a5mz4oL9
// SIG // 8RPRX6X5iUbYjmUCne9yu9lro5o+v0rt/gwU6TquzYHZ
// SIG // 7VtpSX1912uqHuBfT5PcUYZMB7JOybvRPwIDAQABo4IB
// SIG // czCCAW8wHwYDVR0lBBgwFgYKKwYBBAGCN0wIAQYIKwYB
// SIG // BQUHAwMwHQYDVR0OBBYEFK4P57f4I/gQS3dY2VmIaJO7
// SIG // +f8OMEUGA1UdEQQ+MDykOjA4MR4wHAYDVQQLExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xFjAUBgNVBAUTDTIzMDAx
// SIG // Mis0NzA1MjgwHwYDVR0jBBgwFoAUSG5k5VAF04KqFzc3
// SIG // IrVtqMp1ApUwVAYDVR0fBE0wSzBJoEegRYZDaHR0cDov
// SIG // L3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9jcmwvTWlj
// SIG // Q29kU2lnUENBMjAxMV8yMDExLTA3LTA4LmNybDBhBggr
// SIG // BgEFBQcBAQRVMFMwUQYIKwYBBQUHMAKGRWh0dHA6Ly93
// SIG // d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvY2VydHMvTWlj
// SIG // Q29kU2lnUENBMjAxMV8yMDExLTA3LTA4LmNydDAMBgNV
// SIG // HRMBAf8EAjAAMA0GCSqGSIb3DQEBCwUAA4ICAQCS+beq
// SIG // VYyEZUPI+HQBSWZzJHt60R3kAzjxcbMDOOx0b4EGthNY
// SIG // 3mtmmIjJNVpnalp2MNW2peCM0ZUlX+HM388dr4ziDomh
// SIG // pZVtgch5HygKZ4DsyZgEPBdecUhz0bzTJr6QtzxS7yjH
// SIG // 98uUsjycYfdtk06tKuXqSb9UoGQ1pVJRy/xMdZ1/JMwU
// SIG // YR73Og+heZWvqADuAN6P2QtOTjoJuBCcWT/TKlIuYond
// SIG // ncOCYPx77Q6QnC49RiyIQg2nmynoGowiZTIYcZw16xhS
// SIG // yX1/I+5Oy1L62Q7EJ4iWdw+uivt0mUy4b8Cu3TBlRblF
// SIG // CVHw4n65Qk4yhvZsbDw5ZX8nJOMxp0Wb/CcPUYBNcwII
// SIG // Z1NeC9L1VDTs4v+GxO8CLIkciHAnFaF0Z3gQN5/36y17
// SIG // 3Yw7G29paRru/PrNc2zuTdG4R1quI+VjLra7KQcRIaht
// SIG // j0gYwuWKYvo4bX7t/se+jZgb7Mirscffh5vwC55cysa+
// SIG // CsjEd/8+CETMwNUMqaTZOuVIvowdeIPsOL6JXt9zNaVa
// SIG // lXJK5knm1JJo5wrIQoh9diBYB2Re4EcBOGGaye0I8WXq
// SIG // Gah2irEC0TKeud23gXx33r2vcyT4QUnVXAlu8fatHNh1
// SIG // TyyR1/WAlFO9eCPqrS6Qxq3W2cQ/ZopD6i/06P9ZQ2dH
// SIG // IfBbXj4TBO4aLrqD3DCCB3owggVioAMCAQICCmEOkNIA
// SIG // AAAAAAMwDQYJKoZIhvcNAQELBQAwgYgxCzAJBgNVBAYT
// SIG // AlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQH
// SIG // EwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
// SIG // cG9yYXRpb24xMjAwBgNVBAMTKU1pY3Jvc29mdCBSb290
// SIG // IENlcnRpZmljYXRlIEF1dGhvcml0eSAyMDExMB4XDTEx
// SIG // MDcwODIwNTkwOVoXDTI2MDcwODIxMDkwOVowfjELMAkG
// SIG // A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAO
// SIG // BgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjEoMCYGA1UEAxMfTWljcm9zb2Z0
// SIG // IENvZGUgU2lnbmluZyBQQ0EgMjAxMTCCAiIwDQYJKoZI
// SIG // hvcNAQEBBQADggIPADCCAgoCggIBAKvw+nIQHC6t2G6q
// SIG // ghBNNLrytlghn0IbKmvpWlCquAY4GgRJun/DDB7dN2vG
// SIG // EtgL8DjCmQawyDnVARQxQtOJDXlkh36UYCRsr55JnOlo
// SIG // XtLfm1OyCizDr9mpK656Ca/XllnKYBoF6WZ26DJSJhIv
// SIG // 56sIUM+zRLdd2MQuA3WraPPLbfM6XKEW9Ea64DhkrG5k
// SIG // NXimoGMPLdNAk/jj3gcN1Vx5pUkp5w2+oBN3vpQ97/vj
// SIG // K1oQH01WKKJ6cuASOrdJXtjt7UORg9l7snuGG9k+sYxd
// SIG // 6IlPhBryoS9Z5JA7La4zWMW3Pv4y07MDPbGyr5I4ftKd
// SIG // gCz1TlaRITUlwzluZH9TupwPrRkjhMv0ugOGjfdf8NBS
// SIG // v4yUh7zAIXQlXxgotswnKDglmDlKNs98sZKuHCOnqWbs
// SIG // YR9q4ShJnV+I4iVd0yFLPlLEtVc/JAPw0XpbL9Uj43Bd
// SIG // D1FGd7P4AOG8rAKCX9vAFbO9G9RVS+c5oQ/pI0m8GLhE
// SIG // fEXkwcNyeuBy5yTfv0aZxe/CHFfbg43sTUkwp6uO3+xb
// SIG // n6/83bBm4sGXgXvt1u1L50kppxMopqd9Z4DmimJ4X7Iv
// SIG // hNdXnFy/dygo8e1twyiPLI9AN0/B4YVEicQJTMXUpUMv
// SIG // dJX3bvh4IFgsE11glZo+TzOE2rCIF96eTvSWsLxGoGyY
// SIG // 0uDWiIwLAgMBAAGjggHtMIIB6TAQBgkrBgEEAYI3FQEE
// SIG // AwIBADAdBgNVHQ4EFgQUSG5k5VAF04KqFzc3IrVtqMp1
// SIG // ApUwGQYJKwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwCwYD
// SIG // VR0PBAQDAgGGMA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0j
// SIG // BBgwFoAUci06AjGQQ7kUBU7h6qfHMdEjiTQwWgYDVR0f
// SIG // BFMwUTBPoE2gS4ZJaHR0cDovL2NybC5taWNyb3NvZnQu
// SIG // Y29tL3BraS9jcmwvcHJvZHVjdHMvTWljUm9vQ2VyQXV0
// SIG // MjAxMV8yMDExXzAzXzIyLmNybDBeBggrBgEFBQcBAQRS
// SIG // MFAwTgYIKwYBBQUHMAKGQmh0dHA6Ly93d3cubWljcm9z
// SIG // b2Z0LmNvbS9wa2kvY2VydHMvTWljUm9vQ2VyQXV0MjAx
// SIG // MV8yMDExXzAzXzIyLmNydDCBnwYDVR0gBIGXMIGUMIGR
// SIG // BgkrBgEEAYI3LgMwgYMwPwYIKwYBBQUHAgEWM2h0dHA6
// SIG // Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvZG9jcy9w
// SIG // cmltYXJ5Y3BzLmh0bTBABggrBgEFBQcCAjA0HjIgHQBM
// SIG // AGUAZwBhAGwAXwBwAG8AbABpAGMAeQBfAHMAdABhAHQA
// SIG // ZQBtAGUAbgB0AC4gHTANBgkqhkiG9w0BAQsFAAOCAgEA
// SIG // Z/KGpZjgVHkaLtPYdGcimwuWEeFjkplCln3SeQyQwWVf
// SIG // Liw++MNy0W2D/r4/6ArKO79HqaPzadtjvyI1pZddZYSQ
// SIG // fYtGUFXYDJJ80hpLHPM8QotS0LD9a+M+By4pm+Y9G6XU
// SIG // tR13lDni6WTJRD14eiPzE32mkHSDjfTLJgJGKsKKELuk
// SIG // qQUMm+1o+mgulaAqPyprWEljHwlpblqYluSD9MCP80Yr
// SIG // 3vw70L01724lruWvJ+3Q3fMOr5kol5hNDj0L8giJ1h/D
// SIG // Mhji8MUtzluetEk5CsYKwsatruWy2dsViFFFWDgycSca
// SIG // f7H0J/jeLDogaZiyWYlobm+nt3TDQAUGpgEqKD6CPxNN
// SIG // ZgvAs0314Y9/HG8VfUWnduVAKmWjw11SYobDHWM2l4bf
// SIG // 2vP48hahmifhzaWX0O5dY0HjWwechz4GdwbRBrF1HxS+
// SIG // YWG18NzGGwS+30HHDiju3mUv7Jf2oVyW2ADWoUa9WfOX
// SIG // pQlLSBCZgB/QACnFsZulP0V3HjXG0qKin3p6IvpIlR+r
// SIG // +0cjgPWe+L9rt0uX4ut1eBrs6jeZeRhL/9azI2h15q/6
// SIG // /IvrC4DqaTuv/DDtBEyO3991bWORPdGdVk5Pv4BXIqF4
// SIG // ETIheu9BCrE/+6jMpF3BoYibV3FWTkhFwELJm3ZbCoBI
// SIG // a/15n8G9bW1qyVJzEw16UM0xghlzMIIZbwIBATCBlTB+
// SIG // MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3Rv
// SIG // bjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWlj
// SIG // cm9zb2Z0IENvcnBvcmF0aW9uMSgwJgYDVQQDEx9NaWNy
// SIG // b3NvZnQgQ29kZSBTaWduaW5nIFBDQSAyMDExAhMzAAAC
// SIG // y7d1OfsCcUI2AAAAAALLMA0GCWCGSAFlAwQCAQUAoIGu
// SIG // MBkGCSqGSIb3DQEJAzEMBgorBgEEAYI3AgEEMBwGCisG
// SIG // AQQBgjcCAQsxDjAMBgorBgEEAYI3AgEVMC8GCSqGSIb3
// SIG // DQEJBDEiBCA6mEiQBjNWfGquB/9gqNEURzoN0OQ15KS6
// SIG // gTwcYONMLzBCBgorBgEEAYI3AgEMMTQwMqAUgBIATQBp
// SIG // AGMAcgBvAHMAbwBmAHShGoAYaHR0cDovL3d3dy5taWNy
// SIG // b3NvZnQuY29tMA0GCSqGSIb3DQEBAQUABIIBAFHcsKsh
// SIG // Ra8xL0N7J6bWJb6YAqYQ7I8UK4VNJdfDTkYkgqZ/JC81
// SIG // IXzEl1IGiTfdLpNFLLiKDWRlCPOI8OuxyRbWhN5DwK1Y
// SIG // s6Pv3xGEB6x5x8RPe1SI2NHElnr+4p7EmpMR666dKnZR
// SIG // KWKz3pM2now1dEZus/k/ceasUIjW/pZcNn3mEVkT6Q4x
// SIG // 5EZW/ZpOuWX1pNZHtYF9Ff+dYwA+S6K5dpN4a8CaWX+H
// SIG // fqr9+pwdXKremAIajfjOz5/0BB95lkysAnfSvIxCb53a
// SIG // TkM/sFqgFdjXTB7A9/e8RKPVcfLQziQAiXD+dWCbCtnk
// SIG // mlDhtb/wDZHPmmN7y+K0VGGv61qhghb9MIIW+QYKKwYB
// SIG // BAGCNwMDATGCFukwghblBgkqhkiG9w0BBwKgghbWMIIW
// SIG // 0gIBAzEPMA0GCWCGSAFlAwQCAQUAMIIBUQYLKoZIhvcN
// SIG // AQkQAQSgggFABIIBPDCCATgCAQEGCisGAQQBhFkKAwEw
// SIG // MTANBglghkgBZQMEAgEFAAQg0VJGnpflwJWcSs0sOSU8
// SIG // 5qhcC5QP+f1CEJC5B24UrpoCBmPuGFiNdxgTMjAyMzAz
// SIG // MTUyMTA1MzcuNDE4WjAEgAIB9KCB0KSBzTCByjELMAkG
// SIG // A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAO
// SIG // BgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjElMCMGA1UECxMcTWljcm9zb2Z0
// SIG // IEFtZXJpY2EgT3BlcmF0aW9uczEmMCQGA1UECxMdVGhh
// SIG // bGVzIFRTUyBFU046REQ4Qy1FMzM3LTJGQUUxJTAjBgNV
// SIG // BAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2Wg
// SIG // ghFUMIIHDDCCBPSgAwIBAgITMwAAAcUDzc0hofTvOQAB
// SIG // AAABxTANBgkqhkiG9w0BAQsFADB8MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1T
// SIG // dGFtcCBQQ0EgMjAxMDAeFw0yMjExMDQxOTAxMzJaFw0y
// SIG // NDAyMDIxOTAxMzJaMIHKMQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MSUwIwYDVQQLExxNaWNyb3NvZnQgQW1lcmljYSBPcGVy
// SIG // YXRpb25zMSYwJAYDVQQLEx1UaGFsZXMgVFNTIEVTTjpE
// SIG // RDhDLUUzMzctMkZBRTElMCMGA1UEAxMcTWljcm9zb2Z0
// SIG // IFRpbWUtU3RhbXAgU2VydmljZTCCAiIwDQYJKoZIhvcN
// SIG // AQEBBQADggIPADCCAgoCggIBAKtIXbO9Hl9tye6WqaWi
// SIG // l0Yc/k0+ySdzr1X9/jfHzacUbOY2OIRL9wVf8ORFl22X
// SIG // TuJt8Y9NZUyP8Q5KvsrY7oj3vMRl7GcQ57b+y9RMzHeY
// SIG // yEqifnmLvJIFdOepqrPHQaOecWTzz3MX+btfc59OGjEB
// SIG // eT11fwuGS0oxWvSBTXK4m3Tpt5Rlta0ERWto1LLqeoL+
// SIG // t+KuVMB9PVhhrtM/PUW7W8jOeb5gYFlfHnem2Qma3KGC
// SIG // IzC/BUU7xpc56puh7cGXVzMCh092v5C1Ej4hgLKyIBM8
// SIG // +zaQaXjrILPU68Mlk2QTWwcMiAApkN+I/rkeHrdoWZPj
// SIG // R+PSoRCcmA9vnTiGgxgdhFDRUmHMtTJILWbdXkagQdJv
// SIG // mD2M+x46HD8pCmDUGe07/s4JTn3womsdYzm9LuiGAuV9
// SIG // Sa/AME3LGg8rt6gIcfHBUDfQw4IlWcPlERWfKMqA5OrC
// SIG // FdZ8ec2S8voTbWpHj1/Uu2PJ9alnwI6FzxOitP3W08PO
// SIG // xDiS/wZSRnCqBU8ra9Mz4PzDSUm+n9mv8A5F6BghliYk
// SIG // Kxk8Yzj/kfev5yCBtOXhNS6ZMthTnWDDweA4Vu7QXWWr
// SIG // rXqU07koZoJ/hihEfAKANYEkpNRAuWV+HKaVZ4CaW5TA
// SIG // bvK/7QoXx1XV74mOoQ0oR8EApmamXm4EmB5x5eLqxPuC
// SIG // umQvAgMBAAGjggE2MIIBMjAdBgNVHQ4EFgQUVOq7OL9Z
// SIG // sTWBv67aS8K1cHpNBWswHwYDVR0jBBgwFoAUn6cVXQBe
// SIG // Yl2D9OXSZacbUzUZ6XIwXwYDVR0fBFgwVjBUoFKgUIZO
// SIG // aHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9j
// SIG // cmwvTWljcm9zb2Z0JTIwVGltZS1TdGFtcCUyMFBDQSUy
// SIG // MDIwMTAoMSkuY3JsMGwGCCsGAQUFBwEBBGAwXjBcBggr
// SIG // BgEFBQcwAoZQaHR0cDovL3d3dy5taWNyb3NvZnQuY29t
// SIG // L3BraW9wcy9jZXJ0cy9NaWNyb3NvZnQlMjBUaW1lLVN0
// SIG // YW1wJTIwUENBJTIwMjAxMCgxKS5jcnQwDAYDVR0TAQH/
// SIG // BAIwADATBgNVHSUEDDAKBggrBgEFBQcDCDANBgkqhkiG
// SIG // 9w0BAQsFAAOCAgEAjKjefH6zBzknHIivgnZ6+nSvH07I
// SIG // EA3mfW70IwrsTSCWSfdvsaXikQn916uO6nUcpJClJ2Qu
// SIG // nR4S8LdX4cMosvy33VUPcn9YWGf0aU0vs9IZ2qCvj/yA
// SIG // wIlDZt9jVy4QwbtD+Em/7gleIzrjVHJiYaaQUIEFYRcf
// SIG // +eyWJNSwnYyHnv/xq3H25ELYmKG/Tmvdw0o27A9Y6mon
// SIG // BJ5HJVDf5hJvWbJwpwNfvzkA6f/EOHD3x/eCzOCel9Db
// SIG // TQXlcsL1h9MLjGjicx4AywniVJBRPRxPLAQ1XnZo+szy
// SIG // QCPu6My42KsO4uERW4krX1mUho8LfpSyUGUVlAnE92h2
// SIG // L06NWFg2bJKIVoO+8PXxdkG4jvQ356qGe0KMx4u0Yj6W
// SIG // 44JCTAIa4aXk3/2rdnvfh2JCjm1JoDwKx9Vo4r8JtXez
// SIG // 2FrGqy+7uambpN+hm9ZhE0taANl19/gt64Lc0aIT/Pam
// SIG // VX+/ZVb45oN+DbSAiv6TJPfUgbrYIbYqRUjEHW11J0tq
// SIG // Hi7fXCrr9TCbvoCfN6l0zZENkKocbTUb2xPUKpqiUMOV
// SIG // Vv+Emc3taT18cjkzucg6vokSFLm6nkM5lHApIsjbgix1
// SIG // ofDiwiOZiDgtYi7VQ39pcPXlq6KcLuUgybU/2cKiFNam
// SIG // 9lPjY5DXI9YWzgwURC2k01nfdUSYlCPZ3CZBoP4wggdx
// SIG // MIIFWaADAgECAhMzAAAAFcXna54Cm0mZAAAAAAAVMA0G
// SIG // CSqGSIb3DQEBCwUAMIGIMQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MTIwMAYDVQQDEylNaWNyb3NvZnQgUm9vdCBDZXJ0aWZp
// SIG // Y2F0ZSBBdXRob3JpdHkgMjAxMDAeFw0yMTA5MzAxODIy
// SIG // MjVaFw0zMDA5MzAxODMyMjVaMHwxCzAJBgNVBAYTAlVT
// SIG // MRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdS
// SIG // ZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9y
// SIG // YXRpb24xJjAkBgNVBAMTHU1pY3Jvc29mdCBUaW1lLVN0
// SIG // YW1wIFBDQSAyMDEwMIICIjANBgkqhkiG9w0BAQEFAAOC
// SIG // Ag8AMIICCgKCAgEA5OGmTOe0ciELeaLL1yR5vQ7VgtP9
// SIG // 7pwHB9KpbE51yMo1V/YBf2xK4OK9uT4XYDP/XE/HZveV
// SIG // U3Fa4n5KWv64NmeFRiMMtY0Tz3cywBAY6GB9alKDRLem
// SIG // jkZrBxTzxXb1hlDcwUTIcVxRMTegCjhuje3XD9gmU3w5
// SIG // YQJ6xKr9cmmvHaus9ja+NSZk2pg7uhp7M62AW36MEByd
// SIG // Uv626GIl3GoPz130/o5Tz9bshVZN7928jaTjkY+yOSxR
// SIG // nOlwaQ3KNi1wjjHINSi947SHJMPgyY9+tVSP3PoFVZht
// SIG // aDuaRr3tpK56KTesy+uDRedGbsoy1cCGMFxPLOJiss25
// SIG // 4o2I5JasAUq7vnGpF1tnYN74kpEeHT39IM9zfUGaRnXN
// SIG // xF803RKJ1v2lIH1+/NmeRd+2ci/bfV+AutuqfjbsNkz2
// SIG // K26oElHovwUDo9Fzpk03dJQcNIIP8BDyt0cY7afomXw/
// SIG // TNuvXsLz1dhzPUNOwTM5TI4CvEJoLhDqhFFG4tG9ahha
// SIG // YQFzymeiXtcodgLiMxhy16cg8ML6EgrXY28MyTZki1ug
// SIG // poMhXV8wdJGUlNi5UPkLiWHzNgY1GIRH29wb0f2y1BzF
// SIG // a/ZcUlFdEtsluq9QBXpsxREdcu+N+VLEhReTwDwV2xo3
// SIG // xwgVGD94q0W29R6HXtqPnhZyacaue7e3PmriLq0CAwEA
// SIG // AaOCAd0wggHZMBIGCSsGAQQBgjcVAQQFAgMBAAEwIwYJ
// SIG // KwYBBAGCNxUCBBYEFCqnUv5kxJq+gpE8RjUpzxD/LwTu
// SIG // MB0GA1UdDgQWBBSfpxVdAF5iXYP05dJlpxtTNRnpcjBc
// SIG // BgNVHSAEVTBTMFEGDCsGAQQBgjdMg30BATBBMD8GCCsG
// SIG // AQUFBwIBFjNodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20v
// SIG // cGtpb3BzL0RvY3MvUmVwb3NpdG9yeS5odG0wEwYDVR0l
// SIG // BAwwCgYIKwYBBQUHAwgwGQYJKwYBBAGCNxQCBAweCgBT
// SIG // AHUAYgBDAEEwCwYDVR0PBAQDAgGGMA8GA1UdEwEB/wQF
// SIG // MAMBAf8wHwYDVR0jBBgwFoAU1fZWy4/oolxiaNE9lJBb
// SIG // 186aGMQwVgYDVR0fBE8wTTBLoEmgR4ZFaHR0cDovL2Ny
// SIG // bC5taWNyb3NvZnQuY29tL3BraS9jcmwvcHJvZHVjdHMv
// SIG // TWljUm9vQ2VyQXV0XzIwMTAtMDYtMjMuY3JsMFoGCCsG
// SIG // AQUFBwEBBE4wTDBKBggrBgEFBQcwAoY+aHR0cDovL3d3
// SIG // dy5taWNyb3NvZnQuY29tL3BraS9jZXJ0cy9NaWNSb29D
// SIG // ZXJBdXRfMjAxMC0wNi0yMy5jcnQwDQYJKoZIhvcNAQEL
// SIG // BQADggIBAJ1VffwqreEsH2cBMSRb4Z5yS/ypb+pcFLY+
// SIG // TkdkeLEGk5c9MTO1OdfCcTY/2mRsfNB1OW27DzHkwo/7
// SIG // bNGhlBgi7ulmZzpTTd2YurYeeNg2LpypglYAA7AFvono
// SIG // aeC6Ce5732pvvinLbtg/SHUB2RjebYIM9W0jVOR4U3Uk
// SIG // V7ndn/OOPcbzaN9l9qRWqveVtihVJ9AkvUCgvxm2EhIR
// SIG // XT0n4ECWOKz3+SmJw7wXsFSFQrP8DJ6LGYnn8AtqgcKB
// SIG // GUIZUnWKNsIdw2FzLixre24/LAl4FOmRsqlb30mjdAy8
// SIG // 7JGA0j3mSj5mO0+7hvoyGtmW9I/2kQH2zsZ0/fZMcm8Q
// SIG // q3UwxTSwethQ/gpY3UA8x1RtnWN0SCyxTkctwRQEcb9k
// SIG // +SS+c23Kjgm9swFXSVRk2XPXfx5bRAGOWhmRaw2fpCjc
// SIG // ZxkoJLo4S5pu+yFUa2pFEUep8beuyOiJXk+d0tBMdrVX
// SIG // VAmxaQFEfnyhYWxz/gq77EFmPWn9y8FBSX5+k77L+Dvk
// SIG // txW/tM4+pTFRhLy/AsGConsXHRWJjXD+57XQKBqJC482
// SIG // 2rpM+Zv/Cuk0+CQ1ZyvgDbjmjJnW4SLq8CdCPSWU5nR0
// SIG // W2rRnj7tfqAxM328y+l7vzhwRNGQ8cirOoo6CGJ/2XBj
// SIG // U02N7oJtpQUQwXEGahC0HVUzWLOhcGbyoYICyzCCAjQC
// SIG // AQEwgfihgdCkgc0wgcoxCzAJBgNVBAYTAlVTMRMwEQYD
// SIG // VQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25k
// SIG // MR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24x
// SIG // JTAjBgNVBAsTHE1pY3Jvc29mdCBBbWVyaWNhIE9wZXJh
// SIG // dGlvbnMxJjAkBgNVBAsTHVRoYWxlcyBUU1MgRVNOOkRE
// SIG // OEMtRTMzNy0yRkFFMSUwIwYDVQQDExxNaWNyb3NvZnQg
// SIG // VGltZS1TdGFtcCBTZXJ2aWNloiMKAQEwBwYFKw4DAhoD
// SIG // FQAhABr2F2SSu3FKOtvi7xGEBMe/56CBgzCBgKR+MHwx
// SIG // CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9u
// SIG // MRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jv
// SIG // c29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwMA0GCSqGSIb3
// SIG // DQEBBQUAAgUA57wr7zAiGA8yMDIzMDMxNTE5MzUxMVoY
// SIG // DzIwMjMwMzE2MTkzNTExWjB0MDoGCisGAQQBhFkKBAEx
// SIG // LDAqMAoCBQDnvCvvAgEAMAcCAQACAhjjMAcCAQACAhFA
// SIG // MAoCBQDnvX1vAgEAMDYGCisGAQQBhFkKBAIxKDAmMAwG
// SIG // CisGAQQBhFkKAwKgCjAIAgEAAgMHoSChCjAIAgEAAgMB
// SIG // hqAwDQYJKoZIhvcNAQEFBQADgYEAhXavzt1ZAkuXj0GE
// SIG // Fv3h41DTGxCL4Wq91pVEXBXpZ0CRnzvkFbkie0B+rbqX
// SIG // 7eaIDiNi+YEuEt+TR1dtLtkZma4lCZr7MtFY3ZwvPMnu
// SIG // GxZ3ujdpyA2ayQrZ43qgA32XxmKWCX35jIaBuzZ+GSFv
// SIG // GtWXAZqrHKvWYxyF2C5DwNoxggQNMIIECQIBATCBkzB8
// SIG // MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3Rv
// SIG // bjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWlj
// SIG // cm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNy
// SIG // b3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMAITMwAAAcUD
// SIG // zc0hofTvOQABAAABxTANBglghkgBZQMEAgEFAKCCAUow
// SIG // GgYJKoZIhvcNAQkDMQ0GCyqGSIb3DQEJEAEEMC8GCSqG
// SIG // SIb3DQEJBDEiBCCgfuxC8L4lvsCzDVf13EeN/K8tO2PI
// SIG // rYlQAFfcWaEY+jCB+gYLKoZIhvcNAQkQAi8xgeowgecw
// SIG // geQwgb0EIBkBsZH2JHdMCvldPcDtLDvrJvIADMo+RLij
// SIG // 6rzUP3yxMIGYMIGApH4wfDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAg
// SIG // UENBIDIwMTACEzMAAAHFA83NIaH07zkAAQAAAcUwIgQg
// SIG // mPZ3pTQH8qX2PKfHX6/Ak8reVHfZY8NVJ9qLnMdl8D8w
// SIG // DQYJKoZIhvcNAQELBQAEggIAQG6SgxvK4I2nhVWbl33y
// SIG // nMLNSoFSjqs0nGNv0hUqRr5GrjodISkez2AA8EILKrVn
// SIG // JCK9n9ctgrVDVvMX/RPNv5Z//uhVSE+NjVkqjtyWQ/B3
// SIG // 0GHW6lXGXt7e+9jC/nHhOTf5XSDl+l32Jrqbzu4dbcuE
// SIG // biDJKLEfxY3kyHCrVkSl2YsaFm9joz6R/MjAERB9Kt+P
// SIG // MX92ePXK6PAgfLENziKZOmWeqDWH+45/v7NHPwsZDpzr
// SIG // WRfN+t0CoXyPkIXv9AhwF0Xch6vQUi0zG7DRI3dKFMA2
// SIG // s89qcIua3HAGOnvLPMHveo7rgPDuclXULySWwWMML5N+
// SIG // yptDhRIfdsDjim/c+XsmgMTGLvuNuLLGAip0tCUwUjCK
// SIG // 8ed8ROGbx305sFdzjjujLYzaoD3KzjnGzw2ddS4mhSg/
// SIG // fAcqpddYuaixy6QMV1TdsyEXMD/CVaSLrgzFTA5MWyOD
// SIG // RFKqkYQJ7ZhSs5MOVM0Eq/6zJDO6E+nxOLthbhD2+X5Z
// SIG // 6LIspLtycYpoxcIHAIxwDAYUXc3aa3JQIQGpj3qcN6Vw
// SIG // 03J48XYJeBJoU/u/rNarPf1ondGsi95ncJU3ZIiYPEz3
// SIG // H6gPoiCCdHxmrRv93j/VAUOGseYaRUxcWAQHpZ75OMSo
// SIG // g8ZpgeaIz7If1ncYnA/BPLAF7EI/6y6r2vqb8wg9KMrTNew=
// SIG // End signature block
