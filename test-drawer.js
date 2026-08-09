import React, { useState } from 'react'
function TableCellViewer() {
	const [open, setOpen] = useState(false)
	return (
		<Drawer onOpenChange={setOpen}>
			<DrawerTrigger>Open</DrawerTrigger>
			{open && <DrawerContent>Heavy</DrawerContent>}
		</Drawer>
	)
}
