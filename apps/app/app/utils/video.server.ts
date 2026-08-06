/**
 * Video processing utilities for the server
 */

/**
 * Server-side video duration estimation based on file size
 * This is a fallback approach since we can't use DOM APIs on the server
 * For accurate duration, you'd want to use ffprobe or similar tools
 */
export function estimateVideoDuration(
	fileSize: number,
	bitrate: number = 1000000,
): number {
	// Rough estimation: fileSize (bytes) / bitrate (bits per second) * 8 (bits per byte)
	// Default bitrate of 1Mbps is a reasonable estimate for screen recordings
	return Math.round((fileSize * 8) / bitrate)
}

/**
 * Get video file size from File or Blob
 */
export function getVideoFileSize(file: File | Blob): number {
	return file.size
}

/**
 * Generate a simple thumbnail key for a video
 * In a real implementation, you'd generate an actual thumbnail image
 */
export function generateThumbnailKey(
	organizationId: string,
	recordingId: string,
	videoId: string,
): string {
	const timestamp = Date.now()
	return `orgs/${organizationId}/recordings/${recordingId}/thumbnails/${timestamp}-${videoId}.jpg`
}
