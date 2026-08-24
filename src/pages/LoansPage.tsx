import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { Loan, LoanType, GovernmentScheme, LoanStatus } from '@/types';
import { cn, formatDate } from '@/utils';
import { Briefcase, Landmark, Info, FileText, BadgeCheck, ExternalLink, Plus } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import PrototypeNotice from '@/components/PrototypeNotice';

export default function LoansPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'loans' | 'schemes'>('loans');
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [schemeFilter, setSchemeFilter] = useState('All');

  // Live queries
  const loans = useLiveQuery(
    () => user?.id ? db.loans.where('userId').equals(user.id).toArray() : Promise.resolve([] as Loan[]),
    [user?.id]
  ) || [];
  const schemes = useLiveQuery(
    () => user?.id ? db.governmentSchemes.where('userId').equals(user.id).toArray() : Promise.resolve([] as GovernmentScheme[]),
    [user?.id]
  ) || [];

  // Seed demo data if empty
  useEffect(() => {
    const seedData = async () => {
      if (!user?.id || !user.isDemo) return;
      const loanCount = await db.loans.where('userId').equals(user.id).count();
      if (loanCount === 0) {
        await db.loans.bulkAdd([
          { userId: user.id, loanType: 'kcc', bankName: 'SBI', accountNumber: 'xxxx-xxxx-1234', principalAmount: 200000, interestRate: 4, tenureMonths: 12, emiAmount: 17333, startDate: '2025-01-01', endDate: '2026-01-01', amountPaid: 80000, amountRemaining: 120000, status: 'active', nextPaymentDate: '2026-09-01', notes: '' },
          { userId: user.id, loanType: 'crop_loan', bankName: 'Canara Bank', accountNumber: 'xxxx-xxxx-5678', principalAmount: 150000, interestRate: 7, tenureMonths: 6, emiAmount: 25800, startDate: '2026-03-01', endDate: '2026-09-01', amountPaid: 50000, amountRemaining: 100000, status: 'active', nextPaymentDate: '2026-09-05', notes: '' },
          { userId: user.id, loanType: 'equipment', bankName: 'NABARD', accountNumber: 'xxxx-xxxx-9012', principalAmount: 300000, interestRate: 9, tenureMonths: 36, emiAmount: 9540, startDate: '2024-05-01', endDate: '2027-05-01', amountPaid: 120000, amountRemaining: 180000, status: 'active', nextPaymentDate: '2026-09-10', notes: '' },
        ]);
      }
      
      const schemeCount = await db.governmentSchemes.where('userId').equals(user.id).count();
      if (schemeCount === 0) {
        await db.governmentSchemes.bulkAdd([
          { schemeName: 'PM-KISAN', ministry: 'Ministry of Agriculture', description: '₹6,000/year direct benefit transfer to farmers.', eligibility: ['Small and marginal farmers'], benefits: ['₹6000 per year'], applicationDeadline: 'Ongoing', websiteUrl: '#', category: 'subsidy', applicableCrops: [], isApplied: true, applicationStatus: 'approved' },
          { schemeName: 'PMFBY', ministry: 'Ministry of Agriculture', description: 'Pradhan Mantri Fasal Bima Yojana: Crop insurance.', eligibility: ['All farmers'], benefits: ['Insurance cover at 2% premium'], applicationDeadline: '2026-10-15', websiteUrl: '#', category: 'insurance', applicableCrops: [], isApplied: false },
          { schemeName: 'KCC', ministry: 'Finance Ministry', description: 'Kisan Credit Card: Short-term credit at subsidized rates.', eligibility: ['Farmers, fishers, animal husbandry'], benefits: ['Subsidized interest', 'Credit limit'], applicationDeadline: 'Ongoing', websiteUrl: '#', category: 'loan', applicableCrops: [], isApplied: true, applicationStatus: 'approved' },
          { schemeName: 'Soil Health Card', ministry: 'Ministry of Agriculture', description: 'Free soil testing & recommendations.', eligibility: ['All farmers'], benefits: ['Free soil testing', 'Customized fertilizer advice'], applicationDeadline: 'Ongoing', websiteUrl: '#', category: 'subsidy', applicableCrops: [], isApplied: false },
          { schemeName: 'e-NAM', ministry: 'Ministry of Agriculture', description: 'National Agriculture Market online trading platform.', eligibility: ['Farmers with valid ID'], benefits: ['Better price discovery', 'Direct market access'], applicationDeadline: 'Ongoing', websiteUrl: '#', category: 'market', applicableCrops: [], isApplied: false },
          { schemeName: 'PM-KUSUM', ministry: 'Ministry of New & Renewable Energy', description: 'Solar pump subsidy scheme.', eligibility: ['Farmers with land'], benefits: ['60% subsidy on solar pumps'], applicationDeadline: '2026-12-31', websiteUrl: '#', category: 'equipment', applicableCrops: [], isApplied: false },
        ].map((scheme) => ({ ...scheme, userId: user.id } as GovernmentScheme)));
      }
    };
    seedData();
  }, [user?.id, user?.isDemo]);

  const totalLoans = loans.length;
  const activeAmount = loans.reduce((acc, curr) => acc + curr.amountRemaining, 0);
  const amountPaid = loans.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const emiThisMonth = loans.reduce((acc, curr) => acc + curr.emiAmount, 0);

  const schemeCategories = ['All', 'subsidy', 'insurance', 'loan', 'training', 'market', 'equipment'];
  const filteredSchemes = schemeFilter === 'All' ? schemes : schemes.filter(s => s.category === schemeFilter);

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-6xl pb-24">
      <PrototypeNotice>Scheme and loan examples are informational samples; eligibility, rates, and deadlines require official verification.</PrototypeNotice>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Financial Hub</h1>
          <p className="text-gray-500">Manage loans, EMIs, and Government Schemes</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button onClick={() => setActiveTab('loans')} className={cn("pb-3 px-6 font-medium text-sm transition-colors flex items-center gap-2", activeTab === 'loans' ? "border-b-2 border-green-600 text-green-600" : "text-gray-500 hover:text-gray-700")}>
          <Briefcase className="w-4 h-4" /> Loan Tracker
        </button>
        <button onClick={() => setActiveTab('schemes')} className={cn("pb-3 px-6 font-medium text-sm transition-colors flex items-center gap-2", activeTab === 'schemes' ? "border-b-2 border-green-600 text-green-600" : "text-gray-500 hover:text-gray-700")}>
          <Landmark className="w-4 h-4" /> Govt Schemes
        </button>
      </div>

      {activeTab === 'loans' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-medium">Total Active Loans</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{totalLoans}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-medium">Remaining Amount</p>
              <p className="text-2xl font-bold text-red-600 mt-1">₹{activeAmount.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-medium">Amount Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-1">₹{amountPaid.toLocaleString()}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500 font-medium">EMI This Month</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">₹{emiThisMonth.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Your Active Loans</h2>
            <button onClick={() => setShowAddLoan(true)} className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Loan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loans.map(loan => {
              const progress = (loan.amountPaid / loan.principalAmount) * 100;
              const data = [
                { name: 'Paid', value: loan.amountPaid, color: '#16a34a' },
                { name: 'Remaining', value: loan.amountRemaining, color: '#ef4444' }
              ];
              return (
                <div key={loan.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{loan.bankName}</h3>
                      <p className="text-sm text-gray-500 uppercase tracking-wide">{loan.loanType.replace('_', ' ')} &bull; {loan.interestRate}% Interest</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase tracking-wider">{loan.status}</span>
                  </div>
                  
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-24 h-24 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(val: number) => `₹${val.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Principal</span>
                        <span className="font-semibold text-gray-800">₹{loan.principalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Paid</span>
                        <span className="font-semibold text-green-600">₹{loan.amountPaid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Remaining</span>
                        <span className="font-semibold text-red-600">₹{loan.amountRemaining.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                    <div>
                      <span className="text-gray-500 block text-xs">Next EMI Date</span>
                      <span className="font-semibold text-gray-800">{formatDate(loan.nextPaymentDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-xs">EMI Amount</span>
                      <span className="font-semibold text-gray-800">₹{loan.emiAmount.toLocaleString()}</span>
                    </div>
                    <button className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md font-medium hover:bg-blue-100 transition-colors">
                      Mark Paid
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'schemes' && (
        <div className="space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {schemeCategories.map(cat => (
              <button 
                key={cat} 
                onClick={() => setSchemeFilter(cat)}
                className={cn("px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border", schemeFilter === cat ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50")}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchemes.map(scheme => (
              <div key={scheme.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span className={cn("px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider", "bg-blue-100 text-blue-700")}>
                    {scheme.category}
                  </span>
                  {scheme.isApplied && (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                      <BadgeCheck className="w-4 h-4" /> {scheme.applicationStatus}
                    </span>
                  )}
                </div>
                
                <h3 className="font-bold text-lg text-gray-800 mb-1">{scheme.schemeName}</h3>
                <p className="text-xs text-gray-500 mb-4">{scheme.ministry}</p>
                <p className="text-sm text-gray-700 mb-4 flex-1 line-clamp-3">{scheme.description}</p>
                
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                  <p className="font-medium text-gray-800 mb-1 flex items-center gap-1.5"><FileText className="w-4 h-4 text-gray-500"/> Key Benefits:</p>
                  <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                    {scheme.benefits.slice(0, 2).map((b, i) => <li key={i} className="truncate">{b}</li>)}
                  </ul>
                </div>
                
                <button className={cn("w-full py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2", scheme.isApplied ? "bg-gray-100 text-gray-500 cursor-default" : "bg-green-600 text-white hover:bg-green-700")}>
                  {scheme.isApplied ? 'Already Applied' : 'Apply Now'} {!scheme.isApplied && <ExternalLink className="w-4 h-4"/>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Loan Modal */}
      {showAddLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Loan</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await db.loans.add({
                userId: user?.id,
                loanType: fd.get('loanType') as LoanType,
                bankName: fd.get('bankName') as string,
                accountNumber: fd.get('accountNumber') as string,
                principalAmount: Number(fd.get('amount')),
                interestRate: Number(fd.get('rate')),
                tenureMonths: Number(fd.get('tenure')),
                emiAmount: 0, // Simplified
                startDate: fd.get('startDate') as string,
                endDate: '', // Simplified
                amountPaid: 0,
                amountRemaining: Number(fd.get('amount')),
                status: 'active',
                nextPaymentDate: '', // Simplified
                notes: ''
              });
              setShowAddLoan(false);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loan Type</label>
                <select name="loanType" className="w-full border rounded-lg px-3 py-2">
                  <option value="kcc">Kisan Credit Card</option>
                  <option value="crop_loan">Crop Loan</option>
                  <option value="equipment">Equipment Loan</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Bank Name</label><input required name="bankName" type="text" className="w-full border rounded-lg px-3 py-2" /></div>
              <div><label className="block text-sm font-medium mb-1">Account Number</label><input required name="accountNumber" type="text" className="w-full border rounded-lg px-3 py-2" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Amount (₹)</label><input required name="amount" type="number" className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Interest Rate (%)</label><input required name="rate" type="number" step="0.1" className="w-full border rounded-lg px-3 py-2" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Tenure (Months)</label><input required name="tenure" type="number" className="w-full border rounded-lg px-3 py-2" /></div>
                <div><label className="block text-sm font-medium mb-1">Start Date</label><input required name="startDate" type="date" className="w-full border rounded-lg px-3 py-2" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setShowAddLoan(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save Loan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
