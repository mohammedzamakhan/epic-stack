// Basic form components
export { Button, buttonVariants, type ButtonVariant } from './components/button'
export { Input } from './components/input'
export { Label } from './components/label'
export { Textarea } from './components/textarea'
export { Checkbox, type CheckboxProps } from './components/checkbox'
export { Switch } from './components/switch'

// Layout components
export {
	Card,
	CardHeader,
	CardHeaderContent,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
	CardBody,
} from './components/card'
export { Separator } from './components/separator'

// UI elements
export { Badge, badgeVariants } from './components/badge'
export { Skeleton } from './components/skeleton'
export { Progress } from './components/progress'
export { Avatar, AvatarImage, AvatarFallback } from './components/avatar'

// Interactive components
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/tooltip'
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from './components/popover'
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './components/collapsible'
export { HoverCard, HoverCardTrigger, HoverCardContent } from './components/hover-card'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs'
export { Toggle, toggleVariants } from './components/toggle'

// Advanced form components
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from './components/input-otp'

// Layout utilities
export { ScrollArea, ScrollBar } from './components/scroll-area'

// Complex interactive components (with Icon injection support)
export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from './components/dialog'

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectProvider,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from './components/select'

// Layout and structure components
export { AnnotatedLayout, AnnotatedSection } from './components/annotated-layout'
export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption,
} from './components/table'

// Group components
export { ToggleGroup, ToggleGroupItem } from './components/toggle-group'

// Modal and overlay components
export {
	Drawer,
	DrawerPortal,
	DrawerOverlay,
	DrawerTrigger,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerFooter,
	DrawerTitle,
	DrawerDescription,
} from './components/drawer'

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetFooter,
	SheetTitle,
	SheetDescription,
	SheetProvider,
} from './components/sheet'

// UI utility components
export { EpicToaster } from './components/sonner'
export { PageTitle } from './components/page-title'
export { ColorPicker } from './components/color-picker'
export { StatusButton } from './components/status-button'
export { SquarePenIcon, type SquarePenIconHandle } from './components/square-pen-icon'
export { PrioritySignal } from './components/priority-signal'
export { ImageCropper, ImageCropperProvider, centerAspectCrop } from './components/image-cropper'

// Complex interactive components
export {
	type CarouselApi,
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselPrevious,
	CarouselNext,
	useCarousel,
} from './components/carousel'

// Navigation components
export {
	Breadcrumb,
	BreadcrumbList,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbPage,
	BreadcrumbSeparator,
	BreadcrumbEllipsis,
	BreadcrumbProvider,
} from './components/breadcrumb'

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
	DropdownMenuProvider,
} from './components/dropdown-menu'

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandShortcut,
	CommandSeparator,
	CommandProvider,
} from './components/command'

// Advanced data visualization components
export {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
	useChart,
	type ChartConfig,
} from './components/chart'

// Complex layout components
export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInput,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger,
	useSidebar,
	sidebarMenuButtonVariants,
	type SidebarPersistenceCallbacks,
} from './components/sidebar'

// Icon system
export { 
	Icon, 
	type IconName,
	type IconSize 
} from './components/icon'

// Export utilities
export { cn } from './utils/cn'
