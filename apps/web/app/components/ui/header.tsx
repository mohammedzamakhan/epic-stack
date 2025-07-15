import { Menu, X } from 'lucide-react'
import React from 'react'
import { Form, Link } from 'react-router'
import { cn } from '#app/utils/misc.tsx'
import { useOptionalUser } from '#app/utils/user.ts'
import { useOptionalUserOrganizations } from '#app/utils/organizations.ts'
import { Button } from './button'

const menuItems = [
	{ name: 'Features', href: '#link' },
	{ name: 'Pricing', href: '/pricing' },
	{ name: 'About', href: '/about' },
]

function Logo() {
	return (
		<Link to="/" className="group grid leading-snug">
			<span className="font-light transition group-hover:-translate-x-1">
				epic
			</span>
			<span className="font-bold transition group-hover:translate-x-1">
				notes
			</span>
		</Link>
	)
}

export const HeroHeader = () => {
	const [menuState, setMenuState] = React.useState(false)
	const [isScrolled, setIsScrolled] = React.useState(false)
	const user = useOptionalUser()
	const userOrganizations = useOptionalUserOrganizations()
	const currentOrganization = userOrganizations?.currentOrganization

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])
	return (
		<header>
			<nav
				data-state={menuState && 'active'}
				className={cn(
					'fixed z-20 w-full transition-all duration-300',
					isScrolled &&
						'bg-background/75 border-b border-black/5 backdrop-blur-lg',
				)}
			>
				<div className="mx-auto max-w-5xl px-6">
					<div
						className={cn(
							'relative flex flex-wrap items-center justify-between gap-6 py-6 transition-all duration-200 lg:gap-0',
							isScrolled && 'py-3',
						)}
					>
						<div className="flex w-full justify-between gap-6 lg:w-auto">
							<Link
								to="/"
								aria-label="home"
								className="flex items-center space-x-2"
							>
								<Logo />
							</Link>

							<button
								onClick={() => setMenuState(!menuState)}
								aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
								className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
							>
								<Menu className="m-auto size-6 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0" />
								<X className="absolute inset-0 m-auto size-6 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100" />
							</button>

							<div className="m-auto hidden size-fit lg:block">
								<ul className="flex gap-1">
									{menuItems.map((item, index) => (
										<li key={index}>
											<Button asChild variant="ghost" size="sm">
												<Link to={item.href} className="text-base">
													<span>{item.name}</span>
												</Link>
											</Button>
										</li>
									))}
								</ul>
							</div>
						</div>

						<div className="bg-background mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 in-data-[state=active]:block md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none lg:in-data-[state=active]:flex dark:shadow-none dark:lg:bg-transparent">
							<div className="lg:hidden">
								<ul className="space-y-6 text-base">
									{menuItems.map((item, index) => (
										<li key={index}>
											<Link
												to={item.href}
												className="text-muted-foreground hover:text-accent-foreground block duration-150"
											>
												<span>{item.name}</span>
											</Link>
										</li>
									))}
								</ul>
							</div>
							<div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
								{!user ? (
									<>
										<Button
											asChild
											variant="ghost"
											size="sm"
											className={cn(isScrolled && 'lg:hidden')}
										>
											<Link to="/login">
												<span>Login</span>
											</Link>
										</Button>
										<Button
											asChild
											size="sm"
											className={cn(isScrolled && 'lg:hidden')}
										>
											<Link to="/signup">
												<span>Sign Up</span>
											</Link>
										</Button>
										<Button
											asChild
											size="sm"
											className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}
										>
											<Link to="/signup">
												<span>Get Started</span>
											</Link>
										</Button>
									</>
								) : (
									<>
										<Form action="/logout" method="POST">
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												className={cn(isScrolled && 'lg:hidden')}
											>
												<span>Log out</span>
											</Button>
										</Form>
										<Button asChild size="sm">
											<Link
												to={
													currentOrganization
														? `/app/${currentOrganization.organization.slug}`
														: '/app'
												}
											>
												<span>Dashboard</span>
											</Link>
										</Button>
									</>
								)}
							</div>
						</div>
					</div>
				</div>
			</nav>
		</header>
	)
}
