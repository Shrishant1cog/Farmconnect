import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('fc_token');
    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return socket;
}