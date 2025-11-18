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
export {
	Tooltip,
	TooltipTrigger,
	TooltipContent,
	TooltipProvider,
} from './components/tooltip'
export {
	Popover,
	PopoverTrigger,
	PopoverContent,
	PopoverAnchor,
} from './components/popover'
export {
	Collapsible,
	CollapsibleTrigger,
	CollapsibleContent,
} from './components/collapsible'
export {
	HoverCard,
	HoverCardTrigger,
	HoverCardContent,
} from './components/hover-card'
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/tabs'
export { Toggle, toggleVariants } from './components/toggle'

// Advanced form components
export {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	InputOTPSeparator,
} from './components/input-otp'

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
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from './components/select'

// Layout and structure components
export {
	AnnotatedLayout,
	AnnotatedSection,
} from './components/annotated-layout'
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
} from './components/sheet'

// UI utility components
export { EpicToaster } from './components/sonner'
export { PageTitle } from './components/page-title'
export { ColorPicker } from './components/color-picker'
export { StatusButton } from './components/status-button'
export {
	SquarePenIcon,
	type SquarePenIconHandle,
} from './components/square-pen-icon'
export { PrioritySignal } from './components/priority-signal'
export { ImageCropper, centerAspectCrop } from './components/image-cropper'

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
} from './components/breadcrumb'

export { NavMain } from './components/nav-main'
export { NotFoundPage } from './components/not-found-page'

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
} from './components/sidebar'

// Icon system
export { Icon, type IconName, type IconSize } from './components/icon'

// Animated icons
export { ArrowLeftIcon } from './components/animated-icons/arrow-left-icon'
export { BuildingIcon } from './components/animated-icons/building-icon'
export { CircleHelpIcon } from './components/animated-icons/circle-help'
export { FileTextIcon } from './components/animated-icons/file-text-icon'
export { FoldersIcon } from './components/animated-icons/folders-icon'
export { GlobeIcon } from './components/animated-icons/globe-icon'
export { HomeIcon } from './components/animated-icons/home-icon'
export { ListTodoIcon } from './components/animated-icons/list-todo'
export { LockOpenIcon } from './components/animated-icons/lock-open-icon'
export { LogoutIcon } from './components/animated-icons/logout-icon'
export { McpIcon } from './components/animated-icons/mcp-icon'
export { MessageSquareMoreIcon } from './components/animated-icons/message-square-more'
export { SettingsGearIcon } from './components/animated-icons/settings-gear-icon'
export { ShieldCheckIcon } from './components/animated-icons/shield-check-icon'
export { SunMoonIcon } from './components/animated-icons/sun-moon-icon'
export { UserIcon } from './components/animated-icons/user-icon'
export { UserRoundPlusIcon } from './components/animated-icons/user-round-plus'

export { Divider } from './components/divider'

// Field components
export {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldSet,
	FieldTitle,
} from './components/field'

export {
	Item,
	ItemMedia,
	ItemContent,
	ItemActions,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
	ItemDescription,
	ItemHeader,
	ItemFooter,
} from './components/item'

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupText,
	InputGroupInput,
	InputGroupTextarea,
} from './components/input-group'

export { Kbd, KbdGroup } from './components/kbd'

// Export utilities
export { cn } from './utils/cn'

// Theme and client hints utilities
export * from './utils/theme.js'
export * from './utils/client-hints.js'
