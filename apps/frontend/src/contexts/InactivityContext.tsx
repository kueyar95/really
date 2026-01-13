import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from './SocketContext';
import { useQueryClient } from '@tanstack/react-query';

interface InactivityContextType {
  showInactivityModal: boolean;
  remainingTime: number;
  resetInactivityTimer: () => void;
  isDisconnected: boolean;
}

const InactivityContext = createContext<InactivityContextType | undefined>(undefined);

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutos en milisegundos
const COUNTDOWN_DURATION = 30 * 1000; // 30 segundos de cuenta regresiva

export function InactivityProvider({ children }: { children: React.ReactNode }) {
  const { forceDisconnect } = useSocket();
  const queryClient = useQueryClient();
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(30);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const countdownStartTimeRef = useRef<number | null>(null);
  const checkIntervalRef = useRef<number | null>(null);

  const calculateRemainingTime = useCallback(() => {
    if (!countdownStartTimeRef.current) return 30;
    const now = Date.now();
    const elapsedTime = now - countdownStartTimeRef.current;
    return Math.max(0, Math.ceil((COUNTDOWN_DURATION - elapsedTime) / 1000));
  }, []);

  const handleDisconnection = useCallback(() => {
    // Primero desconectar el socket
    forceDisconnect();

    // Detener y limpiar todas las queries activas
    queryClient.cancelQueries();
    queryClient.clear();

    // Desactivar el auto-refetch para todas las queries
    queryClient.setDefaultOptions({
      queries: {
        enabled: false,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false
      }
    });

    setIsDisconnected(true);
  }, [forceDisconnect, queryClient]);

  const resetInactivityTimer = useCallback(() => {
    if (isDisconnected) {
      window.location.reload();
      return;
    }

    setLastActivity(Date.now());
    setShowInactivityModal(false);
    setRemainingTime(30);
    countdownStartTimeRef.current = null;
  }, [isDisconnected]);

  useEffect(() => {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    const handleActivity = () => {
      if (!showInactivityModal) {
        resetInactivityTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    checkIntervalRef.current = window.setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      // Si está inactivo y el modal no se muestra
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT && !showInactivityModal) {
        setShowInactivityModal(true);
        countdownStartTimeRef.current = now;
      }

      // Si el modal está mostrado, actualizar tiempo restante
      if (showInactivityModal && countdownStartTimeRef.current && !isDisconnected) {
        const remaining = calculateRemainingTime();
        setRemainingTime(remaining);

        // Si se acabó el tiempo, desconectar
        if (remaining <= 0) {
          handleDisconnection();
        }
      }
    }, 100); // Actualizamos cada 100ms para mayor precisión

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [lastActivity, showInactivityModal, resetInactivityTimer, calculateRemainingTime, isDisconnected, handleDisconnection]);

  return (
    <InactivityContext.Provider
      value={{
        showInactivityModal,
        remainingTime,
        resetInactivityTimer,
        isDisconnected
      }}
    >
      {children}
    </InactivityContext.Provider>
  );
}

export function useInactivity() {
  const context = useContext(InactivityContext);
  if (context === undefined) {
    throw new Error('useInactivity debe ser usado dentro de un InactivityProvider');
  }
  return context;
}