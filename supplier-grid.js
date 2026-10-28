/* Supplier worksheet interactions. Purchase data stays read-only; only delivery quantities are editable. */
(()=>{
'use strict';
function bind(table,{report=()=>{}}={}){
 if(!table)return;
 const undo=[],redo=[],inputs=[...table.querySelectorAll('[data-order-quantity]')],valid=new WeakMap();
 for(const td of table.querySelectorAll('tbody td')){
  if(!td.children.length){const span=document.createElement('span');span.className='supplier-cell-value';span.textContent=td.textContent;td.replaceChildren(span);td.title=span.textContent;}
 }
 const rows=()=>[...table.tBodies].flatMap(b=>[...b.rows]).filter(r=>!r.hidden&&r.getClientRects().length&&r.cells[0]?.colSpan===1);
 const units=text=>{if(!/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(text))throw Error('送货数量须为非负数，最多3位小数');const [a,b='']=text.split('.');return BigInt(a)*1000n+BigInt(b.padEnd(3,'0'));};
 function validate(input,value){if(!input||input.disabled)throw Error('仅可修改可送货订单的“本次送货数量”');const text=String(value).trim();if(text==='')return '';if(units(text)>units(input.max))throw Error('送货数量超过可下推数量');return text;}
 function apply(changes,record=true){
  const checked=changes.map(([input,value])=>({input,value:validate(input,value),before:valid.get(input)??input.value}));
  if(record&&checked.some(c=>c.before!==c.value)){undo.push(checked);if(undo.length>100)undo.shift();redo.length=0;}
  for(const c of checked){c.input.value=c.value;valid.set(c.input,c.value);c.input.dispatchEvent(new Event('input',{bubbles:true}));}
  report('');
 }
 function restore(from,to,reverse){const changes=from.at(-1);if(!changes)return;try{apply(changes.map(c=>[c.input,reverse?c.before:c.value]),false);from.pop();to.push(changes);}catch(e){report(e.message);}}
 const grid=window.ERPGridSelection.bind({table,cells:'tbody td',edit:(td,options={})=>{
  const input=td.querySelector('[data-order-quantity]:not(:disabled)');if(!input)return;
  input.focus();input.select();if(options.replace){input.value=options.text??'';input.dispatchEvent(new Event('input',{bubbles:true}));}
 }});
 for(const input of inputs){
  valid.set(input,input.value);
  input.addEventListener('change',()=>{try{apply([[input,input.value]]);}catch(e){report(e.message);}});
  input.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();input.value=valid.get(input);input.dispatchEvent(new Event('input',{bubbles:true}));grid.select(input.closest('td'));}
   if(['Enter','Tab'].includes(e.key)){e.preventDefault();try{apply([[input,input.value]]);grid.move(input.closest('td'),e.key,e.shiftKey);}catch(err){report(err.message);}}
  });
 }
 const copy=cell=>cell.querySelector('[data-order-quantity]')?.value??(cell.querySelector('input[type=checkbox]')?(cell.querySelector('input').checked?'✓':''):cell.querySelector('.supplier-cell-value')?.textContent??cell.textContent);
 const paste=(cell,values)=>{
  const visible=rows(),start=visible.indexOf(cell.parentElement),column=cell.cellIndex;
  if(start<0||start+values.length>visible.length)throw Error('粘贴超出当前可见订单行');
  if(values.some(row=>row.length!==1))throw Error('请只复制一列送货数量，采购订单及计算列不能修改');
  apply(values.map((row,i)=>[visible[start+i].cells[column]?.querySelector('[data-order-quantity]'),row[0]]));
 };
 window.ERPTableClipboard.register(table,{copy,paste});
 table.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){e.preventDefault();restore(e.key.toLowerCase()==='y'||e.shiftKey?redo:undo,e.key.toLowerCase()==='y'||e.shiftKey?undo:redo,e.key.toLowerCase()==='z'&&!e.shiftKey);return;}
  const cell=e.target.closest('td');if(!cell||e.target!==cell)return;
  if(e.key==='Home'||e.key==='End'){e.preventDefault();const rs=rows(),row=e.ctrlKey||e.metaKey?(e.key==='Home'?rs[0]:rs.at(-1)):cell.parentElement;const cells=[...row.cells].filter(c=>!c.hidden);grid.select(e.key==='Home'?cells[0]:cells.at(-1));}
  if(e.key==='Delete'||e.key==='Backspace'){const selected=window.ERPColumnRange.getCells(table);const cells=selected.length?selected:[cell];if(cells.some(c=>c.querySelector('[data-order-quantity]:not(:disabled)'))){e.preventDefault();try{apply(cells.map(c=>[c.querySelector('[data-order-quantity]'),'']));}catch(err){report(err.message);}}}
 });
 table.addEventListener('paste',e=>{
  const input=e.target.closest('[data-order-quantity]');if(!input||!e.clipboardData)return;
  e.preventDefault();e.stopPropagation();try{paste(input.closest('td'),window.ERPTableClipboard.parse(e.clipboardData.getData('text/plain')));}catch(err){report(err.message);}
 });
}
window.SupplierWorksheet={bind};
})();
