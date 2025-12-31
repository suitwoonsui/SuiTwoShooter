import { LandingOptions } from '@/components/LandingOptions';

export default function Home() {
	return (
		<main className="h-screen bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
				{/* Main Content - Compact Layout */}
				<div className="container mx-auto px-4 py-4 max-w-4xl">
					{/* Game Title */}
					<div className="text-center mb-8">
						<h1 className="text-5xl md:text-7xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] drop-shadow-lg">
							INSOMNIA
						</h1>
						<p className="text-xl md:text-2xl text-[var(--color-text-secondary)]">
							Web3 Endurance Challenge
						</p>
					</div>

					{/* Landing Options */}
					<LandingOptions />
				</div>

				{/* Footer */}
				<footer className="w-full px-4 py-6 text-center border-t border-[var(--color-border)]/30 mt-8">
					<div className="max-w-md mx-auto">
						<p className="text-[var(--color-text-secondary)] text-sm">
							Built on Sui Blockchain • Experience the future of gaming
						</p>
					</div>
				</footer>
			</main>
	);
}
