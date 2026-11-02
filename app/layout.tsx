import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sprout — little money habits, big possibilities",
  description: "A playful family money garden for learning, saving and growing together.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
