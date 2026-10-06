import React, { useEffect, useState } from 'react';
import { Users, UserPlus, RefreshCw, MessageCircle, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocialStore } from '@/stores/socialStore';
import { syncDeviceContacts } from '@/services/socialService';

export default function FriendsPage() {
  const navigate = useNavigate();
  const { friends, loadFriends, addFriend, acceptFriend } = useSocialStore();
  const [activeTab, setActiveTab] = useState<'friends' | 'find'>('friends');
  const [suggestedContacts, setSuggestedContacts] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleSyncContacts = async () => {
    setSyncing(true);
    try {
      const contacts = await syncDeviceContacts();
      setSuggestedContacts(contacts.filter(c => c.cloudId)); // only show those registered
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddFriend = async (cloudId: string, name: string) => {
    await addFriend(cloudId, name);
    alert('Friend request sent!');
  };

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingRequests = friends.filter(f => f.status === 'pending' && f.isIncoming);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <header className="px-4 py-4 border-b border-gray-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="text-primary-600" />
              Friends
            </h1>
          </div>
        </div>

        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'friends' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
          >
            My Friends
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'find' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}
          >
            Find Friends
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'friends' && (
          <div className="space-y-6">
            {pendingRequests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Friend Requests</h3>
                <div className="space-y-3">
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                          {req.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{req.name}</p>
                          <p className="text-xs text-gray-500">Wants to be friends</p>
                        </div>
                      </div>
                      <button onClick={() => acceptFriend(req.id!)} className="px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg">
                        Accept
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wider">My Friends</h3>
              {acceptedFriends.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Users size={48} className="mx-auto mb-3 opacity-20" />
                  <p>No friends yet. Go to Find Friends to connect!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {acceptedFriends.map(friend => (
                    <div key={friend.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                          {friend.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{friend.name}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/chat/${friend.friendId}`)} className="p-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-white rounded-lg hover:bg-gray-200">
                          <MessageCircle size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'find' && (
          <div className="space-y-6">
            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl text-center">
              <UserPlus className="mx-auto text-primary-600 mb-2" size={32} />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Find your farming community</h3>
              <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">Sync your contacts to see who is already using Crop AI.</p>
              <button
                onClick={handleSyncContacts}
                disabled={syncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white rounded-xl font-medium disabled:opacity-50"
              >
                <RefreshCw size={18} className={syncing ? "animate-spin" : ""} />
                {syncing ? 'Syncing...' : 'Sync Contacts'}
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by User ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
              />
              <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            </div>

            {suggestedContacts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Suggested Contacts</h3>
                <div className="space-y-3">
                  {suggestedContacts.map((contact, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">
                          {contact.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{contact.name}</p>
                          <p className="text-xs text-gray-500">{contact.phone}</p>
                        </div>
                      </div>
                      <button onClick={() => handleAddFriend(contact.cloudId, contact.name)} className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 text-primary-600 dark:text-primary-400 text-sm font-medium rounded-lg">
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
