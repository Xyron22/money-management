"use strict";
const KEY="kaigo_money_final_v1";
const BUDGET_CATS=["Kirim Keluarga","Tabungan","Rokok","Makan & Minum","Shopping","Hiburan","Emergency","Buffer"];
const DEFAULT_BUDGET=Object.fromEntries(BUDGET_CATS.map(x=>[x,0]));
const CATEGORY_MAP={
 income:["Gaji","Pemasukan Lainnya"],
 expense:["Kirim Keluarga","Rokok","Makan & Minum","Shopping","Hiburan","Buffer","Transportasi","Kebutuhan Kerja","Kesehatan","Lainnya"],
 transfer:["Tabungan","Emergency"]
};
const CAT_LABELS={
 "Gaji":{html:"<ruby>給料<rt>きゅうりょう</rt></ruby>",plain:"給料（きゅうりょう）"},
 "Pemasukan Lainnya":{html:"その<ruby>他<rt>た</rt></ruby>の<ruby>収入<rt>しゅうにゅう</rt></ruby>",plain:"その他の収入（そのたのしゅうにゅう）"},
 "Kirim Keluarga":{html:"<ruby>家族<rt>かぞく</rt></ruby>への<ruby>送金<rt>そうきん</rt></ruby>",plain:"家族への送金（かぞくへのそうきん）"},
 "Tabungan":{html:"<ruby>貯金<rt>ちょきん</rt></ruby>",plain:"貯金（ちょきん）"},
 "Rokok":{html:"たばこ",plain:"たばこ"},
 "Makan & Minum":{html:"<ruby>飲食<rt>いんしょく</rt></ruby>",plain:"飲食（いんしょく）"},
 "Shopping":{html:"<ruby>買<rt>か</rt></ruby>い<ruby>物<rt>もの</rt></ruby>",plain:"買い物（かいもの）"},
 "Hiburan":{html:"<ruby>娯楽<rt>ごらく</rt></ruby>",plain:"娯楽（ごらく）"},
 "Emergency":{html:"<ruby>緊急用<rt>きんきゅうよう</rt></ruby>",plain:"緊急用（きんきゅうよう）"},
 "Buffer":{html:"<ruby>予備費<rt>よびひ</rt></ruby>",plain:"予備費（よびひ）"},
 "Transportasi":{html:"<ruby>交通費<rt>こうつうひ</rt></ruby>",plain:"交通費（こうつうひ）"},
 "Kebutuhan Kerja":{html:"<ruby>仕事用品<rt>しごとようひん</rt></ruby>",plain:"仕事用品（しごとようひん）"},
 "Kesehatan":{html:"<ruby>健康<rt>けんこう</rt></ruby>・<ruby>医療<rt>いりょう</rt></ruby>",plain:"健康・医療（けんこう・いりょう）"},
 "Lainnya":{html:"その<ruby>他<rt>た</rt></ruby>",plain:"その他（そのた）"}
};
const $=id=>document.getElementById(id);
const yen=n=>"¥"+Math.round(Number(n)||0).toLocaleString("ja-JP");
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const dual=(jp,idn,extra="")=>`<span class="dual ${extra}"><span class="jp">${jp}</span><span class="idn">${esc(idn)}</span></span>`;
const catHtml=key=>{const x=CAT_LABELS[key];return x?dual(x.html,key,"catlabel"):dual(esc(key),key,"catlabel")};
const catPlain=key=>{const x=CAT_LABELS[key];return x?`${x.plain} — ${key}`:key};
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
function toast(jp,idn){$("toast").innerHTML=dual(jp,idn,"compact");$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1800)}
function fmtMonth(m){const [y,mo]=m.split("-").map(Number);const id=new Date(y,mo-1,1).toLocaleDateString("id-ID",{month:"long",year:"numeric"});return dual(`${y}<ruby>年<rt>ねん</rt></ruby>${mo}<ruby>月<rt>がつ</rt></ruby>`,id,"compact")}
function monthTx(){return db.tx.filter(x=>String(x.date||"").slice(0,7)===month)}
function totals(){const t=monthTx();return {income:t.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount||0),0),expense:t.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount||0),0),transfer:t.filter(x=>x.type==="transfer").reduce((a,x)=>a+Number(x.amount||0),0)}}
function budgetUsed(cat){return monthTx().filter(x=>{if(cat==="Tabungan"||cat==="Emergency")return x.type==="transfer"&&x.category===cat;return x.type==="expense"&&x.category===cat}).reduce((a,x)=>a+Number(x.amount||0),0)}
function render(){
 $("monthName").innerHTML=fmtMonth(month);
 const t=totals(),available=t.income-t.expense-t.transfer;
 $("income").textContent=yen(t.income);$("expense").textContent=yen(t.expense);$("transfers").textContent=yen(t.transfer);$("balance").textContent=yen(available);
 $("budget").innerHTML=BUDGET_CATS.map(cat=>{const b=Number(db.budget[cat]||0),used=budgetUsed(cat),pct=b>0?Math.min(100,used/b*100):0,over=b>0&&used>b,right=b>0?`${Math.round(used/b*100)}%`:"—";return `<div class="baritem"><div class="row"><div>${catHtml(cat)}<div class="small">${yen(used)} / ${yen(b)} ${over?`<span class="pill"><span><ruby>超過<rt>ちょうか</rt></ruby></span><span class="idn">melebihi</span></span>`:""}</div></div><b>${right}</b></div><div class="progress"><div class="fill ${over?'over':''}" style="width:${pct}%"></div></div></div>`}).join("");
 const saved=db.tx.filter(x=>x.type==="transfer"&&x.category==="Tabungan").reduce((a,x)=>a+Number(x.amount||0),0),pct=db.goal>0?Math.min(100,saved/db.goal*100):0;
 $("saved").textContent=yen(saved);
 $("goalPct").innerHTML=db.goal>0?pct.toFixed(1)+"%":dual("<ruby>未設定<rt>みせってい</rt></ruby>","Belum diatur","compact");
 $("goalFill").style.width=pct+"%";
 $("goalText").innerHTML=db.goal>0?dual(`<ruby>目標<rt>もくひょう</rt></ruby> ${yen(db.goal)} ・ <ruby>残<rt>のこ</rt></ruby>り ${yen(Math.max(0,db.goal-saved))}`,`Target ${yen(db.goal)} · sisa ${yen(Math.max(0,db.goal-saved))}`):dual(`<ruby>変更<rt>へんこう</rt></ruby>を<ruby>押<rt>お</rt></ruby>して<ruby>貯金目標<rt>ちょきんもくひょう</rt></ruby>を<ruby>設定<rt>せってい</rt></ruby>してください。`,`Tekan Ubah untuk menentukan target tabungan.`);
 const list=[...monthTx()].sort((a,b)=>(b.created||0)-(a.created||0));
 const empty=dual(`<ruby>今月<rt>こんげつ</rt></ruby>はまだ<ruby>取引<rt>とりひき</rt></ruby>がありません。`,`Belum ada transaksi bulan ini.`);
 $("recent").innerHTML=list.length?list.slice(0,7).map(txHtml).join(""):`<div class="empty">${empty}</div>`;
 $("all").innerHTML=list.length?list.map(txHtml).join(""):`<div class="empty">${empty}</div>`;
 bindTransactionRows();renderStats();persist();
}
function txHtml(x){const sign=x.type==="income"?"+":x.type==="expense"?"-":"↗";return `<div class="item clickable" data-txid="${esc(x.id)}"><div class="row"><div>${catHtml(x.category)}<div class="small">${esc(x.date)}${x.note?" · "+esc(x.note):""}</div></div><b class="${esc(x.type)}">${sign}${yen(x.amount)}</b></div></div>`}
function bindTransactionRows(){document.querySelectorAll("[data-txid]").forEach(el=>el.onclick=()=>openEdit(el.dataset.txid))}
function setPage(p){document.querySelectorAll("main").forEach(x=>x.classList.add("hidden"));$(p).classList.remove("hidden");document.querySelectorAll("nav [data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===p));render()}
function populateCats(selected){const cats=CATEGORY_MAP[$("type").value]||CATEGORY_MAP.expense;$("category").innerHTML=cats.map(x=>`<option value="${esc(x)}">${esc(catPlain(x))}</option>`).join("");if(selected&&cats.includes(selected))$("category").value=selected}
function localISODate(d=new Date()){const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${day}`}
function defaultDate(){const today=localISODate(),ym=today.slice(0,7);return ym===month?today:month+"-01"}
function openAdd(prefCat=null,prefType=null){$("txModalTitle").innerHTML=dual(`<ruby>取引<rt>とりひき</rt></ruby>を<ruby>追加<rt>ついか</rt></ruby>`,`Tambah transaksi`);$("editId").value="";$("type").value=prefType||"expense";populateCats(prefCat);$("amount").value="";$("date").value=defaultDate();$("note").value="";$("deleteBtn").classList.add("hidden");openModal("txModal")}
function openEdit(id){const x=db.tx.find(t=>String(t.id)===String(id));if(!x)return;$("txModalTitle").innerHTML=dual(`<ruby>取引<rt>とりひき</rt></ruby>を<ruby>編集<rt>へんしゅう</rt></ruby>`,`Edit transaksi`);$("editId").value=x.id;$("type").value=x.type;populateCats(x.category);$("amount").value=x.amount;$("date").value=x.date;$("note").value=x.note||"";$("deleteBtn").classList.remove("hidden");openModal("txModal")}
function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}
function shiftMonth(delta){const [y,m]=month.split("-").map(Number);const idx=y*12+(m-1)+delta;const ny=Math.floor(idx/12),nm=((idx%12)+12)%12+1;month=`${ny}-${String(nm).padStart(2,"0")}`;render()}
function renderStats(){
 const ex=monthTx().filter(x=>x.type==="expense"),tr=monthTx().filter(x=>x.type==="transfer"),totalEx=ex.reduce((a,x)=>a+Number(x.amount||0),0),map={};
 ex.forEach(x=>map[x.category]=(map[x.category]||0)+Number(x.amount||0));
 const rows=Object.entries(map).sort((a,b)=>b[1]-a[1]),saved=tr.reduce((a,x)=>a+Number(x.amount||0),0);
 $("statistics").innerHTML=`<div class="grid"><div class="stat"><small>${dual(`<ruby>支出合計<rt>ししゅつごうけい</rt></ruby>`,`Total pengeluaran`,`compact`)}</small><b>${yen(totalEx)}</b></div><div class="stat"><small>${dual(`<ruby>貯蓄合計<rt>ちょちくごうけい</rt></ruby>`,`Total disimpan`,`compact`)}</small><b>${yen(saved)}</b></div></div>`+(rows.length?rows.map(([k,v])=>`<div class="baritem"><div class="row">${catHtml(k)}<b>${yen(v)}</b></div><div class="progress"><div class="fill" style="width:${totalEx?v/totalEx*100:0}%"></div></div><div class="small">${dual(`<ruby>支出<rt>ししゅつ</rt></ruby>の ${totalEx?Math.round(v/totalEx*100):0}%`,`${totalEx?Math.round(v/totalEx*100):0}% dari pengeluaran`,`compact`)}</div></div>`).join(""):`<div class="empty">${dual(`<ruby>支出<rt>ししゅつ</rt></ruby>はまだありません。`,`Belum ada pengeluaran.`)}</div>`);
}
const QUICK=[
 ["💰","Gaji","income"],["🚬","Rokok","expense"],["🍚","Makan & Minum","expense"],["👨‍👩‍👦","Kirim Keluarga","expense"],["👕","Shopping","expense"],["🎮","Hiburan","expense"],["🏦","Tabungan","transfer"],["🆘","Emergency","transfer"],["＋",null,null]
];
$("quick").innerHTML=QUICK.map(([icon,c,t])=>{const label=c?catHtml(c):dual(`その<ruby>他<rt>た</rt></ruby>`,`Lainnya`,`catlabel`);return `<button class="btn" data-qcat="${c||""}" data-qtype="${t||""}"><span>${icon}</span> ${label}</button>`}).join("");
document.querySelectorAll("[data-qcat]").forEach(b=>b.onclick=()=>openAdd(b.dataset.qcat||null,b.dataset.qtype||null));
$("addNav").onclick=()=>openAdd();document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>setPage(b.dataset.page));document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));$("prevTop").onclick=()=>shiftMonth(-1);$("nextTop").onclick=()=>shiftMonth(1);$("allBtn").onclick=()=>setPage("history");$("type").onchange=()=>populateCats();
$("txForm").onsubmit=e=>{e.preventDefault();const amount=Math.round(Number($("amount").value)),date=$("date").value,category=$("category").value,type=$("type").value;if(!Number.isFinite(amount)||amount<=0||!date||!category){toast(`<ruby>金額<rt>きんがく</rt></ruby>・<ruby>日付<rt>ひづけ</rt></ruby>・カテゴリーを<ruby>確認<rt>かくにん</rt></ruby>してください。`,`Periksa nominal, tanggal, dan kategori.`);return}const id=$("editId").value;if(id){const i=db.tx.findIndex(x=>String(x.id)===String(id));if(i>=0)db.tx[i]={...db.tx[i],type,category,amount,date,note:$("note").value.trim(),created:db.tx[i].created||Date.now()}}else{db.tx.push({id:String(Date.now())+"_"+Math.random().toString(36).slice(2),type,category,amount,date,note:$("note").value.trim(),created:Date.now()})}month=date.slice(0,7);closeModal("txModal");render();toast(`<ruby>取引<rt>とりひき</rt></ruby>を<ruby>保存<rt>ほぞん</rt></ruby>しました`,`Transaksi tersimpan`)};
$("deleteBtn").onclick=()=>{const id=$("editId").value;if(!id)return;db.tx=db.tx.filter(x=>String(x.id)!==String(id));closeModal("txModal");render();toast(`<ruby>取引<rt>とりひき</rt></ruby>を<ruby>削除<rt>さくじょ</rt></ruby>しました`,`Transaksi dihapus`)};
function openGoal(){$("goalInput").value=Number(db.goal)||0;openModal("goalModal")}
$("goalBtn").onclick=openGoal;$("goalSet").onclick=openGoal;$("goalForm").onsubmit=e=>{e.preventDefault();const n=Math.max(0,Math.round(Number($("goalInput").value)||0));db.goal=n;closeModal("goalModal");render();toast(`<ruby>目標<rt>もくひょう</rt></ruby>を<ruby>更新<rt>こうしん</rt></ruby>しました`,`Target diperbarui`)};
function openBudget(){$("budgetInputs").innerHTML=BUDGET_CATS.map(cat=>`<div class="budgetInputs"><label for="b_${cat.replace(/\W/g,'_')}">${catHtml(cat)}</label><input id="b_${cat.replace(/\W/g,'_')}" data-bcat="${esc(cat)}" inputmode="numeric" type="number" min="0" step="1" value="${Number(db.budget[cat]||0)}"></div>`).join("");openModal("budgetModal")}
$("budgetBtn").onclick=openBudget;$("budgetSet").onclick=openBudget;$("budgetForm").onsubmit=e=>{e.preventDefault();document.querySelectorAll("[data-bcat]").forEach(inp=>db.budget[inp.dataset.bcat]=Math.max(0,Math.round(Number(inp.value)||0)));closeModal("budgetModal");render();toast(`<ruby>予算<rt>よさん</rt></ruby>を<ruby>更新<rt>こうしん</rt></ruby>しました`,`Budget diperbarui`)};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="Money-Management-By-Tenka-Backup.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("importBtn").onclick=()=>{const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.tx)||typeof x.budget!=="object")throw new Error();db={budget:{...DEFAULT_BUDGET,...x.budget},goal:Number(x.goal)||0,tx:x.tx,month:/^\d{4}-\d{2}$/.test(x.month||"")?x.month:month};month=db.month;persist();render();toast(`バックアップを<ruby>復元<rt>ふくげん</rt></ruby>しました`,`Backup berhasil dipulihkan`)}catch(_){toast(`バックアップファイルが<ruby>無効<rt>むこう</rt></ruby>です`,`File backup tidak valid`)}};r.readAsText(f)};input.click()};
$("resetBtn").onclick=()=>openModal("resetModal");$("confirmReset").onclick=()=>{db={budget:{...DEFAULT_BUDGET},goal:0,tx:[],month:"2026-08"};month="2026-08";persist();closeModal("resetModal");setPage("home");toast(`すべてのデータをリセットしました`,`Semua data sudah direset`)};
render();