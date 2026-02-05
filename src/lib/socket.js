import { io } from "socket.io-client";

// ✅ FIXED URL (No double 'h', and removed '/api')
const SOCKET_URL = "https://gdg-quiz.onrender.com";

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"], // Forces modern websocket connection
      autoConnect: true,
      withCredentials: true, // Good practice for CORS
    });
  }
  return socket;
};
