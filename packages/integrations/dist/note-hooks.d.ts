/**
 * Note Hooks - Middleware for automatically triggering integration notifications
 *
 * This module provides hooks and middleware that automatically detect note changes
 * and trigger integration notifications without requiring manual intervention.
 */
/**
 * Note data for change detection
 */
interface NoteSnapshot {
    id: string;
    title: string;
    content: string;
    organizationId: string;
}
/**
 * Note Hooks class
 *
 * Provides middleware functions that can be called from route handlers
 * to automatically trigger integration notifications.
 */
export declare class NoteHooks {
    private static instance;
    /**
     * Get singleton instance
     */
    static getInstance(): NoteHooks;
    /**
     * Hook to call after note creation
     * @param noteId - ID of the created note
     * @param userId - ID of the user who created the note
     */
    afterNoteCreated(noteId: string, userId: string): Promise<void>;
    /**
     * Hook to call after note update
     * @param noteId - ID of the updated note
     * @param userId - ID of the user who updated the note
     * @param previousData - Previous note data for change detection
     */
    afterNoteUpdated(noteId: string, userId: string, previousData?: {
        title: string;
        content: string;
    }): Promise<void>;
    /**
     * Hook to call before note deletion
     * @param noteId - ID of the note to be deleted
     * @param userId - ID of the user who is deleting the note
     */
    beforeNoteDeleted(noteId: string, userId: string): Promise<void>;
    /**
     * Enhanced note creation hook with change detection
     * @param noteData - Complete note data after creation
     * @param userId - ID of the user who created the note
     */
    onNoteCreated(noteData: NoteSnapshot, userId: string): Promise<void>;
    /**
     * Enhanced note update hook with automatic change detection
     * @param noteId - ID of the updated note
     * @param userId - ID of the user who updated the note
     * @param beforeSnapshot - Note data before update
     * @param afterSnapshot - Note data after update
     */
    onNoteUpdated(noteId: string, userId: string, beforeSnapshot?: NoteSnapshot, _afterSnapshot?: NoteSnapshot): Promise<void>;
    /**
     * Enhanced note deletion hook
     * @param noteData - Note data before deletion
     * @param userId - ID of the user who deleted the note
     */
    onNoteDeleted(noteData: NoteSnapshot, userId: string): Promise<void>;
    /**
     * Utility to capture note snapshot for change detection
     * @param noteId - ID of the note to snapshot
     * @returns Note snapshot or null if not found
     */
    captureNoteSnapshot(noteId: string): Promise<NoteSnapshot | null>;
    /**
     * Batch process note changes
     * @param changes - Array of note changes to process
     */
    processBatchChanges(changes: Array<{
        type: 'created' | 'updated' | 'deleted';
        noteId: string;
        userId: string;
        beforeSnapshot?: NoteSnapshot;
        afterSnapshot?: NoteSnapshot;
    }>): Promise<void>;
}
export declare const noteHooks: NoteHooks;
/**
 * Convenience functions for easy integration into route handlers
 */
/**
 * Call this after creating a note
 */
export declare function triggerNoteCreated(noteId: string, userId: string): Promise<void>;
/**
 * Call this after updating a note
 */
export declare function triggerNoteUpdated(noteId: string, userId: string, previousData?: {
    title: string;
    content: string;
}): Promise<void>;
/**
 * Call this before deleting a note
 */
export declare function triggerNoteDeleted(noteId: string, userId: string): Promise<void>;
/**
 * Utility to wrap note operations with automatic hook triggering
 */
export declare class NoteOperationWrapper {
    /**
     * Wrap note creation with automatic hook triggering
     */
    static create<T>(operation: () => Promise<T>, noteId: string, userId: string): Promise<T>;
    /**
     * Wrap note update with automatic hook triggering
     */
    static update<T>(operation: () => Promise<T>, noteId: string, userId: string, captureSnapshot?: boolean): Promise<T>;
    /**
     * Wrap note deletion with automatic hook triggering
     */
    static delete<T>(operation: () => Promise<T>, noteId: string, userId: string): Promise<T>;
}
export {};
//# sourceMappingURL=note-hooks.d.ts.map