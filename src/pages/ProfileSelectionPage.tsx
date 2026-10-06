import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserCircle2, Plus, Trash2 } from 'lucide-react';

export default function ProfileSelectionPage() {
  const navigate = useNavigate();
  const { user, profiles, selectProfile, addProfile, deleteProfile } = useAuthStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (profiles.length === 0) {
      // If user has no profiles, go to onboarding
      navigate('/onboarding');
    }
  }, [user, profiles, navigate]);

  const handleSelect = (profile: any) => {
    selectProfile(profile);
    navigate('/dashboard');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProfileName.trim()) {
      await addProfile(newProfileName, 'farmer');
      setNewProfileName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-green-950">Who's farming?</h1>
          <p className="text-green-700 mt-3">Choose a Marudham 360 workspace profile to continue.</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8">
          {profiles.map(profile => (
            <div key={profile.id} className="flex flex-col items-center group relative">
              <button
                onClick={() => handleSelect(profile)}
                aria-label={`Select ${profile.name}`} className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white border-2 border-green-100 shadow-sm group-hover:border-green-500 group-hover:shadow-lg transition-all overflow-hidden flex items-center justify-center"
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <UserCircle2 size={80} className="text-green-600 group-hover:text-green-700 transition-colors" />
                )}
              </button>
              <span className="mt-4 text-green-900 group-hover:text-green-700 text-lg font-medium transition-colors">
                {profile.name}
              </span>

              {profiles.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProfile(profile.id!); }}
                  className="absolute -top-3 -right-3 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}

          {isAdding ? (
            <div className="flex flex-col items-center">
              <form onSubmit={handleAdd} className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                <input
                  type="text"
                  autoFocus
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-4 py-2 rounded-lg bg-white text-green-950 border-2 border-green-200 focus:border-green-500 focus:outline-none shadow-sm"
                />
              </form>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                <button onClick={handleAdd} className="text-green-700 hover:text-green-800 font-medium">Add</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center group">
              <button
                onClick={() => setIsAdding(true)}
                aria-label="Add profile" className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-green-100 border-2 border-green-200 group-hover:bg-green-200 group-hover:border-green-500 transition-all flex items-center justify-center shadow-sm"
              >
                <Plus size={60} className="text-green-700 transition-colors" />
              </button>
              <span className="mt-4 text-green-900 group-hover:text-green-700 text-lg font-medium transition-colors">
                Add Profile
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
