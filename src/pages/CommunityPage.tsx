import { Link } from 'react-router-dom';
import ModuleDraftBoard from '@/components/ModuleDraftBoard';

export default function CommunityPage() {
  return <div className="max-w-4xl mx-auto p-4 lg:p-8 pb-28 space-y-6">
    <Link to="/marudham360" className="text-green-700">← MARUDHAM 360</Link>
    <header><h1 className="text-3xl font-bold">Community & Experts</h1><p className="text-gray-600 mt-2">Prepare questions, preserve local knowledge and organize requests for help.</p></header>
    <div className="bg-amber-50 text-amber-900 rounded-xl p-4">This workspace saves drafts locally. It does not publish questions or contact an agriculture officer. Expert verification and automatic escalation are not connected.</div>
    <div className="flex flex-wrap gap-3"><Link className="btn-secondary" to="/friends">Open friends network</Link><Link className="btn-secondary" to="/analyzer">Scan crop first</Link><Link className="btn-secondary" to="/farm-memory">Review farm memory</Link></div>
    <ModuleDraftBoard kind="community" title="Community questions & farm knowledge" />
    <ModuleDraftBoard kind="expert" title="Expert assistance drafts" />
  </div>;
}
