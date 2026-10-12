import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Info, Inbox } from "lucide-react";
import { cx } from "../../lib/cx";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-line bg-white shadow-card", className)}>{children}</div>;
}

type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-line bg-white text-brand hover:bg-primary-soft",
  danger: "border border-red-200 bg-white text-danger hover:bg-red-50",
  success: "bg-success text-white hover:bg-emerald-600",
  ghost: "text-primary hover:bg-primary-soft",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary/30",
        "disabled:cursor-not-allowed disabled:opacity-50",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-brand">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const badgeTones = {
  blue: "bg-primary-soft text-primary border-blue-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  gray: "bg-slate-100 text-slate-600 border-slate-200",
};

export function Badge({ tone = "gray", className, children }: { tone?: keyof typeof badgeTones; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: "draft" | "approved" | "modified" | "rejected" }) {
  if (status === "approved") return <Badge tone="green">Approved</Badge>;
  if (status === "modified") return <Badge tone="blue">Modified &amp; Adopted</Badge>;
  if (status === "rejected") return <Badge tone="red">Rejected</Badge>;
  return <Badge tone="amber">Awaiting review</Badge>;
}

export function MetricCard({
  label,
  value,
  hint,
  tone = "blue",
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "blue" | "green" | "amber" | "purple";
  icon?: ReactNode;
}) {
  const tones = {
    blue: "bg-primary-soft text-primary",
    green: "bg-emerald-50 text-success",
    amber: "bg-amber-50 text-warning",
    purple: "bg-violet-50 text-violet-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className={cx("rounded-lg p-2", tones[tone])}>{icon}</span>}
      </div>
      <p className={cx("mt-2 text-3xl font-bold", tones[tone].split(" ")[1])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
      <Inbox className="mb-3 h-10 w-10 text-slate-300" />
      <p className="font-semibold text-brand">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function EstimateNotice({ children }: { children?: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <strong>Estimated, not measured.</strong>{" "}
        {children ?? "Figures come from a simple arrival model and sample observations. Validate any change with real traffic counts."}
      </span>
    </p>
  );
}

export function Spinner() {
  return <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />;
}