import { useInactivity } from '@/contexts/InactivityContext';

export function InactivityModal() {
  const { showInactivityModal, remainingTime, resetInactivityTimer, isDisconnected } = useInactivity();

  if (!showInactivityModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">
          {isDisconnected ? 'Sesión finalizada' : '¿Sigues ahí?'}
        </h2>
        <p className="text-gray-600 mb-6">
          {isDisconnected
            ? 'Tu sesión ha sido cerrada por inactividad.'
            : `Tu sesión se cerrará en ${remainingTime} segundos por inactividad.`
          }
        </p>
        <div className="flex justify-end">
          <button
            onClick={resetInactivityTimer}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isDisconnected ? 'Recargar página' : 'Sí, continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}