import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileSidebar } from '@/components/layout/MobileSidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: BRAND.metaTitle,
  description: BRAND.metaDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={cn('font-sans', inter.variable)}>
      <body className="antialiased bg-gray-50 min-h-screen">
        {/* Mobile header */}
        <MobileSidebar />

        <div className="flex min-h-screen md:min-h-0">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* Main Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>

        {/* Disclaimer Footer */}
        <footer className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur text-gray-400 text-[10px] text-center py-1 pointer-events-none">
          {BRAND.disclaimer}
        </footer>
      </body>
    </html>
  );
}
