import { Link } from "react-router-dom";
import { BarChart3, Building2, GitCompareArrows, Map, Sparkles, TrendingDown, Users } from "lucide-react";

const FEATURES = [
  { icon: BarChart3, title: "Data-driven insights", text: "See when and where institution arrivals overlap at busy junctions." },
  { icon: Sparkles, title: "Schedule recommendations", text: "Get suggested start-time shifts that spread arrivals more evenly." },
  { icon: Users, title: "Collaborative planning", text: "Institution coordinators review, approve or reject every suggestion." },
  { icon: TrendingDown, title: "Measurable impact", text: "Compare current and proposed schedules with clearly stated assumptions." },
];

const STEPS = [
  { icon: Map, title: "View the map", text: "See congestion hotspots and nearby institutions." },
  { icon: Building2, title: "Add institutions", text: "Enter operating hours and approximate arrivals." },
  { icon: Sparkles, title: "Get recommendations", text: "Find overlapping peaks and feasible shifts." },
  { icon: GitCompareArrows, title: "Compare & review", text: "Check the impact, then approve or reject." },
  { icon: BarChart3, title: "Share reports", text: "Export an impact summary for stakeholders." },
];

export function LandingPage() {
  return (
    <main>
      <section className="relative overflow-hidden bg-linear-to-r from-[#F8FBFF] via-[#EAF3FF] to-[#DDEBFF]">
        <img
          src="/images/hero-city.jpg"
          alt=""
          className="absolute inset-y-0 right-0 hidden h-full w-3/5 object-cover md:block"
          style={{ maskImage: "linear-gradient(to right, transparent, black 35%)" }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="max-w-xl">
            <p className="mb-4 inline-block rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-primary">
              Pilot: Moodbidri, Karnataka
            </p>
            <h1 className="text-4xl leading-tight font-extrabold md:text-5xl">
              Smarter Schedules,
              <br />
              <span className="text-primary">Smoother Cities</span>
            </h1>
            <p className="mt-5 text-base text-slate-600">
              CityWeave AI helps colleges, hospitals, government offices and other institutions coordinate their
              timings so fewer people reach the same junction at the same moment.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover">
                Get Started
              </Link>
              <Link
                to="/app/map"
                className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold text-brand hover:bg-primary-soft"
              >
                View Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-6xl gap-4 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-line bg-white p-5 shadow-card">
            <span className="inline-flex rounded-lg bg-primary-soft p-2 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>

      <section id="how" className="bg-canvas py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-2xl font-bold">How it works</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="rounded-xl border border-line bg-white p-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
