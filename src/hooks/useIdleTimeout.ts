import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export function useIdleTimeout() {
  const timeoutRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(handleLogout, IDLE_TIMEOUT) as unknown as number;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info('Sua sessão expirou por inatividade. Por favor, faça login novamente.');
    navigate('/auth');
  };

  useEffect(() => {
    const events = ['load', 'mousemove', 'mousedown', 'click', 'scroll', 'keypress'];

    const setupEventListeners = () => {
      events.forEach(event => {
        window.addEventListener(event, resetTimeout);
      });
      resetTimeout(); // Initialize timeout on mount
    };

    const cleanupEventListeners = () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    setupEventListeners();

    return () => {
      cleanupEventListeners();
    };
  }, []);
}
