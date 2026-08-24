import { ShieldAlert } from 'lucide-react';

/** Kept as a safe placeholder for old imports; /admin is route-disabled in App.tsx. */
export default function AdminPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-6 text-center">
      <ShieldAlert className="mb-4 h-12 w-12 text-amber-600" />
      <h1 className="text-2xl font-bold text-gray-900">Admin access disabled</h1>
      <p className="mt-3 text-gray-600">
        Marudham 360 does not expose an admin dashboard until a trusted server-managed role system is configured.
      </p>
    </div>
  );
}
