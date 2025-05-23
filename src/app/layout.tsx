import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme';

import ConfigureAmplify from '@/components/ConfigureAmplify';
import Providers from '@/components/Providers';
import TopNavBar from '@/components/TopNavBar';

import "./globals.css";
import "@aws-amplify/ui-react/styles.css";
import { FileSystemProvider } from "@/contexts/FileSystemContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Digital Assistant",
  description: "A digital assistant for your needs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        <AppRouterCacheProvider>
          <ConfigureAmplify />
          <FileSystemProvider>
            <Providers>
              <ThemeProvider theme={theme}>
                <CssBaseline />
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100vh', 
                  overflow: 'hidden' 
                }}>
                  <TopNavBar />
                  <div style={{ 
                    flexGrow: 1, 
                    overflow: 'auto' 
                  }}>
                    {children}
                  </div>
                </div>
              </ThemeProvider>
            </Providers>
          </FileSystemProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}


