import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, IBM_Plex_Mono } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { InstallButton } from "./InstallButton";
import "./globals.css";

// Applies the persisted theme before first paint to avoid a light->dark flash.
const NO_FLASH_THEME = `try{var t=localStorage.getItem('sivabalan-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`;

const heading = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const ledger = IBM_Plex_Mono({
  variable: "--font-ledger",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Sivabalan Finance",
  description: "Internal loan ledger for Sivabalan Finance",
  applicationName: "Sivabalan Finance",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sivabalan",
  },
  // Next emits the modern `mobile-web-app-capable`; add the legacy Apple tag
  // explicitly for older iOS "Add to Home Screen" support.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#6B1E2A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} ${ledger.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <InstallButton />
      </body>
    </html>
  );
}
