import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UploadCloud, Mail, Lock, User, Building2, Car, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'customer-register' | 'owner-register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    businessName: '',
    businessAddress: ''
  });

  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const navigate = useNavigate();
  const { signIn, signUp, resendConfirmation } = useAuth();
  const { t } = useLanguage();

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState<string | null>(null);

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setDocumentFile(file);
    setDocumentPreview(file ? URL.createObjectURL(file) : null);
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        password: savedPassword
      }));
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let documentUrl: string | null = null;
    try {
      if (mode === 'owner-register') {
        if (!documentFile) throw new Error(t('upload_document_error'));
        const fileName = `documents/${Date.now()}_${documentFile.name}`;
        const { error: uploadError } = await supabase
          .storage
          .from('owner-documents')
          .upload(fileName, documentFile);
        if (uploadError) throw uploadError;
        documentUrl = supabase.storage.from('owner-documents').getPublicUrl(fileName).data.publicUrl;
      }

      if (mode === 'login') {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', formData.email);
          localStorage.setItem('rememberedPassword', formData.password);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedPassword');
        }
        await signIn(formData.email, formData.password);
        if (formData.email.includes('owner') || formData.email.includes('admin') || formData.email.includes('property')) {
          navigate('/admin');
        } else {
          navigate('/');
        }
        return;
      }

      // Registration
      const userData = {
        name: formData.name,
        phone: formData.phone,
        role: mode === 'owner-register' ? 'owner' : 'user',
        businessName: formData.businessName,
        businessAddress: formData.businessAddress,
        identity_document_url: documentUrl
      };
      await signUp(formData.email, formData.password, userData);
      setPendingEmail(formData.email);
      setShowEmailConfirmation(true);

    } catch (error: any) {
      console.error('Authentication error:', error);
      if (error.message?.includes('Email not confirmed') || error.message?.includes('check your email')) {
        setPendingEmail(formData.email);
        setShowEmailConfirmation(true);
        setError(null);
      } else {
        setError(error.message || 'An error occurred during authentication');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    try {
      setLoading(true);
      await resendConfirmation(pendingEmail);
      setError(null);
    } catch (error: any) {
      setError(error.message || 'Failed to resend confirmation email');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      businessName: '',
      businessAddress: ''
    });
    setError(null);
    setShowEmailConfirmation(false);
    setPendingEmail('');
  };

  const switchMode = (newMode: typeof mode) => {
    setMode(newMode);
    resetForm();
  };

  // Show email confirmation screen
  if (showEmailConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {/* Language Switcher */}
          <div className="flex justify-end mb-4">
            <LanguageSwitcher />
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'owner-register'
                ? t('registration_submitted')
                : t('check_email')}
            </h2>

            {mode === 'owner-register' ? (
              <>
                <p className="text-gray-600 mb-6">
                  {t('owner_registration_message')}<br />
                  {t('registration_pending')}<br />
                  <br />
                  <strong>{t('what_happens_next')}</strong>
                  <ul className="list-disc list-inside text-left text-sm mt-2 mb-2 text-gray-700">
                    <li>{t('admin_review')}</li>
                    <li>{t('approval_email')} <strong>{pendingEmail}</strong>.</li>
                    <li>{t('rejection_email')}</li>
                  </ul>
                  <br />
                  <span className="text-xs text-gray-500">
                    {t('verification_time')}
                  </span>
                </p>
                <button
                  onClick={() => {
                    setShowEmailConfirmation(false);
                    setMode('login');
                  }}
                  className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200"
                >
                  {t('back_to_login')}
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  {t('confirmation_sent')} <strong>{pendingEmail}</strong>.<br />
                  {t('complete_registration')}
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">{t('dont_see_email')}</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>{t('check_spam')}</li>
                        <li>{t('correct_email')}</li>
                        <li>{t('wait_minutes')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={handleResendConfirmation}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{t('sending')}</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>{t('resend_confirmation')}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowEmailConfirmation(false)}
                    className="w-full text-gray-600 hover:text-gray-800 py-2 transition-colors"
                  >
                    {t('back_to_registration')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <img
                src="/logo.svg"
                alt="ParkPass Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              ParkPass
            </span>
          </div>
          <p className="text-gray-600">
            {mode === 'login' && t('welcome_back')}
            {mode === 'customer-register' && t('find_parking')}
            {mode === 'owner-register' && t('start_earning')}
          </p>
        </div>

        {/* Account Type Selection (only show when not in login mode) */}
        {mode !== 'login' && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => switchMode('customer-register')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  mode === 'customer-register'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Car className={`h-6 w-6 mx-auto mb-2 ${
                  mode === 'customer-register' ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <div className={`font-semibold ${
                  mode === 'customer-register' ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {t('driver')}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {t('find_book_parking')}
                </div>
              </button>
              
              <button
                onClick={() => switchMode('owner-register')}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  mode === 'owner-register'
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Building2 className={`h-6 w-6 mx-auto mb-2 ${
                  mode === 'owner-register' ? 'text-blue-600' : 'text-gray-600'
                }`} />
                <div className={`font-semibold ${
                  mode === 'owner-register' ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {t('owner')}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {t('list_spaces')}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'login' && t('sign_in')}
              {mode === 'customer-register' && t('create_driver_account')}
              {mode === 'owner-register' && t('create_owner_account')}
            </h2>
            <p className="text-gray-600">
              {mode === 'login' && t('enter_credentials')}
              {mode === 'customer-register' && t('join_drivers')}
              {mode === 'owner-register' && t('monetize_spaces')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field (Registration only) */}
            {mode !== 'login' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('full_name')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('enter_full_name')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                    required
                  />
                </div>
              </div>
            )}

            {/* Business Name (Owner registration only) */}
            {mode === 'owner-register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('business_name')}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder={t('business_name_placeholder')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('email_address')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('enter_email')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            </div>

            {/* Phone Field (Registration only) */}
            {mode !== 'login' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('phone_number')}
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder={t('enter_phone')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            )}

            {/* Business Address (Owner registration only) */}
            {mode === 'owner-register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('business_address')}
                </label>
                <input
                  type="text"
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleInputChange}
                  placeholder={t('primary_location')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            )}

            {mode === 'owner-register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('upload_proof')} <span className="text-gray-400">{t('id_document')}</span>
                </label>
                <label className="relative block cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleDocumentChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    required
                  />
                  <div className="flex items-center gap-2 w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300">
                    <UploadCloud className="text-gray-400" />
                    <span className={`text-base font-normal ${documentFile ? "text-gray-900" : "text-gray-400"}`}>
                      {documentFile ? documentFile.name : t('choose_file')}
                    </span>
                  </div>
                </label>
                {documentPreview && (
                  <div className="mt-3">
                    <img
                      src={documentPreview}
                      alt="Document Preview"
                      className="h-20 w-auto object-contain rounded-lg shadow border border-gray-200"
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {t('upload_clear_document')}
                </p>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={t('enter_password')}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {mode !== 'login' && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('password_requirements')}
                </p>
              )}
            </div>

            {/* Confirm Password Field (Registration only) */}
            {mode !== 'login' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('confirm_password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder={t('confirm_password_placeholder')}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* Remember Me / Forgot Password (Login only) */}
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
                  />
                  <span className="ml-2 text-sm text-gray-600">{t('remember_me')}</span>
                </label>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  {t('forgot_password')}
                </button>
              </div>
            )}

            {/* Terms and Conditions (Registration only) */}
            {mode !== 'login' && (
              <div className="flex items-start space-x-3">
                <input 
                  type="checkbox" 
                  required 
                  className="mt-1 rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50" 
                />
                <span className="text-sm text-gray-600 leading-relaxed">
                  {t('agree_terms')}{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 transition-colors font-medium underline"
                    onClick={() => setShowTerms(true)}
                  >
                    {t('terms_of_service')}
                  </button>{' '}
                  {t('and')}{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 transition-colors font-medium underline"
                    onClick={() => setShowPrivacy(true)}
                  >
                    {t('privacy_policy')}
                  </button>
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>{t('please_wait')}</span>
                </div>
              ) : (
                <>
                  {mode === 'login' && t('sign_in')}
                  {mode === 'customer-register' && t('create_driver_account')}
                  {mode === 'owner-register' && t('create_owner_account')}
                </>
              )}
            </button>
          </form>
            {showTerms && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative mx-4">
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                    onClick={() => setShowTerms(false)}
                    aria-label="Close Terms of Service"
                  >
                    ✕
                  </button>
                  <h2 className="text-xl font-bold mb-4">{t('terms_of_service')}</h2>
                  <div className="text-gray-700 text-sm max-h-96 overflow-y-auto">
                    {/* TODO: Add Terms of Service content here */}
                    <p>[Terms of Service content goes here...]</p>
                  </div>
                </div>
              </div>
            )}

            {showPrivacy && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative mx-4">
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
                    onClick={() => setShowPrivacy(false)}
                    aria-label="Close Privacy Policy"
                  >
                    ✕
                  </button>
                  <h2 className="text-xl font-bold mb-4">{t('privacy_policy')}</h2>
                  <div className="text-gray-700 text-sm max-h-96 overflow-y-auto">
                    {/* TODO: Add Privacy Policy content here */}
                    <p>[Privacy Policy content goes here...]</p>
                  </div>
                </div>
              </div>
            )}
          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            {mode === 'login' ? (
              <p className="text-gray-600">
                {t('no_account')}{' '}
                <button
                  onClick={() => switchMode('customer-register')}
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  {t('sign_up_driver')}
                </button>
                {' '}{t('or')}{' '}
                <button
                  onClick={() => switchMode('owner-register')}
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  {t('list_parking_space')}
                </button>
              </p>
            ) : (
              <p className="text-gray-600">
                {t('have_account')}{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  {t('sign_in')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};