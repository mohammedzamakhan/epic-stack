import { i18n } from '@lingui/core'

let linguiActivated = false

export function activateTestLingui() {
	if (!linguiActivated) {
		i18n.load({ en: {} })
		i18n.activate('en')
		linguiActivated = true
	}
}
