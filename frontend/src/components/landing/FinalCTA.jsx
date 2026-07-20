import { Link } from "react-router-dom";

export default function FinalCTA() {
  return (
    <section className="border-b border-border/70">
      <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-foreground text-background p-10 md:p-16">
          <div aria-hidden className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.05]">
                Give your society the operating system it deserves.
              </h2>
              <p className="mt-4 text-background/70 max-w-md">
                Book a 20-minute walkthrough with our team. We'll import your resident list and
                show you the ledger with your real data.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 md:justify-end">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3.5 text-sm font-semibold hover:brightness-110 transition"
              >
                Get started free
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-background/30 px-6 py-3.5 text-sm font-semibold hover:bg-background/10 transition"
              >
                Book a call
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
