import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "LSU Tiger Trivia",
  description: "A daily 5-clue trivia game for LSU football fans. Unofficial fan project.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, overflowX: "hidden" }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
