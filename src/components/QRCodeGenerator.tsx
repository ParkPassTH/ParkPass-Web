import React, { useEffect, useRef } from 'react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  className?: string;
  id?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  value, 
  size = 200, 
  className = "",
  id
}) => {
  const qrRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    // Generate QR code URL using a reliable service
    const generateQRCode = () => {
      if (!value) return;
      
      // Use QR Server API to generate QR code
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
      
      // Set the image source
      if (qrRef.current) {
        qrRef.current.src = qrCodeUrl;
      }
    };
    
    generateQRCode();
  }, [value, size]);
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div 
        className="border-2 border-gray-200 rounded-lg p-4 bg-white"
        style={{ width: size + 32, height: size + 32 }}
      >
        <img 
          ref={qrRef}
          id={id}
          alt="QR Code"
          width={size}
          height={size}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};