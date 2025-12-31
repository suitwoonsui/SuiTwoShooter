import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Insomnia Game',
  description: 'A web3 endurance clicker game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="overflow-x-hidden">
        <Providers>
          <Header />
          <main className="pt-16 overflow-x-hidden">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
