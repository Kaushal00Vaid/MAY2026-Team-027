import { QRCodeSVG } from "qrcode.react";

export default function ResidentPassCode({ token, size = 176 }) {
  if (!token) return <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" />;

  return (
    <QRCodeSVG
      value={token}
      size={size}
      level="M"
      marginSize={1}
      bgColor="#ffffff"
      fgColor="#0f2336"
      title="Dynamic resident entry pass"
    />
  );
}
