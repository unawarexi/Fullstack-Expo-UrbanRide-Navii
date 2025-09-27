import { Server as HttpServer } from "http";
import { Socket, Server as SocketIOServer } from "socket.io";

// interface SocketEvents {
//   connection: (socket: Socket) => void;
//   disconnect: (reason: string) => void;
//   error: (error: Error) => void;
//   [key: string]: (...args: any[]) => void;
// }

class SocketManager {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Socket> = new Map();

  constructor(httpServer: HttpServer, corsOrigin: string | string[] = "*") {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ["websocket", "polling"],
    });

    this.setupConnection();
  }

  private setupConnection(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log(`✅ Connected: ${socket.id}`);
      this.connectedUsers.set(socket.id, socket);

      socket.on("disconnect", (reason: string) => {
        console.log(`❌ Disconnected: ${socket.id} - ${reason}`);
        this.connectedUsers.delete(socket.id);
      });

      socket.on("error", (error: Error) => {
        console.error(`🔥 Socket error ${socket.id}:`, error);
      });

      this.registerEvents(socket);
    });
  }

  private registerEvents(socket: Socket): void {
    socket.on("join_room", (room: string) => {
      socket.join(room);
      socket.emit("joined_room", { room, socketId: socket.id });
    });

    socket.on("leave_room", (room: string) => {
      socket.leave(room);
      socket.emit("left_room", { room, socketId: socket.id });
    });

    socket.on("send_message", (data: { room?: string; message: any }) => {
      const payload = {
        ...data,
        socketId: socket.id,
        timestamp: Date.now(),
      };

      if (data.room) {
        this.io.to(data.room).emit("new_message", payload);
      } else {
        this.io.emit("new_message", payload);
      }
    });
  }

  // Public API methods
  public emitToSocket(socketId: string, event: string, data: any): boolean {
    const socket = this.connectedUsers.get(socketId);
    if (socket) {
      socket.emit(event, data);
      return true;
    }
    return false;
  }

  public emitToRoom(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, data);
  }

  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getConnectedCount(): number {
    return this.connectedUsers.size;
  }

  public isConnected(socketId: string): boolean {
    return this.connectedUsers.has(socketId);
  }

  public disconnectSocket(socketId: string): void {
    const socket = this.connectedUsers.get(socketId);
    if (socket) {
      socket.disconnect(true);
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  // Register custom events
  public onEvent(event: string, handler: (socket: Socket, ...args: any[]) => void): void {
    this.io.on("connection", (socket: Socket) => {
      socket.on(event, (...args: any[]) => handler(socket, ...args));
    });
  }
}

let socketManagerInstance: SocketManager | undefined;

export const createSocketManager = (httpServer: HttpServer, corsOrigin?: string | string[]): SocketManager => {
  socketManagerInstance = new SocketManager(httpServer, corsOrigin);
  return socketManagerInstance;
};

export const getSocketManager = (): SocketManager | undefined => socketManagerInstance;

export { SocketManager };
