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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoiceNumber = exports.checkUserClaims = exports.backfillUserClaims = exports.getCurrentClaims = exports.assignUserRole = exports.setUserClaimsOnCreate = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK
admin.initializeApp();
// Export all authentication triggers and callable functions
var auth_1 = require("./triggers/auth");
Object.defineProperty(exports, "setUserClaimsOnCreate", { enumerable: true, get: function () { return auth_1.setUserClaimsOnCreate; } });
Object.defineProperty(exports, "assignUserRole", { enumerable: true, get: function () { return auth_1.assignUserRole; } });
Object.defineProperty(exports, "getCurrentClaims", { enumerable: true, get: function () { return auth_1.getCurrentClaims; } });
// Export migration functions
var backfill_claims_1 = require("./migrations/backfill-claims");
Object.defineProperty(exports, "backfillUserClaims", { enumerable: true, get: function () { return backfill_claims_1.backfillUserClaims; } });
Object.defineProperty(exports, "checkUserClaims", { enumerable: true, get: function () { return backfill_claims_1.checkUserClaims; } });
// Export callable functions
var invoices_1 = require("./callable/invoices");
Object.defineProperty(exports, "generateInvoiceNumber", { enumerable: true, get: function () { return invoices_1.generateInvoiceNumber; } });
// Future exports will include:
// - App Check middleware
// - Scheduled backup functions
// - Analytics functions
//# sourceMappingURL=index.js.map