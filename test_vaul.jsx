import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { Drawer } from 'vaul'

function Test() {
	return (
		<Drawer.Root>
			<Drawer.Trigger>Open</Drawer.Trigger>
			<Drawer.Portal>
				<Drawer.Content>
					<div id="heavy-content">HEAVY</div>
				</Drawer.Content>
			</Drawer.Portal>
		</Drawer.Root>
	)
}

console.log(renderToString(<Test />))
