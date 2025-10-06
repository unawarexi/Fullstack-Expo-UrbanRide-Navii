import { useAuth } from "@clerk/clerk-expo";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketEvents {
  new_message: (data: any) => void;
  joined_room: (data: { room: string; socketId: string }) => void;
  left_room: (data: { room: string; socketId: string }) => void;
  connect: () => void;
  disconnect: (reason: string) => void;
  connect_error: (error: Error) => void;
}

// Main hook - this is what you'll use in components
export const useSocket = () => {
  const { getToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string>();

  const connect = async () => {
    if (socketRef.current?.connected) return;

    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      console.error(" EXPO_PUBLIC_BACKEND_URL not configured");
      return;
    }

    try {
      const token = await getToken();

      socketRef.current = io(backendUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000,
        transports: ["websocket", "polling"],
        auth: token ? { token } : undefined,
      });

      socketRef.current.on("connect", () => {
        console.log(" Socket connected:", socketRef.current?.id);
        setConnected(true);
        setSocketId(socketRef.current?.id);
      });

      socketRef.current.on("disconnect", (reason: string) => {
        console.log(" Socket disconnected:", reason);
        setConnected(false);
        setSocketId(undefined);
      });

      socketRef.current.on("connect_error", (error: Error) => {
        console.error(" Socket connection error:", error);
        setConnected(false);
      });
    } catch (error) {
      console.error("Failed to get auth token:", error);
      // Connect without auth if token fails
      socketRef.current = io(backendUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        timeout: 20000,
        transports: ["websocket", "polling"],
      });
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setSocketId(undefined);
    }
  };

  const joinRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_room", room);
    }
  };

  const leaveRoom = (room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave_room", room);
    }
  };

  const sendMessage = (data: { room?: string; message: any }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("send_message", data);
    }
  };

  const on = <K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback as any);
    }
  };

  const off = <K extends keyof SocketEvents>(event: K, callback?: SocketEvents[K]) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback as any);
      } else {
        socketRef.current.off(event);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    on,
    off,
    connected,
    socketId,
  };
};
