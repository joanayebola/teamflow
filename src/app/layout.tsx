import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Teamflow — Project management for small teams",
  description:
    "Teamflow is a project management SaaS demo: workspaces, Kanban boards, activity logs, notifications and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
