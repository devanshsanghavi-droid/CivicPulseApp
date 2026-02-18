// src/context/AppContext.tsx
// React Native version of your web App.tsx context logic.
// Navigation is handled by AppNavigator.tsx instead of screen state strings.

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Notification } from '../types';
import { storageService } from '../services/storage';
import { firestoreService } from '../services/firestoreService';
import { onAuthStateChange, convertFirebaseUserToAppUser, configureGoogleSignIn } from '../services/firebaseAuth';

interface AppContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  isAdmin: boolean;
  notifs: Notification[];
  unreadCount: number;
  refreshNotifs: () => Promise<void>;
  markNotifsRead: () => Promise<void>;
  locationExplained: boolean;
  setLocationExplained: (v: boolean) => void;
  isAuthLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [locationExplained, setLocationExplained] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const unreadCount = notifs.filter(n => !n.read).length;

  // Configure Google Sign-In once
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  // Listen to Firebase auth state (same as web)
  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      if (firebaseUser) {
        const appUser = await convertFirebaseUserToAppUser(firebaseUser);
        setUserState(appUser);
      } else {
        setUserState(null);
      }
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const setUser = async (u: User | null) => {
    setUserState(u);
    if (u) {
      await storageService.setCurrentUser(u);
    } else {
      await storageService.clearCurrentUser();
    }
  };

  const refreshNotifs = async () => {
    if (!user) return;
    try {
      // Fetch from Firestore (live data)
      const firestoreNotifs = await firestoreService.getNotifications(user.id);
      setNotifs(firestoreNotifs);
      // Cache locally
      await storageService.setNotifications(firestoreNotifs);
    } catch {
      // Fallback to local cache if Firestore fails
      const localNotifs = await storageService.getNotifications(user.id);
      setNotifs(localNotifs);
    }
  };

  const markNotifsRead = async () => {
    if (!user) return;
    await firestoreService.markNotificationsRead(user.id);
    await storageService.markNotificationsRead(user.id);
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Poll notifications every 10 seconds (same pattern as web's 5s interval)
  useEffect(() => {
    if (!user) return;
    refreshNotifs();
    const interval = setInterval(refreshNotifs, 10000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      isAdmin,
      notifs,
      unreadCount,
      refreshNotifs,
      markNotifsRead,
      locationExplained,
      setLocationExplained,
      isAuthLoading,
    }}>
      {children}
    </AppContext.Provider>
  );
};
