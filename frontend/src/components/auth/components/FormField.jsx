import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function FormField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon: Icon,
  prefix,
  required = false,
  className = "",
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </Label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60">
            <Icon size={15} />
          </div>
        )}
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60 select-none pointer-events-none">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`h-11 bg-muted/40 border-border/60 focus:border-primary/60 focus:ring-primary/20 focus:ring-2 transition-all duration-200 text-sm placeholder:text-muted-foreground/50
            ${Icon ? "pl-9" : ""}
            ${prefix ? "pl-10" : ""}
          `}
        />
      </div>
    </div>
  );
}
