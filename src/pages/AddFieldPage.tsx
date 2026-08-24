import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { Field, CropType, GrowthStage, FieldStatus, RiskLevel } from '@/types';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { queueCloudChange } from '@/services/cloudSyncService';

export default function AddFieldPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    crop: 'paddy' as CropType,
    variety: '',
    location: '',
    plantingDate: '',
    expectedHarvest: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.area || isNaN(Number(formData.area))) newErrors.area = 'Valid area is required';
    if (!formData.variety.trim()) newErrors.variety = 'Variety is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.plantingDate) newErrors.plantingDate = 'Planting date is required';
    if (!formData.expectedHarvest) newErrors.expectedHarvest = 'Expected harvest date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!user?.id) {
      setErrors({ form: 'Please log in before adding a field.' });
      return;
    }

    const newField: Omit<Field, 'id'> = {
      userId: user.id,
      name: formData.name,
      area: Number(formData.area),
      areaUnit: 'acres',
      crop: formData.crop,
      variety: formData.variety,
      location: formData.location,
      plantingDate: new Date(formData.plantingDate).toISOString(),
      expectedHarvest: new Date(formData.expectedHarvest).toISOString(),
      growthStage: (formData.crop === 'paddy' ? 'nursery' : 'germination') as GrowthStage,
      healthScore: 100,
      status: 'healthy' as FieldStatus,
      diseaseRisk: 'low' as RiskLevel
    };

    try {
      const id = await db.fields.add(newField as Field);
      await queueCloudChange(user.id, 'fields', 'create', { ...newField, id } as unknown as Record<string, unknown>);
      navigate('/fields');
    } catch (error) {
      console.error('Failed to add field', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <button 
        onClick={() => navigate('/fields')}
        className="flex items-center text-green-700 hover:text-green-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-1" /> Back to Fields
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-green-50/50">
          <h1 className="text-2xl font-bold text-gray-900">Add New Field</h1>
          <p className="text-gray-500 mt-1">Enter details about your crop field to start monitoring.</p>
          {errors.form && <p className="text-red-500 text-sm mt-2">{errors.form}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Field Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. North Plot"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Area (Acres)</label>
              <input
                type="number"
                name="area"
                value={formData.area}
                onChange={handleChange}
                placeholder="e.g. 2.5"
                step="0.1"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${errors.area ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.area && <p className="text-red-500 text-xs mt-1">{errors.area}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Crop Type</label>
              <select
                name="crop"
                value={formData.crop}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
              >
                <option value="paddy">Paddy (Rice)</option>
                <option value="wheat">Wheat</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Variety</label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleChange}
                placeholder="e.g. Basmati 370"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${errors.variety ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.variety && <p className="text-red-500 text-xs mt-1">{errors.variety}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Village Name, District"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Planting Date</label>
              <input
                type="date"
                name="plantingDate"
                value={formData.plantingDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${errors.plantingDate ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.plantingDate && <p className="text-red-500 text-xs mt-1">{errors.plantingDate}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Expected Harvest Date</label>
              <input
                type="date"
                name="expectedHarvest"
                value={formData.expectedHarvest}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all ${errors.expectedHarvest ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.expectedHarvest && <p className="text-red-500 text-xs mt-1">{errors.expectedHarvest}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => navigate('/fields')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Save Field
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
