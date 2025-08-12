import { tasks } from '@trigger.dev/sdk/v3'
import { type transferS3Files } from './tasks/transfer-s3-files'
import { type imageProcessingTask } from './tasks/image-processing'
import { type videoProcessingTask } from './tasks/video-processing'

export async function triggerVideoProcessing(
	payload: Parameters<typeof videoProcessingTask.trigger>[0],
) {
	const handle = await tasks.trigger<typeof videoProcessingTask>(
		'video-processing',
		payload,
	)
	return handle
}

export async function triggerImageProcessing(
	payload: Parameters<typeof imageProcessingTask.trigger>[0],
) {
	const handle = await tasks.trigger<typeof imageProcessingTask>(
		'image-processing',
		payload,
	)
	return handle
}

export async function triggerTransferS3Files(
	payload: Parameters<typeof transferS3Files.trigger>[0],
) {
	const handle = await tasks.trigger<typeof transferS3Files>(
		'transfer-s3-files-cross-account',
		payload,
	)
	return handle
}
