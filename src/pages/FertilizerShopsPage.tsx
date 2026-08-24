import NearbyPlacesMap from '@/components/NearbyPlacesMap';

export default function FertilizerShopsPage() {
  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Nearby Fertilizer Shops</h1>
        <p className="text-gray-500">Find fertilizer and agricultural-input businesses around your current location.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
        <NearbyPlacesMap
          keyword="fertilizer shops agricultural inputs"
          title="Use the search button for live nearby business results based on these coordinates."
          actionLabel="Search Nearby Fertilizer Shops"
        />
      </div>
    </div>
  );
}
