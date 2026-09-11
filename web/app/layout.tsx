import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://supermind.vercel.app';
const TITLE = 'SuperMind — Your open-source second brain';
const DESCRIPTION =
  'Save links, articles, and ideas from any device and find them again. SuperMind is an open-source, self-hosted second brain built on Firebase — capture with one click on web, browser extension, and mobile.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s · SuperMind' },
  description: DESCRIPTION,
  applicationName: 'SuperMind',
  authors: [{ name: 'Sameer' }],
  creator: 'Sameer',
  keywords: [
    'second brain', 'bookmark manager', 'save links', 'knowledge management',
    'read it later', 'note taking', 'personal knowledge management', 'PKM',
    'open source', 'self-hosted', 'Firebase', 'browser extension',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'SuperMind',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'SuperMind — your open-source second brain' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'productivity',
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  colorScheme: 'dark light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Familjen+Grotesk:ital,wght@0,400;0,500;0,600;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
