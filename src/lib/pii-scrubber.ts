/**
 * PII (Personally Identifiable Information) Scrubber
 *
 * Removes or redacts sensitive data before sending to Sentry or logs.
 * Protects user privacy while maintaining useful error information.
 */

/**
 * PII field patterns to scrub
 */
const PII_FIELD_PATTERNS = [
  // Identity
  'email',
  'emailAddress',
  'userEmail',
  'username',
  'userName',
  'name',
  'fullName',
  'firstName',
  'lastName',
  'displayName',

  // Contact
  'phone',
  'phoneNumber',
  'mobile',
  'telephone',
  'address',
  'street',
  'city',
  'state',
  'zipCode',
  'postalCode',
  'country',

  // Authentication
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'authToken',
  'sessionId',
  'session_id',

  // Financial
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'cvv',
  'cvv2',
  'cvc',
  'ssn',
  'socialSecurity',
  'bankAccount',
  'bank_account',
  'routingNumber',
  'routing_number',

  // Identifiers
  'uid',
  'userId',
  'user_id',
  'companyId',
  'company_id',
  'customerId',
  'customer_id',

  // Firebase specific
  'firebaseToken',
  'firebase_token',
  'idToken',
  'id_token',
];

/**
 * PII regex patterns for value-based detection
 */
const PII_VALUE_PATTERNS = [
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (various formats)
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  /\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g,

  // Credit card numbers (basic pattern)
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // SSN (XXX-XX-XXXX)
  /\b\d{3}-\d{2}-\d{4}\b/g,

  // IP addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
];

/**
 * Redaction placeholder
 */
const REDACTED = '[REDACTED]';

/**
 * Check if a field name indicates PII
 */
export function isPIIField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  return PII_FIELD_PATTERNS.some((pattern) =>
    lowerField.includes(pattern.toLowerCase())
  );
}

/**
 * Check if a value contains PII patterns
 */
export function containsPII(value: string): boolean {
  if (typeof value !== 'string') return false;
  return PII_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

/**
 * Redact PII from a string value
 */
export function redactPIIFromString(value: string): string {
  if (typeof value !== 'string') return value;

  let redacted = value;

  // Apply each PII pattern
  for (const pattern of PII_VALUE_PATTERNS) {
    redacted = redacted.replace(pattern, REDACTED);
  }

  return redacted;
}

/**
 * Scrub PII from an object recursively
 */
export function scrubPII(data: any, maxDepth = 10, currentDepth = 0): any {
  // Prevent infinite recursion
  if (currentDepth >= maxDepth) {
    return '[MAX_DEPTH]';
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== 'object') {
    // Check strings for PII patterns
    if (typeof data === 'string') {
      return redactPIIFromString(data);
    }
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => scrubPII(item, maxDepth, currentDepth + 1));
  }

  // Handle objects
  const scrubbed: any = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if field name indicates PII
    if (isPIIField(key)) {
      scrubbed[key] = REDACTED;
      continue;
    }

    // Recursively scrub nested objects
    if (value && typeof value === 'object') {
      scrubbed[key] = scrubPII(value, maxDepth, currentDepth + 1);
    } else if (typeof value === 'string') {
      // Check string values for PII patterns
      scrubbed[key] = redactPIIFromString(value);
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

/**
 * Scrub PII from error messages
 */
export function scrubErrorMessage(message: string): string {
  if (typeof message !== 'string') return String(message);

  let scrubbed = message;

  // Redact common PII patterns in error messages
  scrubbed = redactPIIFromString(scrubbed);

  // Redact user IDs in error messages
  scrubbed = scrubbed.replace(/user[_-]?id[:\s]*\S+/gi, 'userId: [REDACTED]');
  scrubbed = scrubbed.replace(/uid[:\s]*\S+/gi, 'uid: [REDACTED]');

  // Redact Firebase UIDs (28-character alphanumeric)
  scrubbed = scrubbed.replace(/\b[A-Za-z0-9]{28}\b/g, '[UID]');

  // Redact tokens
  scrubbed = scrubbed.replace(/token[:\s]*\S+/gi, 'token: [REDACTED]');

  return scrubbed;
}

/**
 * Create a safe context object for logging/error reporting
 */
export interface SafeContext {
  environment: string;
  release?: string;
  userId?: string; // Hashed or anonymized
  companyId?: string; // Hashed or anonymized
  [key: string]: any;
}

/**
 * Create safe context from user data
 */
export function createSafeContext(user?: {
  uid?: string;
  email?: string;
  companyId?: string;
  role?: string;
}): SafeContext {
  if (!user) {
    return {
      environment: import.meta.env.MODE,
      authenticated: false,
    };
  }

  return {
    environment: import.meta.env.MODE,
    authenticated: true,
    // Use hashed or anonymized IDs
    userId: user.uid ? hashString(user.uid) : undefined,
    companyId: user.companyId ? hashString(user.companyId) : undefined,
    role: user.role, // Role is not PII
    // Don't include email or any PII
  };
}

/**
 * Simple hash function for anonymizing IDs
 * Not cryptographically secure, but good enough for anonymization
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `anon_${Math.abs(hash).toString(36)}`;
}

/**
 * Scrub PII from request/response data
 */
export function scrubRequestData(data: any): any {
  if (!data) return data;

  const scrubbed = scrubPII(data);

  // Additional scrubbing for common API patterns
  if (scrubbed.headers) {
    scrubbed.headers = {
      ...scrubbed.headers,
      Authorization: scrubbed.headers.Authorization ? '[REDACTED]' : undefined,
      Cookie: scrubbed.headers.Cookie ? '[REDACTED]' : undefined,
      'X-API-Key': scrubbed.headers['X-API-Key'] ? '[REDACTED]' : undefined,
    };
  }

  return scrubbed;
}

/**
 * Scrub PII from breadcrumbs
 */
export function scrubBreadcrumb(breadcrumb: any): any {
  if (!breadcrumb) return breadcrumb;

  const scrubbed = { ...breadcrumb };

  // Scrub data in breadcrumb
  if (scrubbed.data) {
    scrubbed.data = scrubPII(scrubbed.data);
  }

  // Scrub message
  if (scrubbed.message && typeof scrubbed.message === 'string') {
    scrubbed.message = scrubErrorMessage(scrubbed.message);
  }

  return scrubbed;
}

/**
 * Get safe user identifier for error tracking
 */
export function getSafeUserId(user?: { uid?: string; email?: string }): string | undefined {
  if (!user) return undefined;

  // Use hashed UID instead of actual UID or email
  if (user.uid) {
    return hashString(user.uid);
  }

  return undefined;
}

/**
 * Allowlist of safe fields that don't need scrubbing
 */
const SAFE_FIELDS = new Set([
  'id',
  'type',
  'status',
  'role',
  'level',
  'category',
  'timestamp',
  'duration',
  'count',
  'total',
  'success',
  'error',
  'code',
  'message',
  'environment',
  'version',
  'release',
  'platform',
  'browser',
  'os',
]);

/**
 * Check if a field is safe to log
 */
export function isSafeField(fieldName: string): boolean {
  return SAFE_FIELDS.has(fieldName.toLowerCase());
}

/**
 * Create a minimal safe object with only essential fields
 */
export function createMinimalSafeObject(data: any, allowedFields: string[] = []): any {
  if (!data || typeof data !== 'object') return data;

  const safe: any = {};

  const allowed = new Set([...SAFE_FIELDS, ...allowedFields.map((f) => f.toLowerCase())]);

  for (const [key, value] of Object.entries(data)) {
    if (allowed.has(key.toLowerCase())) {
      safe[key] = value;
    }
  }

  return safe;
}

/**
 * Test if scrubbing is working correctly
 */
export function testPIIScrubbing(): void {
  const testData = {
    user: {
      email: 'test@example.com',
      phone: '555-123-4567',
      name: 'John Doe',
      role: 'admin',
    },
    payment: {
      creditCard: '4111-1111-1111-1111',
      cvv: '123',
    },
    metadata: {
      ipAddress: '192.168.1.1',
      userId: 'user_abc123',
    },
    safeData: {
      status: 'active',
      count: 42,
    },
  };

  const scrubbed = scrubPII(testData);

  console.log('Original:', testData);
  console.log('Scrubbed:', scrubbed);
  console.log('Test passed:', scrubbed.user.email === REDACTED);
}
