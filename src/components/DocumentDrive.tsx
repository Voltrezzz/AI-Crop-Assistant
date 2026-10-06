import { encryptDocument, decryptDocument } from '@/utils/documentCrypto';
import { validateDocumentUpload } from '@/utils/documentUpload';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/db/database';
import { DocumentFile } from '@/types';
import { FileText, Upload, Trash2, Download, Search, File as FileIcon, Calendar } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const CATEGORIES = ['Patta/Chitta', 'Adangal', 'Soil Report', 'Insurance', 'Loan', 'Scheme', 'Invoice/Receipt', 'Other'];

export default function DocumentDrive() {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [unlockDoc, setUnlockDoc] = useState<DocumentFile | null>(null);
  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Upload form state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadCategory, setUploadCategory] = useState(CATEGORIES[0]);
  const [uploadExpiry, setUploadExpiry] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (db.documents) {
      try {
        if (!user?.id) {
          return;
        }
        let docs = await db.documents.where('userId').equals(user.id).toArray();
        if (docs.length === 0 && user.isDemo) {
          const demoDocs: DocumentFile[] = [
            { name: 'Ramesh_Patta_2024.pdf', type: 'Patta/Chitta', category: 'Patta/Chitta', size: 1024 * 450, date: new Date().toISOString() },
            { name: 'Soil_Health_Card_Q1.pdf', type: 'Soil Report', category: 'Soil Report', size: 1024 * 850, date: new Date().toISOString(), expiryDate: '2027-01-01' },
            { name: 'KCC_Loan_Agreement.pdf', type: 'Loan', category: 'Loan', size: 1024 * 1200, date: new Date().toISOString(), expiryDate: '2028-06-30' }
          ];
          for (const doc of demoDocs) await db.documents.add({ ...doc, userId: user.id });
          docs = await db.documents.where('userId').equals(user.id).toArray();
        }
        setDocuments(docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load documents.');
      }
    }
  }, [user]);

  // IndexedDB reads synchronize external persisted state; event handlers reuse this loader.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || isUploading) return;
    setError(''); setIsUploading(true);
    try {
      if (passphrase.length < 12) throw new Error('Set a passphrase of at least 12 characters before choosing a file.');
      await validateDocumentUpload(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read this file.'));
        reader.readAsDataURL(file);
      });
      const encryptedData = await encryptDocument(dataUrl, passphrase);
      await db.documents.add({ userId: user.id, name: file.name, type: uploadCategory, category: uploadCategory,
        size: file.size, date: new Date().toISOString(), encryptedData, expiryDate: uploadExpiry || undefined });
      await loadDocuments();
      setShowUploadForm(false); setUploadExpiry(''); setPassphrase('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to store document.'); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const deleteDocument = async (id: number) => {
    try {
      const doc = await db.documents.get(id);
      if (!user?.id || doc?.userId !== user.id) throw new Error('Document unavailable.');
      if (!window.confirm(`Delete ${doc.name} from this device?`)) return;
      await db.documents.delete(id);
      await loadDocuments();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete document.'); }
  };

  async function unlockDownload() {
    if (!unlockDoc?.id || !user?.id || unlocking) return;
    setUnlocking(true); setError('');
    try {
      const doc = await db.documents.get(unlockDoc.id);
      if (!doc?.encryptedData || doc.userId !== user.id) throw new Error('Document unavailable.');
      const dataUrl = await decryptDocument(doc.encryptedData, unlockPassphrase);
      const a = document.createElement('a'); a.href = dataUrl; a.download = doc.name; a.click();
      setUnlockDoc(null); setUnlockPassphrase('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to unlock document.'); }
    finally { setUnlocking(false); }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || (d.category || d.type).toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" /> Document Locker
          </h2>
          <p className="text-sm text-gray-500">New uploads are encrypted with your passphrase on this device. Names, categories and dates remain visible. Older uploads are unencrypted. Cloud backup and sharing are not connected.</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button onClick={() => setShowUploadForm(!showUploadForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap">
            <Upload className="w-4 h-4" /> Upload
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 text-red-700">{error}</p>}
      {showUploadForm && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-indigo-900 mb-3 text-sm">Upload New Document</h3>
          <label className="block text-sm mb-2">File passphrase (at least 12 characters)<input type="password" autoComplete="new-password" value={passphrase} onChange={e => setPassphrase(e.target.value)} className="input-field mt-1" /></label>
          <p className="text-xs text-indigo-800 mb-4">Keep this passphrase safely: it is never saved and cannot be recovered. It protects file contents, not document names. Clearing browser data removes files.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-indigo-800 mb-1">Category</label>
              <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="w-full p-2 rounded border border-indigo-200 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-800 mb-1">Expiry/Renewal Date (Optional)</label>
              <input type="date" value={uploadExpiry} onChange={e => setUploadExpiry(e.target.value)} className="w-full p-2 rounded border border-indigo-200 text-sm" />
            </div>
            <div className="flex items-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <button disabled={isUploading || passphrase.length < 12} onClick={() => fileInputRef.current?.click()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded text-sm font-bold flex items-center justify-center gap-2">
                <FileIcon size={16} /> Choose File & Save
              </button>
            </div>
          </div>
          {isUploading && <p className="text-sm text-indigo-600">Encrypting and saving on this device…</p>}
        </div>
      )}

      {unlockDoc && <section className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 space-y-3" aria-label="Unlock document">
        <h3 className="font-bold break-words">Unlock {unlockDoc.name}</h3>
        <label className="block text-sm">Passphrase<input type="password" autoComplete="off" className="input-field mt-1" value={unlockPassphrase} onChange={e => setUnlockPassphrase(e.target.value)} /></label>
        <div className="flex gap-3"><button disabled={unlocking} onClick={() => void unlockDownload()} className="btn-primary">{unlocking ? 'Unlocking…' : 'Unlock & download'}</button><button disabled={unlocking} onClick={() => { setUnlockDoc(null); setUnlockPassphrase(''); }} className="btn-secondary">Cancel</button></div>
      </section>}
      {documents.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No documents found. Upload your farm records here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-3 px-4 text-sm font-medium text-gray-500">Document</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">Category</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">Size</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500">Expiry</th>
                <th className="py-3 px-4 text-sm font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map(doc => (
                <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                        {doc.name.endsWith('.pdf') ? <FileText size={16} /> : <FileIcon size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={doc.name}>{doc.name}</p>
                        <p className="text-xs text-gray-500">{new Date(doc.date).toLocaleDateString()} · {doc.encryptedData ? 'Encrypted' : doc.dataUrl ? 'Unencrypted legacy upload' : 'Sample entry'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">{doc.category || doc.type}</span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {formatSize(doc.size)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {doc.expiryDate ? (
                      <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs border border-amber-100">
                        <Calendar size={12} /> {new Date(doc.expiryDate).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-2">
                      {doc.encryptedData ? (
                        <button onClick={() => { setUnlockDoc(doc); setUnlockPassphrase(''); setError(''); }} className="p-1.5 text-indigo-600 rounded" title="Unlock and download"><Download size={18} /></button>
                      ) : doc.dataUrl ? (
                        <a href={doc.dataUrl} download={doc.name} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Download">
                          <Download size={18} />
                        </a>
                      ) : (
                        <button className="p-1.5 text-gray-300 cursor-not-allowed" disabled title="Sample entry; no file attached">
                          <Download size={18} />
                        </button>
                      )}
                      <button onClick={() => doc.id && deleteDocument(doc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Delete">
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
  );
}
