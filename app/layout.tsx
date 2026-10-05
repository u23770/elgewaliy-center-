import "./globals.css";
import PwaRegister from "@/app/components/pwa-register";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#fffaf5" />
        <meta name="description" content="الجويلي — متجر ملابس أونلاين" />
      </head>
      <body><PwaRegister />{children}</body>
    </html>
  );
}
