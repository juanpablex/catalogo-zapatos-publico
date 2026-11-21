(function(root){
 const palette=[
  ["Negro","#202124",["negro","black","noir"]],
  ["Blanco","#ffffff",["blanco","white","blanc"]],
  ["Gris oscuro","#555b61",["gris oscuro","dark grey","dark gray"]],
  ["Gris claro","#d0d2d4",["gris claro","light grey","light gray"]],
  ["Gris","#93989d",["gris","grey","gray"]],
  ["Azul marino","#172d52",["azul marino","navy"]],
  ["Azul","#3172b7",["azul","blue"]],
  ["Rojo","#d63e3e",["rojo","red"]],
  ["Verde","#428054",["verde","green"]],
  ["Rosa","#e59bb7",["rosa","rosado","pink"]],
  ["Morado","#8b5ba6",["morado","violeta","purple","violet"]],
  ["Amarillo","#f0d144",["amarillo","yellow"]],
  ["Naranja","#ef8b35",["naranja","anaranjado","orange"]],
  ["Beige","#d4bea0",["beige","crema","cream"]],
  ["Marrón","#885b3c",["marron","cafe","brown"]],
  ["Celeste","#8dc5e4",["celeste","sky blue"]],
  ["Turquesa","#38aeaa",["turquesa","turquoise","teal"]],
  ["Dorado","#c5a04a",["dorado","gold"]],
  ["Plateado","#b6b9bd",["plateado","silver"]]
 ];
 function normalize(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}
 function matches(value){
  let remaining=normalize(value),found=[];
  const aliases=palette.flatMap(([name,hex,words])=>words.map(word=>({name,hex,word}))).sort((a,b)=>b.word.length-a.word.length);
  for(const item of aliases){
   const expression=new RegExp("(^|[^a-z])"+item.word+"(?=$|[^a-z])","g");
   if(expression.test(remaining)){
    if(!found.some(color=>color.name===item.name))found.push({...item,index:remaining.search(expression)});
    remaining=remaining.replace(expression,match=>" ".repeat(match.length));
   }
  }
  return found.sort((a,b)=>a.index-b.index);
 }
 function background(value){
  const colors=matches(value).map(color=>color.hex);
  if(!colors.length)return "";
  if(colors.length===1)return colors[0];
  return "linear-gradient(90deg,"+colors.flatMap((color,i)=>[color+" "+(i/colors.length*100)+"%",color+" "+((i+1)/colors.length*100)+"%"]).join(",")+")";
 }
 const api={matches,background};
 if(typeof module!=="undefined"&&module.exports)module.exports=api;
 else root.CatalogColors=api;
})(typeof window!=="undefined"?window:globalThis);
