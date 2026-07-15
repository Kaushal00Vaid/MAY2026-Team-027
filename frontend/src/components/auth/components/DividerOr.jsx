import { Separator } from "@/components/ui/separator";

export default function DividerOr({ text = "or continue with" }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <Separator className="flex-1 bg-border/50" />
      <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider whitespace-nowrap">
        {text}
      </span>
      <Separator className="flex-1 bg-border/50" />
    </div>
  );
}
