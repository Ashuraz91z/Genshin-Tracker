export const elements=['Pyro','Hydro','Anémo','Électro','Cryo','Géo','Dendro'];
export function elementName(element='') {
  return ({Anemo:'Anémo',Electro:'Électro',Geo:'Géo'})[element]??element;
}
export function inventoryItems(data,catalogue,category) {
  const entries=category==='materials'?Object.entries(data.materials).map(([key,count])=>({key,count})):data[category];
  return entries.map((item,index)=>{
    const reference=catalogue[category]?.[item.setKey??item.key]??{};
    const piece=reference.pieces?.[item.slotKey];
    return {...item,id:index,name:piece?.name??reference.name??item.key??item.setKey,setName:item.setKey?(reference.name??item.setKey):'',rarity:item.rarity??reference.rarity??0,image:piece?.image??reference.image,weapon:reference.weapon};
  });
}
export function filterInventory(items,{search='',rarity='',set='',slot='',equipped='',sort='level',minLevel='',maxLevel=''}={}) {
  const query=search.trim().toLocaleLowerCase('fr');
  return items.filter(item=>(!query||`${item.name} ${item.setName}`.toLocaleLowerCase('fr').includes(query))&&
    (!rarity||String(item.rarity)===rarity)&&(!set||item.setKey===set)&&(!slot||item.slotKey===slot)&&
    (!equipped||(equipped==='none'?!item.location:equipped==='any'?!!item.location:item.location===equipped))&&
    (minLevel===''||(item.level!==undefined&&item.level>=Number(minLevel)))&&
    (maxLevel===''||(item.level!==undefined&&item.level<=Number(maxLevel))))
    .sort((a,b)=>{
      if(sort==='name')return a.name.localeCompare(b.name,'fr');
      if(sort==='set')return a.setName.localeCompare(b.setName,'fr')||(b.level??0)-(a.level??0);
      if(sort==='rarity')return b.rarity-a.rarity||(b.level??0)-(a.level??0);
      if(sort==='quantity')return (b.count??0)-(a.count??0);
      if(sort==='levelAsc')return (a.level??0)-(b.level??0);
      return (b.level??0)-(a.level??0)||b.rarity-a.rarity;
    });
}
