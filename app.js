"use strict";
const KEY="kaigo_money_final_v1";
const BUDGET_CATS=["Kirim Keluarga","Tabungan","Rokok","Makan & Minum","Shopping","Hiburan","Emergency","Buffer"];
const DEFAULT_BUDGET=Object.fromEntries(BUDGET_CATS.map(x=>[x,0]));
const CATEGORY_MAP={
 income:["Gaji","Pemasukan Lainnya"],
 expense:["Kirim Keluarga","Rokok","Makan & Minum","Shopping","Hiburan","Buffer","Transportasi","Kebutuhan Kerja","Kesehatan","Lainnya"],
 transfer:["Tabungan","Emergency"]
};
const $=id=>document.getElementById(id);
const yen=n=>"¥"+Math.round(Number(n)||0).toLocaleString("ja-JP");
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function safeLoad(){
 try{
   const raw=localStorage.getItem(KEY);
   if(!raw) return {budget:{...DEFAULT_BUDGET},goal:0,tx:[],month:"2026-08"};
   const x=JSON.parse(raw);
   return {budget:{...DEFAULT_BUDGET,...(x.budget||{})},goal:Number(x.goal)||0,tx:Array.isArray(x.tx)?x.tx:[],month:/^\d{4}-\d{2}$/.test(x.month||"")?x.month:"2026-08"};
 }catch(e){return {budget:{...DEFAULT_BUDGET},goal:0,tx:[],month:"2026-08"}}
}
let db=safeLoad();
let month=db.month;
function persist(){db.month=month;localStorage.setItem(KEY,JSON.stringify(db))}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1600)}
function fmtMonth(m){return new Date(m+"-01T00:00:00").toLocaleDateString("id-ID",{month:"long",year:"numeric"})}
function monthTx(){return db.tx.filter(x=>String(x.date||"").slice(0,7)===month)}
function totals(){const t=monthTx();return {income:t.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0),expense:t.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0),transfer:t.filter(x=>x.type==="transfer").reduce((a,x)=>a+Number(x.amount||0),0)}}
function budgetUsed(cat){return monthTx().filter(x=>{if(cat==="Tabungan"||cat==="Emergency")return x.type==="transfer"&&x.category===cat;return x.type==="expense"&&x.category===cat}).reduce((a,x)=>a+Number(x.amount||0),0)}
function render(){
 $("monthName").textContent=fmtMonth(month);const t=totals(),available=t.income-t.expense-t.transfer;$("income").textContent=yen(t.income);$("expense").textContent=yen(t.expense);$("transfers").textContent=yen(t.transfer);$("balance").textContent=yen(available);
 $("budget").innerHTML=BUDGET_CATS.map(cat=>{const b=Number(db.budget[cat]||0),used=budgetUsed(cat),pct=b>0?Math.min(100,used/b*100):0,over=b>0&&used>b,right=b>0?`${Math.round(used/b*100)}%`:"—";return `<div class="baritem"><div class="row"><div><b>${esc(cat)}</b><div class="small">${yen(used)} / ${yen(b)} ${over?'<span class="pill">melebihi</span>':''}</div></div><b>${right}</b></div><div class="progress"><div class="fill ${over?'over':''}" style="width:${pct}%"></div></div></div>`}).join("");
 const saved=db.tx.filter(x=>x.type==="transfer"&&x.category==="Tabungan").reduce((a,x)=>a+Number(x.amount||0),0),pct=db.goal>0?Math.min(100,saved/db.goal*100):0;$("saved").textContent=yen(saved);$("goalPct").textContent=db.goal>0?pct.toFixed(1)+"%":"Belum diatur";$("goalFill").style.width=pct+"%";$("goalText").textContent=db.goal>0?`Target ${yen(db.goal)} · sisa ${yen(Math.max(0,db.goal-saved))}`:"Tekan Ubah untuk menentukan target tabungan.";
 const list=[...monthTx()].sort((a,b)=>(b.created||0)-(a.created||0));$("recent").innerHTML=list.length?list.slice(0,7).map(txHtml).join(""):'<div class="empty">Belum ada transaksi bulan ini.</div>';$("all").innerHTML=list.length?list.map(txHtml).join(""):'<div class="empty">Belum ada transaksi bulan ini.</div>';bindTransactionRows();renderStats();persist();
}
function txHtml(x){const sign=x.type==="income"?"+":x.type==="expense"?"-":"↗";return `<div class="item clickable" data-txid="${esc(x.id)}"><div class="row"><div><b>${esc(x.category)}</b><div class="small">${esc(x.date)}${x.note?" · "+esc(x.note):""}</div></div><b class="${esc(x.type)}">${sign}${yen(x.amount)}</b></div></div>`}
function bindTransactionRows(){document.querySelectorAll("[data-txid]").forEach(el=>el.onclick=()=>openEdit(el.dataset.txid))}
function setPage(p){document.querySelectorAll("main").forEach(x=>x.classList.add("hidden"));$(p).classList.remove("hidden");document.querySelectorAll("nav [data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===p));render()}
function populateCats(selected){const cats=CATEGORY_MAP[$("type").value]||CATEGORY_MAP.expense;$("category").innerHTML=cats.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join("");if(selected&&cats.includes(selected))$("category").value=selected}
function defaultDate(){const today=new Date(),ym=today.toISOString().slice(0,7);return ym===month?today.toISOString().slice(0,10):month+"-01"}
function openAdd(prefCat=null,prefType=null){$("txModalTitle").textContent="Tambah transaksi";$("editId").value="";$("type").value=prefType||"expense";populateCats(prefCat);$("amount").value="";$("date").value=defaultDate();$("note").value="";$("deleteBtn").classList.add("hidden");openModal("txModal")}
function openEdit(id){const x=db.tx.find(t=>String(t.id)===String(id));if(!x)return;$("txModalTitle").textContent="Edit transaksi";$("editId").value=x.id;$("type").value=x.type;populateCats(x.category);$("amount").value=x.amount;$("date").value=x.date;$("note").value=x.note||"";$("deleteBtn").classList.remove("hidden");openModal("txModal")}
function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}
function shiftMonth(delta){const d=new Date(month+"-01T00:00:00");d.setMonth(d.getMonth()+delta);month=d.toISOString().slice(0,7);render()}
function renderStats(){const ex=monthTx().filter(x=>x.type==="expense"),tr=monthTx().filter(x=>x.type==="transfer"),totalEx=ex.reduce((a,x)=>a+Number(x.amount||0),0),map={};ex.forEach(x=>map[x.category]=(map[x.category]||0)+Number(x.amount||0));const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]),saved=tr.reduce((a,x)=>a+Number(x.amount||0),0);$("statistics").innerHTML=`<div class="grid"><div class="stat"><small>Total pengeluaran</small><b>${yen(totalEx)}</b></div><div class="stat"><small>Total disimpan</small><b>${yen(saved)}</b></div></div>`+(rows.length?rows.map(([k,v])=>`<div class="baritem"><div class="row"><b>${esc(k)}</b><b>${yen(v)}</b></div><div class="progress"><div class="fill" style="width:${totalEx?v/totalEx*100:0}%"></div></div><div class="small">${totalEx?Math.round(v/totalEx*100):0}% dari pengeluaran</div></div>`).join(""):'<div class="empty">Belum ada pengeluaran.</div>')}
$("quick").innerHTML=[["💰 Gaji","Gaji","income"],["🚬 Rokok","Rokok","expense"],["🍚 Makan","Makan & Minum","expense"],["👨‍👩‍👦 Keluarga","Kirim Keluarga","expense"],["👕 Shopping","Shopping","expense"],["🎮 Hiburan","Hiburan","expense"],["🏦 Tabungan","Tabungan","transfer"],["🆘 Emergency","Emergency","transfer"],["＋ Lainnya",null,null]].map(([label,c,t])=>`<button class="btn" data-qcat="${c||""}" data-qtype="${t||""}">${label}</button>`).join("");
document.querySelectorAll("[data-qcat]").forEach(b=>b.onclick=()=>openAdd(b.dataset.qcat||null,b.dataset.qtype||null));$("addNav").onclick=()=>openAdd();document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>setPage(b.dataset.page));document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));$("prevTop").onclick=()=>shiftMonth(-1);$("nextTop").onclick=()=>shiftMonth(1);$("allBtn").onclick=()=>setPage("history");$("type").onchange=()=>populateCats();
$("txForm").onsubmit=e=>{e.preventDefault();const amount=Math.round(Number($("amount").value)),date=$("date").value,category=$("category").value,type=$("type").value;if(!Number.isFinite(amount)||amount<=0||!date||!category){toast("Periksa nominal, tanggal, dan kategori.");return}const id=$("editId").value;if(id){const i=db.tx.findIndex(x=>String(x.id)===String(id));if(i>=0)db.tx[i]={...db.tx[i],type,category,amount,date,note:$("note").value.trim(),created:db.tx[i].created||Date.now()}}else{db.tx.push({id:String(Date.now())+"_"+Math.random().toString(36).slice(2),type,category,amount,date,note:$("note").value.trim(),created:Date.now()})}month=date.slice(0,7);closeModal("txModal");render();toast("Transaksi tersimpan")};
$("deleteBtn").onclick=()=>{const id=$("editId").value;if(!id)return;db.tx=db.tx.filter(x=>String(x.id)!==String(id));closeModal("txModal");render();toast("Transaksi dihapus")};
function openGoal(){$("goalInput").value=Number(db.goal)||0;openModal("goalModal")}
$("goalBtn").onclick=openGoal;$("goalSet").onclick=openGoal;$("goalForm").onsubmit=e=>{e.preventDefault();const n=Math.max(0,Math.round(Number($("goalInput").value)||0));db.goal=n;closeModal("goalModal");render();toast("Target diperbarui")};
function openBudget(){$("budgetInputs").innerHTML=BUDGET_CATS.map(cat=>`<div class="budgetInputs"><label for="b_${cat.replace(/\W/g,'_')}">${esc(cat)}</label><input id="b_${cat.replace(/\W/g,'_')}" data-bcat="${esc(cat)}" inputmode="numeric" type="number" min="0" step="1" value="${Number(db.budget[cat]||0)}"></div>`).join("");openModal("budgetModal")}
$("budgetBtn").onclick=openBudget;$("budgetSet").onclick=openBudget;$("budgetForm").onsubmit=e=>{e.preventDefault();document.querySelectorAll("[data-bcat]").forEach(inp=>db.budget[inp.dataset.bcat]=Math.max(0,Math.round(Number(inp.value)||0)));closeModal("budgetModal");render();toast("Budget diperbarui")};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="Kaigo-Money-Backup.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("importBtn").onclick=()=>{const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.tx)||typeof x.budget!=="object")throw new Error();db={budget:{...DEFAULT_BUDGET,...x.budget},goal:Number(x.goal)||0,tx:x.tx,month:/^\d{4}-\d{2}$/.test(x.month||"")?x.month:month};month=db.month;persist();render();toast("Backup berhasil dipulihkan")}catch(_){toast("File backup tidak valid")}};r.readAsText(f)};input.click()};
$("resetBtn").onclick=()=>openModal("resetModal");$("confirmReset").onclick=()=>{db={budget:{...DEFAULT_BUDGET},goal:0,tx:[],month:"2026-08"};month="2026-08";persist();closeModal("resetModal");setPage("home");toast("Semua data sudah direset")};
render();