
import { DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "SONDER — Every Piece Has a Story",
    template: "%s | SONDER",
  },
  description:
    "A digital art showcase and creative community where every piece has a story.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${dmSans.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  );
}
