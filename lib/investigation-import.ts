const networks = new Set(['bitcoin','ethereum','tron','solana','base','arbitrum','polygon','optimism','ton']);
const address = (v: unknown): v is string => typeof v === 'string' && /^[-a-zA-Z0-9:_]{1,128}$/.test(v) && !Object.hasOwn(Object.prototype,v);
const shortText = (v: unknown, limit: number): v is string => typeof v === 'string' && v.length <= limit;
const coordinate = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1000000;
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : undefined;

export function importInvestigation(json: string, id: string) {
  const project = JSON.parse(json);
  if (!project || !networks.has(project.network) || !address(project.root) ||
      !shortText(project.name,100) || !project.name.trim() || !shortText(project.notes,10000) ||
      !project.nodes || typeof project.nodes !== 'object' || Array.isArray(project.nodes) ||
      !Array.isArray(project.transfers) || project.transfers.length > 800) {
    throw new Error('Invalid investigation');
  }
  const entries = Object.entries(project.nodes);
  if (entries.length > 180) throw new Error('Too many nodes');
  const nodes = Object.fromEntries(entries.map(([key,value]) => {
    const node = value as {id?:unknown; address?:unknown; x?:unknown; y?:unknown} | null;
    if (!node || !address(key) || node.id !== key || !address(node.address) ||
        !coordinate(node.x) || !coordinate(node.y)) throw new Error('Invalid graph node');
    return [key,{id:key,address:node.address,x:node.x,y:node.y}];
  }));
  const transfers = project.transfers.map((row:any) => {
    if (!row || !address(row.from) || !address(row.to) || !shortText(row.id,512) ||
        !shortText(row.hash,128) || !shortText(row.amount,100) || !/^\d+(\.\d+)?$/.test(row.amount) ||
        !shortText(row.symbol,64) || !shortText(row.asset,256) || !['native','token'].includes(row.kind)) {
      throw new Error('Invalid transfer');
    }
    const {id,hash,from,to,amount,symbol,asset,kind} = row;
    return {id,hash,from,to,amount,symbol,asset,kind,timestamp:date(row.timestamp)};
  });
  const names = Object.fromEntries(Object.entries(project.names || {}).filter(([key,value]) =>
    key.startsWith(project.network+':') && address(key.slice(project.network.length+1)) && shortText(value,50)
  ));
  const validNodeIds = (v:unknown) => Array.isArray(v) ? v.filter(key=>address(key)&&Object.hasOwn(nodes,key)).slice(0,180) : [];
  return {
    id, network:project.network, root:project.root, name:project.name, notes:project.notes,
    at:date(project.at)||new Date().toISOString(),
    nodes, transfers, names, expanded:validNodeIds(project.expanded), pinned:validNodeIds(project.pinned),
    zoom:coordinate(project.zoom)&&project.zoom>=0.05&&project.zoom<=10?project.zoom:1,
    pan:coordinate(project.pan?.x)&&coordinate(project.pan?.y)?{x:project.pan.x,y:project.pan.y}:{x:0,y:0},
    bundle:{data:{hash:project.root}, transactions:[], transfers, partial_history:true},
  };
}
