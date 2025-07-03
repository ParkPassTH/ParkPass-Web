import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper for API calls
const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${apiBase}${endpoint}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'An error occurred');
    }
    return response.json();
  },
  post: async (endpoint: string, body: any) => {
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'An error occurred');
    }
    return response.json();
  },
  put: async (endpoint: string, body: any) => {
    const response = await fetch(`${apiBase}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'An error occurred');
    }
    return response.json();
  },
};

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<User | null>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // ปรับ loadProfile ให้ดึงข้อมูลจาก Server API
  const loadProfile = async (userId: string) => {
    try {
      const data = await api.get(`/api/profile/${userId}`);
      setProfile(data);
    } catch (err: any) {
      console.error('Error loading profile from server:', err.message);
      setProfile(null);
      // To prevent login loops, we avoid signing out automatically.
      // The UI should handle cases where a profile is missing.
    }
  };

  useEffect(() => {
    setLoading(true);

    // Function to check the current session and update state
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      setLoading(false);
    };

    checkSession();

    // Set up a listener for authentication state changes (login, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth event: ${event}`);
        setUser(session?.user ?? null);
        setProfile(null); // Reset profile first
        if (session?.user) {
          setLoading(true);
          await loadProfile(session.user.id);
          setLoading(false);
        } 
      }
    );

    // Cleanup the subscription when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Use the server API to sign in. The server returns { session } directly.
      const { session } = await api.post('/api/auth/signin', { email, password });

      // The server now handles the sign-in, but we need to inform the client-side Supabase instance
      // about the new session to keep everything in sync and trigger onAuthStateChange.
      // This will also persist the session in localStorage.
      if (session) {
        await supabase.auth.setSession(session);
        console.log('✅ Session received from server and set on client.');
      } else {
        // If the server doesn't return a session, it means login failed.
        // The API helper would have already thrown an error for non-OK responses,
        // but as a fallback, we throw a generic error.
        throw new Error('Sign in failed or invalid session received from server.');
      }
      
      // onAuthStateChange will handle setting the user, profile, and loading state.
      console.log('✅ Sign in request successful. Waiting for auth state change.');

    } catch (error: any) {
      console.error('❌ Sign in error:', error.message);
      setLoading(false); // Stop loading on error
      // Re-throw the error to be caught by the UI component
      throw error; 
    }
    // NOTE: The `finally` block was removed. 
    // The onAuthStateChange listener is now responsible for setting loading to false after a successful login.
  };

  // ปรับ signUp ให้เรียกใช้ Server API
  const signUp = async (email: string, password: string, userData: any): Promise<User | null> => {
    setLoading(true);
    try {
      console.log('🔍 Signing up via server with data:', userData);
      
      const { user } = await api.post('/api/auth/signup', {
        email,
        password,
        userData // Send the whole userData object
      });

      console.log('✅ Sign up request sent successfully. Waiting for email confirmation.');
      // The onAuthStateChange listener will handle the user state once confirmed.
      // Returning the user from the server might be inconsistent with the actual auth state.
      return user || null; 
      
    } catch (error: any) {
      console.error('❌ Sign up error:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Call the server endpoint to handle the sign-out logic
      await api.post('/api/auth/signout', {});

      // Manually clear local state and trigger a state update for Supabase client
      await supabase.auth.signOut(); // This clears the local session
      setUser(null);
      setProfile(null);
      
      // Only remove specific items, not the entire localStorage
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
      console.log('✅ Sign out successful.');
    } catch (error: any) {
      console.error('❌ Sign out error:', error.message);
      // Even if server fails, attempt a client-side sign-out to clear the session
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  // ปรับ updateProfile ให้เรียกใช้ Server API
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');
    setLoading(true);
    try {
      await api.put(`/api/profile/${user.id}`, updates);
      // Reload profile to get the latest data
      await loadProfile(user.id);
    } catch (error: any) {
      console.error('❌ Update profile error:', error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      await api.post('/api/auth/resend-confirmation', { email });
      console.log('✅ Confirmation email resent successfully.');
    } catch (error: any) {
      console.error('❌ Error resending confirmation:', error.message);
      throw error;
    }
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    resendConfirmation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
