import { Link, Outlet } from "react-router-dom";
import { BrandLogo } from "../components/common/BrandLogo";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandLogo />
          <nav className="flex items-center gap-6 text-sm font-medium">
            <a href="#features" className="hidden text-muted hover:text-brand sm:inline">Features</a>
            <a href="#how" className="hidden text-muted hover:text-brand sm:inline">How it works</a>
            <Link to="/app" className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primary-hover">
              Get Started
            </Link>
          </nav>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-line py-6 text-center text-xs text-muted">
        CityWeave AI · Google AI Builder Cup prototype · Pilot area: Moodbidri, Karnataka
      </footer>
    </div>
  );
}
