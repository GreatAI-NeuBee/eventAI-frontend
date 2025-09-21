import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, type User, type AuthState } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { UserService, type ApiError, type BackendUserData } from '../services/userService';

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  session: Session | null;
  backendUser: BackendUserData | null;
  backendUserLoading: boolean;
  refreshBackendUser: () => Promise<void>;
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
  const [backendUser, setBackendUser] = useState<BackendUserData | null>(null);
  const [backendUserLoading, setBackendUserLoading] = useState(false);
  
  // Track ongoing user creation to prevent duplicate calls
  const userCreationInProgress = useRef<Set<string>>(new Set());
  // Track which users we've already processed to avoid re-processing
  const processedUsers = useRef<Set<string>>(new Set());

  // Fetch backend user data by email
  const fetchBackendUser = async (email: string) => {
    try {
      setBackendUserLoading(true);
      const response = await UserService.getUserByEmail(email);
      
      if (response && response.data) {
        setBackendUser(response.data);
      } else {
        setBackendUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch backend user:', err);
      setBackendUser(null);
    } finally {
      setBackendUserLoading(false);
    }
  };

  // Refresh backend user data
  const refreshBackendUser = async () => {
    if (user?.email) {
      await fetchBackendUser(user.email);
    }
  };

  // Ensure user exists in backend database (fetch-first approach)
  const ensureBackendUser = async (supabaseUser: User) => {
    const userEmail = supabaseUser.email;
    if (!userEmail) return;
    
    // If we've already processed this user successfully, skip everything
    if (processedUsers.current.has(userEmail)) {
      return;
    }
    
    // If we already have backend user data for this email, mark as processed and skip
    if (backendUser && backendUser.email === userEmail) {
      processedUsers.current.add(userEmail);
      return;
    }
    
    // Prevent duplicate operations for the same user
    if (userCreationInProgress.current.has(userEmail)) {
      return;
    }
    
    userCreationInProgress.current.add(userEmail);
    
    try {
      // Always try to fetch first - this is a GET request and won't cause 409
      await fetchBackendUser(userEmail);
      
      // Mark user as processed since we successfully loaded their data
      processedUsers.current.add(userEmail);
      
    } catch (fetchErr) {
      // User doesn't exist in backend, create them (only now do we POST)
      try {
        await UserService.createOrUpdateUser(supabaseUser);
        
        // Fetch the newly created user data
        await fetchBackendUser(userEmail);
        
        // Mark user as processed since we successfully created and loaded their data
        processedUsers.current.add(userEmail);
        
      } catch (createErr) {
        // Handle creation errors
        const apiError = createErr as ApiError & { isUserExists?: boolean };
        
        if (apiError.isUserExists || apiError.status === 409) {
          // User was created by another process, just fetch the data
          await fetchBackendUser(userEmail);
          
          // Mark user as processed since we successfully loaded their data
          processedUsers.current.add(userEmail);
        } else {
          // Actual error occurred
          console.error('❌ Failed to create user in backend:', apiError.message);
          throw createErr;
        }
      }
    } finally {
      // Always remove from in-progress set when done
      userCreationInProgress.current.delete(userEmail);
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
            await ensureBackendUser(session.user);
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
        setSession(session);
        setUser(session?.user as User || null);
        setLoading(false);
        setError(null);

        // Handle different auth events
        if (event === 'SIGNED_IN' && session?.user) {
          // Ensure user exists in backend database
          await ensureBackendUser(session.user);
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
      setBackendUser(null);
      
      // Clear processed users cache so they can be re-processed on next login
      processedUsers.current.clear();
      userCreationInProgress.current.clear();
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
    backendUser,
    backendUserLoading,
    refreshBackendUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
