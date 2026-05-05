import PusherServer from 'pusher';

const hasPusherConfig = process.env.PUSHER_APP_ID && process.env.NEXT_PUBLIC_PUSHER_KEY && process.env.PUSHER_SECRET;

if (!hasPusherConfig) {
  console.warn("⚠️ Warning: Pusher environment variables are not configured. Real-time features will be disabled.");
}

export const pusherServer = hasPusherConfig 
  ? new PusherServer({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      useTLS: true,
    })
  : {
      trigger: async () => {
        console.warn("Pusher trigger called but Pusher is not configured.");
        return {};
      },
    } as unknown as PusherServer;