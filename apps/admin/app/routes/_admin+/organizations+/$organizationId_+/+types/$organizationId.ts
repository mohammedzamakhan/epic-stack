import  { type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router'

export interface Route {
	LoaderArgs: LoaderFunctionArgs
	ActionArgs: ActionFunctionArgs
}
