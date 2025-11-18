/**
 * Calculate fractional position for reordering items.
 * This allows for efficient reordering without reassigning positions to all items.
 *
 * @param prevPosition - Position of the item before the insertion point (null if inserting at beginning)
 * @param nextPosition - Position of the item after the insertion point (null if inserting at end)
 * @returns The calculated fractional position
 */
export function getFractionalPosition(
	prevPosition: number | null,
	nextPosition: number | null,
): number {
	if (prevPosition === null && nextPosition === null) {
		return 1.0 // First item
	} else if (prevPosition === null) {
		return nextPosition! - 1.0 // Insert at beginning
	} else if (nextPosition === null) {
		return prevPosition + 1.0 // Insert at end
	} else {
		return (prevPosition + nextPosition) / 2.0 // Insert between
	}
}

/**
 * Calculate new position for an item being reordered within a list.
 *
 * @param items - Array of items in the destination list (excluding the item being moved)
 * @param targetIndex - Target index where the item should be inserted
 * @returns The calculated fractional position
 */
export function calculateReorderPosition<T extends { position: number }>(
	items: T[],
	targetIndex: number,
): number {
	if (items.length === 0) {
		// Empty list, use position 1.0
		return 1.0
	} else if (targetIndex <= 0) {
		// Insert at beginning
		const firstItem = items[0]
		return getFractionalPosition(null, firstItem?.position ?? null)
	} else if (targetIndex >= items.length) {
		// Insert at end
		const lastItem = items[items.length - 1]
		return getFractionalPosition(lastItem?.position ?? null, null)
	} else {
		// Insert between two items
		const prevItem = items[targetIndex - 1]
		const nextItem = items[targetIndex]
		return getFractionalPosition(
			prevItem?.position ?? null,
			nextItem?.position ?? null,
		)
	}
}
