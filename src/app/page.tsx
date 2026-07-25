import Link from "next/link";
import { Server, Box, Users, FileDown } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const features = [
  {
    icon: Box,
    title: "Interactive 3D cabinets",
    body: "2-post and 4-post racks with doors, PDUs, floor power feeds and top or bottom cable entry — every configuration rendered live.",
  },
  {
    icon: Server,
    title: "Precise rack elevations",
    body: "Drag devices into U-slots on a front/rear elevation editor. Set height, depth and face; collisions are caught instantly.",
  },
  {
    icon: Users,
    title: "Built for teams",
    body: "Organizations with role-based access. Invite teammates as admins, editors or viewers.",
  },
  {
    icon: FileDown,
    title: "Export anywhere",
    body: "One-click export of any cabinet to Markdown, CSV or a print-ready PDF with the rack elevation.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <Server size={17} />
          </span>
          RackDoc
        </div>
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn btn-ghost">
            Sign in
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Get started
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
          <p className="chip mb-5 !text-accent !border-accent/40">
            Datacenter documentation, visualized
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] max-w-3xl mx-auto">
            Your cabinets, documented in{" "}
            <span className="text-accent">3D</span>
          </h1>
          <p className="text-ink-muted text-lg mt-6 max-w-2xl mx-auto">
            Model every rack — posts, doors, PDUs, power feeds and cabling — and
            keep rich notes on the cabinet and every device inside it. Then
            export it all as Markdown, CSV or PDF.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/signup" className="btn btn-primary !px-6 !py-3 !text-base">
              Create your first cabinet
            </Link>
            <Link href="/login" className="btn btn-secondary !px-6 !py-3 !text-base">
              Sign in
            </Link>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-24 grid sm:grid-cols-2 gap-5">
          {features.map((f) => (
            <div key={f.title} className="card p-6 text-left">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent mb-4">
                <f.icon size={20} />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-edge py-6 text-center text-sm text-ink-faint">
        RackDoc — datacenter cabinet documentation
      </footer>
    </div>
  );
}
