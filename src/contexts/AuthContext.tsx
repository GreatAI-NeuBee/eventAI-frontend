import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type User, type AuthState } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { UserService, type ApiError } from '../services/userService';

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle user creation in backend database
  const handleUserCreation = async (supabaseUser: User) => {
    try {
      console.log('🔄 Handling user creation for:', supabaseUser.email);
      
      // Create or update user in backend database
      await UserService.createOrUpdateUser(supabaseUser);
      
      console.log('✅ User successfully synced with backend database');
    } catch (err) {
      console.error('❌ Failed to sync user with backend:', err);
      
      // Don't block the auth flow if backend sync fails
      // Just log the error and continue
      const apiError = err as ApiError;
      console.warn('⚠️ User authentication successful but backend sync failed:', apiError.message);
      
      // Optionally set a non-blocking error state
      // setError(`Warning: ${apiError.message}`);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          setError(error.message);
        } else {
          setSession(session);
          setUser(session?.user as User || null);
          
          // If there's an existing session, ensure user exists in backend
          if (session?.user) {
            console.log('Found existing session, syncing user with backend');
            await handleUserCreation(session.user);
          }
        }
      } catch (err) {
        console.error('Error in getInitialSession:', err);
        setError('Failed to get session');
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user as User || null);
        setLoading(false);
        setError(null);

        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in:', session.user.email);
          
          // Create or update user in backend database
          await handleUserCreation(session.user);
          
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error('Error signing in with Google:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      // Clear local state
      setUser(null);
      setSession(null);
    } catch (err) {
      console.error('Error signing out:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign out';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signInWithGoogle,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
