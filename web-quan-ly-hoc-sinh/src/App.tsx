import React, { useEffect } from 'react';
import AppRouter from './router';
import ToastContainer from './components/ui/Toast';
import api from './lib/api';
import { useAuthStore } from './store/authStore';
import './styles/globals.css';

const App: React.FC = () => {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;
    const verifySession = async () => {
      try {
        const response = await api.get('/auth/me');
        useAuthStore.getState().setUser(response.data.data.user);
      } catch {
        useAuthStore.getState().logout();
      } finally {
        useAuthStore.getState().setLoading(false);
      }
    };
    verifySession();
  }, [token]);

  return (
    <>
      <AppRouter />
      <ToastContainer />
    </>
  );
};

export default App;
