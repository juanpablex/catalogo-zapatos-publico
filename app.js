const $=s=>document.querySelector(s);
const money=n=>n==null?"Consultar precio":n.toLocaleString("es-BO")+" Bs";
const controls=["search","brand","color","size","price","sort"];
let selection=[];
try{selection=JSON.parse(localStorage.getItem("paso-selection")||"[]")}catch{}
let allProducts=[], publicPacks=[], currentPack="";
let explicitPack=new URL(location.href).searchParams.get("pack");
const productById=id=>allProducts.find(p=>p.id===id);
function refreshFilters(){
 for(const key of ["brand","color","size"]){
  const control=$("#"+key), previous=control.value;
  while(control.options.length>1)control.remove(1);
  const values=[...new Set(PRODUCTS.flatMap(p=>key==="size"?p.sizes:[p[key]]))].filter(Boolean).sort((a,b)=>String(a).localeCompare(String(b),"es",{numeric:true}));
  values.forEach(v=>control.add(new Option(v,v)));
  if(values.includes(previous))control.value=previous;
 }
}
function photo(container,p){
 container.replaceChildren();
 if(p.image){const img=document.createElement("img");img.src=p.image;img.alt=p.name;img.loading="lazy";img.onerror=()=>{img.remove();const s=document.createElement("span");s.textContent="Foto pendiente";container.append(s)};container.append(img)}
 else{const s=document.createElement("span");s.textContent="Foto pendiente";container.append(s)}
 if(p.sold){const ribbon=document.createElement("span");ribbon.className="sold-ribbon";ribbon.textContent="VENDIDO";container.append(ribbon)}
}
function render(){
 const query=$("#search").value.trim().toLocaleLowerCase("es");
 let list=PRODUCTS.filter(p=>(!query||(p.name+" "+p.brand).toLocaleLowerCase("es").includes(query))&&(!$("#brand").value||p.brand===$("#brand").value)&&(!$("#color").value||p.color===$("#color").value)&&(!$("#size").value||p.sizes.includes($("#size").value)));
 const range=$("#price").value;
 if(range){const [min,max]=range.split("-").map(Number);list=list.filter(p=>p.price!=null&&p.price<=max&&(min===0?p.price>=0:p.price>min))}
 if($("#sort").value!=="default")list.sort((a,b)=>{if(a.price==null)return b.price==null?0:1;if(b.price==null)return -1;return $("#sort").value==="asc"?a.price-b.price:b.price-a.price});
 $("#grid").replaceChildren(...list.map(p=>{
 const article=document.createElement("article");article.className="card"+(p.sold?" is-sold":"");
 const button=document.createElement("button");button.className="product-open";button.setAttribute("aria-label","Ver "+p.name);
 button.innerHTML='<div class="placeholder"></div><p class="card-brand"></p><h3></h3><div class="card-bottom"><strong></strong><span class="color-label"></span></div><p class="card-sizes"></p>';
 photo(button.querySelector(".placeholder"),p);button.querySelector(".card-brand").textContent=p.brand||"Marca por confirmar";button.querySelector("h3").textContent=p.name;button.querySelector("strong").textContent=money(p.price);
 const swatch=document.createElement("i");swatch.className="swatch";swatch.style.background=p.hex;swatch.hidden=!p.hex;if(p.hex)button.querySelector(".color-label").append(swatch);button.querySelector(".color-label").append(document.createTextNode(p.color||"Color por confirmar"));
 button.querySelector(".card-sizes").textContent=p.sizes.length?"Tallas "+p.sizes.join(" · "):"Tallas por confirmar";button.onclick=()=>openViewer(p);article.append(button);
 const add=document.createElement("button");add.type="button";add.className="card-add";
 const selected=selection.some(x=>x.id===p.id);add.textContent=selected?"✓":"+";
 add.hidden=!!p.sold;add.disabled=!!p.sold;
 add.setAttribute("aria-label",(selected?"Quitar ":"Agregar ")+p.name+(selected?" de":" a")+" mi selección");add.setAttribute("aria-pressed",String(selected));
 add.onclick=()=>toggleSelection(p);article.append(add);return article;
 }));
 $("#results").textContent=list.length+" modelos";$("#empty").hidden=!!list.length;
}
function reset(){controls.forEach(id=>$("#"+id).value=id==="sort"?"default":"");render()}
function toggleSelection(p){
 const current=productById(p.id);if(!current||current.sold)return;
 if(selection.some(x=>x.id===p.id))selection=selection.filter(x=>x.id!==p.id);
 else selection.push({id:p.id,size:current.sizes[0]||"Por confirmar"});
 persist();render();syncViewerSelection();
}
function syncViewerSelection(){
 const p=viewerProducts[viewerIndex];if(!p)return;
 const sold=productById(p.id)?.sold??p.sold,selected=selection.some(x=>x.id===p.id),button=$("#viewer-add");
 button.disabled=sold;button.hidden=sold;button.textContent=selected?"✓":"+";
 button.setAttribute("aria-pressed",String(selected));button.setAttribute("aria-label",(selected?"Quitar ":"Agregar ")+p.name+(selected?" de":" a")+" mi selección");
}
let viewerProducts=[],viewerIndex=0,viewerFrame=null;
function viewerMove(index){
 if(!viewerProducts.length)return;
 const next=(index+viewerProducts.length)%viewerProducts.length;
 $("#viewer-feed").scrollTo({top:next*$("#viewer-feed").clientHeight,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
}
function viewerUpdate(){
 const feed=$("#viewer-feed");
 viewerIndex=Math.max(0,Math.min(viewerProducts.length-1,Math.round(feed.scrollTop/Math.max(1,feed.clientHeight))));
 $("#viewer-count").textContent=(viewerIndex+1)+" / "+viewerProducts.length;
 for(const index of [viewerIndex-1,viewerIndex,viewerIndex+1]){
  feed.children[index]?.querySelectorAll("img").forEach(img=>img.loading="eager");
 }
 $("#photo-download-status").textContent="";
 syncViewerSelection();
}
function openViewer(product){
 viewerProducts=PRODUCTS.slice();viewerIndex=Math.max(0,viewerProducts.findIndex(p=>p.id===product.id));
 $("#viewer-feed").replaceChildren(...viewerProducts.map((p,index)=>{
  const slide=document.createElement("article");slide.className="viewer-slide"+(p.viewerImage?" has-portrait":"")+(p.sold?" is-sold":"");slide.setAttribute("aria-label",p.name);
  const img=document.createElement("img");img.className="viewer-image";img.src=p.viewerImage||p.image;img.alt=p.name;img.loading=Math.abs(index-viewerIndex)<=1?"eager":"lazy";img.decoding="async";
  const info=document.createElement("div");info.className="viewer-info";
  const tag=document.createElement("p");tag.className="viewer-tag";tag.textContent=p.packName+" · "+(p.brand||"Marca por confirmar")+" · "+p.id;
  const title=document.createElement("h2");title.textContent=p.name;
  const price=document.createElement("p");price.className="viewer-price";price.textContent=money(p.price);
  const sizes=document.createElement("p");sizes.className="viewer-sizes";sizes.textContent=p.sizes.length?"Tallas: "+p.sizes.join(" · "):"Tallas por confirmar";
  const more=document.createElement("details"),summary=document.createElement("summary");summary.textContent="Más información";more.append(summary);
  for(const text of [p.color?"Color: "+p.color:"",p.state==null?"Estado por calificar":"Estado: "+p.state+"/10",p.productCode?"Código: "+p.productCode:"",p.observation?"Observaciones: "+p.observation:""]){if(text){const line=document.createElement("p");line.textContent=text;more.append(line)}}
  if(p.qrUrl){try{const url=new URL(p.qrUrl);if(["http:","https:"].includes(url.protocol)&&!url.username&&!url.password){const a=document.createElement("a");a.href=url.href;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Abrir enlace del QR";more.append(a)}}catch{}}
  const labelPhoto=p.images.find(item=>item.label==="Etiqueta");
  if(labelPhoto){const showLabel=document.createElement("button");showLabel.type="button";showLabel.className="viewer-label";showLabel.textContent="Ver etiqueta";let showing=false;showLabel.onclick=()=>{showing=!showing;slide.classList.toggle("showing-label",showing);img.src=showing?labelPhoto.src:(p.viewerImage||p.image);slide.querySelector(".viewer-ambient").src=img.src;showLabel.textContent=showing?"Volver al zapato":"Ver etiqueta"};more.append(showLabel)}
  const ambient=img.cloneNode();ambient.className="viewer-ambient";ambient.alt="";ambient.setAttribute("aria-hidden","true");
  if(p.sold){const sold=document.createElement("span");sold.className="sold-ribbon";sold.textContent="VENDIDO";slide.append(sold)}
  info.append(tag,title,price,sizes,more);slide.append(img,ambient,info);return slide;
 }));
 $("#photo-viewer").showModal();document.documentElement.classList.add("viewer-open");
 $("#viewer-feed").scrollTo({top:viewerIndex*$("#viewer-feed").clientHeight,behavior:"instant"});viewerUpdate();
};
$("#viewer-feed").addEventListener("scroll",()=>{if(viewerFrame)return;viewerFrame=requestAnimationFrame(()=>{viewerFrame=null;viewerUpdate()})},{passive:true});
let viewerGesture=null;
const feedGesture=$("#viewer-feed");
feedGesture.addEventListener("pointerdown",event=>{
 if(event.button!==0||!event.isPrimary||event.target.closest("button,a,summary,details,.viewer-info"))return;
 viewerGesture={id:event.pointerId,x:event.clientX,y:event.clientY,scroll:feedGesture.scrollTop,mouse:event.pointerType!=="touch",axis:null};
 feedGesture.setPointerCapture(event.pointerId);
});
feedGesture.addEventListener("pointermove",event=>{
 const g=viewerGesture;if(!g||g.id!==event.pointerId)return;
 const dx=event.clientX-g.x,dy=event.clientY-g.y;
 if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))>12)g.axis=Math.abs(dx)>Math.abs(dy)?"x":"y";
 if(g.axis==="x"){
  event.preventDefault();const slide=feedGesture.children[viewerIndex];
  slide.style.transform="translateX("+dx*.75+"px)";slide.style.opacity=String(Math.max(.5,1-Math.abs(dx)/feedGesture.clientWidth*.4));
 }else if(g.axis==="y"&&g.mouse){event.preventDefault();feedGesture.style.scrollSnapType="none";feedGesture.scrollTop=g.scroll-dy}
},{passive:false});
function finishViewerGesture(event,cancelled=false){
 const g=viewerGesture;if(!g||g.id!==event.pointerId)return;
 viewerGesture=null;
 for(const slide of feedGesture.children){slide.style.transform="";slide.style.opacity=""}
 feedGesture.style.scrollSnapType="";
 const dx=event.clientX-g.x,dy=event.clientY-g.y;
 if(!cancelled&&g.axis==="x"&&Math.abs(dx)>Math.min(90,feedGesture.clientWidth*.18)){
  const next=(viewerIndex+(dx<0?1:-1)+viewerProducts.length)%viewerProducts.length;
  feedGesture.scrollTo({top:next*feedGesture.clientHeight,behavior:"instant"});viewerUpdate();
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches)feedGesture.children[next].animate([{transform:"translateX("+(dx<0?"100%":"-100%")+")"},{transform:"translateX(0)"}],{duration:230,easing:"ease-out"});
 }else if(!cancelled&&g.mouse&&g.axis==="y"){
  const origin=Math.round(g.scroll/feedGesture.clientHeight);viewerMove(origin+(Math.abs(dy)>60?(dy<0?1:-1):0));
 }
}
feedGesture.addEventListener("pointerup",event=>finishViewerGesture(event));
feedGesture.addEventListener("pointercancel",event=>finishViewerGesture(event,true));
feedGesture.addEventListener("dragstart",event=>event.preventDefault());
$("#viewer-add").onclick=()=>toggleSelection(viewerProducts[viewerIndex]);
$("#viewer-cart").onclick=showCart;
$("#photo-viewer").addEventListener("close",()=>document.documentElement.classList.remove("viewer-open"));
$("#photo-viewer").addEventListener("keydown",event=>{if(["ArrowDown","ArrowRight","PageDown","ArrowUp","ArrowLeft","PageUp","Home","End"].includes(event.key)){event.preventDefault();viewerMove(event.key==="Home"?0:event.key==="End"?viewerProducts.length-1:viewerIndex+(["ArrowDown","ArrowRight","PageDown"].includes(event.key)?1:-1))}});
window.addEventListener("resize",()=>{if($("#photo-viewer").open)$("#viewer-feed").scrollTo({top:viewerIndex*$("#viewer-feed").clientHeight,behavior:"instant"})});
$("#photo-download").onclick=async()=>{
 const button=$("#photo-download"),src=$("#viewer-feed").children[viewerIndex].querySelector("img").src,id=viewerProducts[viewerIndex].id;
 button.disabled=true;$("#photo-download-status").textContent="Preparando descarga…";
 try{
  const response=await fetch(src);
  if(!response.ok)throw new Error("No se pudo descargar");
  const blob=await response.blob();
  const extension={"image/webp":"webp","image/jpeg":"jpg","image/png":"png"}[blob.type];
  if(!extension)throw new Error("La respuesta no es una imagen");
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download="paso-deportivo-"+id+"."+extension;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  $("#photo-download-status").textContent="Descarga iniciada.";
 }catch{$("#photo-download-status").textContent="No se pudo descargar. Vuelve a intentarlo."}
 finally{button.disabled=false}
};
function persist(){try{localStorage.setItem("paso-selection",JSON.stringify(selection))}catch{}$("#count").textContent=selection.length;$("#viewer-cart").textContent="Mi selección · "+selection.length;syncViewerSelection()}
function showCart(){
 $("#copy-status").textContent="";
 $("#cart-items").replaceChildren(...selection.map(item=>{
 const p=productById(item.id),row=document.createElement("div");row.className="cart-row";
 const text=document.createElement("div"),name=document.createElement("p"),meta=document.createElement("small"),b=document.createElement("button");name.textContent=p.name+" · "+p.packName+" · "+money(p.price);meta.textContent=(p.brand||"Marca por confirmar")+" · "+(p.color||"Color por confirmar")+" · Talla "+item.size;text.append(name,meta);b.textContent="Quitar";b.onclick=()=>{selection=selection.filter(x=>x!==item);persist();render();showCart()};row.append(text,b);return row;
 }));
 if(!selection.length)$("#cart-items").textContent="Todavía no elegiste un par. Agrega tus favoritos con el signo +.";
 $("#total").textContent=selection.length&&selection.every(x=>productById(x.id).price!=null)?"Total estimado "+money(selection.reduce((sum,x)=>sum+productById(x.id).price,0)):"";
 $("#copy").disabled=!selection.length;$("#send").disabled=!selection.length;
 if(!$("#cart").open)$("#cart").showModal();
}
function orderMessage(){return "Hola, me interesan estos zapatos deportivos:\n"+selection.map(x=>{const p=productById(x.id);return "• "+p.packName+" · "+p.id+" · "+p.name+" · "+(p.brand||"Marca por confirmar")+" · "+(p.color||"Color por confirmar")+" · Tallas: "+(p.sizes.length?p.sizes.join(" / "):"Por confirmar")+" · "+money(p.price)}).join("\n")+"\n¿Me confirmas precio, disponibilidad y entrega?"}
$("#send").onclick=()=>{if(selection.length&&selection.every(x=>!productById(x.id)?.sold))window.open("https://wa.me/59178367871?text="+encodeURIComponent(orderMessage()),"_blank","noopener,noreferrer")};
$("#copy").onclick=async()=>{const message=orderMessage();try{await navigator.clipboard.writeText(message);$("#copy-status").textContent="Consulta copiada. Ya puedes pegarla en WhatsApp."}catch{$("#copy-status").textContent=message}};
$("#pack-select").onchange=()=>{
 explicitPack=$("#pack-select").value;currentPack=explicitPack;const url=new URL(location.href);url.searchParams.set("pack",explicitPack);history.replaceState(null,"",url);
 PRODUCTS.splice(0,PRODUCTS.length,...allProducts.filter(p=>p.packId===currentPack));$("#pack-title").textContent=publicPacks.find(p=>p.id===currentPack)?.nombre||"Pack";reset();refreshFilters();render();
};
controls.forEach(id=>$("#"+id).addEventListener(id==="search"?"input":"change",render));
$("#reset").onclick=reset;$("#empty-reset").onclick=reset;$("#bag").onclick=showCart;
document.querySelectorAll("dialog").forEach(d=>{d.querySelector(".close").onclick=()=>d.close();d.addEventListener("click",e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
let loadingCatalog=false;
async function loadCatalog(){
 if(loadingCatalog)return;
 loadingCatalog=true;
 $("#catalog-status").textContent=PRODUCTS.length?"Actualizando catálogo…":"Cargando fotos… La primera conexión puede tardar un momento.";
 $("#retry-catalog").hidden=true;
 try{
  const response=await fetch(CATALOG_API+"/api/catalog",{cache:"no-store"});
  if(!response.ok)throw new Error("No se pudo cargar");
  const rows=await response.json();
  const packsResponse=await fetch(CATALOG_API+"/api/packs",{cache:"no-store"});
  if(!packsResponse.ok)throw new Error("No se pudieron cargar los packs");
  publicPacks=await packsResponse.json();
  if(!Array.isArray(rows))throw new Error("Respuesta inválida");
  const products=rows.map(p=>({
   id:"Z-"+p.id,packId:String(p.pack_id||1),packName:p.pack_nombre||"Pack 1",sold:p.vendido===true,name:p.nombre?(/^\d+$/.test(p.nombre)?"Zapato "+p.nombre:p.nombre):"Zapato "+p.id,brand:p.marca||"",color:p.color||"",hex:CatalogColors.background(p.color),
   price:p.precio==null?null:Number(p.precio),qrUrl:p.qr_url||null,state:p.estado??null,observation:p.observacion||"",productCode:p.codigo_producto||"",
   sizes:p.tallas.map(t=>t.sistema+" "+t.valor),
   image:CATALOG_API+"/api/photos/"+p.foto_id+"?v="+encodeURIComponent(p.actualizado_en||""),
   viewerImage:p.visor_foto_id?CATALOG_API+"/api/photos/"+p.visor_foto_id+"?v="+encodeURIComponent(p.actualizado_en||""):null,
   images:(p.fotos||[{id:p.foto_id,orden:1}]).filter(image=>image.orden!==3).map(image=>({
    src:CATALOG_API+"/api/photos/"+image.id+"?v="+encodeURIComponent(p.actualizado_en||""),
    label:image.orden===2?"Etiqueta":"Zapato"
   }))
  }));
  allProducts=products;
  currentPack=publicPacks.some(p=>p.id===explicitPack)?explicitPack:publicPacks[0]?.id||"1";
  $("#pack-select").replaceChildren(...publicPacks.map(p=>new Option(p.nombre+" · "+p.cantidad+" zapatos",p.id)));
  $("#pack-select").value=currentPack;
  PRODUCTS.splice(0,PRODUCTS.length,...allProducts.filter(p=>p.packId===currentPack));
  $("#pack-title").textContent=publicPacks.find(p=>p.id===currentPack)?.nombre||"Pack 1";
  if(!Array.isArray(selection))selection=[];
  selection=selection.filter(x=>allProducts.some(p=>p.id===x.id&&!p.sold&&(p.sizes.includes(x.size)||(!p.sizes.length&&x.size==="Por confirmar"))));
  refreshFilters();persist();render();
  if($("#cart").open)showCart();
  $("#catalog-status").textContent=PRODUCTS.length?"":"Todavía no hay zapatos publicados.";
 }catch{
  $("#catalog-status").textContent=PRODUCTS.length?"No se pudo actualizar. Se muestran los últimos datos cargados.":"No se pudo conectar con el catálogo. Intenta nuevamente.";
  $("#retry-catalog").hidden=false;
 }finally{loadingCatalog=false;$("#bag").disabled=!PRODUCTS.length}
}
$("#retry-catalog").onclick=loadCatalog;
$("#bag").disabled=true;
loadCatalog();
setInterval(loadCatalog,30000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadCatalog()});
