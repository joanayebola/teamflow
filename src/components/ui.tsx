import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const styles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-ink-400",
    secondary:
      "bg-ink-800 text-ink-100 border border-ink-700 hover:bg-ink-700 disabled:opacity-50",
    danger:
      "bg-red-600/90 text-white hover:bg-red-500 disabled:opacity-50",
    ghost: "text-ink-300 hover:bg-ink-800 hover:text-white disabled:opacity-50",
  } as const;
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 ${className}`}
      {...props}
    />
  );
}

export function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-ink-100 placeholder:text-ink-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-2 text-sm text-ink-100 outline-none focus:border-indigo-500 ${className}`}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink-400">
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-ink-800 bg-ink-900 ${className}`}>
      {children}
    </div>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-ink-700/60 text-ink-300",
  MEDIUM: "bg-sky-500/15 text-sky-300",
  HIGH: "bg-amber-500/15 text-amber-300",
  URGENT: "bg-red-500/15 text-red-300",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.MEDIUM}`}
    >
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const styles =
    role === "OWNER"
      ? "bg-indigo-500/15 text-indigo-300"
      : role === "ADMIN"
        ? "bg-emerald-500/15 text-emerald-300"
        : "bg-ink-700/60 text-ink-300";
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${styles}`}
    >
      {role}
    </span>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cls = size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-600/80 font-semibold text-white ${cls}`}
      title={name}
    >
      {initials}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-700 bg-ink-900/50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink-200">{title}</p>
      {body && <p className="mt-1 text-sm text-ink-400">{body}</p>}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {message}
    </p>
  );
}
