import { create } from 'zustand';
import { db } from '@/db/database';
import { Friend, DirectMessage } from '@/types';
import { useAuthStore } from './authStore';

interface SocialState {
  friends: Friend[];
  messages: DirectMessage[];
  loading: boolean;
  loadFriends: () => Promise<void>;
  addFriend: (friendId: string, name: string) => Promise<void>;
  acceptFriend: (id: number) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (receiverId: string, content: string) => Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: [],
  messages: [],
  loading: false,

  loadFriends: async () => {
    const user = useAuthStore.getState().user;
    if (!user?.id) return;
    
    set({ loading: true });
    try {
      const friends = await db.friends.where('userId').equals(user.id).toArray();
      set({ friends, loading: false });
    } catch (error) {
      console.error('Failed to load friends:', error);
      set({ loading: false });
    }
  },

  addFriend: async (friendId: string, name: string) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) return;
    
    const newFriend: Friend = {
      userId: user.id,
      friendId,
      name,
      status: 'pending',
      isIncoming: false,
      createdAt: new Date().toISOString()
    };
    
    await db.friends.add(newFriend);
    await get().loadFriends();
  },

  acceptFriend: async (id: number) => {
    await db.friends.update(id, { status: 'accepted' });
    await get().loadFriends();
  },

  loadMessages: async (conversationId: string) => {
    const user = useAuthStore.getState().user;
    if (!user?.id) return;

    set({ loading: true });
    try {
      const messages = await db.directMessages
        .where('userId').equals(user.id)
        .and(msg => msg.conversationId === conversationId)
        .sortBy('timestamp');
        
      set({ messages, loading: false });
    } catch (error) {
      console.error('Failed to load messages:', error);
      set({ loading: false });
    }
  },

  sendMessage: async (receiverId: string, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user?.id || !user.cloudId) return;

    const newMessage: DirectMessage = {
      userId: user.id,
      conversationId: receiverId,
      senderId: user.cloudId,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      readStatus: false
    };

    await db.directMessages.add(newMessage);
    await get().loadMessages(receiverId);
  }
}));
