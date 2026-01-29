import { io } from "socket.io-client";

// Your Render Backend URL
const SOCKET_URL = "https://gdg-quiz-app.onrender.com";
let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
};
