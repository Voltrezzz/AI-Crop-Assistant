import 'fake-indexeddb/auto';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/AI-Crop-Assistant/', pretendToBeVisual: true });
Object.assign(dom.window, { indexedDB: globalThis.indexedDB, IDBKeyRange: globalThis.IDBKeyRange });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, localStorage: dom.window.localStorage, sessionStorage: dom.window.sessionStorage });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
