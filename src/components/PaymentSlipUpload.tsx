import React, { useState } from 'react';
import { Upload, X, Check, AlertCircle, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface PaymentSlipUploadProps {
  bookingId: string;
  onUploadComplete: (imageUrl: string) => void;
  onClose: () => void;
}

export const PaymentSlipUpload: React.FC<PaymentSlipUploadProps> = ({
  bookingId,
  onUploadComplete,
  onClose
}) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload to Supabase Storage
      const fileName = `payment-slip-${bookingId}-${Date.now()}.${selectedFile.name.split('.').pop()}`;
      const filePath = `payment-slips/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-slips')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-slips')
        .getPublicUrl(filePath);

      // Just return the URL to the parent component
      // The parent will handle creating the booking and payment slip record
      onUploadComplete(publicUrl);
      
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload payment slip. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">{t('upload_payment_slip')}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          )}

          {preview ? (
            <div className="mb-6">
              <div className="relative">
                <img 
                  src={preview} 
                  alt="Payment slip preview" 
                  className="w-full h-64 object-contain border border-gray-200 rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{t('uploading')}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{t('confirm_upload')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
            >
              {uploading ? (
                <div className="space-y-3">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600">{t('uploading_payment_slip')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      {t('upload_payment_slip')}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      {t('drag_drop_payment_slip')}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleInputChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      <span>{t('choose_file')}</span>
                    </label>
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('supported_formats')}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">{t('payment_instructions')}</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• {t('take_clear_photo_receipt')}</li>
              <li>• {t('ensure_transaction_details_visible')}</li>
              <li>• {t('include_booking_reference_available')}</li>
              <li>• {t('booking_confirmed_after_verification')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};