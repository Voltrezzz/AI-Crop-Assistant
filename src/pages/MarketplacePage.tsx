import ModuleDraftBoard from '@/components/ModuleDraftBoard';
import React, { useState } from 'react';
import { Users, Tractor, MapPin, Star, Briefcase } from 'lucide-react';
import PrototypeNotice from '@/components/PrototypeNotice';

type Tab = 'labour' | 'equipment';

const MOCK_LABOUR = [
  { id: 1, name: 'Murugan K.', skills: ['Harvesting', 'Paddy'], location: 'Thanjavur, 5km away', rating: 4.8, available: true, rate: '₹500/day' },
  { id: 2, name: 'Selvam Team (5)', skills: ['Transplanting', 'Weeding'], location: 'Kumbakonam, 12km away', rating: 4.5, available: false, rate: '₹2200/day' },
];

const MOCK_EQUIPMENT = [
  { id: 1, name: 'Mahindra Tractor 575 DI', owner: 'Raja Agencys', location: 'Thanjavur', rate: '₹800/hr', available: true, image: 'tractor' },
  { id: 2, name: 'Combine Harvester', owner: 'Sakthi Rentals', location: 'Trichy', rate: '₹2500/hr', available: true, image: 'harvester' },
];

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('labour');


  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 pb-24">
      <PrototypeNotice>This is a prototype marketplace directory. Listings are samples. Save labour and equipment request drafts below. They are not sent; bookings and matching are not connected.</PrototypeNotice>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manpower & Equipment</h1>
          <p className="text-gray-600">Find local workers and machinery</p>
        </div>

      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button onClick={() => setTab('labour')} className={`pb-3 font-medium flex items-center gap-2 ${tab === 'labour' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>
          <Users size={20} /> Labour Exchange
        </button>
        <button onClick={() => setTab('equipment')} className={`pb-3 font-medium flex items-center gap-2 ${tab === 'equipment' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-gray-500'}`}>
          <Tractor size={20} /> Machinery Rental
        </button>
      </div>

      <div className="mb-6"><ModuleDraftBoard kind="marketplace" title="Labour & equipment request drafts" withDate /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tab === 'labour' && MOCK_LABOUR.map(l => (
          <div key={l.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg">{l.name}</h3>
                <p className="text-gray-500 text-sm flex items-center gap-1"><MapPin size={14} /> {l.location}</p>
              </div>
              <div className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                <Star size={12} fill="currentColor" /> {l.rating}
              </div>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {l.skills.map(s => <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">{s}</span>)}
            </div>
            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-900">{l.rate}</span>
              </div>
              <button disabled className={`px-4 py-1.5 rounded-lg text-sm font-bold ${l.available ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
                {l.available ? 'Sample listing' : 'Sample: Busy'}
              </button>
            </div>
          </div>
        ))}

        {tab === 'equipment' && MOCK_EQUIPMENT.map(e => (
          <div key={e.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-bold text-lg">{e.name}</h3>
                <p className="text-gray-500 text-sm flex items-center gap-1"><Briefcase size={14} /> {e.owner}</p>
                <p className="text-gray-500 text-sm flex items-center gap-1"><MapPin size={14} /> {e.location}</p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
              <div>
                <span className="font-bold text-gray-900">{e.rate}</span>
              </div>
              <button disabled className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold">
                Booking unavailable
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
