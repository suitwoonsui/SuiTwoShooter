import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SuiTwo Backend',
  description: 'Backend API and Admin Interface for SuiTwo Game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}

