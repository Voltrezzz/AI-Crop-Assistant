import { ComparisonResult, User } from '@/types';
import { db } from '@/db/database';

// In a real app, this would hit the Supabase edge function or direct DB query with RLS.
// For now, we simulate finding a user by Contract ID / User ID and returning mock public data.
export const getComparisonData = async (query: string): Promise<ComparisonResult | null> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // In this demo, if they search for 'DEMO-123' or similar, we return a mock result
  // otherwise, we check if it matches the current user (which isn't useful for comparison but just in case)
  
  if (query.length < 3) return null;

  // Mock public data for a remote user
  return {
    userId: 'mock-uuid-1234',
    userName: 'Rajesh Kumar',
    contractId: query.toUpperCase(),
    fields: [
      {
        id: 999,
        userId: 999,
        name: 'North Plot',
        area: 2.5,
        areaUnit: 'acres',
        crop: 'paddy',
        variety: 'BPT 5204',
        location: 'Thanjavur',
        plantingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        expectedHarvest: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        growthStage: 'tillering',
        healthScore: 85,
        status: 'healthy',
        diseaseRisk: 'low'
      }
    ],
    scans: [],
    landParcels: []
  };
};

export const syncDeviceContacts = async (): Promise<Partial<User>[]> => {
  // Use navigator.contacts if available (Android Chrome)
  if ('contacts' in navigator && 'ContactsManager' in window) {
    const props = ['name', 'tel'];
    const opts = { multiple: true };
    try {
      const contacts = await (navigator as any).contacts.select(props, opts);
      return contacts.map((c: any) => ({
        name: c.name?.[0] || 'Unknown',
        phone: c.tel?.[0] || ''
      }));
    } catch (ex) {
      console.warn('Contact selection failed:', ex);
    }
  }
  
  // Fallback to mock contacts
  return [
    { name: 'Kannan', phone: '+91 98765 11111', cloudId: 'kannan-123' },
    { name: 'Suresh', phone: '+91 98765 22222', cloudId: 'suresh-456' }
  ];
};
