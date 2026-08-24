import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/db/database';
import { DocumentFile } from '@/types';
import { FileText, Upload, Trash2, Download, Search, HardDrive, File as FileIcon } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function DocumentDrive() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [user?.id]);

  const loadDocuments = async () => {
    if (db.documents) {
      try {
        if (!user?.id) {
          setDocuments([]);
          return;
        }
        let docs = await db.documents.where('userId').equals(user.id).toArray();
        if (docs.length === 0 && user.isDemo) {
          // Seed demo documents
          const demoDocs: DocumentFile[] = [
            { name: 'Ramesh_Patta_2024.pdf', type: 'Patta', size: 1024 * 450, date: new Date().toISOString() },
            { name: 'Soil_Health_Card_Q1.pdf', type: 'Soil Health Card', size: 1024 * 850, date: new Date().toISOString() },
            { name: 'KCC_Loan_Agreement.pdf', type: 'Loan Agreement', size: 1024 * 1200, date: new Date().toISOString() }
          ];
          for (let doc of demoDocs) await db.documents.add({ ...doc, userId: user.id });
          docs = await db.documents.where('userId').equals(user.id).toArray();
        }
        setDocuments(docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    
    // Simulate upload delay and base64 conversion
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const newDoc: DocumentFile = {
        userId: user?.id,
        name: file.name,
        type: file.name.includes('pdf') ? 'PDF Document' : 'Image',
        size: file.size,
        date: new Date().toISOString(),
        dataUrl
      };
      
      try {
        if (db.documents) {
          await db.documents.add(newDoc);
          await loadDocuments();
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id?: number) => {
    if (id && db.documents) {
      const document = await db.documents.get(id);
      if (document?.userId === user?.id) await db.documents.delete(id);
      loadDocuments();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const filteredDocs = documents.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 mt-12 pt-8 border-t border-gray-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <HardDrive className="text-blue-600" />
            Document Drive
          </h1>
          <p className="text-gray-500">Securely store and manage your farm documents</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-xl focus:outline-none focus:border-blue-500"
            />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
            disabled={isUploading}
          >
            <Upload size={18} />
            <span className="hidden sm:inline">{isUploading ? 'Uploading...' : 'Upload'}</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <FileIcon size={48} className="text-gray-300 mb-4" />
            <p className="text-lg font-medium">No documents found</p>
            <p className="text-sm mt-1">Upload your Patta, Chitta, or Loan documents to keep them safe.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">Name</th>
                  <th className="p-4 font-semibold text-gray-600 hidden md:table-cell">Type</th>
                  <th className="p-4 font-semibold text-gray-600">Size</th>
                  <th className="p-4 font-semibold text-gray-600 hidden sm:table-cell">Date</th>
                  <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDocs.map((doc, idx) => (
                  <tr key={doc.id || idx} className="hover:bg-gray-50/50 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                          <FileText size={20} />
                        </div>
                        <span className="font-medium text-gray-900 truncate max-w-[150px] sm:max-w-xs">{doc.name}</span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell text-gray-600">{doc.type}</td>
                    <td className="p-4 text-gray-600">{formatSize(doc.size)}</td>
                    <td className="p-4 hidden sm:table-cell text-gray-600">{new Date(doc.date).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {doc.dataUrl && (
                          <a href={doc.dataUrl} download={doc.name} className="p-2 text-gray-400 hover:text-blue-600 transition">
                            <Download size={18} />
                          </a>
                        )}
                        <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-500 transition">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
