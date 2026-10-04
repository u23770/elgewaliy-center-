import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title:"الجويلي | Elgewaliy",
  description:"ملابس أطفال وأولاد وبنات من الجويلي"
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
