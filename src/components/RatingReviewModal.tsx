import React, { useState } from 'react';
import { Star, X, Send, Camera } from 'lucide-react';
import { uploadReviewPhoto } from '../utils/reviewPhotoUpload';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface RatingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  spotName: string;
  bookingId: string;
  onSubmit: (rating: number, review: string, photos: string[], isAnonymous?: boolean, aspects?: any) => void;
}

export const RatingReviewModal: React.FC<RatingReviewModalProps> = ({
  isOpen,
  onClose,
  spotName,
  bookingId,
  onSubmit
}) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // State for specific aspects rating
  const [aspectRatings, setAspectRatings] = useState({
    location: 0,
    security: 0,
    value: 0,
    cleanliness: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert(t('please_select_rating'));
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Submitting review for booking:', bookingId);
      await onSubmit(rating, review, photos, isAnonymous, aspectRatings);
      // Reset form
      setRating(0);
      setHoverRating(0);
      setReview('');
      setPhotos([]);
      setIsAnonymous(false);
      setAspectRatings({
        location: 0,
        security: 0,
        value: 0,
        cleanliness: 0
      });
      onClose();
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || photos.length >= 3) return;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert(t('please_login_to_upload_photos'));
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadPromises = Array.from(files).slice(0, 3 - photos.length).map(async (file) => {
        const photoUrl = await uploadReviewPhoto(file, user.id);
        return photoUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter(url => url !== null) as string[];
      
      setPhotos(prev => [...prev, ...validUrls]);
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert(t('failed_to_upload_photos'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const setAspectRating = (aspect: string, rating: number) => {
    setAspectRatings(prev => ({
      ...prev,
      [aspect]: rating
    }));
  };

  const ratingLabels = [
    '', // 0 stars
    t('terrible'),
    t('poor'), 
    t('average'),
    t('good'),
    t('excellent')
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{t('rate_and_review')}</h3>
              <p className="text-sm text-gray-600">{spotName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('how_was_your_parking_experience')}
              </label>
              <div className="flex items-center space-x-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {(rating > 0 || hoverRating > 0) && (
                <p className="text-sm font-medium text-gray-700">
                  {ratingLabels[hoverRating || rating]}
                </p>
              )}
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('write_your_review_optional')}
              </label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                placeholder={t('review_placeholder')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-gray-500">
                  {t('help_other_drivers')}
                </p>
                <p className="text-xs text-gray-500">
                  {review.length}/500
                </p>
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('add_photos_optional')}
              </label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo}
                      alt={`${t('review_photo')} ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 3 && (
                  <label className="h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="text-center">
                      <Camera className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">{t('add_photo')}</span>
                    </div>
                  </label>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {t('add_up_to_3_photos')}
              </p>
            </div>

            {/* Review Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('rate_specific_aspects_optional')}
              </label>
              <div className="space-y-3">
                {[
                  { label: t('location_access'), key: 'location' },
                  { label: t('security_safety'), key: 'security' },
                  { label: t('value_for_money'), key: 'value' },
                  { label: t('cleanliness'), key: 'cleanliness' }
                ].map((aspect) => (
                  <div key={aspect.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{aspect.label}</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setAspectRating(aspect.key, star)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-4 w-4 transition-colors cursor-pointer ${
                              star <= (aspectRatings[aspect.key as keyof typeof aspectRatings] || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300 hover:text-yellow-200'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anonymous Option */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
              <label htmlFor="anonymous" className="ml-2 text-sm text-gray-700">
                {t('post_review_anonymously')}
              </label>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-200 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={rating === 0 || isSubmitting}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{t('submitting')}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{t('submit_review')}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Review Guidelines */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">{t('review_guidelines')}</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• {t('be_honest_and_helpful')}</li>
              <li>• {t('focus_on_parking_experience')}</li>
              <li>• {t('avoid_personal_information')}</li>
              <li>• {t('photos_should_be_relevant')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};