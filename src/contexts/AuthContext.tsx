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
      console.log('🔍 Checking if user exists in backend:', userEmail);
      
      // Try to fetch user first
      try {
        const existingUser = await UserService.getUserByEmail(userEmail);
        
        if (existingUser && existingUser.data) {
          console.log('✅ User found in backend:', existingUser.data);
          setBackendUser(existingUser.data);
          processedUsers.current.add(userEmail);
          return;
        }
        
        // If we reach here, user doesn't exist, create them
        console.log('👤 User not found, creating new user in backend...');
        
      } catch (fetchErr: any) {
        // Check if it's a 404 (user not found) - this is expected for new users
        if (fetchErr?.response?.status !== 404) {
          console.error('❌ Unexpected error fetching user:', fetchErr);
          throw fetchErr;
        }
        console.log('👤 User not found (404), creating new user in backend...');
      }
      
      // Create user in backend
      console.log('🔨 Creating user in backend with data:', {
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name
      });
      
      const createResponse = await UserService.createOrUpdateUser(supabaseUser);
      
      if (createResponse && createResponse.data) {
        console.log('✅ User created successfully:', createResponse.data);
        setBackendUser(createResponse.data);
        processedUsers.current.add(userEmail);
      } else {
        console.error('❌ User creation succeeded but no data returned');
        // Try to fetch the user again
        await fetchBackendUser(userEmail);
        processedUsers.current.add(userEmail);
      }
      
    } catch (generalErr: any) {
      console.error('❌ General error in ensureBackendUser:', generalErr);
      
      // Handle creation errors specifically
      if (generalErr?.isUserExists || generalErr?.status === 409) {
        console.log('🔄 User already exists (409), fetching data...');
        // User was created by another process, just fetch the data
        await fetchBackendUser(userEmail);
        processedUsers.current.add(userEmail);
      } else {
        // Actual error occurred
        setBackendUser(null); // Ensure we clear any stale data
        throw generalErr;
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
