import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type UserRole = 'admin' | 'client' | 'freelancer' | 'consultant';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  userRole: UserRole | null;
  loading: boolean;
  signUp: (email: string, password: string, role: UserRole, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: any, message?: string, token?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ error: any, message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setUserRole(data.user.role as UserRole);
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signUp = async (email: string, password: string, role: UserRole, fullName: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role, fullName })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || { message: 'Signup failed' } };
      }

      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setUserRole(data.user.role as UserRole);
      return { error: null };
    } catch (error) {
      return { error: { message: 'Connection error' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || { message: 'Signin failed' } };
      }

      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setUserRole(data.user.role as UserRole);
      return { error: null };
    } catch (error) {
      return { error: { message: 'Connection error' } };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setUserRole(null);
    navigate('/auth');
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (!response.ok) return { error: data.error || { message: 'Failed to request password reset' } };
      return { error: null, message: data.message, token: data.resetToken };
    } catch (error) {
      return { error: { message: 'Connection error' } };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken: token, newPassword })
      });
      const data = await response.json();
      if (!response.ok) return { error: data.error || { message: 'Failed to reset password' } };
      return { error: null, message: data.message };
    } catch (error) {
      return { error: { message: 'Connection error' } };
    }
  };

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signUp, signIn, signOut, forgotPassword, resetPassword }}>
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
