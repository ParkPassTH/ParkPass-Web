import React, { useEffect, useRef } from 'react';

interface QRCodeGeneratorProps {
  value?: string;
  bookingId?: string;
  spotId?: string;
  size?: number;
  className?: string;
  id?: string;
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ 
  value, 
  bookingId,
  spotId,
  size = 200, 
  className = "",
  id
}) => {
  const qrRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    // Generate QR code URL using a reliable service
    const generateQRCode = () => {
      let qrData = '';
      
      // If bookingId and spotId are provided, create QR data for parking verification
      if (bookingId && spotId) {
        // Create a JSON object with booking and spot information
        const parkingData = {
          type: 'parking_verification',
          bookingId: bookingId,
          spotId: spotId,
          timestamp: new Date().toISOString()
        };
        qrData = JSON.stringify(parkingData);
      } else if (value) {
        // Use the provided value for other purposes
        qrData = value;
      } else {
        // No data to generate QR code
        return;
      }
      
      // Use QR Server API to generate QR code
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrData)}`;
      
      // Set the image source
      if (qrRef.current) {
        qrRef.current.src = qrCodeUrl;
      }
    };
    
    generateQRCode();
  }, [value, bookingId, spotId, size]);
  
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
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
};