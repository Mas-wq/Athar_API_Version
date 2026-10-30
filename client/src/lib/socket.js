import { io } from "socket.io-client";

export const createChatSocket = () => io({
  path: "/socket.io",
  withCredentials: true,
});
