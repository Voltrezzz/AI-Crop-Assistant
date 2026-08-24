import { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, FlaskConical, Leaf } from 'lucide-react';

type AreaUnit = 'acres' | 'hectares';
type NutrientKey = 'nitrogen' | 'phosphate' | 'potash';

const PRODUCT_GRADES = {
  ureaNitrogen: 0.46,
  dapNitrogen: 0.18,
  dapPhosphate: 0.46,
  mopPotash: 0.60,
} as const;

const round = (value: number) => Math.round(value * 10) / 10;

export default function FertilizerCalculatorPage() {
  const [crop, setCrop] = useState<'Paddy' | 'Wheat'>('Paddy');
  const [area, setArea] = useState(1);
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('acres');
  const [targets, setTargets] = useState<Record<NutrientKey, string>>({ nitrogen: '', phosphate: '', potash: '' });
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');

  const result = useMemo(() => {
    const totalNitrogen = Number(targets.nitrogen) * area;
    const totalPhosphate = Number(targets.phosphate) * area;
    const totalPotash = Number(targets.potash) * area;
    const dap = totalPhosphate / PRODUCT_GRADES.dapPhosphate;
    const nitrogenFromDap = dap * PRODUCT_GRADES.dapNitrogen;
    const remainingNitrogen = Math.max(0, totalNitrogen - nitrogenFromDap);

    return {
      totalNitrogen: round(totalNitrogen),
      totalPhosphate: round(totalPhosphate),
      totalPotash: round(totalPotash),
      dap: round(dap),
      urea: round(remainingNitrogen / PRODUCT_GRADES.ureaNitrogen),
      mop: round(totalPotash / PRODUCT_GRADES.mopPotash),
      nitrogenFromDap: round(nitrogenFromDap),
      excessNitrogen: round(Math.max(0, nitrogenFromDap - totalNitrogen)),
    };
  }, [area, targets]);

  const updateTarget = (key: NutrientKey, value: string) => {
    if (value !== '' && Number(value) < 0) return;
    setTargets(current => ({ ...current, [key]: value }));
    setShowResult(false);
  };

  const calculate = () => {
    if (!Number.isFinite(area) || area <= 0) {
      setError('Enter a field area greater than zero.');
      return;
    }
    if (Object.values(targets).every(value => Number(value) === 0)) {
      setError('Enter the N, P₂O₅, and K₂O rates from your Soil Health Card or local recommendation.');
      return;
    }
    setError('');
    setShowResult(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 md:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
          <Calculator className="text-green-600" /> Fertilizer Calculator
        </h1>
        <p className="mt-1 text-gray-500">Convert a soil-test nutrient recommendation into approximate fertilizer product quantities.</p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <p>This is an arithmetic conversion tool, not a fertilizer prescription. Enter rates from a Soil Health Card, soil laboratory, or qualified local agronomist and verify the analysis printed on each fertilizer bag.</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Crop
            <select value={crop} onChange={event => setCrop(event.target.value as 'Paddy' | 'Wheat')} className="mt-2 w-full rounded-xl border bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-green-500">
              <option value="Paddy">Paddy (Rice)</option>
              <option value="Wheat">Wheat</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Field area
            <input type="number" min="0.01" step="0.01" value={area} onChange={event => { setArea(Number(event.target.value)); setShowResult(false); }} className="mt-2 w-full rounded-xl border bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-green-500" />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Area unit
            <select value={areaUnit} onChange={event => { setAreaUnit(event.target.value as AreaUnit); setShowResult(false); }} className="mt-2 w-full rounded-xl border bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-green-500">
              <option value="acres">Acres</option>
              <option value="hectares">Hectares</option>
            </select>
          </label>
        </div>

        <div className="mt-6">
          <h2 className="font-bold text-gray-900">Recommended nutrient rate from your soil test</h2>
          <p className="mt-1 text-xs text-gray-500">Enter kilograms per {areaUnit === 'acres' ? 'acre' : 'hectare'}.</p>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            {([
              ['nitrogen', 'Nitrogen (N)'],
              ['phosphate', 'Phosphate (P₂O₅)'],
              ['potash', 'Potash (K₂O)'],
            ] as const).map(([key, label]) => (
              <label key={key} className="text-sm font-medium text-gray-700">
                {label}
                <input type="number" min="0" step="0.1" value={targets[key]} onChange={event => updateTarget(key, event.target.value)} className="mt-2 w-full rounded-xl border bg-gray-50 p-3 outline-none focus:ring-2 focus:ring-green-500" />
              </label>
            ))}
          </div>
        </div>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end">
          <button onClick={calculate} className="rounded-xl bg-green-600 px-8 py-3 font-medium text-white transition hover:bg-green-700">Calculate quantities</button>
        </div>
      </div>

      {showResult && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <h2 className="flex items-center gap-2 font-bold text-blue-900"><FlaskConical size={20} /> {crop} nutrient totals for {area} {areaUnit}</h2>
            <p className="mt-2 text-sm text-blue-800">N: <b>{result.totalNitrogen} kg</b> · P₂O₅: <b>{result.totalPhosphate} kg</b> · K₂O: <b>{result.totalPotash} kg</b></p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ['DAP (18-46-0)', result.dap, 'Supplies all entered P₂O₅ and part of N'],
              ['Urea (46% N)', result.urea, `Supplies N remaining after ${result.nitrogenFromDap} kg N from DAP`],
              ['MOP (60% K₂O)', result.mop, 'Supplies the entered K₂O target'],
            ].map(([label, amount, detail]) => (
              <div key={String(label)} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{amount} kg</p>
                <p className="mt-2 text-xs text-gray-500">{detail}</p>
              </div>
            ))}
          </div>

          {result.excessNitrogen > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              DAP would exceed the entered nitrogen target by {result.excessNitrogen} kg. Ask an agronomist about a phosphorus source with less or no nitrogen rather than applying this combination unchanged.
            </div>
          )}

          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <h3 className="flex items-center gap-2 font-bold text-green-900"><Leaf size={19} /> Organic nutrient sources</h3>
            <p className="mt-2 text-sm text-green-800">Manure, compost, and biofertilizer nutrient content varies widely, so this calculator does not fabricate an equivalent quantity. Use a laboratory analysis or local recommendation before subtracting their nutrient contribution.</p>
          </div>
        </div>
      )}
    </div>
  );
}
