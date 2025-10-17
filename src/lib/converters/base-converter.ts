/**
 * Base Firestore Data Converter
 *
 * Provides type-safe conversion between Firestore documents and TypeScript types
 * with built-in Zod validation, timestamp conversion, and error handling.
 */

import {
  DocumentData,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
  WithFieldValue,
} from 'firebase/firestore';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '../../services/logger';
import { ValidationError } from '../../services/errors';

/**
 * Base document interface
 */
export interface BaseDocument {
  id?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

/**
 * Converter options
 */
export interface ConverterOptions {
  /**
   * Whether to validate data on read
   * @default true
   */
  validateOnRead?: boolean;

  /**
   * Whether to validate data on write
   * @default true
   */
  validateOnWrite?: boolean;

  /**
   * Whether to strip undefined values
   * @default true
   */
  stripUndefined?: boolean;

  /**
   * Whether to automatically convert timestamps
   * @default true
   */
  convertTimestamps?: boolean;

  /**
   * Custom field transformers
   */
  transformers?: {
    toFirestore?: (data: any) => any;
    fromFirestore?: (data: any) => any;
  };
}

/**
 * Default converter options
 */
const DEFAULT_OPTIONS: Required<ConverterOptions> = {
  validateOnRead: true,
  validateOnWrite: true,
  stripUndefined: true,
  convertTimestamps: true,
  transformers: {},
};

/**
 * Convert JavaScript Date to Firestore Timestamp
 */
export function dateToTimestamp(date: Date | Timestamp): Timestamp {
  if (date instanceof Timestamp) {
    return date;
  }
  return Timestamp.fromDate(date);
}

/**
 * Convert Firestore Timestamp to JavaScript Date
 */
export function timestampToDate(timestamp: Timestamp | Date): Date {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return timestamp.toDate();
}

/**
 * Recursively convert all Timestamp fields to Date
 */
export function convertTimestampsToDate(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Timestamp) {
    return obj.toDate();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestampsToDate);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = convertTimestampsToDate(value);
  }

  return result;
}

/**
 * Recursively convert all Date fields to Timestamp
 */
export function convertDatesToTimestamp(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return Timestamp.fromDate(obj);
  }

  if (obj instanceof Timestamp) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertDatesToTimestamp);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = convertDatesToTimestamp(value);
  }

  return result;
}

/**
 * Strip undefined values from object
 */
export function stripUndefined(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(stripUndefined);
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = stripUndefined(value);
    }
  }

  return result;
}

/**
 * Create a type-safe Firestore data converter
 *
 * @param schema - Zod schema for validation
 * @param collectionName - Name of the Firestore collection (for logging)
 * @param options - Converter options
 * @returns Firestore data converter
 */
export function createConverter<T extends BaseDocument>(
  schema: ZodSchema<T>,
  collectionName: string,
  options: ConverterOptions = {}
): FirestoreDataConverter<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    /**
     * Convert TypeScript object to Firestore document
     */
    toFirestore(data: WithFieldValue<T>): DocumentData {
      try {
        let processedData = { ...data };

        // Apply custom transformer
        if (opts.transformers?.toFirestore) {
          processedData = opts.transformers.toFirestore(processedData);
        }

        // Convert dates to timestamps
        if (opts.convertTimestamps) {
          processedData = convertDatesToTimestamp(processedData);
        }

        // Strip undefined values
        if (opts.stripUndefined) {
          processedData = stripUndefined(processedData);
        }

        // Update timestamps
        const now = Timestamp.now();
        if (!processedData.createdAt) {
          processedData.createdAt = now;
        }
        processedData.updatedAt = now;

        // Validate with Zod
        if (opts.validateOnWrite) {
          try {
            schema.parse(processedData);
          } catch (error) {
            if (error instanceof ZodError) {
              logger.error('Validation error on write', {
                collection: collectionName,
                errors: error.errors,
                data: processedData,
              });
              throw new ValidationError(
                `Invalid data for ${collectionName}: ${error.errors[0]?.message}`,
                error.errors
              );
            }
            throw error;
          }
        }

        logger.debug('Converting to Firestore', {
          collection: collectionName,
          id: processedData.id,
        });

        return processedData as DocumentData;
      } catch (error) {
        logger.error('Error converting to Firestore', error as Error, {
          collection: collectionName,
          data,
        });
        throw error;
      }
    },

    /**
     * Convert Firestore document to TypeScript object
     */
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options?: SnapshotOptions
    ): T {
      try {
        const data = snapshot.data(options);
        let processedData = { ...data, id: snapshot.id };

        // Convert timestamps to dates
        if (opts.convertTimestamps) {
          processedData = convertTimestampsToDate(processedData);
        }

        // Apply custom transformer
        if (opts.transformers?.fromFirestore) {
          processedData = opts.transformers.fromFirestore(processedData);
        }

        // Validate with Zod
        if (opts.validateOnRead) {
          try {
            const validated = schema.parse(processedData);
            logger.debug('Converted from Firestore', {
              collection: collectionName,
              id: snapshot.id,
            });
            return validated;
          } catch (error) {
            if (error instanceof ZodError) {
              logger.warn('Validation error on read', {
                collection: collectionName,
                id: snapshot.id,
                errors: error.errors,
              });
              // Return data anyway but log the validation error
              // This allows reading legacy data that doesn't match current schema
            }
          }
        }

        return processedData as T;
      } catch (error) {
        logger.error('Error converting from Firestore', error as Error, {
          collection: collectionName,
          id: snapshot.id,
        });
        throw error;
      }
    },
  };
}

/**
 * Create a simplified converter without validation
 * Useful for read-heavy operations where validation overhead is not needed
 */
export function createSimpleConverter<T extends BaseDocument>(
  _collectionName: string
): FirestoreDataConverter<T> {
  return {
    toFirestore(data: WithFieldValue<T>): DocumentData {
      const now = Timestamp.now();
      return {
        ...data,
        createdAt: data.createdAt || now,
        updatedAt: now,
      } as DocumentData;
    },

    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      const data = snapshot.data();
      return convertTimestampsToDate({
        ...data,
        id: snapshot.id,
      }) as T;
    },
  };
}

/**
 * Type guard to check if value is a Firestore Timestamp
 */
export function isTimestamp(value: any): value is Timestamp {
  return value instanceof Timestamp;
}

/**
 * Type guard to check if value is a Date
 */
export function isDate(value: any): value is Date {
  return value instanceof Date;
}
