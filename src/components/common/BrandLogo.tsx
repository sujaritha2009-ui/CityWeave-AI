import { Link } from "react-router-dom";

export function BrandLogo({ to = "/", size = "md" }: { to?: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-9 w-9" : "h-8 w-8";
  return (
    <Link to={to} className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className={box} />
      <span className={size === "lg" ? "text-2xl font-extrabold" : "text-lg font-extrabold"}>
        CityWeave <span className="text-primary">AI</span>
      </span>
    </Link>
  );
}
