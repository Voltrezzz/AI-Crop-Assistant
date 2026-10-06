import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '@/db/database';
import { FarmActivityType, FarmActivity } from '@/types';
import { useAuthStore } from '@/stores/authStore';
import { queueCloudChange } from '@/services/cloudSyncService';
import { ArrowLeft, Check, Leaf, Droplets, FlaskConical, Bug, Eye } from 'lucide-react';
import { cn } from '@/utils';

export default function AddActivityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const fieldId = location.state?.fieldId;

  const [type, setType] = useState<FarmActivityType>('observation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [cost, setCost] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!user?.id || !fieldId || !title.trim() || isSubmitting) return;
    setError('');

    setIsSubmitting(true);
    try {
      const field = await db.fields.get(Number(fieldId));
      if (field?.userId !== user.id) throw new Error('Field unavailable.');
      if (!Number.isFinite(Date.parse(date)) || (cost && (!Number.isFinite(Number(cost)) || Number(cost) < 0))) throw new Error('Enter a valid date and nonnegative cost.');
      const cycle = await db.cropCycles.where('fieldId').equals(Number(fieldId)).filter(c => c.userId === user.id && c.status === 'active').first();
      const activity: Omit<FarmActivity, 'id'> = {
        userId: user.id,
        fieldId: Number(fieldId),
        cropCycleId: cycle?.id,
        type,
        title,
        description,
        date: new Date(date).toISOString(),
        cost: cost ? parseFloat(cost) : undefined,
        createdAt: new Date().toISOString()
      };

      await db.transaction('rw', db.tables, async () => {
        const localId = await db.farmActivities.add(activity);
        await queueCloudChange(user.id!, 'farmActivities', 'create', { ...activity, id: localId }, { deferSync: true });
      });

      navigate(`/fields/${fieldId}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save activity.');
      setIsSubmitting(false);
    }
  };

  if (!fieldId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">No field selected</h2>
        <button onClick={() => navigate('/fields')} className="mt-4 text-green-600">Back to fields</button>
      </div>
    );
  }

  const activityTypes: { value: FarmActivityType; label: string; icon: React.ReactNode }[] = [
    { value: 'sowing', label: 'Sowing', icon: <Leaf className="w-5 h-5" /> },
    { value: 'irrigation', label: 'Irrigation', icon: <Droplets className="w-5 h-5" /> },
    { value: 'fertilizer', label: 'Fertilizer', icon: <FlaskConical className="w-5 h-5" /> },
    { value: 'pesticide', label: 'Pesticide', icon: <Bug className="w-5 h-5" /> },
    { value: 'observation', label: 'Observation', icon: <Eye className="w-5 h-5" /> },
    { value: 'harvest', label: 'Harvest', icon: <Leaf className="w-5 h-5" /> }
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="flex items-center mb-6">
        <button onClick={() => navigate(-1)} className="mr-4 text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add Farm Activity</h1>
      </div>

      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Activity Type</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {activityTypes.map(act => (
                <button
                  key={act.value}
                  onClick={() => setType(act.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-colors",
                    type === act.value
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  )}
                >
                  <div className="mb-2">{act.icon}</div>
                  <span className="text-sm font-medium">{act.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Applied Urea"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-green-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details, observations, or notes..."
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-green-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.00"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-4 py-3 outline-none focus:border-green-500 transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!title || isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <><Check className="w-5 h-5" /> Save Activity</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
