import { createElement, useEffect } from 'react';
export default function SatelliteMapMock({ onPick, onTileReady, tileUrl, view = 'vegetation' }: {onPick?: (lat:number,lng:number)=>void; onTileReady?:()=>void; tileUrl?:string; view?:string}) {
  useEffect(() => { if (tileUrl && view !== 'background') onTileReady?.(); },[tileUrl,view,onTileReady]);
  return createElement('div',null,createElement('p',null,'Map rendering stub for DOM tests'),createElement('button',{onClick:()=>onPick?.(13.082,80.27)},'Tap selected map'));
}
