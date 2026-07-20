const toneMap = {
  neutral: "bg-stone-100 text-stone-600 ring-stone-200",
  primary: "bg-primary/10 text-primary ring-primary/20",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
};

export default function Chip({ children, tone = "neutral" }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
}
