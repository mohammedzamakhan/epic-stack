import { EpicToaster } from '#app/components/ui/sonner.tsx'
import { Outlet } from 'react-router'
import { useTheme } from '../resources+/theme-switch'

export default function AuthLayout() {
	const theme = useTheme()
	return (
		<div
			className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-4"
			style={{
				backgroundImage: `url('/app/assets/images/background_1.webp')`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundRepeat: 'no-repeat',
			}}
		>
			<div className="w-full max-w-md">
				<div className="flex flex-col gap-6">
					<Outlet />
					<div className="text-center text-xs text-balance text-white/80 *:[a]:underline *:[a]:underline-offset-4 *:[a]:hover:text-white">
						By continuing, you agree to our <a href="#">Terms of Service</a> and{' '}
						<a href="#">Privacy Policy</a>.
					</div>
				</div>
			</div>
		</div>
	)
}
