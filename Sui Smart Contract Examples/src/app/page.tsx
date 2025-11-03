import { WalletConnection } from '@/components/WalletConnection';
import { ContractInteraction } from '@/components/ContractInteraction';

export default function Home() {
	return (
		<main className="h-screen bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
			{/* Main Content - Smart Contract Examples */}
			<div className="container mx-auto px-4 py-4 max-w-6xl">
				{/* Project Title */}
				<div className="text-center mb-8">
					<h1 className="text-5xl md:text-7xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-accent1)] to-[var(--color-accent2)] drop-shadow-lg">
						SUI SMART CONTRACTS
					</h1>
					<p className="text-xl md:text-2xl text-[var(--color-text-secondary)]">
						Comprehensive Examples & Integration Guide
					</p>
				</div>

				{/* Wallet Connection */}
				<div className="mb-8">
					<WalletConnection />
				</div>

				{/* Contract Interaction Examples */}
				<div className="mb-8">
					<ContractInteraction />
				</div>

				{/* Smart Contract Examples Overview */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
					<div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
						<h3 className="text-xl font-bold text-[var(--color-accent1)] mb-3">Process Management</h3>
						<p className="text-[var(--color-text-secondary)] mb-4">
							Learn process lifecycle management, validation mechanisms, and time-based operations.
						</p>
						<a href="/contracts/examples/session-management" className="text-[var(--color-accent1)] hover:underline">
							View Example →
						</a>
					</div>

					<div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
						<h3 className="text-xl font-bold text-[var(--color-accent2)] mb-3">Data Analytics</h3>
						<p className="text-[var(--color-text-secondary)] mb-4">
							Complex state management, classification systems, and user data tracking.
						</p>
						<a href="/contracts/examples/statistics-system" className="text-[var(--color-accent2)] hover:underline">
							View Example →
						</a>
					</div>

					<div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
						<h3 className="text-xl font-bold text-[var(--color-accent3)] mb-3">System Administration</h3>
						<p className="text-[var(--color-text-secondary)] mb-4">
							Administrative capabilities, configuration management, and system governance.
						</p>
						<a href="/contracts/examples/admin-controls" className="text-[var(--color-accent3)] hover:underline">
							View Example →
						</a>
					</div>

					<div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
						<h3 className="text-xl font-bold text-[var(--color-accent1)] mb-3">Payment System</h3>
						<p className="text-[var(--color-text-secondary)] mb-4">
							Payment processing, SUI token transactions, and usage-based models.
						</p>
						<a href="/contracts/examples/nft-payments" className="text-[var(--color-accent1)] hover:underline">
							View Example →
						</a>
					</div>
				</div>

				{/* Integration Examples */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
					<div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
						<h3 className="text-xl font-bold text-[var(--color-accent2)] mb-3">Wallet Integration</h3>
						<p className="text-[var(--color-text-secondary)] mb-4">
							Complete wallet connection examples using @mysten/dapp-kit with Next.js.
						</p>
						<a href="/examples/wallet-connection" className="text-[var(--color-accent2)] hover:underline">
							View Examples →
						</a>
					</div>

					<div className="bg-[var(--color-surface)] p-6 rounded-lg border border-[var(--color-border)]">
						<h3 className="text-xl font-bold text-[var(--color-accent3)] mb-3">Contract Interaction</h3>
						<p className="text-[var(--color-text-secondary)] mb-4">
							Frontend integration patterns for calling smart contract functions.
						</p>
						<a href="/examples/contract-interaction" className="text-[var(--color-accent3)] hover:underline">
							View Examples →
						</a>
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="w-full px-4 py-6 text-center border-t border-[var(--color-border)]/30 mt-8">
				<div className="max-w-md mx-auto">
					<p className="text-[var(--color-text-secondary)] text-sm">
						Built on Sui Blockchain • Learn the future of smart contract development
					</p>
				</div>
			</footer>
		</main>
	);
}