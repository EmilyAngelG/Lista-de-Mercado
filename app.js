/*
  app.js - lógica principal
  - Itens em memória (array)
  - Suporta adicionar, editar, excluir (arrastar p/ esquerda), selecionar imagem (file input + capture)
  - Modo comparação com snapshot por item
  - Formatação de moeda: aceita ponto ou vírgula na entrada, exibe com vírgula (pt-BR style)
*/

const listEl = document.getElementById('list');
const endAdd = document.getElementById('end-add');
const footerAdd = document.getElementById('footer-add');
const totalValueEl = document.getElementById('totalValue');
const compareValueEl = document.getElementById('compareValue');
const modal = document.getElementById('modal');
const modalTotal = document.getElementById('modalTotal');
const saveCompareBtn = document.getElementById('saveCompare');
const modalClose = document.getElementById('modalClose');
const cancelModal = document.getElementById('cancelModal');
const modalCompareActions = document.getElementById('modalCompareActions');
const compareSavedEl = document.getElementById('compareSaved');
const deleteCompareBtn = document.getElementById('deleteCompare');
const modalCompareClose = document.getElementById('modalCompareClose');
const closeCompareModal = document.getElementById('closeCompareModal');

let items = []; // array of {id,title,image,dataUrl,qty,unit, snapshot: {qty,unit} }
let compare = null; // {total: number, snapshotItems: [{id,qty,unit}], timestamp}

// Helpers
const uid = ()=>Math.random().toString(36).slice(2,9);
function parseNumber(v){ if(v==null || v==='') return null; v = String(v).trim().replace(',','.'); const n = parseFloat(v); return Number.isFinite(n)?n:null }
function formatCurrency(n){ if(n==null) return ''; return n.toFixed(2).replace('.',','); }
function isItemBlank(item){ return (!item.title || item.title.trim()==='') && (!item.image) && (item.qty==null || item.qty==='') && (item.unit==null || item.unit==='') }

// initial render with one empty item
addItem(true);

function addItem(skipValidation=false){
  const last = items[items.length-1];
  if(!skipValidation && last && !isItemBlank(last)){
    // allowed
  } else if(!skipValidation && last && isItemBlank(last)){
    // do not add
    return;
  }
  const it = {id:uid(), title:'', image:null, dataUrl:null, qty:'', unit:'', snapshot:null};
  items.push(it);
  render();
  scrollToEnd();
}

function scrollToEnd(){ setTimeout(()=>{ endAdd.scrollIntoView({behavior:'smooth',block:'center'}); },120) }

function render(){
  listEl.innerHTML='';
  items.forEach((item, idx)=>{
    const card = document.createElement('article');
    card.className='card';
    card.dataset.id = item.id;

    // delete X element (revealed on drag)
    const deleteX = document.createElement('div'); deleteX.className='delete-x'; deleteX.textContent='✕'; card.appendChild(deleteX);

    // title
    const title = document.createElement('input'); title.className='title'; title.placeholder='Título (opcional)'; title.value=item.title||'';
    title.addEventListener('input',e=>{ item.title=e.target.value; });
    const titleWrap = document.createElement('div'); titleWrap.className='title-wrap'; titleWrap.appendChild(title);
    const titleLabel = document.createElement('div'); titleLabel.className='title'; titleLabel.appendChild(title);

    card.appendChild(title);

    // image
    const imgWrap = document.createElement('label'); imgWrap.className='img-wrap';
    const imgEl = document.createElement('img');
    if(item.dataUrl) imgEl.src = item.dataUrl; else imgEl.alt='Adicionar imagem';
    imgWrap.appendChild(imgEl);
    const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*'; fileInput.capture='environment'; fileInput.style.display='none';
    fileInput.addEventListener('change',ev=>{ const f = ev.target.files[0]; if(f){ const reader = new FileReader(); reader.onload = (ev2)=>{ item.dataUrl = ev2.target.result; item.image = f.name; render(); } ; reader.readAsDataURL(f); } });
    imgWrap.appendChild(fileInput);
    imgWrap.addEventListener('click',()=>fileInput.click());
    card.appendChild(imgWrap);

    // fields container
    const fields = document.createElement('div'); fields.className='fields';

    if(compare && compare.snapshotItems){
      // comparison mode: show left (snapshot) blocked and right editable
      const leftCol = document.createElement('div'); leftCol.style.width='100%'; leftCol.style.display='flex'; leftCol.style.justifyContent='space-between'; leftCol.style.marginBottom='6px';
      // left block
      const leftBlock = document.createElement('div'); leftBlock.style.flex='1'; leftBlock.style.textAlign='left';
      leftBlock.innerHTML = '<div class="label">Antigo</div>';
      const snap = (compare.snapshotMap && compare.snapshotMap[item.id]) || {qty:'',unit:''};
      const leftQty = document.createElement('div'); leftQty.textContent = (snap.qty==null||snap.qty==='')? '': snap.qty; leftQty.style.fontWeight='600';
      const leftUnit = document.createElement('div'); leftUnit.textContent = (snap.unit==null||snap.unit==='')? '': formatCurrency(parseNumber(snap.unit));
      leftBlock.appendChild(leftQty); leftBlock.appendChild(leftUnit);

      // right block (edit current)
      const rightBlock = document.createElement('div'); rightBlock.style.flex='1'; rightBlock.style.textAlign='right';
      rightBlock.innerHTML = '<div class="label">Atual</div>';
      const qtyInput = document.createElement('input'); qtyInput.placeholder='Qtd'; qtyInput.value = item.qty||''; qtyInput.addEventListener('input',e=>{ item.qty=e.target.value; updateTotals(); render(); });
      const unitInput = document.createElement('input'); unitInput.placeholder='Valor unit.'; unitInput.value = item.unit||''; unitInput.addEventListener('input',e=>{ item.unit=e.target.value; updateTotals(); render(); });
      rightBlock.appendChild(qtyInput); rightBlock.appendChild(unitInput);

      const twoCol = document.createElement('div'); twoCol.style.display='flex'; twoCol.style.justifyContent='space-between'; twoCol.style.width='100%'; twoCol.style.gap='8px';
      twoCol.appendChild(leftBlock); twoCol.appendChild(rightBlock);

      fields.appendChild(twoCol);

      // item totals
      const totRight = document.createElement('div'); totRight.className='totalItem';
      const nQty = parseNumber(item.qty); const nUnit = parseNumber(item.unit);
      const tot = (nQty!=null && nUnit!=null) ? nQty*nUnit : null;
      totRight.textContent = tot==null? '': formatCurrency(tot);
      // color based on compare
      const snapTot = (()=>{ const q = parseNumber(snap.qty); const u = parseNumber(snap.unit); return (q!=null && u!=null)? q*u : null })();
      if(tot==null) { totRight.style.color='var(--accent)'; }
      else if(snapTot==null) { totRight.style.color='var(--accent)'; }
      else if(tot < snapTot) totRight.style.color='var(--green)';
      else if(tot > snapTot) totRight.style.color='var(--red)';
      else totRight.style.color='var(--accent)';
      fields.appendChild(totRight);

    } else {
      // normal mode: single centered fields
      const qtyField = document.createElement('div'); qtyField.className='field';
      const qtyLabel = document.createElement('div'); qtyLabel.className='label'; qtyLabel.textContent='Quantidade';
      const qtyInput = document.createElement('input'); qtyInput.type='text'; qtyInput.placeholder='Qtd'; qtyInput.value = item.qty||''; qtyInput.addEventListener('input',e=>{ item.qty=e.target.value; updateTotals(); render(); });
      qtyField.appendChild(qtyLabel); qtyField.appendChild(qtyInput);

      const unitField = document.createElement('div'); unitField.className='field';
      const unitLabel = document.createElement('div'); unitLabel.className='label'; unitLabel.textContent='Valor unit.';
      const unitInput = document.createElement('input'); unitInput.type='text'; unitInput.placeholder='0,00'; unitInput.value = item.unit||''; unitInput.addEventListener('input',e=>{ item.unit=e.target.value; updateTotals(); render(); });
      unitField.appendChild(unitLabel); unitField.appendChild(unitInput);

      fields.appendChild(qtyField); fields.appendChild(unitField);

      const tot = (parseNumber(item.qty)!=null && parseNumber(item.unit)!=null) ? parseNumber(item.qty)*parseNumber(item.unit) : null;
      const totEl = document.createElement('div'); totEl.className='totalItem'; totEl.textContent = tot==null? '': formatCurrency(tot);
      fields.appendChild(totEl);
    }

    // add touch-drag handlers for delete
    let startX=null, currentX=0, touching=false;
    function onTouchStart(e){ touching=true; startX = (e.touches?e.touches[0].clientX:e.clientX); card.style.transition='none'; }
    function onTouchMove(e){ if(!touching) return; const x = (e.touches?e.touches[0].clientX:e.clientX); currentX = x - startX; if(currentX<0){ card.style.transform = `translateX(${currentX}px)`; card.classList.add('delete-back'); card.classList.add('show-x'); }
    }
    function onTouchEnd(e){ touching=false; card.style.transition='transform 0.2s ease'; if(currentX < -80){ // reveal fully -> show X (clickable)
        card.style.transform = `translateX(-80px)`; card.classList.add('delete-back'); card.classList.add('show-x');
      } else { // revert
        card.style.transform = '';
        card.classList.remove('delete-back'); card.classList.remove('show-x');
      }
      startX=null; currentX=0;
    }
    card.addEventListener('touchstart', onTouchStart); card.addEventListener('touchmove', onTouchMove); card.addEventListener('touchend', onTouchEnd);
    card.addEventListener('mousedown', onTouchStart); document.addEventListener('mousemove', onTouchMove); document.addEventListener('mouseup', onTouchEnd);

    // clicking X removes
    deleteX.addEventListener('click',()=>{ items = items.filter(it=>it.id!==item.id); updateTotals(); render(); });

    // clicking elsewhere closes reveal
    card.addEventListener('click',(e)=>{ if(!card.classList.contains('show-x')) return; // if X visible, clicking anywhere else should close
      if(e.target===deleteX) return; card.style.transform=''; card.classList.remove('delete-back'); card.classList.remove('show-x');
    });
    
    card.appendChild(fields);

    listEl.appendChild(card);
  });

  // end add element
  listEl.appendChild(endAdd);
  updateTotals();
}

function updateTotals(){
  // compute item totals and list total
  let total = 0; items.forEach(it=>{
    const q = parseNumber(it.qty); const u = parseNumber(it.unit);
    if(q!=null && u!=null) total += q*u;
  });
  // update total display with comparison coloring
  totalValueEl.textContent = formatCurrency(Number(total.toFixed(2)));
  totalValueEl.classList.remove('green','red');
  if(compare && compare.total!=null){
    if(total < compare.total) { totalValueEl.classList.add('green'); }
    else if(total > compare.total){ totalValueEl.classList.add('red'); }
    else { totalValueEl.classList.remove('green','red'); }
  }
}

// footer add click
footerAdd.addEventListener('click',()=>{ // scroll to end and try add
  endAdd.scrollIntoView({behavior:'smooth',block:'center'});
  setTimeout(()=>addItem(false),300);
});
endAdd.addEventListener('click',()=>{ addItem(false); });

// total click -> open modal
totalValueEl.addEventListener('click',()=>{
  modalTotal.textContent = totalValueEl.textContent;
  modal.classList.remove('hidden');
});
modalClose.addEventListener('click',()=>modal.classList.add('hidden'));
cancelModal.addEventListener('click',()=>modal.classList.add('hidden'));

saveCompareBtn.addEventListener('click',()=>{
  // create snapshot
  const total = parseNumber(totalValueEl.textContent.replace(',','.')) || 0;
  const snapshotItems = items.map(it=>({id:it.id, qty:it.qty, unit:it.unit}));
  compare = { total, snapshotItems, timestamp:Date.now() };
  // create convenience map for fast lookup
  compare.snapshotMap = {};
  snapshotItems.forEach(si=> compare.snapshotMap[si.id]=si);
  // set compare display
  compareValueEl.textContent = formatCurrency(compare.total);
  compareValueEl.classList.add('orange');
  compareSavedEl.textContent = compareValueEl.textContent;
  modal.classList.add('hidden');
  render();
});

// clicking compare field opens compare actions modal if comparison exists
compareValueEl.addEventListener('click',()=>{
  if(!compare) return; compareSavedEl.textContent = compareValueEl.textContent; modalCompareActions.classList.remove('hidden');
});
modalCompareClose.addEventListener('click',()=>modalCompareActions.classList.add('hidden'));
closeCompareModal.addEventListener('click',()=>modalCompareActions.classList.add('hidden'));

deleteCompareBtn.addEventListener('click',()=>{
  compare = null; compareValueEl.textContent=''; compareValueEl.classList.remove('orange'); modalCompareActions.classList.add('hidden'); render(); updateTotals();
});

// clicking compare value when no compare does nothing

// initial accessibility: set total to 0 display
updateTotals();

// Limitations & where to add persistence:
// - Currently items and comparison are kept in memory (JS). To persist between sessions, save `items` and `compare` to localStorage
//   (e.g. localStorage.setItem('lista_items', JSON.stringify(items))). To persist server-side, send to backend on save.

// Edge cases handling
// - If qty or unit missing or invalid, treated as null in calculations; results show empty until valid numbers provided.

// Simple keyboard support: add item with Enter when focused on footerAdd
footerAdd.addEventListener('keyup',(e)=>{ if(e.key==='Enter') footerAdd.click(); });

// Format numeric inputs on blur (display with comma)
// (Note: formatting is simple — we accept '.' or ',' when editing. Display uses comma.)