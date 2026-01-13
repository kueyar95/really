import io from "socket.io-client";

// Crear la instancia del socket
export const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000", {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});