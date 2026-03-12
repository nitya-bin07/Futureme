import type { Metadata } from 'next';
import './globals.css';
import PageTransition from '@/components/PageTransition';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'FutureMe — Letters to the Future',
  description: 'Write a letter to your future self. Seal it. Receive it when the time is right.',
  keywords: ['future self', 'letter', 'time capsule', 'self reflection'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Crimson+Text:ital,wght@0,400;0,600;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-void-700 text-parchment antialiased">
        <AuthProvider>
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
