import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Learnova Video Service — Example Client',
  description: 'Demo frontend for the Learnova video processing microservice',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
