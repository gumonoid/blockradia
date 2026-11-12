import {Resvg} from '@resvg/resvg-js';
import {fileURLToPath} from 'node:url';

const font=fileURLToPath(new URL('../lib/assets/report-font.ttf',import.meta.url));
export function renderPNG(svg){
 if(typeof svg!=='string'||svg.length>2_000_000)throw Error('Invalid chart');
 const image=new Resvg(svg,{font:{fontFiles:[font],loadSystemFonts:false,defaultFontFamily:'BlockRadia Report'},fitTo:{mode:'width',value:1600}});
 return image.render().asPng();
}
