export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-brand placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";
