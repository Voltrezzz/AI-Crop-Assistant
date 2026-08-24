import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, MapPin, Search, CheckCircle, Plus } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { db } from '@/db/database';
import { Scan, Field } from '@/types';
import { formatConfidence, formatDate, formatHealthScore, formatRisk, formatSeverity } from '@/utils';
import { useAuthStore } from '@/stores/authStore';

interface Report {
  id: string;
  date: string;
  fieldId: string;
  fieldName: string;
  type: string;
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedField, setSelectedField] = useState<string>('all');

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) {
        setFields([]);
        setScans([]);
        setReports([]);
        return;
      }
      const allFields = await db.fields.where('userId').equals(user.id).toArray();
      const allScans = await db.scans.where('userId').equals(user.id).toArray();
      allScans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setFields(allFields);
      setScans(allScans);

      const saved = localStorage.getItem(`cropsense_reports_${user.id}`);
      if (saved) {
        try {
          setReports(JSON.parse(saved));
        } catch {
          setReports([]);
        }
      } else {
        setReports([]);
      }
    };
    loadData();
  }, [user?.id]);

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const now = new Date();
      const dateStr = formatDate(now.toISOString());
      
      let targetScans = scans;
      let fieldName = 'All Fields';
      
      if (selectedField !== 'all') {
        const fieldIdNum = Number(selectedField);
        targetScans = scans.filter(s => s.fieldId === fieldIdNum);
        fieldName = fields.find(f => f.id === fieldIdNum)?.name || 'Unknown Field';
      }

      // PDF Content Generation
      doc.setFontSize(22);
      doc.setTextColor(21, 128, 61); // Green 700
      doc.text('CropSense AI - Crop Health Report', 20, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(75, 85, 99); // Gray 600
      doc.text(`Generated: ${dateStr}`, 20, 30);
      doc.text(`Farmer: ${user?.name || 'CropSense user'}`, 20, 36);
      doc.text(`Field Scope: ${fieldName}`, 20, 42);
      
      doc.setDrawColor(229, 231, 235); // Gray 200
      doc.line(20, 48, 190, 48);

      doc.setFontSize(16);
      doc.setTextColor(31, 41, 55); // Gray 800
      doc.text('Recent Scan Results', 20, 60);

      let yPos = 70;
      
      if (targetScans.length === 0) {
        doc.setFontSize(12);
        doc.text('No scans recorded for this selection.', 20, yPos);
      } else {
        targetScans.slice(0, 5).forEach((scan, index) => {
          if (yPos > 260) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(12);
          doc.setTextColor(31, 41, 55);
          doc.text(`Scan ${index + 1} - ${formatDate(scan.date)}`, 20, yPos);
          
          doc.setFontSize(11);
          doc.setTextColor(75, 85, 99);
          doc.text(`Diagnosis: ${scan.disease}`, 25, yPos + 6);
          doc.text(`Confidence: ${formatConfidence(scan.confidence)}`, 25, yPos + 12);
          doc.text(`Severity: ${formatSeverity(scan.severity)}`, 25, yPos + 18);
          doc.text(`Health Score: ${formatHealthScore(scan.healthScore)}`, 25, yPos + 24);
          doc.text(`Risk: ${formatRisk(scan.risk)}`, 25, yPos + 30);
          
          yPos += 41;
        });
      }

      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text('Prototype Report - CropSense AI', 20, 285);

      // Save PDF
      const filename = `CropHealthReport_${dateStr.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      doc.save(filename);

      // Add to list
      const newReport: Report = {
        id: `r_${Date.now()}`,
        date: now.toISOString(),
        fieldId: selectedField,
        fieldName: fieldName,
        type: 'On-Demand Health Report'
      };
      
      const updatedReports = [newReport, ...reports];
      setReports(updatedReports);
      if (user?.id) localStorage.setItem(`cropsense_reports_${user.id}`, JSON.stringify(updatedReports));

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Farm Reports</h1>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-green-600" /> Generate New Report
        </h2>
        
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Field</label>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500"
            >
              <option value="all">All Fields</option>
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.crop})</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={generateReport}
            disabled={isGenerating}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <span className="animate-pulse">Generating PDF...</span>
            ) : (
              <>
                <FileText className="w-5 h-5" /> Generate PDF
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Past Reports</h2>
        
        {reports.length === 0 ? (
          <p className="text-gray-500 italic">No reports generated yet.</p>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-red-500 rounded-lg">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{report.type}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(report.date)}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {report.fieldName}</span>
                    </div>
                  </div>
                </div>
                <button 
                  disabled
                  className="p-2 text-gray-300 cursor-not-allowed rounded-lg"
                  title="Generated PDF files are downloaded immediately and are not retained by CropSense."
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
