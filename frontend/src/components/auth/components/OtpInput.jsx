import { useRef } from "react";

/**
 * OtpInput — 6-box PIN entry component.
 *
 * Props:
 *   value     {string}   Current OTP string (controlled)
 *   onChange  {function} Called with updated OTP string
 *   disabled  {boolean}
 *   error     {boolean}  Highlights boxes red on error
 */
export default function OtpInput({ value = "", onChange, disabled = false, error = false }) {
  const inputRefs = useRef([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const handleChange = (idx, e) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1); // digits only, last char
    const newDigits = [...digits];
    newDigits[idx] = char;
    onChange(newDigits.join(""));

    // Advance focus
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(paste.padEnd(6, "").slice(0, 6));
    // Focus the next empty box or last box
    const nextIdx = Math.min(paste.length, 5);
    inputRefs.current[nextIdx]?.focus();
  };

  const borderColor = error
    ? "border-red-400 bg-red-50"
    : "border-border/60 bg-muted/40 focus:border-primary/60 focus:ring-primary/25";

  return (
    <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => (inputRefs.current[idx] = el)}
          id={`otp-digit-${idx}`}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          disabled={disabled}
          autoFocus={idx === 0}
          className={`
            w-11 h-13 text-center text-xl font-bold rounded-xl border-2
            transition-all duration-200 outline-none
            focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed
            ${borderColor}
            ${digit ? "bg-primary/5 border-primary/40 text-[#0f1a2b]" : "text-[#0f1a2b]"}
          `}
          style={{ height: "3.25rem" }}
          aria-label={`OTP digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}
