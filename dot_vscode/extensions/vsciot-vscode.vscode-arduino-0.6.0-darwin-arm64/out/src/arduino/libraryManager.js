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
exports.LibraryManager = void 0;
const fs = require("fs");
const path = require("path");
const util = require("../common/util");
class LibraryManager {
    constructor(_settings, _arduinoApp) {
        this._settings = _settings;
        this._arduinoApp = _arduinoApp;
    }
    get libraries() {
        return this._libraries;
    }
    loadLibraries(update = false) {
        return __awaiter(this, void 0, void 0, function* () {
            this._libraryMap = new Map();
            this._libraries = [];
            const libraryIndexFilePath = path.join(this._settings.packagePath, "library_index.json");
            if (update || !util.fileExistsSync(libraryIndexFilePath)) {
                yield this._arduinoApp.initializeLibrary(true);
            }
            // Parse libraries index file "library_index.json"
            const packageContent = fs.readFileSync(libraryIndexFilePath, "utf8");
            this.parseLibraryIndex(JSON.parse(packageContent));
            // Load default Arduino libraries from Arduino installation package.
            yield this.loadInstalledLibraries(this._settings.defaultLibPath, true);
            // Load manually installed libraries.
            yield this.loadInstalledLibraries(path.join(this._settings.sketchbookPath, "libraries"), false);
            // Load libraries from installed board packages.
            const builtinLibs = yield this.loadBoardLibraries();
            this._libraries = Array.from(this._libraryMap.values());
            this._libraries = this._libraries.concat(builtinLibs);
            // Mark those libraries that are supported by current board's architecture.
            this.tagSupportedLibraries();
        });
    }
    parseLibraryIndex(rawModel) {
        rawModel.libraries.forEach((library) => {
            // Arduino install-library program will replace the blank space of the library folder name with underscore,
            // here format library name consistently for better parsing at the next steps.
            const formattedName = library.name.replace(/\s+/g, "_");
            const existingLib = this._libraryMap.get(formattedName);
            if (existingLib) {
                existingLib.versions.push(library.version);
            }
            else {
                library.versions = [library.version];
                library.builtIn = false;
                library.version = "";
                this._libraryMap.set(formattedName, library);
            }
        });
    }
    loadInstalledLibraries(libRoot, isBuiltin) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!util.directoryExistsSync(libRoot)) {
                return;
            }
            const installedLibDirs = util.filterJunk(util.readdirSync(libRoot, true));
            for (const libDir of installedLibDirs) {
                let sourceLib = null;
                if (util.fileExistsSync(path.join(libRoot, libDir, "library.properties"))) {
                    const properties = yield util.parseProperties(path.join(libRoot, libDir, "library.properties"));
                    const formattedName = properties.name.replace(/\s+/g, "_");
                    sourceLib = this._libraryMap.get(formattedName);
                    if (!sourceLib) {
                        sourceLib = Object.assign({}, properties);
                        sourceLib.website = properties.url;
                        this._libraryMap.set(formattedName, sourceLib);
                    }
                    sourceLib.version = util.formatVersion(properties.version);
                }
                else {
                    // For manually imported library, library.properties may be missing. Take the folder name as library name.
                    sourceLib = this._libraryMap.get(libDir);
                    if (!sourceLib) {
                        sourceLib = {
                            name: libDir,
                            types: ["Contributed"],
                        };
                        this._libraryMap.set(libDir, sourceLib);
                    }
                }
                sourceLib.builtIn = isBuiltin;
                sourceLib.installed = true;
                sourceLib.installedPath = path.join(libRoot, libDir);
                sourceLib.srcPath = path.join(libRoot, libDir, "src");
                // If lib src folder doesn't exist, then fallback to the lib root path as source folder.
                sourceLib.srcPath = util.directoryExistsSync(sourceLib.srcPath) ? sourceLib.srcPath : path.join(libRoot, libDir);
            }
        });
    }
    // Builtin libraries from board packages.
    loadBoardLibraries() {
        return __awaiter(this, void 0, void 0, function* () {
            let builtinLibs = [];
            const librarySet = new Set(this._libraryMap.keys());
            const installedPlatforms = this._arduinoApp.boardManager.getInstalledPlatforms();
            for (const board of installedPlatforms) {
                const libs = yield this.parseBoardLibraries(board.rootBoardPath, board.architecture, librarySet);
                builtinLibs = builtinLibs.concat(libs);
            }
            return builtinLibs;
        });
    }
    parseBoardLibraries(rootBoardPath, architecture, librarySet) {
        return __awaiter(this, void 0, void 0, function* () {
            const builtInLib = [];
            const builtInLibPath = path.join(rootBoardPath, "libraries");
            if (util.directoryExistsSync(builtInLibPath)) {
                const libDirs = util.filterJunk(util.readdirSync(builtInLibPath, true));
                if (!libDirs || !libDirs.length) {
                    return builtInLib;
                }
                for (const libDir of libDirs) {
                    let sourceLib = {};
                    if (util.fileExistsSync(path.join(builtInLibPath, libDir, "library.properties"))) {
                        const properties = yield util.parseProperties(path.join(builtInLibPath, libDir, "library.properties"));
                        sourceLib = Object.assign({}, properties);
                        sourceLib.version = util.formatVersion(sourceLib.version);
                        sourceLib.website = properties.url;
                    }
                    else {
                        sourceLib.name = libDir;
                    }
                    sourceLib.builtIn = true;
                    sourceLib.installed = true;
                    sourceLib.installedPath = path.join(builtInLibPath, libDir);
                    sourceLib.srcPath = path.join(builtInLibPath, libDir, "src");
                    // If lib src folder doesn't exist, then fallback to lib root path as source folder.
                    sourceLib.srcPath = util.directoryExistsSync(sourceLib.srcPath) ? sourceLib.srcPath : path.join(builtInLibPath, libDir);
                    sourceLib.architectures = [architecture];
                    // For libraries with the same name, append architecture info to name to avoid duplication.
                    if (librarySet.has(sourceLib.name)) {
                        sourceLib.name = sourceLib.name + "(" + architecture + ")";
                    }
                    if (!librarySet.has(sourceLib.name)) {
                        librarySet.add(sourceLib.name);
                        builtInLib.push(sourceLib);
                    }
                }
            }
            return builtInLib;
        });
    }
    tagSupportedLibraries() {
        const currentBoard = this._arduinoApp.boardManager.currentBoard;
        if (!currentBoard) {
            return;
        }
        const targetArch = currentBoard.platform.architecture;
        this._libraries.forEach((library) => {
            const architectures = [].concat(library.architectures || "*");
            library.supported = !!architectures.find((arch) => {
                return arch.indexOf(targetArch) >= 0 || arch.indexOf("*") >= 0;
            });
        });
    }
}
exports.LibraryManager = LibraryManager;

//# sourceMappingURL=libraryManager.js.map

// SIG // Begin signature block
// SIG // MIInkQYJKoZIhvcNAQcCoIIngjCCJ34CAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // I1fZH7JoDaOWtwY1gCuixI61LMgMVEYYVaHjElEKMAig
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
// SIG // DQEJBDEiBCDad5mD4brhDpt8klvGrjtpWaevZ9dHF0QA
// SIG // iJp22MAq7TBCBgorBgEEAYI3AgEMMTQwMqAUgBIATQBp
// SIG // AGMAcgBvAHMAbwBmAHShGoAYaHR0cDovL3d3dy5taWNy
// SIG // b3NvZnQuY29tMA0GCSqGSIb3DQEBAQUABIIBAJ8MppO2
// SIG // HFzcDKikig0iKtnv1iQ03OL2V3pvYWlUOkA1v1uufc8i
// SIG // EiH7G4YAvDEq5CnxucPzs9DOOqqD2J6HvKdMHVjppaKn
// SIG // ywgnqT5aKh7s/zRGO/cWnAgO73WPf7svfg6y/tLy98yd
// SIG // eS8Avpxp52NH/vw3mUZNOjdpNt3NXHvsS8FLEiFA2+Xp
// SIG // gD4jMYBEpvkEoZ1z6Eq++Eb3XMY9/g0h6TDhOJUwr+d4
// SIG // KwY7pB6WOZvcDtVPfFt11sprpCVgj+FdjMkspt/6SlHr
// SIG // G+o+u8gLrStRWZIiVQVvfa0TtY8RK0QwXQVY1xnoylO7
// SIG // VadGgmAVls1iz8zlsZ8vUmqzz6Whghb9MIIW+QYKKwYB
// SIG // BAGCNwMDATGCFukwghblBgkqhkiG9w0BBwKgghbWMIIW
// SIG // 0gIBAzEPMA0GCWCGSAFlAwQCAQUAMIIBUQYLKoZIhvcN
// SIG // AQkQAQSgggFABIIBPDCCATgCAQEGCisGAQQBhFkKAwEw
// SIG // MTANBglghkgBZQMEAgEFAAQg0MIAFhzR4a/6AuLVhyIE
// SIG // +G3NgIFIDv8mQ9q7IGQJ9NICBmPubjVx6hgTMjAyMzAz
// SIG // MTUyMTA1MzcuMjIzWjAEgAIB9KCB0KSBzTCByjELMAkG
// SIG // A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAO
// SIG // BgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjElMCMGA1UECxMcTWljcm9zb2Z0
// SIG // IEFtZXJpY2EgT3BlcmF0aW9uczEmMCQGA1UECxMdVGhh
// SIG // bGVzIFRTUyBFU046QUUyQy1FMzJCLTFBRkMxJTAjBgNV
// SIG // BAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2Wg
// SIG // ghFUMIIHDDCCBPSgAwIBAgITMwAAAb/fbrkEFVIoWAAB
// SIG // AAABvzANBgkqhkiG9w0BAQsFADB8MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1T
// SIG // dGFtcCBQQ0EgMjAxMDAeFw0yMjExMDQxOTAxMjRaFw0y
// SIG // NDAyMDIxOTAxMjRaMIHKMQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MSUwIwYDVQQLExxNaWNyb3NvZnQgQW1lcmljYSBPcGVy
// SIG // YXRpb25zMSYwJAYDVQQLEx1UaGFsZXMgVFNTIEVTTjpB
// SIG // RTJDLUUzMkItMUFGQzElMCMGA1UEAxMcTWljcm9zb2Z0
// SIG // IFRpbWUtU3RhbXAgU2VydmljZTCCAiIwDQYJKoZIhvcN
// SIG // AQEBBQADggIPADCCAgoCggIBALhMYdJ9VMSjMwb5Dx3q
// SIG // +O568g+FCthlctV+mzlQvoS1YQ5bCFkNbl//WvCESN81
// SIG // 6P8taEw7o/qyR8l+DmUJ+NhNIru8erMD7zN+MyDkj5/J
// SIG // YJ1sxhALEbc/cway1vfuMP2IVpVyPIb3O6L6rqbi9017
// SIG // XvAW5jTlA0i/jrtmwXzmxs7B98mPwRC76sDtdymfWdTs
// SIG // SmnJ6qtbvRPUYWovdEk6INtpUdjFUUseeRR4v3pp2QPy
// SIG // Cr7ALRB9iuiZoDskO/5g0K1jRAOa6FI4UKi0MNf98M/w
// SIG // iL3PfhT8V9ncUdJ772HuVS6r/EPfXDpDus+leLLRg8hQ
// SIG // 7jvAsLYkrwgt0KzjroAJd92jw/WGbMMsFkZPmBsiyPhc
// SIG // PpAglGOodajo04+YJc9HrJnbN7nuOVmiNoSPbrBaKzPI
// SIG // Mv/+bQ2V49CilNQcQNOMaXxMvdUWVG3OqXQLxJKWKzdo
// SIG // 5aV4TL0w+6YHWMsZFUmlmb+5FqecvTY1j/wkwxl0wug1
// SIG // ohnF8D0DuukHVTVsbohnaXz2hFJ1l3Cpw1bmtZIQQMTu
// SIG // JvcIP9ajOn+x8F3/6R4nzHo/qge0lGToiUnF/tR5n35m
// SIG // UQBYiV0tKlA5NGQGVt6F9sS8pdNOOHhyO2PeRj2sPDpU
// SIG // k3jYjQCpfjMh+Tmon7FLslRzn+K7KxPmcgLkvXvREaru
// SIG // R/9dAgMBAAGjggE2MIIBMjAdBgNVHQ4EFgQUVQKJVE93
// SIG // ld8Cv/i7n/8GsAjzGKcwHwYDVR0jBBgwFoAUn6cVXQBe
// SIG // Yl2D9OXSZacbUzUZ6XIwXwYDVR0fBFgwVjBUoFKgUIZO
// SIG // aHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9j
// SIG // cmwvTWljcm9zb2Z0JTIwVGltZS1TdGFtcCUyMFBDQSUy
// SIG // MDIwMTAoMSkuY3JsMGwGCCsGAQUFBwEBBGAwXjBcBggr
// SIG // BgEFBQcwAoZQaHR0cDovL3d3dy5taWNyb3NvZnQuY29t
// SIG // L3BraW9wcy9jZXJ0cy9NaWNyb3NvZnQlMjBUaW1lLVN0
// SIG // YW1wJTIwUENBJTIwMjAxMCgxKS5jcnQwDAYDVR0TAQH/
// SIG // BAIwADATBgNVHSUEDDAKBggrBgEFBQcDCDANBgkqhkiG
// SIG // 9w0BAQsFAAOCAgEAIwkRL40+sl8CWHb5BVKkxhoekYsw
// SIG // GPnIrgelDgVJtMqquUAvuaQhGvVkjL21Bs8QwhBQYA/d
// SIG // 4Fhp5IsmHBwms5YGSvhO1sbSN2z/vhW+ESWYli6PyAvY
// SIG // V9doQmWcGFyBlcwvQVQHDcf87BaiP/bvLv24Rowxz2ne
// SIG // OwuDkDQh65DasxmMW+BkKuj7MOqO3BLctzFNyXeLswWs
// SIG // 2hYT0b5gX0p/lH3eqUzWS4CF/QY6y5mW5XP3diyALqxK
// SIG // +VtvVn1uUTESBGczvU2jK/883Zlv3FelXWg08oMuYODt
// SIG // 1F2nbdQ62lKZ+Y3A9dE1VjZ8s/6WnpXh6I6xggpLKnsa
// SIG // XpTJFLImD9B1/aRVIDYJVlNdK9cBMxcGTPWl9kaqt3xU
// SIG // azd4LvLQl/h9ZyitgKG1tb5rCi0x+j8l9S5Mr0cE4+OW
// SIG // taWnhyEfExs5t/omO8KQtTB7s6gKgHQ3miFXVZXIfNO1
// SIG // SSeIQ4r3ugIjkAlfTMIlMoX+b+D/I0xqH/Aqow29z5y5
// SIG // TUpxZtgRYTGd+aDUxKLHN+xmR0nDPN4UzdROPNbC2Ca6
// SIG // 4YXHbXMjQetI7jI6hlA+rkP+w2zL7b/d7RY+Vo8VYTAp
// SIG // JGOuhBGIKXxSzgm9p4CSVhbiQiBrAog3w8RsBOEVWAJ6
// SIG // Bc6Gtjn0qoo2INna3WX6abUUbysTLAM7t6MZEv0wggdx
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
// SIG // dGlvbnMxJjAkBgNVBAsTHVRoYWxlcyBUU1MgRVNOOkFF
// SIG // MkMtRTMyQi0xQUZDMSUwIwYDVQQDExxNaWNyb3NvZnQg
// SIG // VGltZS1TdGFtcCBTZXJ2aWNloiMKAQEwBwYFKw4DAhoD
// SIG // FQA4BHfiTa6eHabxSjGYvdbcW34nN6CBgzCBgKR+MHwx
// SIG // CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9u
// SIG // MRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jv
// SIG // c29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwMA0GCSqGSIb3
// SIG // DQEBBQUAAgUA57yEyzAiGA8yMDIzMDMxNjAxNTQxOVoY
// SIG // DzIwMjMwMzE3MDE1NDE5WjB0MDoGCisGAQQBhFkKBAEx
// SIG // LDAqMAoCBQDnvITLAgEAMAcCAQACAgfNMAcCAQACAhFi
// SIG // MAoCBQDnvdZLAgEAMDYGCisGAQQBhFkKBAIxKDAmMAwG
// SIG // CisGAQQBhFkKAwKgCjAIAgEAAgMHoSChCjAIAgEAAgMB
// SIG // hqAwDQYJKoZIhvcNAQEFBQADgYEAdDL7VQPmcfjurn+h
// SIG // fuO6Z8uCyeeZn792ecZvRC8oi0owQ7UPAnprE0/HyGQ/
// SIG // tiQnko87+LZ4sa4Z0otyM/O0PMYkIRxW/yx7/T4tRXY4
// SIG // gH+Pot2jDTMiKSkOfjrcCm2sU6bmhvbC+Nua7qE9zVwu
// SIG // W/dGvFgBQG7QVZCDsfjg754xggQNMIIECQIBATCBkzB8
// SIG // MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3Rv
// SIG // bjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWlj
// SIG // cm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNy
// SIG // b3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMAITMwAAAb/f
// SIG // brkEFVIoWAABAAABvzANBglghkgBZQMEAgEFAKCCAUow
// SIG // GgYJKoZIhvcNAQkDMQ0GCyqGSIb3DQEJEAEEMC8GCSqG
// SIG // SIb3DQEJBDEiBCCrK+Hs5DcCVF9sVaQSgX7e0X8cfIYF
// SIG // I712w+MJrhZZATCB+gYLKoZIhvcNAQkQAi8xgeowgecw
// SIG // geQwgb0EIP0OLUc+txIkY+CvtfcjVMKIASDrKeOAiLgX
// SIG // 52RwrwWuMIGYMIGApH4wfDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAg
// SIG // UENBIDIwMTACEzMAAAG/3265BBVSKFgAAQAAAb8wIgQg
// SIG // CSaQDoY5kL2c915goBp4xFUIjiBzbaUA+86EEWWHzFow
// SIG // DQYJKoZIhvcNAQELBQAEggIAUPz222dh41VscMKQY0P8
// SIG // A7RHKlP60E1QUtoNmF+a/lmCPwEEbsBaxb36duQyL6wR
// SIG // 1lGmbGlD0/BdebHdDoKIOHNb7Oo4gLWswqUwnKqJ+ql8
// SIG // XKgwHfFu96togbXVwE6kixlOmkkieb1ChGPLYt/YsrIt
// SIG // +HQO09kWY2dPRNihW6TjMNg9pDd26iEGBQgxCKz1xNSc
// SIG // XoTTiN15cimLwyAyLhBe0ypCRw+HQLjG3hHpnbuOMrBJ
// SIG // oj/SQPNHy+MCkbEbIicudixAeuU3nb5qJLhMf1A0r9hr
// SIG // hqIkY2U/L3DETcIEsmFLa70/qMx/1//UHtI3Ew0yEJDU
// SIG // cL04o2Eb/9Pw+JbnansNHQFhxMHysRtSb8vkIyVZo9FI
// SIG // aurBzPD3ciug3JvMWzNqdl0PDPCxXkmsLWSS/GhXT888
// SIG // /hsTBWue4DY7zIkBKH8fEZSncaLEVpkSOQeBKNmY8nPs
// SIG // nmijZWKEkue0CRlMCBKrD1tHMZ8vMRi28LOAkpQrSTfX
// SIG // 4jKq6mnHRyLRFtAItXoBm/1co3kogFZdkxsgMav/yx9o
// SIG // PRNNK/ahtjDdYZ3ssEsvx4L9XU+yDqib4xIMgrWpj+Rt
// SIG // aUfw7iEFW+Wlvv9mL3CQmXy3Xo7ZXrnDjsszm1TsdyV+
// SIG // iJ1qEqHR4oyUR/CCVWSa5+jrmfpd2sVqro34TlnCFt7Foq4=
// SIG // End signature block
