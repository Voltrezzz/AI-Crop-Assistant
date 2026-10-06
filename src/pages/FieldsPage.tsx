import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { Field } from '@/types';
import { cn, formatDate, getStatusColor, capitalize } from '@/utils';
import { Plus, Leaf, Wheat, Activity, MapPin } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function FieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    const loadFields = async () => {
      try {
        if (!user?.id) {
          setFields([]);
          return;
        }
        const allFields = await db.fields.where('userId').equals(user.id).toArray();
        setFields(allFields);
      } catch (error) {
        console.error('Failed to load fields', error);
      }
    };
    loadFields();
  }, [user?.id]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-900">My Fields</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/crop-plan')}
            className="flex items-center gap-2 bg-white text-green-700 border border-green-200 hover:bg-green-50 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <span>AI Crop Plan</span>
          </button>
          <button
            onClick={() => navigate('/fields/new')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Field</span>
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-green-100">
          <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No fields yet</h2>
          <p className="text-gray-500 mb-6">Add your first field to start monitoring crop health.</p>
          <button
            onClick={() => navigate('/fields/new')}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Field
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fields.map((field) => (
            <div
              key={field.id}
              onClick={() => navigate(`/fields/${field.id}`)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-green-300 cursor-pointer transition-all"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{field.name}</h3>
                  <div className="flex items-center text-sm text-gray-500 gap-2">
                    {field.crop === 'paddy' ? <Leaf className="w-4 h-4 text-green-500" /> : <Wheat className="w-4 h-4 text-amber-500" />}
                    <span>{capitalize(field.crop)} • {field.area} {field.areaUnit}</span>
                  </div>
                </div>
                <div className="relative w-12 h-12 flex items-center justify-center bg-gray-50 rounded-full">
                  <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={field.healthScore >= 80 ? "text-green-500" : field.healthScore >= 60 ? "text-amber-500" : "text-red-500"}
                      strokeDasharray={`${field.healthScore}, 100`}
                      strokeWidth="3"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="text-xs font-bold">{field.healthScore}</span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{field.location}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <Activity className="w-4 h-4" />
                  <span>Stage: {capitalize(field.growthStage)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", getStatusColor(field.status))}>
                  {capitalize(field.status)}
                </span>
                <span className="text-xs text-gray-500">
                  {field.lastScanDate ? `Scanned ${formatDate(field.lastScanDate)}` : 'No scans yet'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
