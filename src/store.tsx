import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import type { User } from './types';

interface AuthContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const users = useLiveQuery(() => db.users.toArray());
  
  // بارگذاری نشست قبلی در صورت وجود (Local-First Authentication)
  const [currentUser, setInternalCurrentUser] = useState<User | null>(() => {
    const storedAuth = localStorage.getItem('auth_session');
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        return parsed.currentUser || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const setCurrentUser = (user: User | null) => {
    setInternalCurrentUser(user);
    if (user) {
      // ذخیره توکن/نشست در حافظه محلی
      localStorage.setItem('auth_session', JSON.stringify({ 
        role: user.role, 
        currentUser: user,
        token: `mock_token_${user.id}_${Date.now()}`
      }));
    } else {
      localStorage.removeItem('auth_session');
    }
  };

  // Keep currentUser synced with database changes (e.g., updates, soft deletion)
  useEffect(() => {
    if (users && currentUser) {
      const dbUser = users.find(u => u.id === currentUser.id);
      if (dbUser) {
        if (dbUser.isDeleted) {
          // Log out if current logged-in user was deleted
          setCurrentUser(null);
        } else if (
          dbUser.name !== currentUser.name ||
          dbUser.role !== currentUser.role ||
          dbUser.username !== currentUser.username ||
          dbUser.password !== currentUser.password ||
          dbUser.profileImage !== currentUser.profileImage ||
          dbUser.isApproved !== currentUser.isApproved ||
          dbUser.base !== currentUser.base
        ) {
          // Update session if user profile changed in DB
          setCurrentUser(dbUser);
        }
      }
    }
  }, [users, currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, isLoading: !users }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
