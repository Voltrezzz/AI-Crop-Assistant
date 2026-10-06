# MARUDHAM 360 — Progress State

Updated: 2026-10-05

## Scope and status

Phase 10: verification and fixes — implementation and core local verification completed; production release gates remain open.

The user explicitly authorized Phase 10 verification and fixes and required deployment to remain pending approval. No deployment, push, production migration, or external messaging was performed. Existing uncommitted Phase 1–9 work was preserved. The received handoff is retained in `docs/phase9-handoff-received.md`; its earlier “fully working” claims are superseded by this document.

## Implementation plan and completed changes

1. Repair runtime navigation and local storage before checking downstream flows.
   - Removed literal text between React Router routes and registered marketplace, community, documents and livelihood pages.
   - Added dashboard links and field links to satellite preview and harvest recording.
   - Added Dexie schema version 10 for inventory and sales, retaining existing stores and records.
2. Make the cultivation-to-sale flow safe to retry and honest about its capabilities.
   - Added transactional crop-cycle creation, inventory recording and whole-batch sale recording with account ownership checks.
   - Local mutations and sync outbox entries commit together; duplicate concurrent submissions return the existing record.
   - Prevented multiple active cycles per field; updated field crop, planting date, estimated harvest date and growth stage together.
   - Linked new activities to the active cycle; validated activity dates and costs.
   - Replaced simulated image grading with manual grades. Removed invented buyer prices, fabricated fixed expenses and unsupported net-profit claims.
   - Restored explicitly selected demo accounts within the browser tab session and linked completed cycles to their saved harvest records.
   - Resumed saved inventory/sale records after reload. Displayed actual recorded revenue and cycle activity costs, with incomplete-expense disclosure.
3. Correct sync isolation and relationships.
   - Added crop cycles, inventory and sales to the supported sync entities.
   - Assigned stable parent UUIDs, queued newly identified parents first, stripped device-local relationship IDs from uploads, and restored relations during hydration.
   - Rejected local/cloud account mismatch, serialized concurrent processing, preserved pending local changes during hydration, and stopped processing after upload failure.
   - Removed unsafe reconciliation that assumed another device's numeric record ID referred to the same local record.
   - Added sync errors and manual retry in Settings; successful-sync status is account scoped and only set after success.
4. Correct misleading prototype interactions and data handling.
   - Document uploads validate size, MIME type and signature; failures are shown; deletion checks ownership and requests confirmation.
   - Removed fake expiring share links. Documents are explicitly browser-local; cloud backup/sharing are not connected.
   - Disabled unconnected expert submission, marketplace booking/request and product-listing actions.
   - Clearly labelled community participants, livelihood estimates, scheme references and satellite data as previews or samples.
   - GeoJSON imports validate a single polygon, convert longitude/latitude for Leaflet and update the existing owned boundary. Esri imagery attribution is corrected; sample dates are fixed.
5. Verify and prepare a reviewable handoff.
   - Added `npm test` with IndexedDB and mocked-cloud regression tests.
   - Fixed lint errors, including loader declaration order, mutable chat messages, unused imports and render-time sample-date generation.
   - Kept three narrowly documented React compiler lint exceptions for reused IndexedDB loaders. The unused source-generating legacy script is explicitly outside app lint scope; it was not executed.
   - Restored production minification. Applied compatible dependency audit updates without forcing major migrations.

## Verification evidence

- Baseline production build: passed, but did not detect the runtime route text or missing database stores.
- Production build after the main fixes: passed, including TypeScript compilation and PWA generation. Precache: 122 entries, 13,070.93 KiB (baseline: 16,167.46 KiB). Large-chunk and mixed static/dynamic import warnings remain.
- Final production rebuild, including the browser-discovered demo-session fix: passed. An earlier attempt was temporarily blocked by approval-review quota; the later authorized retry completed.
- Latest `npm run lint`: passed with zero errors or warnings.
- `npm test`: 12 tests passed. Uses fake-indexeddb and a mocked Supabase client, not a live backend.
- Browser access recovered after initial request-header policy errors. Verified on the final local production build: demo sign-in/profile selection; crop planning and field date/stage updates; activity cost recording; inventory creation; whole-batch sale; completed-cycle navigation; reload persistence; document locker upload of a synthetic PNG; community, marketplace, livelihood and Settings routes; and honest unavailable-cloud status.
- Sale evidence: 5 quintals × INR 2,000 = INR 10,000 revenue; recorded cycle activity cost INR 500; difference INR 9,500. Screenshot: `docs/phase10-harvest-verification.png`.
- At the 390 × 844 mobile breakpoint, the sale page rendered and document scroll width equalled viewport width (390 px). This is a focused check, not a full mobile-device matrix.
- Origin-outage check: stopped the local preview server and reloaded the saved sale page successfully. Browser network remained enabled, so full network-offline operation and external-service behavior are not certified.
- A stale lazy-module error occurred while rebuilding underneath a running preview server. Restarting the preview against the current build and reloading resolved it. Production update-transition behavior still needs a separate check.
- `npm audit fix`: compatible updates reduced advisories from 12 to 10 (6 high, 4 moderate). Remaining dependency chains include Tailwind/braces, Vite/esbuild/PWA and React Router. Reported fixes require major-version changes and remain release work.

The regression suite covers schema upgrade retention; concurrent harvest/sale idempotency; reopen persistence; invalid inputs; cross-account rejection; inventory and sale rollback on outbox failure; active-cycle uniqueness; field date updates; stable relationship identities; GeoJSON validation; cloud account mismatch; concurrent sync deduplication; and cross-device hydration with pending-local-edit protection.

## Remaining release gates and limitations

- Broaden browser checks beyond the verified core journey, including fresh field creation, invalid forms, unavailable IDs and update transitions.
- Finish document download/delete and invalid-file UI checks, satellite polygon-import UI, and voice/microphone behavior. Document upload and route navigation were checked.
- Check installation, first-load model caching and offline reload using an isolated browser origin. Maps, external translation/fonts, cloud auth and remote APIs are not guaranteed offline.
- Configure an authorized test Supabase environment and verify sign-in, RLS, account switching, offline retry and cross-device sync. No live credentials or production migrations were used.
- Cloud deletion propagation and multi-device conflict resolution are still limited; no tombstone protocol exists. Older cloud child records lacking stable parent identifiers may need repair.
- Migrate remaining vulnerable dependency chains with regression checks before production release.
- Crop-planning estimates are illustrative. The ML classifier is not validated as a general non-plant detector; no new accuracy or field-evaluation claim is made. Satellite observations and produce grading are not live AI integrations.
- Community posts and saved livelihood selections remain session previews. Marketplace matching, verified expert routing, document cloud sharing and consumer sales are not implemented services.
- Deployment requires the user's approval after these gates have been reviewed.

## Next continuation

Read this file and inspect the existing working tree without resetting it. Continue the remaining release gates and broader browser verification. The final build, lint, core journey and 12 regression tests have passed. Do not treat the historical Phase 9 handoff as proof of tested functionality. Keep deployment pending explicit approval and update this file with actual results.


## Continuation — 6 October 2026

- Upgraded Vite to 7.3.6, React plugin to 5.2.0, PWA plugin to 2.0.0, and React Router to 7.18.4. Declared esbuild explicitly for the test runner. Preserved the previous browser build targets.
- Deployment workflow now uses Node 22 and runs lint and tests before building; no workflow or deployment was triggered.
- Voice assistant now maps regional speech locales, cancels delayed responses on navigation/unmount, reports recognition errors and provides direct manual command navigation. Spoken command matching remains English; microphone behavior has not been browser verified.
- Added transactional field creation with positive finite area, valid ordered dates, required trimmed text, local-account validation and rollback if outbox creation fails. Added visible save errors, submission state and accessible field labels.
- Extracted the document signature/size validator and tested unsupported, empty, oversized and mismatched files.
- Regression suite: 15 tests passed. Lint passed before the final type-narrowing/test-import-order adjustments; production rebuild was still running at handoff.
- Latest npm audit after compatible fixes: 10 advisories (5 high, 5 moderate). Remaining chains involve Tailwind 3/braces/selector parser and TensorFlow/argparse/sprintf-js. Major Tailwind migration and the audit-suggested TensorFlow downgrade were not forced.
- Native browser automation was stopped by the user with physical Escape before the new browser checks began. No further Computer Use calls were made. Fresh field UI, document download/delete, satellite import, voice behavior and production update transitions remain unverified.
- Deployment remains pending explicit approval. Preserve all existing changes and resume from this handoff.


## Presentation modules — 6 October 2026

The user requested the presentation features as separate menu options and clarified that independent features should have ten sidebar entries. Added all ten entries to desktop/sidebar mobile drawer, plus /marudham360 overview. New health, offline status, farm memory, post-harvest and finance views read this account's records. Added schema 11 for persistent local community/expert/marketplace/enterprise drafts, retained existing records and enabled saved enterprise ideas. New document contents use passphrase-based local encryption; legacy documents remain unencrypted. Tamil and English fixed voice phrases now match routes, with a typed fallback. No real expert dispatch, bookings, CV produce grading or live Sentinel ingestion was invented.

Final production build passed (122 precache entries, 12,416.60 KiB); lint and git diff --check passed. 24 regression/DOM tests passed. Menu destinations, mobile drawer, draft remount/account isolation, memory/finance rendering, typed Tamil commands, schema retention and encrypted-document recovery/tamper rejection were checked. DOM tests do not replace full visual browser testing or live microphone/backend checks. Deployment remains forbidden by the user's current instruction.

Details and limitations are in docs/sih2026-modules.md. Previous schema 10 and English-only voice notes above are superseded. All existing changes are preserved; do not reset the working tree.


## Integrated menu and real satellite feature — 6 October 2026

The user rejected the separate SIH grouping and requested the satellite feature. Removed that sidebar grouping and overview button, distributing the ten features among existing categories and adding Satellite Monitoring under Crop Health. Added direct /farm-memory, /health-alerts, /offline, /post-harvest, /finance and /satellite routes; previous routes remain compatible. Removed SIH wording from the overview page header.

Replaced fixed mock Sentinel observations with public Sentinel-2 STAC search, dated scenes, cloud metadata, PNG NDVI imagery and polygon-clipped statistics. The actual imported boundary is required; no sample Chennai location is substituted. Applied processing-baseline correction using provider metadata (1000 DN offset for baseline 04.00+) and versioned cached statistics. Added schema 12 for account/field-scoped scene metadata and stats, with local export and boundary-change invalidation. Boundary save/outbox operations are atomic. Coordinate transmission, network dependence, unmasked cloud risk and NDVI interpretation limits are visible.

Live API checks with a synthetic polygon verified scene metadata, baseline 05.13, HTTP 200 PNG output, CORS '*', and real polygon statistics. Evidence in docs/satellite-api-verification.json. This is not an assessment of a user's field. DOM tests stub map rendering; no native browser raster or live microphone certification is claimed. Details in docs/sih2026-modules.md supersede the previous sample-satellite notes.

Final checks: 28 tests, lint, production build and git diff --check passed. Existing large-chunk/mixed-import warnings and unrelated dependency advisories remain. No deployment, push, production backend configuration, external message or production migration was performed.

## Location-first satellite preview — 6 October 2026

The user requested an easier-to-find satellite preview based on location instead of requiring JSON. Added a large dashboard shortcut and moved Satellite Monitoring immediately below Dashboard in the sidebar/mobile drawer. The default page supports place search (Photon/OpenStreetMap), current location with browser permission, and clicking the map. No saved field or JSON is needed. It analyses an explicitly labelled 200 m, 500 m or 1 km square centred on the selected point; it does not replace or invent an owned field boundary. The newest Sentinel-2 scene, map and statistics load with one button, and the page scrolls to the resulting map. Exact boundaries and date/cloud filters remain under Advanced.

Location previews remain on the current page and can be exported; they do not enter field-boundary cloud sync. Provider transmission and approximate-area interpretation are disclosed. Permission denial and unavailable place search offer map selection instead. No geolocation permission was granted during agent verification.

31 regression/DOM tests passed, including no-field/no-JSON place selection, newest-scene loading, denied geolocation fallback and coordinate/area validation. Lint and build passed. In the fresh local production preview, real Thanjavur place lookup returned results, and the latest 3 October Sentinel-2 observation rendered with mean NDVI 0.388 and 2,652 valid pixels for the selected 500 m square. This is a public place preview, not an assessment of the user's farm. The old local preview origin had stale service-worker chunks; verification used a fresh origin.

Deployment is now authorized by the user's explicit instruction to deploy. The first prototype deployment merged PR #1 and passed GitHub Actions; this location improvement is the next authorized update.

## Vegetation display and comparison — 6 October 2026

User reported seeing ordinary imagery instead of the vegetation signal. The observed page showed only Esri background and no loaded Sentinel scene, yet still displayed an NDVI legend. Map clicks could also replace the selected point and clear an existing preview. Fixed both: background-only status is explicit with a direct Load vegetation colours button, the NDVI legend is shown on the map only when its layer is selected, and loaded maps do not change location unless the user chooses Change location on map.

Vegetation colours is now the default loaded display at full opacity with no Esri layer underneath. Separate aerial-background and blended modes are available, with blend opacity and recenter controls. Tile-load/error callbacks distinguish loaded colour tiles from unavailable data. Added observation age, scene cloud cover, analysed-area dimensions, earlier-date NDVI map/mean comparison for the same geometry, and CSV export of actual available statistics. Comparisons are labelled as observations, not disease or treatment conclusions; missing and same-date data are not converted into invented change values.

All 33 regression/DOM tests passed, including loaded-map click preservation, explicit location changes, layer switching, matching comparison geometry, and missing-data/date checks. Lint and production build passed. Deployment authorization from the user's instruction to deploy remains in effect. Preserve generated tsconfig.tsbuildinfo changes outside commits.
- Browser verification: real public Thanjavur Sentinel-2 tiles rendered in vegetation-only mode; earlier 2026-09-26 NDVI 0.519 versus 2026-10-03 NDVI 0.388 (change -0.131). Background/blend controls and loaded-map click retention passed. Mobile 390px viewport had no horizontal overflow. No private GPS location used for agent requests.
