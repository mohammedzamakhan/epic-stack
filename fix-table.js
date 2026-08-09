const fs = require('fs')

const filePath = 'apps/app/app/components/data-table.tsx'
let content = fs.readFileSync(filePath, 'utf8')

const targetStr = `function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
	const isMobile = useIsMobile()`

const replaceStr = `function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
	const isMobile = useIsMobile()
	const [hasOpened, setHasOpened] = React.useState(false)`

content = content.replace(targetStr, replaceStr)

const drawerStr = `<Drawer direction={isMobile ? 'bottom' : 'right'}>`
const replaceDrawerStr = `<Drawer direction={isMobile ? 'bottom' : 'right'} onOpenChange={(open) => {
			if (open) setHasOpened(true)
		}}>`

content = content.replace(drawerStr, replaceDrawerStr)

const drawerContentStr = `<DrawerContent>
				<DrawerHeader className="gap-1">`
const replaceDrawerContentStr = `<DrawerContent>
				{hasOpened ? (
					<>
				<DrawerHeader className="gap-1">`

content = content.replace(drawerContentStr, replaceDrawerContentStr)

const drawerFooterStr = `</DrawerClose>
				</DrawerFooter>
			</DrawerContent>`
const replaceDrawerFooterStr = `</DrawerClose>
				</DrawerFooter>
					</>
				) : null}
			</DrawerContent>`

content = content.replace(drawerFooterStr, replaceDrawerFooterStr)

fs.writeFileSync(filePath, content)
console.log('Fixed data-table.tsx')
