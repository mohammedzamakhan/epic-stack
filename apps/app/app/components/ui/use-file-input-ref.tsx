/**
 * Utility function to create a ref callback for file inputs
 * Handles setting a File object on an input element via DataTransfer API
 *
 * @param file - The File object to set on the input
 * @returns A ref callback function for use with file input elements
 */
export function createFileInputRef(file?: File) {
	return (input: HTMLInputElement | null) => {
		if (input && file) {
			try {
				const dataTransfer = new DataTransfer()
				dataTransfer.items.add(file)
				input.files = dataTransfer.files
			} catch {
				// DataTransfer API may not be supported in all environments
			}
		}
	}
}
