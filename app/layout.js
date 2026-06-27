export const metadata = {
  title: "LSU Daily Trivia",
  description: "A daily 5-clue trivia game for LSU football fans. Unofficial fan project.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
