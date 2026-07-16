import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nurzhanabdirazakov.github.io/chatgpt-edu-nii-kz/"),
  title: "ChatGPT Edu — НИИ Казахстана",
  description: "Публичный мониторинг подключения и активации ChatGPT Edu в научно-исследовательских институтах Казахстана.",
  icons: {
    icon: "/chatgpt-edu-nii-kz/favicon.svg",
    shortcut: "/chatgpt-edu-nii-kz/favicon.svg",
  },
  openGraph: {
    title: "ChatGPT Edu — НИИ Казахстана",
    description: "72 научные организации: договоры, доступы и активация сотрудников.",
    type: "website",
    images: [{ url: "/chatgpt-edu-nii-kz/og.png", width: 1536, height: 1024, alt: "ChatGPT Edu — НИИ Казахстана" }],
  },
  twitter: { card: "summary_large_image", images: ["/chatgpt-edu-nii-kz/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
