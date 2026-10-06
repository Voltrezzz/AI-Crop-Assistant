import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DocumentDrive from '@/components/DocumentDrive';

export default function DocumentLockerPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 pb-24">
      <button onClick={() => navigate(-1)} className="flex items-center text-indigo-700 hover:text-indigo-800 mb-6">
        <ArrowLeft className="w-5 h-5 mr-1" /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Locker</h1>
        <p className="text-gray-600">Keep farm documents on this device</p>
      </div>

      <DocumentDrive />
    </div>
  );
}
