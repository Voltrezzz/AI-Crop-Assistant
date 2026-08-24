import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Animal, VaccinationRecord, AnimalType, AnimalHealthStatus } from '@/types';
import { cn, formatDate } from '@/utils';
import { Plus, Activity, Syringe, HeartPulse, ShieldAlert, CheckCircle2, AlertTriangle, Info, MapPin } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import NearbyPlacesMap from '@/components/NearbyPlacesMap';

export default function AnimalsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'list' | 'vaccinations' | 'health'>('list');
  const [showAddAnimal, setShowAddAnimal] = useState(false);
  const [showAddVaccine, setShowAddVaccine] = useState(false);

  // Live queries
  const animals = useLiveQuery(
    () => user?.id ? db.animals.where('userId').equals(user.id).toArray() : Promise.resolve([] as Animal[]),
    [user?.id]
  ) || [];
  const vaccinations = useLiveQuery(
    () => user?.id ? db.vaccinations.where('userId').equals(user.id).toArray() : Promise.resolve([] as VaccinationRecord[]),
    [user?.id]
  ) || [];
  
  // Seed demo data if empty
  useEffect(() => {
    const seedData = async () => {
      if (!user?.id || !user.isDemo) return;
      const count = await db.animals.where('userId').equals(user.id).count();
      if (count === 0) {
        await db.animals.bulkAdd([
          { userId: user.id, name: 'Lakshmi', type: 'cow', breed: 'Gir', tagNumber: 'TAG001', healthStatus: 'healthy', dateOfBirth: '2022-01-10', gender: 'female', weight: 450, notes: '' },
          { userId: user.id, name: 'Ramu', type: 'buffalo', breed: 'Murrah', tagNumber: 'TAG002', healthStatus: 'healthy', dateOfBirth: '2023-05-15', gender: 'male', weight: 550, notes: '' },
          { userId: user.id, name: 'Shyama', type: 'goat', breed: 'Jamunapari', tagNumber: 'TAG003', healthStatus: 'sick', dateOfBirth: '2024-02-20', gender: 'female', weight: 45, notes: '' },
          { userId: user.id, name: '12 Poultry', type: 'poultry', breed: 'Kadaknath', tagNumber: 'BATCH-A', healthStatus: 'healthy', dateOfBirth: '2025-01-01', gender: 'female', weight: 1.5, notes: '' },
          { userId: user.id, name: 'Mothi', type: 'cow', breed: 'Sahiwal', tagNumber: 'TAG004', healthStatus: 'under_treatment', dateOfBirth: '2021-11-05', gender: 'female', weight: 480, notes: '' },
        ]);
      }
      
      const vCount = await db.vaccinations.where('userId').equals(user.id).count();
      if (vCount === 0) {
        const demoAnimals = await db.animals.where('userId').equals(user.id).toArray();
        const getAnimal = (name: string) => demoAnimals.find((animal) => animal.name === name);
        const lakshmi = getAnimal('Lakshmi');
        const ramu = getAnimal('Ramu');
        const shyama = getAnimal('Shyama');
        const mothi = getAnimal('Mothi');

        await db.vaccinations.bulkAdd([
          { userId: user.id, animalId: lakshmi?.id || 0, animalName: 'Lakshmi', vaccineName: 'FMD vaccine', disease: 'Foot and Mouth', dateAdministered: '2025-12-01', nextDueDate: '2026-12-01', veterinarianName: 'Dr. Sharma', batchNumber: 'B123', dosage: '2ml', status: 'completed', notes: '' },
          { userId: user.id, animalId: lakshmi?.id || 0, animalName: 'Lakshmi', vaccineName: 'Brucellosis', disease: 'Brucellosis', dateAdministered: '', nextDueDate: '2026-09-15', veterinarianName: '', batchNumber: '', dosage: '1ml', status: 'scheduled', notes: '' },
          { userId: user.id, animalId: ramu?.id || 0, animalName: 'Ramu', vaccineName: 'Hemorrhagic Septicemia', disease: 'HS', dateAdministered: '2025-11-01', nextDueDate: '2026-11-01', veterinarianName: 'Dr. Sharma', batchNumber: 'H789', dosage: '2ml', status: 'completed', notes: '' },
          { userId: user.id, animalId: shyama?.id || 0, animalName: 'Shyama', vaccineName: 'PPR', disease: 'PPR', dateAdministered: '', nextDueDate: '2026-08-10', veterinarianName: '', batchNumber: '', dosage: '1ml', status: 'overdue', notes: '' },
          { userId: user.id, animalId: mothi?.id || 0, animalName: 'Mothi', vaccineName: 'Anthrax', disease: 'Anthrax', dateAdministered: '', nextDueDate: '2026-09-20', veterinarianName: '', batchNumber: '', dosage: '1ml', status: 'scheduled', notes: '' },
        ]);
      }
    };
    seedData();
  }, [user?.id, user?.isDemo]);

  const totalAnimals = animals.length;
  const healthyAnimals = animals.filter(a => a.healthStatus === 'healthy').length;
  const treatmentAnimals = animals.filter(a => a.healthStatus === 'under_treatment' || a.healthStatus === 'sick').length;
  const overdueVacs = vaccinations.filter(v => v.status === 'overdue' || (v.status === 'scheduled' && new Date(v.nextDueDate) < new Date())).length;
  const dueSoonVacs = vaccinations.filter(v => v.status === 'due' || v.status === 'scheduled').length;

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Livestock Management</h1>
          <p className="text-gray-500">Monitor health, vaccinations, and records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddVaccine(true)} className="px-4 py-2 bg-green-100 text-green-700 font-medium rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2">
            <Syringe className="w-4 h-4" /> Log Vaccine
          </button>
          <button onClick={() => setShowAddAnimal(true)} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Animal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Activity className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Animals</p>
            <p className="text-2xl font-bold text-gray-800">{totalAnimals}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg"><CheckCircle2 className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Healthy</p>
            <p className="text-2xl font-bold text-gray-800">{healthyAnimals}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><HeartPulse className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Treatment</p>
            <p className="text-2xl font-bold text-gray-800">{treatmentAnimals}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg"><ShieldAlert className="w-6 h-6" /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Vaccines Due/Overdue</p>
            <p className="text-2xl font-bold text-gray-800">{dueSoonVacs}</p>
          </div>
        </div>
      </div>

      {overdueVacs > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold">Vaccinations Overdue</h4>
            <p className="text-sm mt-1">You have {overdueVacs} animal(s) with overdue vaccinations. Please review the Vaccination Tracker.</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button onClick={() => setActiveTab('list')} className={cn("pb-3 px-4 font-medium text-sm transition-colors", activeTab === 'list' ? "border-b-2 border-green-600 text-green-600" : "text-gray-500 hover:text-gray-700")}>Animal List</button>
        <button onClick={() => setActiveTab('vaccinations')} className={cn("pb-3 px-4 font-medium text-sm transition-colors", activeTab === 'vaccinations' ? "border-b-2 border-green-600 text-green-600" : "text-gray-500 hover:text-gray-700")}>Vaccination Tracker</button>
        <button onClick={() => setActiveTab('health')} className={cn("pb-3 px-4 font-medium text-sm transition-colors", activeTab === 'health' ? "border-b-2 border-green-600 text-green-600" : "text-gray-500 hover:text-gray-700")}>Health Records</button>
      </div>

      {/* Content */}
      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {animals.map(animal => (
            <div key={animal.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    {animal.name} 
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{animal.type}</span>
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{animal.breed} &bull; {animal.tagNumber}</p>
                </div>
                <StatusBadge status={animal.healthStatus} />
              </div>
              <div className="p-4 bg-gray-50/50 flex justify-between text-sm">
                <div>
                  <p className="text-gray-500">Weight</p>
                  <p className="font-medium text-gray-800">{animal.weight} kg</p>
                </div>
                <div>
                  <p className="text-gray-500">Gender</p>
                  <p className="font-medium text-gray-800 capitalize">{animal.gender}</p>
                </div>
                <div>
                  <p className="text-gray-500">Age</p>
                  <p className="font-medium text-gray-800">
                    {Math.floor((new Date().getTime() - new Date(animal.dateOfBirth).getTime()) / (1000 * 3600 * 24 * 365.25))} yrs
                  </p>
                </div>
              </div>
            </div>
          ))}
          {animals.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>No animals added yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'vaccinations' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
                  <th className="p-4 font-medium">Animal</th>
                  <th className="p-4 font-medium">Vaccine / Disease</th>
                  <th className="p-4 font-medium">Next Due</th>
                  <th className="p-4 font-medium">Status</th>
                  <th className="p-4 font-medium">Administered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vaccinations.map(vac => (
                  <tr key={vac.id} className="hover:bg-gray-50/50">
                    <td className="p-4 font-medium text-gray-800">{vac.animalName}</td>
                    <td className="p-4">
                      <p className="text-gray-800">{vac.vaccineName}</p>
                      <p className="text-xs text-gray-500">{vac.disease}</p>
                    </td>
                    <td className="p-4 text-gray-800">{formatDate(vac.nextDueDate) || '-'}</td>
                    <td className="p-4"><VacStatusBadge status={vac.status} /></td>
                    <td className="p-4 text-gray-500 text-sm">{vac.dateAdministered ? formatDate(vac.dateAdministered) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vaccinations.length === 0 && (
              <div className="py-12 text-center text-gray-500">
                <p>No vaccination records found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'health' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Info className="w-12 h-12 text-blue-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-800">Health Records Summary</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2">No recent severe health events recorded. Keep updating animal health statuses to track treatments here.</p>
        </div>
      )}

      {/* Nearby Veterinary Clinics */}
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-5">
        <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-blue-600" /> Nearby Veterinary Clinics
        </h3>
        <NearbyPlacesMap
          keyword="veterinary clinic animal hospital"
          title="No clinic is assumed or fabricated; live search uses your current coordinates."
          actionLabel="Find Nearby Veterinary Clinics"
        />
      </div>

      {/* Modals */}
      {showAddAnimal && user?.id && <AddAnimalModal userId={user.id} onClose={() => setShowAddAnimal(false)} onSave={() => setShowAddAnimal(false)} />}
      {showAddVaccine && user?.id && <AddVaccineModal userId={user.id} animals={animals} onClose={() => setShowAddVaccine(false)} onSave={() => setShowAddVaccine(false)} />}
    </div>
  );
}

function StatusBadge({ status }: { status: AnimalHealthStatus }) {
  const styles = {
    healthy: 'bg-green-100 text-green-700 border-green-200',
    sick: 'bg-red-100 text-red-700 border-red-200',
    under_treatment: 'bg-orange-100 text-orange-700 border-orange-200',
    recovered: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full border capitalize", styles[status] || 'bg-gray-100 text-gray-700 border-gray-200')}>
      {status.replace('_', ' ')}
    </span>
  );
}

function VacStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    due: 'bg-amber-100 text-amber-700',
    overdue: 'bg-red-100 text-red-700',
    scheduled: 'bg-blue-100 text-blue-700',
  };
  return (
    <span className={cn("px-2.5 py-1 text-xs font-medium rounded-full capitalize", styles[status] || 'bg-gray-100 text-gray-700')}>
      {status}
    </span>
  );
}

function AddAnimalModal({ userId, onClose, onSave }: { userId: number, onClose: () => void, onSave: () => void }) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await db.animals.add({
      userId,
      name: fd.get('name') as string,
      type: fd.get('type') as AnimalType,
      breed: fd.get('breed') as string,
      tagNumber: fd.get('tagNumber') as string,
      dateOfBirth: fd.get('dateOfBirth') as string,
      gender: fd.get('gender') as 'male'|'female',
      weight: Number(fd.get('weight')),
      healthStatus: fd.get('healthStatus') as AnimalHealthStatus,
      notes: fd.get('notes') as string,
    });
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add New Animal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input required name="name" type="text" className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Ganga" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select name="type" className="w-full border rounded-lg px-3 py-2">
                <option value="cow">Cow</option>
                <option value="buffalo">Buffalo</option>
                <option value="goat">Goat</option>
                <option value="sheep">Sheep</option>
                <option value="poultry">Poultry</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Breed</label>
              <input required name="breed" type="text" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tag Number</label>
              <input required name="tagNumber" type="text" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input required name="dateOfBirth" type="date" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gender</label>
              <select name="gender" className="w-full border rounded-lg px-3 py-2">
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Weight (kg)</label>
              <input required name="weight" type="number" step="0.1" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Health Status</label>
              <select name="healthStatus" className="w-full border rounded-lg px-3 py-2">
                <option value="healthy">Healthy</option>
                <option value="sick">Sick</option>
                <option value="under_treatment">Under Treatment</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea name="notes" rows={2} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save Animal</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddVaccineModal({ userId, animals, onClose, onSave }: { userId: number, animals: Animal[], onClose: () => void, onSave: () => void }) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const animalId = Number(fd.get('animalId'));
    const animal = animals.find(a => a.id === animalId);
    if (!animal) return;

    await db.vaccinations.add({
      userId,
      animalId,
      animalName: animal.name,
      vaccineName: fd.get('vaccineName') as string,
      disease: fd.get('disease') as string,
      dateAdministered: fd.get('dateAdministered') as string,
      nextDueDate: fd.get('nextDueDate') as string,
      veterinarianName: fd.get('veterinarianName') as string,
      batchNumber: fd.get('batchNumber') as string,
      dosage: fd.get('dosage') as string,
      status: fd.get('status') as any,
      notes: ''
    });
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Log Vaccination</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Animal</label>
            <select required name="animalId" className="w-full border rounded-lg px-3 py-2">
              <option value="">Select animal...</option>
              {animals.map(a => <option key={a.id} value={a.id}>{a.name} ({a.tagNumber})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vaccine Name</label>
              <input required name="vaccineName" type="text" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Disease</label>
              <input required name="disease" type="text" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select name="status" className="w-full border rounded-lg px-3 py-2">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="due">Due</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Administered Date</label>
              <input name="dateAdministered" type="date" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Next Due Date</label>
              <input required name="nextDueDate" type="date" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dosage</label>
              <input name="dosage" type="text" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Veterinarian</label>
              <input name="veterinarianName" type="text" className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Batch #</label>
              <input name="batchNumber" type="text" className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save Record</button>
          </div>
        </form>
      </div>
    </div>
  );
}
