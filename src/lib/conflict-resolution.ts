/**
 * Conflict Resolution for Offline Sync
 *
 * Implements version-based optimistic locking to handle conflicts
 * when multiple users or offline tabs modify the same document.
 */

import {
  getDoc,
  serverTimestamp,
  runTransaction,
  DocumentReference,
  Firestore,
} from 'firebase/firestore';
import { logger } from '../services/logger';

/**
 * Base interface for versioned documents
 * All documents that need conflict resolution should extend this
 */
export interface VersionedDocument {
  id?: string;
  version?: number;
  updatedAt?: Date | ReturnType<typeof serverTimestamp>;
  updatedBy?: string;
}

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy =
  | 'server-wins' // Server version always wins
  | 'client-wins' // Client version always wins
  | 'last-write-wins' // Most recent update wins (by timestamp)
  | 'manual' // Requires manual user resolution
  | 'merge'; // Attempt to merge changes (field-level)

/**
 * Conflict information returned when a conflict is detected
 */
export interface Conflict<T> {
  type: 'version-mismatch' | 'concurrent-update';
  localVersion: number;
  serverVersion: number;
  localData: Partial<T>;
  serverData: T;
  timestamp: Date;
}

/**
 * Result of a conflict resolution attempt
 */
export interface ConflictResolutionResult<T> {
  success: boolean;
  conflict?: Conflict<T>;
  resolvedData?: T;
  message?: string;
}

/**
 * Update a document with optimistic locking
 * Checks version before updating to detect conflicts
 *
 * @param docRef - Firestore document reference
 * @param data - Data to update
 * @param expectedVersion - Expected version number (from local state)
 * @param userId - ID of user making the update
 * @returns Result of the update with conflict detection
 */
export async function updateWithVersionCheck<T extends VersionedDocument>(
  db: Firestore,
  docRef: DocumentReference,
  data: Partial<T>,
  expectedVersion: number,
  userId: string,
): Promise<ConflictResolutionResult<T>> {
  try {
    // Use transaction to ensure atomic read-modify-write
    const result = await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(docRef);

      if (!docSnap.exists()) {
        throw new Error('Document does not exist');
      }

      const currentData = docSnap.data() as T;
      const currentVersion = currentData.version || 0;

      // Check for version conflict
      if (currentVersion !== expectedVersion) {
        logger.warn('Version conflict detected', {
          docId: docRef.id,
          expectedVersion,
          currentVersion,
          userId,
        });

        return {
          success: false,
          conflict: {
            type: 'version-mismatch' as const,
            localVersion: expectedVersion,
            serverVersion: currentVersion,
            localData: data,
            serverData: currentData,
            timestamp: new Date(),
          },
        };
      }

      // No conflict - proceed with update
      const updatedData = {
        ...data,
        version: currentVersion + 1,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      };

      transaction.update(docRef, updatedData);

      return {
        success: true,
        resolvedData: {
          ...currentData,
          ...updatedData,
        } as T,
      };
    });

    if (result.success) {
      logger.info('Document updated successfully with version check', {
        docId: docRef.id,
        newVersion: expectedVersion + 1,
      });
    }

    return result;
  } catch (error) {
    logger.error('Error updating document with version check', error as Error, {
      docId: docRef.id,
      expectedVersion,
    });

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Resolve a conflict using the specified strategy
 *
 * @param conflict - Conflict information
 * @param strategy - Resolution strategy to use
 * @param userId - ID of user resolving the conflict
 * @returns Resolved data
 */
export function resolveConflict<T extends VersionedDocument>(
  conflict: Conflict<T>,
  strategy: ConflictStrategy,
  userId: string,
): Partial<T> {
  logger.info('Resolving conflict', { strategy, conflict });

  switch (strategy) {
    case 'server-wins':
      // Keep server version
      return {
        ...conflict.serverData,
        version: conflict.serverVersion,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      } as Partial<T>;

    case 'client-wins':
      // Keep client version
      return {
        ...conflict.localData,
        version: conflict.serverVersion + 1, // Increment server version
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      } as Partial<T>;

    case 'last-write-wins': {
      // Use most recent update (by timestamp)
      const serverTime = conflict.serverData.updatedAt as Date | undefined;
      const isServerNewer = serverTime && serverTime > conflict.timestamp;

      if (isServerNewer) {
        return resolveConflict(conflict, 'server-wins', userId);
      }
      return resolveConflict(conflict, 'client-wins', userId);
    }

    case 'merge': {
      // Field-level merge: take non-null values from both
      const merged = { ...conflict.serverData };
      Object.entries(conflict.localData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          (merged as Record<string, unknown>)[key] = value;
        }
      });
      return {
        ...merged,
        version: conflict.serverVersion + 1,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      } as Partial<T>;
    }

    case 'manual':
      // Manual resolution requires user intervention
      throw new Error('Manual conflict resolution required');

    default:
      throw new Error(`Unknown conflict strategy: ${strategy}`);
  }
}

/**
 * Retry an update with automatic conflict resolution
 *
 * @param db - Firestore instance
 * @param docRef - Document reference
 * @param data - Data to update
 * @param userId - User ID
 * @param strategy - Conflict resolution strategy
 * @param maxRetries - Maximum number of retry attempts
 * @returns Final result after retries
 */
export async function updateWithRetry<T extends VersionedDocument>(
  db: Firestore,
  docRef: DocumentReference,
  data: Partial<T>,
  userId: string,
  strategy: ConflictStrategy = 'last-write-wins',
  maxRetries = 3,
): Promise<ConflictResolutionResult<T>> {
  let lastResult: ConflictResolutionResult<T> | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Get current version
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return {
        success: false,
        message: 'Document does not exist',
      };
    }

    const currentData = docSnap.data() as T;
    const currentVersion = currentData.version || 0;

    // Attempt update
    const result = await updateWithVersionCheck<T>(db, docRef, data, currentVersion, userId);

    if (result.success) {
      return result;
    }

    // Conflict detected - attempt resolution
    if (result.conflict && strategy !== 'manual') {
      logger.info(`Conflict on attempt ${attempt + 1}, applying ${strategy} strategy`);

      try {
        const resolvedData = resolveConflict(result.conflict, strategy, userId);

        // Retry with resolved data
        data = resolvedData;
        lastResult = result;

        // Small delay before retry
        await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      } catch (error) {
        logger.error('Conflict resolution failed', error as Error);
        return result;
      }
    }

    lastResult = result;
  }

  // Max retries exceeded
  return (
    lastResult || {
      success: false,
      message: 'Max retries exceeded',
    }
  );
}

/**
 * Initialize a new versioned document
 * Sets version to 0 and timestamps
 *
 * @param data - Initial document data
 * @param userId - User ID creating the document
 * @returns Document with version fields
 */
export function initializeVersionedDocument<T extends VersionedDocument>(
  data: T,
  userId: string,
): T & Required<Pick<VersionedDocument, 'version'>> {
  return {
    ...data,
    version: 0,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
    createdAt: serverTimestamp(),
    createdBy: userId,
  } as T & Required<Pick<VersionedDocument, 'version'>>;
}

/**
 * Check if a document needs conflict resolution
 * Compares local and server versions
 *
 * @param localVersion - Local document version
 * @param serverVersion - Server document version
 * @returns True if versions differ (conflict exists)
 */
export function hasConflict(localVersion: number, serverVersion: number): boolean {
  return localVersion !== serverVersion;
}

/**
 * Get a user-friendly conflict message
 *
 * @param conflict - Conflict information
 * @returns Human-readable message
 */
export function getConflictMessage<T>(conflict: Conflict<T>): string {
  return `This item was modified by another user. Your version (v${conflict.localVersion}) conflicts with the server version (v${conflict.serverVersion}). Please review the changes and try again.`;
}
