import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: "ФСТЭК №117 — Трекер соответствия",
  description: "Оценка готовности ГИС к требованиям Приказа ФСТЭК №117",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 max-w-6xl mx-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
