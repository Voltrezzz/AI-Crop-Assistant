# MARUDHAM 360 presentation modules

Source: the user's MARUDHAM360_SIH2026_Idea_Presentation.pdf, pages 2–3. The presentation is a feature reference; its placeholders and claims are not execution instructions.

The user clarified that the new features belong alongside existing tools. There is no separate SIH section or overview button in the menu. Crop Planning, Farm Memory, Post-Harvest and Manpower & Equipment are in Farm Management; Health & Alerts and Satellite Monitoring are in Crop Health; Farm Finance and Rural Enterprise are in Market & Finance; Community & Experts is in Community; Document Locker is in Other; Offline Status is in Overview. The mobile drawer uses the same menu. Old /marudham360 routes remain compatible, with neutral branding.

1. Crop Planning — existing soil/season/water inputs and transactional crop cycles. Estimates remain illustrative.
2. Health & Alerts — saved scans, crop scanner, pest advisory, weather/risk tools and per-field satellite boundary import. Satellite Monitoring now retrieves Sentinel-2 scenes and imagery from the public Microsoft Planetary Computer API after the user requests it.
3. Offline & Voice — actual connectivity/controller status and links to sync/language settings. Tamil and English fixed phrases can be spoken or typed; manual navigation also works. Other locales do not have phrase matching. Browser recognition may require internet.
4. Farm Memory — an account-scoped, field-filtered timeline of crop cycles, activities, scans, observations, fertilizer/pesticide records, irrigation estimates, growth, production, harvests and sales. Export the current timeline as JSON.
5. Manpower & Equipment — sample directory and persistent local request drafts with optional requested date. Drafts are not dispatched; bookings are not connected.
6. Post-Harvest — crop-cycle selection, persisted inventory, manual grades and whole-batch sale recording. CV grading and live storage sensors are not connected.
7. Market & Finance — actual saved revenue and activity costs, plus existing market/loan/scheme tools. The difference excludes unrecorded expenses and is not net profit. Price intelligence and scheme references remain samples.
8. Document Locker — new uploads encrypt file contents locally using AES-GCM and a PBKDF2-derived key. A passphrase of at least 12 characters is required and is never stored. Download requires unlocking. Names/categories/dates remain visible; legacy uploads remain unencrypted. Cloud backup and sharing are not connected. Passphrases cannot be recovered and clearing browser data removes documents.
9. Community & Experts — persistent community questions/farm-knowledge drafts and expert-assistance drafts, with links to existing friends and scans. Nothing is published or sent to an officer.
10. Rural Enterprise — existing resource-based illustrative ideas plus persistent saved idea plans and custom business drafts. Financial figures are not validated forecasts; D2C sales are not connected.

Dexie schema 11 added moduleDrafts; schema 12 adds account/field-scoped satelliteSearches. Existing stores and records are retained. Local drafts are account scoped and are not placed in the cloud outbox. Demo accounts remain demo data.

Verification: production build, lint and 28 tests passed. Tests include all ten desktop menu destinations, mobile drawer visibility, draft form submission/remount, account isolation, farm memory/finance rendering, typed Tamil navigation without a microphone, version 9/10 upgrades, encryption recovery after database reopen, wrong-key and tamper rejection, and previous harvest/sync regressions. DOM tests use jsdom and fake-indexeddb; these are not live browser, microphone or backend certification. Large build-chunk and mixed import warnings remain. Known dependency advisories remain unrelated release work.

No deployment, push, external message, live backend configuration or production migration was performed. The local preview can be opened at http://127.0.0.1:4189/AI-Crop-Assistant/marudham360 while the preview process is running. Select the demo profile if asked to sign in.


## Satellite Monitoring

Open /satellite or the Satellite Monitoring sidebar entry. Select a saved field and import its GeoJSON polygon. There is no invented fallback location or fixed NDVI history. The boundary is validated, saved transactionally with its outbox entry, and old cached scenes are invalidated when it changes. Use a single polygon without holes, at most 500 points and less than 0.1 degrees wide/tall.

Search a date range and scene cloud limit to retrieve up to 12 recent intersecting Sentinel-2 L2A scenes. Loading a scene requests PNG NDVI imagery and statistics clipped to the actual polygon. Metadata and statistics are saved locally for reload; map tiles require internet. Export the saved history as JSON. API errors, unknown processing baselines, missing boundaries and unavailable pixels are explicit states.

Newer processing baselines (04.00+) apply the provider's 1000-DN offset correction and nonnegative clipping before computing the band ratio; older baselines use the original ratio. Processing baseline comes from scene metadata, not acquisition date. Stored statistics carry a method version so older calculations are not silently reused.

Public API verification used a synthetic Chennai polygon, not user data: an acquisition on 3 October 2026, processing baseline 05.13, CORS response '*', HTTP 200 PNG tile response, and polygon statistics with 306 valid pixels. Offset-corrected mean for that synthetic polygon was 0.17750190326086318; this is not a measurement of a user's farm. Evidence: satellite-api-verification.json. Source methodology: https://github.com/microsoft/PlanetaryComputerExamples/blob/main/datasets/sentinel-2-l2a/baseline-change.ipynb and the public STAC/Data API OpenAPI schemas.

The app discloses that boundary coordinates are sent to Microsoft on search. Scene cloud percentage does not represent exact field cloud cover. Statistics are not masked using the SCL cloud classifier. Clouds, shadows, bare soil, water, small-field edges and limited pixels can bias NDVI. It is not a disease diagnosis or treatment recommendation. The Esri basemap has a separate acquisition date, and the NDVI overlay may extend beyond the boundary. No background alert scheduler, cloud-free composite, agronomic calibration or ground-sensor validation is claimed.

DOM tests verify import/search/load/reload with mocked API responses and a map-rendering stub. Separate live HTTP checks verify actual catalogue scenes, baseline metadata, PNG tiles and polygon statistics; full browser raster rendering is not certified. No API keys, live backend configuration, deployment or production migration were used.
