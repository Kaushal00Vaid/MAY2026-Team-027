export default function SectionLabel({ eyebrow, title, sub }) {
  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-widest uppercase text-primary">
        <span className="h-px w-6 bg-primary" />
        {eyebrow}
      </div>
      <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
        {title}
      </h2>
      {sub && (
        <p className="mt-3 text-base text-muted-foreground leading-relaxed">
          {sub}
        </p>
      )}
    </div>
  );
}
