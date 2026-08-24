import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '@/db/database';
import { Scan, Field } from '@/types';
import { capitalize, cn, formatConfidence, formatDate, formatHealthScore, formatSeverity, getSeverityColor } from '@/utils';
import { Filter, Search, ChevronRight, AlertCircle, Leaf, Wheat } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function HistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [scans, setScans] = useState<(Scan & { fieldName?: string })[]>([]);
  const [fields, setFields] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCrop, setFilterCrop] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterField, setFilterField] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setFields({});
        setScans([]);
        return;
      }
      const allFields = await db.fields.where('userId').equals(user.id).toArray();
      const fieldMap: Record<number, string> = {};
      allFields.forEach(f => {
        if (f.id) fieldMap[f.id] = f.name;
      });
      setFields(fieldMap);

      const allScans = await db.scans.where('userId').equals(user.id).toArray();
      allScans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const enhancedScans = allScans.map(scan => ({
        ...scan,
        fieldName: scan.fieldId ? fieldMap[scan.fieldId] : 'Unknown Field'
      }));
      setScans(enhancedScans);
    } catch (error) {
      console.error('Failed to load history', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScans = scans.filter(scan => {
    if (filterCrop !== 'all' && scan.crop !== filterCrop) return false;
    if (filterSeverity !== 'all' && scan.severity !== filterSeverity) return false;
    if (filterField !== 'all' && scan.fieldId?.toString() !== filterField) return false;
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Crop History</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap gap-4">
        <div className="flex items-center text-gray-500 mr-2">
          <Filter className="w-5 h-5 mr-2" /> Filters:
        </div>
        
        <select 
          value={filterCrop} 
          onChange={(e) => setFilterCrop(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500"
        >
          <option value="all">All Crops</option>
          <option value="paddy">Paddy</option>
          <option value="wheat">Wheat</option>
        </select>

        <select 
          value={filterSeverity} 
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500"
        >
          <option value="all">All Severities</option>
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select 
          value={filterField} 
          onChange={(e) => setFilterField(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500"
        >
          <option value="all">All Fields</option>
          {Object.entries(fields).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
      ) : filteredScans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No scans found</h3>
          <p className="text-gray-500">Try adjusting your filters or run a new scan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredScans.map((scan) => (
              <div 
                key={scan.id} 
                onClick={() => navigate(`/history/${scan.id}`)}
                className="p-5 hover:bg-gray-50 cursor-pointer transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              >
                <div className="w-full sm:w-24 h-48 sm:h-24 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden relative">
                  {scan.thumbnailData || scan.imageData ? (
                    <img src={scan.thumbnailData || scan.imageData} alt={scan.diseaseName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                  )}
                  {scan.disease !== 'healthy' && (
                    <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-full shadow-sm">
                      <AlertCircle className={cn("w-4 h-4", scan.severity === 'critical' ? 'text-red-600' : scan.severity === 'high' ? 'text-orange-500' : 'text-amber-500')} />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1">
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 truncate">{scan.diseaseName}</h4>
                      <p className="text-sm text-gray-500">{scan.fieldName} • {formatDate(scan.date)}</p>
                    </div>
                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold self-start", getSeverityColor(scan.severity))}>
                      {formatSeverity(scan.severity)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      {scan.crop === 'paddy' ? <Leaf className="w-4 h-4 text-green-500" /> : <Wheat className="w-4 h-4 text-amber-500" />}
                      {capitalize(scan.crop)}
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                    <div className="text-sm text-gray-600">
                      Health: <span className="font-semibold text-gray-900">{formatHealthScore(scan.healthScore)}</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                    <div className="text-sm text-gray-600">
                      Confidence: {formatConfidence(scan.confidence)}
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="w-6 h-6 text-gray-300 hidden sm:block flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
