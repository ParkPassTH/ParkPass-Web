import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Eye, EyeOff, UploadCloud, Mail, Lock, User, Building2, Car, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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
    

    let documentUrl = '';
    try {
      if (mode === 'owner-register') {
        if (!documentFile) throw new Error('กรุณาอัปโหลดหลักฐานเจ้าของที่');
        const { data, error: uploadError } = await supabase
          .storage
          .from('owner-documents')
          .upload(`documents/${Date.now()}_${documentFile.name}`, documentFile);
        if (uploadError) throw uploadError;
        if (!data || !data.path) throw new Error('Upload failed: No file path returned');
        const publicUrlObj = supabase.storage.from('owner-documents').getPublicUrl(data.path);
        documentUrl = publicUrlObj.data.publicUrl;
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
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'owner-register'
                ? 'Registration Submitted'
                : 'Check Your Email'}
            </h2>

            {mode === 'owner-register' ? (
              <>
                <p className="text-gray-600 mb-6">
                  Thank you for registering as a parking space owner.<br />
                  Your registration has been received and is pending admin approval.<br />
                  <br />
                  <strong>What happens next?</strong>
                  <ul className="list-disc list-inside text-left text-sm mt-2 mb-2 text-gray-700">
                    <li>An admin will review your documents.</li>
                    <li>Once approved, you will receive a confirmation email at <strong>{pendingEmail}</strong>.</li>
                    <li>If rejected, you will also be notified by email.</li>
                  </ul>
                  <br />
                  <span className="text-xs text-gray-500">
                    Please allow up to 1-3 business days for verification.
                  </span>
                </p>
                <button
                  onClick={() => {
                    setShowEmailConfirmation(false);
                    setMode('login');
                  }}
                  className="w-full mt-4 bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-all duration-200"
                >
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  We've sent a confirmation link to <strong>{pendingEmail}</strong>.<br />
                  Please click the link in your email to complete your registration.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">Don't see the email?</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Check your spam or junk folder</li>
                        <li>Make sure you entered the correct email address</li>
                        <li>Wait a few minutes for the email to arrive</li>
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
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>Resend Confirmation Email</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowEmailConfirmation(false)}
                    className="w-full text-gray-600 hover:text-gray-800 py-2 transition-colors"
                  >
                    Back to Registration
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
            {mode === 'login' && 'Welcome back to the future of parking'}
            {mode === 'customer-register' && 'Find and book parking spots instantly'}
            {mode === 'owner-register' && 'Start earning from your parking spaces'}
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
                  Driver
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Find & book parking
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
                  Owner
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  List your spaces
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {mode === 'login' && 'Sign In'}
              {mode === 'customer-register' && 'Create Driver Account'}
              {mode === 'owner-register' && 'Create Owner Account'}
            </h2>
            <p className="text-gray-600">
              {mode === 'login' && 'Enter your credentials to access your account'}
              {mode === 'customer-register' && 'Join thousands of drivers finding perfect parking'}
              {mode === 'owner-register' && 'Start monetizing your parking spaces today'}
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
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
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
                  Business Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="Your business or property name"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            </div>

            {/* Phone Field (Registration only) */}
            {mode !== 'login' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            )}

            {/* Business Address (Owner registration only) */}
            {mode === 'owner-register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </label>
                <input
                  type="text"
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleInputChange}
                  placeholder="Primary business location"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 hover:border-gray-300"
                  required
                />
              </div>
            )}

            {mode === 'owner-register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Proof of Ownership <span className="text-gray-400">(ID card or government document)</span>
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
                      {documentFile ? documentFile.name : 'Choose file'}
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
                  Please upload a clear image or PDF of your ownership document. This is required for verification.
                </p>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
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
                  Must be at least 8 characters with letters and numbers
                </p>
              )}
            </div>

            {/* Confirm Password Field (Registration only) */}
            {mode !== 'login' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
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
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium">
                  Forgot password?
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
                  I agree to the{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 transition-colors font-medium underline"
                    onClick={() => setShowTerms(true)}
                  >
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 transition-colors font-medium underline"
                    onClick={() => setShowPrivacy(true)}
                  >
                    Privacy Policy
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
                  <span>Please wait...</span>
                </div>
              ) : (
                <>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'customer-register' && 'Create Driver Account'}
                  {mode === 'owner-register' && 'Create Owner Account'}
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
                  <h2 className="text-xl font-bold mb-4">Terms of Service</h2>
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
                  <h2 className="text-xl font-bold mb-4">Privacy Policy</h2>
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
                Don't have an account?{' '}
                <button
                  onClick={() => switchMode('customer-register')}
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  Sign up as a driver
                </button>
                {' '}or{' '}
                <button
                  onClick={() => switchMode('owner-register')}
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  list your parking space
                </button>
              </p>
            ) : (
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};