export const metadata = {
  title: "Pascal Parser",
  description: "Синтаксический анализатор Pascal"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
