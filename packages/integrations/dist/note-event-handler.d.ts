/**
 * Note Event Handler - Handles note change events and triggers integrations
 *
 * This module provides functionality to:
 * - Detect note changes (create, update, delete)
 * - Trigger integration notifications
 * - Handle different change types
 * - Manage event queuing and processing
 */
/**
 * Note change event types
 */
export type NoteChangeType = 'created' | 'updated' | 'deleted';
/**
 * Note change event data
 */
export interface NoteChangeEvent {
    noteId: string;
    changeType: NoteChangeType;
    userId: string;
    organizationId: string;
    timestamp: Date;
    metadata?: {
        previousTitle?: string;
        previousContent?: string;
        changes?: string[];
    };
}
/**
 * Note event processing result
 */
export interface NoteEventResult {
    success: boolean;
    connectionsNotified: number;
    errors: string[];
}
/**
 * Note Event Handler class
 *
 * Manages the detection and processing of note change events,
 * triggering appropriate integration notifications.
 */
export declare class NoteEventHandler {
    private static instance;
    /**
     * Get singleton instance
     */
    static getInstance(): NoteEventHandler;
    /**
     * Handle note creation event
     * @param noteId - ID of the created note
     * @param userId - ID of the user who created the note
     * @returns Processing result
     */
    handleNoteCreated(noteId: string, userId: string): Promise<NoteEventResult>;
    /**
     * Handle note update event
     * @param noteId - ID of the updated note
     * @param userId - ID of the user who updated the note
     * @param previousData - Previous note data for change detection
     * @returns Processing result
     */
    handleNoteUpdated(noteId: string, userId: string, previousData?: {
        title: string;
        content: string;
    }): Promise<NoteEventResult>;
    /**
     * Handle note deletion event
     * @param noteId - ID of the deleted note
     * @param userId - ID of the user who deleted the note
     * @param noteData - Note data before deletion
     * @returns Processing result
     */
    handleNoteDeleted(noteId: string, userId: string, noteData: {
        title: string;
        organizationId: string;
    }): Promise<NoteEventResult>;
    /**
     * Process a note change event
     * @param event - Note change event to process
     * @returns Processing result
     */
    private processNoteEvent;
    /**
     * Batch process multiple note events
     * @param events - Array of note change events
     * @returns Array of processing results
     */
    processBatchEvents(events: NoteChangeEvent[]): Promise<NoteEventResult[]>;
    /**
     * Get event processing statistics
     * @param organizationId - Organization ID to get stats for
     * @param timeRange - Time range in hours (default: 24)
     * @returns Event processing statistics
     */
    getEventStats(organizationId: string, timeRange?: number): Promise<{
        totalEvents: number;
        successfulEvents: number;
        failedEvents: number;
        connectionsNotified: number;
    }>;
}
export declare const noteEventHandler: NoteEventHandler;
//# sourceMappingURL=note-event-handler.d.ts.map