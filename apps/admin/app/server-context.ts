import { createContext, type ServerBuild } from 'react-router'

export const serverBuildContext = createContext<ServerBuild | null>(null)
