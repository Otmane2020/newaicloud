import { useEffect, useState } from "react";
import QRCode from "qrcode";

interface LocalQrCodeProps {
  value: string;
  size?: number;
  alt?: string;
  className?: string;
}

export default function LocalQrCode({
  value,
  size = 220,
  alt = "QR code",
  className = "",
}: LocalQrCodeProps) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((dataUrl) => {
      if (alive) setSrc(dataUrl);
    });
    return () => {
      alive = false;
    };
  }, [value, size]);

  if (!src) {
    return (
      <div
        className={`grid place-items-center bg-white text-slate-500 ${className}`}
        style={{ width: size, height: size }}
      >
        …
      </div>
    );
  }

  return <img src={src} alt={alt} width={size} height={size} className={className} />;
}