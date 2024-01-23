"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timer = exports.notifyUserWarning = exports.notifyUserError = exports.notifyAndThrowUserError = exports.traceWarning = exports.traceError = exports.traceUserData = exports.silly = exports.error = exports.verbose = exports.warn = exports.debug = exports.info = exports.configure = exports.LogLevel = void 0;
const winston = require("winston");
const telemetry_transport_1 = require("./telemetry-transport");
const user_notification_transport_1 = require("./user-notification-transport");
var LogLevel;
(function (LogLevel) {
    LogLevel["Info"] = "info";
    LogLevel["Warn"] = "warn";
    LogLevel["Error"] = "error";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
function FilterErrorPath(line) {
    if (line) {
        const values = line.split("/out/");
        if (values.length <= 1) {
            // Didn't match expected format
            return line;
        }
        else {
            return values[1];
        }
    }
}
function configure(context) {
    winston.configure({
        transports: [
            new (winston.transports.File)({ level: LogLevel.Warn, filename: context.asAbsolutePath("arduino.log") }),
            new telemetry_transport_1.default({ level: LogLevel.Info, context }),
            new user_notification_transport_1.default({ level: LogLevel.Info }),
        ],
    });
}
exports.configure = configure;
function info(message, metadata) {
    winston.info(message, metadata);
}
exports.info = info;
function debug(message, metadata) {
    winston.debug(message, metadata);
}
exports.debug = debug;
function warn(message, metadata) {
    winston.warn(message, metadata);
}
exports.warn = warn;
function verbose(message, metadata) {
    winston.verbose(message, metadata);
}
exports.verbose = verbose;
function error(message, metadata) {
    winston.error(message, metadata);
}
exports.error = error;
function silly(message, metadata) {
    winston.silly(message, metadata);
}
exports.silly = silly;
function traceUserData(message, metadata) {
    // use `info` as the log level and add a special flag in metadata
    winston.log(LogLevel.Info, message, Object.assign(Object.assign({}, metadata), { telemetry: true }));
}
exports.traceUserData = traceUserData;
function traceErrorOrWarning(level, message, error, metadata) {
    // use `info` as the log level and add a special flag in metadata
    let stackArray;
    let firstLine = "";
    if (error !== undefined && error.stack !== undefined) {
        stackArray = error.stack.split("\n");
        if (stackArray !== undefined && stackArray.length >= 2) {
            firstLine = stackArray[1]; // The fist line is the error message and we don't want to send that telemetry event
            firstLine = FilterErrorPath(firstLine ? firstLine.replace(/\\/g, "/") : "");
        }
    }
    winston.log(level, message, Object.assign(Object.assign({}, metadata), { message: error.message, errorLine: firstLine, telemetry: true }));
}
function traceError(message, error, metadata) {
    traceErrorOrWarning(LogLevel.Error, message, error, metadata);
}
exports.traceError = traceError;
function traceWarning(message, error, metadata) {
    traceErrorOrWarning(LogLevel.Warn, message, error, metadata);
}
exports.traceWarning = traceWarning;
function notifyAndThrowUserError(errorCode, error, message) {
    notifyUserError(errorCode, error, message);
    throw error;
}
exports.notifyAndThrowUserError = notifyAndThrowUserError;
function notifyUserError(errorCode, error, message) {
    traceError(errorCode, error, { notification: message || error.message, showUser: true, telemetry: true });
}
exports.notifyUserError = notifyUserError;
function notifyUserWarning(errorCode, error, message) {
    traceWarning(errorCode, error, { notification: message || error.message, showUser: true, telemetry: true });
}
exports.notifyUserWarning = notifyUserWarning;
class Timer {
    constructor() {
        this.start();
    }
    // Get the duration of time elapsed by the timer, in milliseconds
    end() {
        if (!this._startTime) {
            return -1;
        }
        else {
            const endTime = process.hrtime(this._startTime);
            return endTime[0] * 1000 + endTime[1] / 1000000;
        }
    }
    start() {
        this._startTime = process.hrtime();
    }
}
exports.Timer = Timer;

//# sourceMappingURL=logger.js.map

// SIG // Begin signature block
// SIG // MIInkQYJKoZIhvcNAQcCoIIngjCCJ34CAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // Jvx9r95AvAe+m2iGGMvSP9hMoRFQl4TA/MyKWvoA/seg
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
// SIG // DQEJBDEiBCD+Pz78jamxtD/Y0174HIOykudQ4FRg8EY/
// SIG // vg4C0b+JoDBCBgorBgEEAYI3AgEMMTQwMqAUgBIATQBp
// SIG // AGMAcgBvAHMAbwBmAHShGoAYaHR0cDovL3d3dy5taWNy
// SIG // b3NvZnQuY29tMA0GCSqGSIb3DQEBAQUABIIBAGcBH1Qx
// SIG // OAPQKlyXxoCN6yRALYphAjAIMqW7cdRUjN0jIU2m11Ds
// SIG // LCKkYGMDE5+OGSn6O4u11sKIQwX/+utQC3LKi4u41lno
// SIG // vI6h3bQwIhK5cX4gVi4GVr93hu5vfuLe8oEAIdPkUayw
// SIG // JfkrZscIcye+w64Pr8KnksI7J0iHhWa8qkZnKZVTfUI6
// SIG // AuoC9alya2H4dxvmde7HnKnPPB9eKPDwbSLM57QnM6ZO
// SIG // GD5hjkW9yPmO3NHTsq9UdsgMsbE4BZKZUEHuDyOym+2A
// SIG // 3f/j2u1ga5rM2MaKpzTT43Ajs5y94eliGHmH+fDLOels
// SIG // c6BD2DJuGF6kLudoWT7bzxtrI+Whghb9MIIW+QYKKwYB
// SIG // BAGCNwMDATGCFukwghblBgkqhkiG9w0BBwKgghbWMIIW
// SIG // 0gIBAzEPMA0GCWCGSAFlAwQCAQUAMIIBUQYLKoZIhvcN
// SIG // AQkQAQSgggFABIIBPDCCATgCAQEGCisGAQQBhFkKAwEw
// SIG // MTANBglghkgBZQMEAgEFAAQgHN+cRkeA+Njsn5hWVA9P
// SIG // CuZGNs3eFsAcQOGtR0iNjGcCBmPuM3OrtRgTMjAyMzAz
// SIG // MTUyMTA1MzcuMDExWjAEgAIB9KCB0KSBzTCByjELMAkG
// SIG // A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAO
// SIG // BgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjElMCMGA1UECxMcTWljcm9zb2Z0
// SIG // IEFtZXJpY2EgT3BlcmF0aW9uczEmMCQGA1UECxMdVGhh
// SIG // bGVzIFRTUyBFU046N0JGMS1FM0VBLUI4MDgxJTAjBgNV
// SIG // BAMTHE1pY3Jvc29mdCBUaW1lLVN0YW1wIFNlcnZpY2Wg
// SIG // ghFUMIIHDDCCBPSgAwIBAgITMwAAAcj5sO5n7eprRgAB
// SIG // AAAByDANBgkqhkiG9w0BAQsFADB8MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1T
// SIG // dGFtcCBQQ0EgMjAxMDAeFw0yMjExMDQxOTAxMzdaFw0y
// SIG // NDAyMDIxOTAxMzdaMIHKMQswCQYDVQQGEwJVUzETMBEG
// SIG // A1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9u
// SIG // ZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MSUwIwYDVQQLExxNaWNyb3NvZnQgQW1lcmljYSBPcGVy
// SIG // YXRpb25zMSYwJAYDVQQLEx1UaGFsZXMgVFNTIEVTTjo3
// SIG // QkYxLUUzRUEtQjgwODElMCMGA1UEAxMcTWljcm9zb2Z0
// SIG // IFRpbWUtU3RhbXAgU2VydmljZTCCAiIwDQYJKoZIhvcN
// SIG // AQEBBQADggIPADCCAgoCggIBALnLnX4oT4MkVsJ5yLiQ
// SIG // qnN0wrRZNFzophXCo1PW0ulhZ4NpfhayIndJj2eylrOh
// SIG // MI9tV/mZBpDOsfqMx5ZjbZx0kOPKYyBXZSlyKIe30qON
// SIG // QOJ9LUCJcIbPLiGCKHKe9scAwRykmcRmhGv9O9O4sjsP
// SIG // ml2VzXE8YDYkRAEm/bYZS2TO+ZnySIAVb1JnS2XPlzlG
// SIG // MM//LpeyBM7TzR+HJ/Ap9LSYSBX6dp3ra/BmDaIsiKsb
// SIG // nhu/rErdsV5e/4oHOXBz2Z1oX5fT2gePkrrawPMwIc1R
// SIG // 054+EX38QOEd5OAUWz3RqMEHzn/eWXmMS0x3+WsAdJ6m
// SIG // cTmPsrhloX+oaeURkaLnPW3lWb/fDNXq2GueUtWoWYBg
// SIG // 0CcnFbRMvNkZZin02GNrjZpTy1rZw+7A5aVZIWEBirk1
// SIG // p7sECqvWU0hPtFdnB/CWlgWCUDCLlljPN7yz6NyE/0v+
// SIG // Y09qGTkvZ7CYMMAsEVLWLcLavPzybb7dVelaBuFndvzA
// SIG // In4BCTpBxewET6iPV79vPq4qiWeZoyxs/OHT9q8qHtJc
// SIG // WEs9z0+RKyqEtPsyaWDQHMW79lF4k5N1o/5md7bpc+s+
// SIG // F50peYMtDy3q/hFY8+BvehnGYCtnfRvrmMpR1sAZ3iL/
// SIG // WBUI+sjHVv+LBKZBG66YiTXpnMVApgYqWe0nN+a7+LrZ
// SIG // CeP1AgMBAAGjggE2MIIBMjAdBgNVHQ4EFgQUtVwvSYG6
// SIG // 0sCw04iSU+IiuzVL5PUwHwYDVR0jBBgwFoAUn6cVXQBe
// SIG // Yl2D9OXSZacbUzUZ6XIwXwYDVR0fBFgwVjBUoFKgUIZO
// SIG // aHR0cDovL3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9j
// SIG // cmwvTWljcm9zb2Z0JTIwVGltZS1TdGFtcCUyMFBDQSUy
// SIG // MDIwMTAoMSkuY3JsMGwGCCsGAQUFBwEBBGAwXjBcBggr
// SIG // BgEFBQcwAoZQaHR0cDovL3d3dy5taWNyb3NvZnQuY29t
// SIG // L3BraW9wcy9jZXJ0cy9NaWNyb3NvZnQlMjBUaW1lLVN0
// SIG // YW1wJTIwUENBJTIwMjAxMCgxKS5jcnQwDAYDVR0TAQH/
// SIG // BAIwADATBgNVHSUEDDAKBggrBgEFBQcDCDANBgkqhkiG
// SIG // 9w0BAQsFAAOCAgEAw9ZyUshDw6koJ35BYnyG7XiW+zZG
// SIG // Qm0Y+cgRok9X/X0xr1G+Qlu5N3kqd7sVKqJvS1spHDX0
// SIG // Gv2H8NJYmxIpvWEY1DXC+NqCBaraf+65fYIOtaIgfDwf
// SIG // uryxJo15GMVFEfFoyiguUOXcfegdtX2knKNjDpr42MRl
// SIG // EewJ/uOdvZUDzy6mxCkY3DUG/qfppEB9l3jG7IeREApE
// SIG // 7mAIphU4J7otmTxSxLgacQSuc9h5yp3h1CfYuKXClnQq
// SIG // hdQDlTfIFyB9EdBX5THAoOU1vL/dFcMf5j92hNiIHtbh
// SIG // PDPWDQZ+e++j8ZgNemfnNrPoWCPvbCWYYUQPGkmGnK5S
// SIG // 8+2lP+ejrxGEREUGbbbgBZK1fjPyfrQnhjb9Bne+WOJS
// SIG // izKef9MaDr4jwXQdqw+Qv1PgfKrdWwakC1WdcB0ctP+h
// SIG // 4ScWzotiIBiWjgmCxl9s89FQE+pmdgU1qyZnCukg7+61
// SIG // +6bIAvgn9bdEdWlgpAhybaWLsio3+1KHUWs3rzn+ldNV
// SIG // 5KwERyqyO20KBxS/rLp9pYiQgYzedZg1qBIFAhL8Ad5f
// SIG // kRWAC9GiIrHOXE2hl/0/BfogG8/o9hhlbpvOYBEEvbi8
// SIG // 0nnaGD8hF8U25cHsBnQMaiGWiqM0QaMOPTpy/uQoKKFT
// SIG // H92UqqcXNkAtBNN5enP7woZGMqjF6uy8HeD5x6owggdx
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
// SIG // dGlvbnMxJjAkBgNVBAsTHVRoYWxlcyBUU1MgRVNOOjdC
// SIG // RjEtRTNFQS1CODA4MSUwIwYDVQQDExxNaWNyb3NvZnQg
// SIG // VGltZS1TdGFtcCBTZXJ2aWNloiMKAQEwBwYFKw4DAhoD
// SIG // FQDfzhNQu8Y1NApSA10AYrnAGO7LsqCBgzCBgKR+MHwx
// SIG // CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9u
// SIG // MRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1pY3Jv
// SIG // c29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwMA0GCSqGSIb3
// SIG // DQEBBQUAAgUA57xJhzAiGA8yMDIzMDMxNTIxNDEyN1oY
// SIG // DzIwMjMwMzE2MjE0MTI3WjB0MDoGCisGAQQBhFkKBAEx
// SIG // LDAqMAoCBQDnvEmHAgEAMAcCAQACAitUMAcCAQACAhHL
// SIG // MAoCBQDnvZsHAgEAMDYGCisGAQQBhFkKBAIxKDAmMAwG
// SIG // CisGAQQBhFkKAwKgCjAIAgEAAgMHoSChCjAIAgEAAgMB
// SIG // hqAwDQYJKoZIhvcNAQEFBQADgYEARm91eUqQZFC9IIPC
// SIG // GdiOA3dlAhH7xiqoruJUPg/I59Ky11BPxX8XMggknZZy
// SIG // Mk+gM1VZDLdedNovw0Bc23WbUwTFjK42MY08tsUjvpvh
// SIG // m6GpnP4yxI7mCaK6LzbCca7XuEt/7R3WJEfp+A+8flbN
// SIG // REKsLeXMfiPD5BL+jDX8XKIxggQNMIIECQIBATCBkzB8
// SIG // MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3Rv
// SIG // bjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWlj
// SIG // cm9zb2Z0IENvcnBvcmF0aW9uMSYwJAYDVQQDEx1NaWNy
// SIG // b3NvZnQgVGltZS1TdGFtcCBQQ0EgMjAxMAITMwAAAcj5
// SIG // sO5n7eprRgABAAAByDANBglghkgBZQMEAgEFAKCCAUow
// SIG // GgYJKoZIhvcNAQkDMQ0GCyqGSIb3DQEJEAEEMC8GCSqG
// SIG // SIb3DQEJBDEiBCCaw2KkaqOef1BHtr0AKJZImw/OYRHz
// SIG // XMDAKJRjGuFJxTCB+gYLKoZIhvcNAQkQAi8xgeowgecw
// SIG // geQwgb0EIGIAmM/NP22jL8cOo3Kkry9BVuE3bwNPZ8R3
// SIG // 7D4bhANmMIGYMIGApH4wfDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3RhbXAg
// SIG // UENBIDIwMTACEzMAAAHI+bDuZ+3qa0YAAQAAAcgwIgQg
// SIG // Dl6feoaTNuaFYz6YOpHuPPRk6rKE/wWUnFoE/gvIs3Qw
// SIG // DQYJKoZIhvcNAQELBQAEggIAJW/KkNhRLSq24+UU5b4T
// SIG // bnpuas9y+t1Aw6L+a9dRHy1Yb5ucqVM/3cJbS8LeS44s
// SIG // af2alPpI08swufk61miQuub/oug1sBbuM8feSDclgVy1
// SIG // +5r9qrf+cmNo+4xbdZfrdNZKCMlZuAZk1yknKVRkq+Ud
// SIG // WqwP5Fb0txb9FKdFB07f4WHIZN7//C4495rdBudSK067
// SIG // /4v+AqbSd9wwbpdcHEFnsN7YCnJl/iFxuEgIPnj16D6Q
// SIG // 0niJI7UPqI1Be+neDs1x2xdf3u8fFPav2F8FNP3rth5v
// SIG // v0PPcVTwWeyIaXftEANbLMEvcnO1nArLZFYdM9sUnOrM
// SIG // 4YwLuiNBbRBVKuxHOheaMTQdK15kLB4ns/5eHXoH7SCT
// SIG // 25yQ/yFu4LYE+DtRlchVESK29HbDF6VoW1C/J77jjg6+
// SIG // LLW7kYkaCnjU0EtLQQZ7Qk0EpSRofdpByRLYerzCadEM
// SIG // fvSS0PYrJl/4b6V4IG/Qf4ROIcpdwe7KOgFM7fSvshfi
// SIG // JrK66r5aa+TCsRKlSvOXdasyTl0rKPJ8zuzC9JNPUCMF
// SIG // lrnKMBFm0AmHl/1ORe1kn5IP85LUZUeHyQzhrYEl5i6A
// SIG // Z0I4iZHm1g9dSMBEIkWBV8VT1pcq+sYruspLOCyC66nR
// SIG // nWIxaAt/itNFnEky2iISJLlj8MeNC30t2Mq+j2TBBPV9QKo=
// SIG // End signature block
