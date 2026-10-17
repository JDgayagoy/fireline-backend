import './globals.css';

export const metadata = {
  title: 'FireLine Gas & Fire Safety PWA',
  description: 'FireLine Real-time Autonomous IoT Gas & Fire Safety Hub with Solenoid Valve Control',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FireLine'
  },
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/apple-touch-icon.png'
  }
};

export const viewport = {
  themeColor: '#f6f7f9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FireLine" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased selection:bg-red-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
