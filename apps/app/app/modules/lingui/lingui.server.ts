import { createLocaleCookie, createLinguiServer } from '@repo/i18n/server'
import config from '../../../lingui.config'

export const localeCookie = createLocaleCookie()

export const linguiServer = createLinguiServer(config, localeCookie)
