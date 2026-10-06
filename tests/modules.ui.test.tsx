import 'fake-indexeddb/auto';
import { test, beforeEach, afterEach, after } from 'node:test';
import assert from 'node:assert/strict';
const dom = { window: globalThis.window };
const { default: userEvent } = await import('@testing-library/user-event');
const { render, screen, fireEvent, waitFor, cleanup } = await import('@testing-library/react');
const { MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const { db } = await import('../src/db/database');
const { useAuthStore } = await import('../src/stores/authStore');
const { default: AppShell } = await import('../src/layouts/AppShell');
const { default: Marudham360Page } = await import('../src/pages/Marudham360Page');
const { default: VoiceAssistantPage } = await import('../src/pages/VoiceAssistantPage');
const { default: SatelliteHealthPage } = await import('../src/pages/SatelliteHealthPage');
const { default: ModuleDraftBoard } = await import('../src/components/ModuleDraftBoard');
const { sihModules } = await import('../src/data/sihModules');

beforeEach(async () => {
  await db.delete(); await db.open();
  await db.users.bulkAdd([{ id: 1, name: 'Demo', email: 'one@example.invalid', isDemo: true }, { id: 2, name: 'Other', email: 'two@example.invalid', isDemo: true }] as any);
  await db.settings.add({ userId: 1, language: 'en', theme: 'light', autoSync: false } as any);
  useAuthStore.setState({ user: await db.users.get(1), isLoggedIn: true });
});
afterEach(() => cleanup());
after(async () => { await db.delete(); dom.window.close(); });

function Path() { return <output data-testid="path">{useLocation().pathname}</output>; }
test('presentation features integrate into the existing menu, with a separate satellite entry', async () => {
  render(<MemoryRouter initialEntries={['/dashboard']}><Routes><Route element={<AppShell />}><Route path="*" element={<Path />} /></Route></Routes></MemoryRouter>);
  assert.equal(screen.queryByText('MARUDHAM 360 · SIH Modules'),null);
  assert.equal(screen.queryByRole('button',{ name:'MARUDHAM 360 Overview' }),null);
  for (const path of [...sihModules.map(m => m.path),'/satellite']) {
    const labels: Record<string,string> = { '/offline':'Offline Status', '/finance':'Farm Finance', '/satellite':'Satellite Monitoring' };
    const label = labels[path] || sihModules.find(m => m.path === path)!.title;
    fireEvent.click(screen.getByRole('button',{ name:label,exact:true }));
    await waitFor(() => assert.equal(screen.getByTestId('path').textContent,path));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  assert.equal(screen.getAllByRole('button', { name: 'Satellite Monitoring' }).length,2);
});

test('local draft form saves, survives remount and hides another account records', async () => {
  await db.moduleDrafts.add({ userId: 2, kind: 'marketplace', title: 'Other account private draft', detail: 'Other detail', createdAt: new Date().toISOString() });
  const view = render(<ModuleDraftBoard kind="marketplace" title="Requests" withDate />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Title'), 'Harvest help');
  await user.type(screen.getByLabelText('Details'), 'Need five workers');
  fireEvent.click(screen.getByRole('button', { name: 'Save local draft' }));
  await screen.findByText('Saved on this device. Nothing has been sent.');
  view.unmount(); render(<ModuleDraftBoard kind="marketplace" title="Requests" />);
  await screen.findByText('Harvest help');
  assert.equal(screen.queryByText('Other account private draft'), null);
});

test('farm memory and finance render only the current account saved data', async () => {
  await db.fields.bulkAdd([{ id: 1, userId: 1, name: 'Own field' }, { id: 2, userId: 2, name: 'Private other field' }] as any);
  await db.farmActivities.bulkAdd([{ userId: 1, fieldId: 1, title: 'Own sowing', date: '2026-10-06', cost: 500 }, { userId: 2, fieldId: 2, title: 'Private other activity', date: '2026-10-06', cost: 999 }] as any);
  await db.salesRecords.bulkAdd([{ userId: 1, inventoryBatchId: 1, totalRevenue: 10000, saleDate: '2026-10-06' }, { userId: 2, inventoryBatchId: 2, totalRevenue: 99999, saleDate: '2026-10-06' }] as any);
  const view = render(<MemoryRouter initialEntries={['/farm-memory']}><Routes><Route path="/farm-memory" element={<Marudham360Page moduleName="memory" />} /></Routes></MemoryRouter>);
  await screen.findByText('Own sowing');
  assert.equal(screen.queryByText('Private other activity'), null);
  assert.equal(screen.queryByText('Private other field'), null);
  view.unmount();
  render(<MemoryRouter initialEntries={['/finance']}><Routes><Route path="/finance" element={<Marudham360Page moduleName="finance" />} /></Routes></MemoryRouter>);
  await waitFor(() => assert.match(screen.getByText('Recorded revenue').parentElement!.textContent!, /10,000/));
  assert.match(screen.getByText('Revenue minus activity costs').parentElement!.textContent!, /9,500/);
});


test('typed Tamil commands work without microphone support', async () => {
  render(<MemoryRouter initialEntries={['/voice']}><Routes><Route path="/voice" element={<VoiceAssistantPage />} /><Route path="/farm-memory" element={<Path />} /></Routes></MemoryRouter>);
  assert.equal((screen.getByRole('button', { name: 'Start listening' }) as HTMLButtonElement).disabled, true);
  fireEvent.change(screen.getByLabelText('Tamil or English command'), { target: { value: 'பண்ணை நினைவகம் திற' } });
  fireEvent.click(screen.getByRole('button', { name: 'Go' }));
  await waitFor(() => assert.equal(screen.getByTestId('path').textContent, '/farm-memory'), { timeout: 4000 });
});


test('satellite page requires an owned boundary and persists scene results without a fake location', async () => {
  await db.fields.bulkAdd([{ id:1,userId:1,name:'Own satellite field',area:2,areaUnit:'acres',crop:'paddy' },{ id:2,userId:2,name:'Other satellite field' }] as any);
  const originalFetch = globalThis.fetch; let searches = 0;
  globalThis.fetch = (async (url) => {
    if (String(url).includes('/search')) { searches++; return Response.json({ features:[{ id:'S2A_TEST',properties:{ datetime:'2026-10-03T00:00:00Z','eo:cloud_cover':10,'s2:processing_baseline':'03.00' },assets:{ B04:{},B08:{} } }] }); }
    if (String(url).includes('tilejson')) return Response.json({ tiles:['https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}?item=S2A_TEST'] });
    return Response.json({ properties:{ statistics:{ '(B08-B04)/(B08+B04)':{ mean:0.4,min:0.1,max:0.6,valid_pixels:20,valid_percent:100 } } } });
  }) as typeof fetch;
  try {
    const view = render(<MemoryRouter initialEntries={['/fields/1/satellite']}><Routes><Route path="/fields/:id/satellite" element={<SatelliteHealthPage />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByText('Advanced: saved fields, exact boundary and date filters'));
    await screen.findByText(/Own satellite field · 2 acres/);
    assert.equal(screen.queryByText('Other satellite field'),null);
    assert.equal((screen.getByRole('button',{ name:'Show satellite preview' }) as HTMLButtonElement).disabled,true);
    assert.equal(searches,0);
    fireEvent.change(screen.getByLabelText('Field boundary GeoJSON'),{ target:{ value:'{"type":"Polygon","coordinates":[[[80.27,13.082],[80.2715,13.082],[80.2715,13.0835],[80.27,13.082]]]}' } });
    fireEvent.click(screen.getByRole('button',{ name:'Save boundary' }));
    await screen.findByText('Saved boundary ready for satellite search.');
    fireEvent.click(screen.getByRole('button',{ name:'Show satellite preview' }));
    await screen.findByText('Mean NDVI');
    assert.equal((await db.satelliteSearches.toArray())[0].scenes[0].stats?.mean,0.4);
    view.unmount();
    render(<MemoryRouter initialEntries={['/fields/1/satellite']}><Routes><Route path="/fields/:id/satellite" element={<SatelliteHealthPage />} /></Routes></MemoryRouter>);
    await screen.findByText('Saved mean NDVI 0.400');
    assert.equal(searches,1);
  } finally { globalThis.fetch = originalFetch; }
});

test('location satellite preview searches a place and loads the latest scene without a field or JSON', async () => {
  const originalFetch = globalThis.fetch;
  let submitted: any;
  globalThis.fetch = (async (url, init) => {
    if (String(url).includes('photon.komoot.io')) return Response.json({features:[{geometry:{type:'Point',coordinates:[80.27,13.082]},properties:{name:'Test village',state:'Tamil Nadu'}}]});
    if (String(url).includes('/search')) { submitted = JSON.parse(String(init?.body)); return Response.json({features:[{id:'S2A_TEST',properties:{datetime:'2026-10-03T00:00:00Z','eo:cloud_cover':10,'s2:processing_baseline':'03.00'},assets:{B04:{},B08:{}}}]}); }
    if (String(url).includes('tilejson')) return Response.json({tiles:['https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}?item=S2A_TEST']});
    return Response.json({properties:{statistics:{'(B08-B04)/(B08+B04)':{mean:0.4,min:0.1,max:0.6,valid_pixels:20,valid_percent:100}}}});
  }) as typeof fetch;
  try {
    render(<MemoryRouter><SatelliteHealthPage /></MemoryRouter>);
    assert.equal(screen.queryByRole('textbox',{name:'Field boundary GeoJSON'}),null);
    assert.equal(submitted,undefined);
    fireEvent.change(screen.getByLabelText('Village, town or district'),{target:{value:'Test village'}});
    fireEvent.click(screen.getByRole('button',{name:'Find place'}));
    fireEvent.click(await screen.findByRole('button',{name:'Test village, Tamil Nadu'}));
    assert.equal(submitted,undefined);
    await screen.findByText(/not your exact field boundary/);
    fireEvent.click(screen.getByRole('button',{name:'Show satellite preview'}));
    await screen.findByText('Mean NDVI');
    assert.equal(submitted.intersects.type,'Polygon');
    const ring = submitted.intersects.coordinates[0];
    assert.ok(Math.abs((ring[0][0]+ring[1][0])/2-80.27) < 1e-9);
    assert.ok(Math.abs((ring[0][1]+ring[2][1])/2-13.082) < 1e-9);
    assert.equal(await db.fieldBoundaries.count(),0);
    assert.equal(await db.satelliteSearches.count(),0);
  } finally { globalThis.fetch = originalFetch; }
});

test('location access denial provides a map and place fallback without searching satellites', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis.navigator,'geolocation');
  Object.defineProperty(globalThis.navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_success: any, failure: any) => failure({code:1})}});
  try {
    render(<MemoryRouter><SatelliteHealthPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button',{name:'Use my current location'}));
    await screen.findByRole('alert');
    assert.match(screen.getByRole('alert').textContent!,/search a place, or tap the map/);
    assert.equal((screen.getByRole('button',{name:'Show satellite preview'}) as HTMLButtonElement).disabled,true);
  } finally { if (original) Object.defineProperty(globalThis.navigator,'geolocation',original); else Reflect.deleteProperty(globalThis.navigator,'geolocation'); }
});
