'use client';

import Head from 'next/head';
import { usePathname } from 'next/navigation';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  structuredData?: Record<string, unknown>;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Insomnia Game - Fast-Paced Blockchain Gaming',
  description = 'Test your reflexes in Insomnia, a fast-paced blockchain game. Compete on the leaderboard, earn NFT rewards, and prove your gaming skills!',
  keywords = ['blockchain game', 'NFT', 'gaming', 'web3', 'leaderboard', 'reaction time', 'Sui blockchain'],
  ogImage = '/images/og-image.png',
  canonicalUrl,
  noindex = false,
  structuredData,
}) => {
  const pathname = usePathname();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://insomnia-game.vercel.app';
  const fullUrl = canonicalUrl || `${baseUrl}${pathname}`;

  const defaultStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'Insomnia Game',
    description,
    url: fullUrl,
    applicationCategory: 'Game',
    operatingSystem: 'Web Browser',
    gameItem: {
      '@type': 'Thing',
      name: 'Game Pass NFT'
    },
    offers: {
      '@type': 'Offer',
      price: '0.01',
      priceCurrency: 'SUI'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150'
    }
  };

  const finalStructuredData = structuredData || defaultStructuredData;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <meta name="author" content="Insomnia Game Team" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Open Graph */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Insomnia Game Screenshot" />
      <meta property="og:site_name" content="Insomnia Game" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:image:alt" content="Insomnia Game Screenshot" />
      <meta name="twitter:creator" content="@InsomniaGame" />
      <meta name="twitter:site" content="@InsomniaGame" />
      
      {/* PWA Meta Tags */}
      <meta name="application-name" content="Insomnia" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Insomnia" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="msapplication-TileColor" content="#6366f1" />
      <meta name="msapplication-config" content="/browserconfig.xml" />
      <meta name="theme-color" content="#6366f1" />
      
      {/* Apple Touch Icons */}
      <link rel="apple-touch-icon" sizes="180x180" href="/images/apple-touch-icon.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/images/apple-touch-icon-152x152.png" />
      <link rel="apple-touch-icon" sizes="144x144" href="/images/apple-touch-icon-144x144.png" />
      <link rel="apple-touch-icon" sizes="120x120" href="/images/apple-touch-icon-120x120.png" />
      <link rel="apple-touch-icon" sizes="114x114" href="/images/apple-touch-icon-114x114.png" />
      <link rel="apple-touch-icon" sizes="76x76" href="/images/apple-touch-icon-76x76.png" />
      <link rel="apple-touch-icon" sizes="72x72" href="/images/apple-touch-icon-72x72.png" />
      <link rel="apple-touch-icon" sizes="60x60" href="/images/apple-touch-icon-60x60.png" />
      <link rel="apple-touch-icon" sizes="57x57" href="/images/apple-touch-icon-57x57.png" />
      
      {/* Standard Favicons */}
      <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png" />
      <link rel="icon" href="/favicon.ico" />
      
      {/* Web App Manifest */}
      <link rel="manifest" href="/manifest.json" />
      
      {/* Preconnect to external domains */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://fullnode.testnet.sui.io" />
      
      {/* DNS Prefetch */}
      <link rel="dns-prefetch" href="//fullnode.testnet.sui.io" />
      <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(finalStructuredData)
        }}
      />
      
      {/* Security Headers */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      
      {/* Performance Hints */}
      <link rel="preload" href="/gameWorker.js" as="script" />
      <link rel="prefetch" href="/api/leaderboard" />
    </Head>
  );
};
