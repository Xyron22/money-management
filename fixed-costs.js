"use strict";
(function(){
  const FIXED_KEY="money_management_fixed_costs_v1";
  const BASELINE_KEY="money_management_baseline_income_v1";
  const currentYM=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")};
  const loadFixed=()=>{try{const x=JSON.parse(localStorage.getItem(FIXED_KEY)||"[]");return Array.isArray(x)?x:[]}catch(_){return []}};
  const saveFixed=x=>localStorage.setItem(FIXED_KEY,JSON.stringify(x));
  const makeId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const billingDate=(ym,day)=>{const p=ym.split("-").map(Number),last=new Date(p[0],p[1],0).getDate();return ym+"-"+String(Math.min(Math.max(1,Number(day)||1),last)).padStart(2,"0")};

  if(!CATEGORY_MAP.expense.includes("Langganan")) CATEGORY_MAP.expense.push("Langganan");
  if(!BUDGET_CATS.includes("Langganan")) BUDGET_CATS.push("Langganan");
  if(!Object.prototype.hasOwnProperty.call(db.budget,"Langganan")) db.budget["Langganan"]=0;
  CAT_LABELS["Langganan"]={html:"<ruby>固定費<rt>こていひ</rt></ruby>・サブスク",plain:"固定費・サブスク（こていひ）"};

  function ensureMonthlyFixed(){
    const costs=loadFixed();
    let changed=false;
    costs.filter(x=>x.active!==false && (!x.startMonth||month>=x.startMonth)).forEach(x=>{
      const id="fixed:"+x.id+":"+month;
      const existing=db.tx.find(t=>String(t.id)===id);
      const wanted={category:x.category||"Langganan",amount:Number(x.amount)||0,date:billingDate(month,x.day),note:x.name+" / 自動登録・biaya rutin"};
      if(!existing){
        db.tx.push({id:id,type:"expense",category:wanted.category,amount:wanted.amount,date:wanted.date,note:wanted.note,created:new Date(wanted.date+"T12:00:00").getTime(),fixedCostId:x.id});
        changed=true;
      }else if(existing.fixedCostId===x.id && (existing.category!==wanted.category || Number(existing.amount)!==wanted.amount || existing.date!==wanted.date || existing.note!==wanted.note)){
        Object.assign(existing,wanted);
        changed=true;
      }
    });
    if(changed) persist();
  }

  function ensureUI(){
    if(!document.getElementById("fixedCostCard")){
      const card=document.createElement("section");
      card.className="card";card.id="fixedCostCard";
      card.innerHTML='<div class="row"><div class="title">🔁 <span class="dual inline"><span class="jp"><ruby>固定費<rt>こていひ</rt></ruby>・サブスク</span><span class="idn">Biaya rutin & langganan</span></span></div><button class="btn outline" id="fixedManage"><span class="dual compact"><span class="jp"><ruby>管理<rt>かんり</rt></ruby></span><span class="idn">Kelola</span></span></button></div><div id="fixedSummary"></div>';
      const quick=document.querySelector("#home .card:nth-last-of-type(2)");
      const recent=document.getElementById("recent")?.closest(".card");
      if(recent) recent.parentNode.insertBefore(card,recent); else document.getElementById("home").appendChild(card);
    }
    if(!document.getElementById("fixedSet")){
      const a=document.createElement("div");a.className="actions";
      a.innerHTML='<button class="btn outline" id="fixedSet">🔁 <span class="dual compact"><span class="jp"><ruby>固定費<rt>こていひ</rt></ruby>・サブスク</span><span class="idn">Biaya rutin</span></span></button>';
      const reset=document.getElementById("resetBtn")?.closest(".actions");
      if(reset) reset.parentNode.insertBefore(a,reset);
    }
    if(!document.getElementById("fixedModal")){
      const m=document.createElement("div");m.id="fixedModal";m.className="modal hidden";
      m.innerHTML='<div class="sheet"><div class="row"><b>🔁 <span class="dual inline"><span class="jp"><ruby>固定費<rt>こていひ</rt></ruby>・サブスク</span><span class="idn">Biaya rutin & langganan</span></span></b><button class="btn outline" data-close-fixed>✕</button></div><p class="note"><span class="dual"><span class="jp"><ruby>毎月<rt>まいつき</rt></ruby>、<ruby>請求日<rt>せいきゅうび</rt></ruby>に<ruby>支出<rt>ししゅつ</rt></ruby>として<ruby>自動登録<rt>じどうとうろく</rt></ruby>されます。</span><span class="idn">Otomatis dicatat sebagai pengeluaran setiap bulan pada tanggal tagihan.</span></span></p><div id="fixedList"></div><button class="btn dark" id="fixedAdd" style="width:100%;margin-top:12px"><span class="dual compact"><span class="jp">＋ <ruby>固定費<rt>こていひ</rt></ruby>を<ruby>追加<rt>ついか</rt></ruby></span><span class="idn">Tambah biaya rutin</span></span></button></div>';
      document.body.appendChild(m);
    }
    if(!document.getElementById("fixedEditModal")){
      const m=document.createElement("div");m.id="fixedEditModal";m.className="modal hidden";
      m.innerHTML='<div class="sheet"><div class="row"><b id="fixedEditTitle"></b><button class="btn outline" data-close-fixed-edit>✕</button></div><form id="fixedForm" class="form" style="margin-top:14px"><input type="hidden" id="fixedId"><label><span class="dual formdual"><span class="jp"><ruby>名前<rt>なまえ</rt></ruby></span><span class="idn">Nama layanan</span></span><input id="fixedName" maxlength="40" placeholder="例：iCloud+" required></label><label><span class="dual formdual"><span class="jp"><ruby>月額<rt>げつがく</rt></ruby> (¥)</span><span class="idn">Biaya bulanan (¥)</span></span><input id="fixedAmount" type="number" inputmode="numeric" min="1" step="1" required></label><label><span class="dual formdual"><span class="jp"><ruby>請求日<rt>せいきゅうび</rt></ruby></span><span class="idn">Tanggal tagihan</span></span><input id="fixedDay" type="number" inputmode="numeric" min="1" max="31" required></label><label><span class="dual formdual"><span class="jp"><ruby>開始月<rt>かいしづき</rt></ruby></span><span class="idn">Mulai bulan</span></span><input id="fixedStart" type="month" required></label><label><span class="dual formdual"><span class="jp">カテゴリー</span><span class="idn">Kategori</span></span><select id="fixedCategory"></select></label><label class="fixedCheck"><input id="fixedActive" type="checkbox"><span class="dual formdual"><span class="jp"><ruby>有効<rt>ゆうこう</rt></ruby></span><span class="idn">Aktif</span></span></label><button class="btn dark" type="submit"><span class="dual compact"><span class="jp"><ruby>保存<rt>ほぞん</rt></ruby></span><span class="idn">Simpan</span></span></button><button class="btn red hidden" id="fixedDelete" type="button"><span class="dual compact"><span class="jp"><ruby>削除<rt>さくじょ</rt></ruby></span><span class="idn">Hapus biaya rutin</span></span></button></form></div>';
      document.body.appendChild(m);
    }
    document.getElementById("fixedManage").onclick=openManager;
    document.getElementById("fixedSet").onclick=openManager;
    document.querySelector("[data-close-fixed]").onclick=()=>closeModal("fixedModal");
    document.querySelector("[data-close-fixed-edit]").onclick=()=>closeModal("fixedEditModal");
    document.getElementById("fixedAdd").onclick=()=>openFixedEdit();
  }

  function renderFixed(){
    ensureUI();
    const costs=loadFixed(),active=costs.filter(x=>x.active!==false),total=active.reduce((a,x)=>a+(Number(x.amount)||0),0);
    const s=document.getElementById("fixedSummary");
    s.innerHTML=active.length?'<div class="row"><span class="small">'+active.length+' layanan aktif</span><b>'+yen(total)+' / 月</b></div><div class="fixedChips">'+active.map(x=>'<span class="fixedChip">'+esc(x.name)+' '+yen(x.amount)+'</span>').join("")+'</div>':'<div class="empty"><span class="dual"><span class="jp"><ruby>固定費<rt>こていひ</rt></ruby>はまだありません。</span><span class="idn">Belum ada biaya rutin.</span></span></div>';
  }
  function openManager(){
    const list=document.getElementById("fixedList"),costs=loadFixed();
    list.innerHTML=costs.length?costs.map(x=>'<button class="fixedItem '+(x.active===false?'off':'')+'" data-fixed-id="'+esc(x.id)+'"><span><b>'+esc(x.name)+'</b><small>'+yen(x.amount)+'・毎月'+Number(x.day)+'日</small></span><span>'+(x.active===false?'停止':'›')+'</span></button>').join(""):'<div class="empty">登録された固定費はありません。<span class="idn">Belum ada biaya rutin.</span></div>';
    list.querySelectorAll("[data-fixed-id]").forEach(b=>b.onclick=()=>openFixedEdit(b.dataset.fixedId));
    openModal("fixedModal");
  }
  function openFixedEdit(id){
    const x=loadFixed().find(v=>v.id===id);
    document.getElementById("fixedEditTitle").innerHTML=x?dual("<ruby>固定費<rt>こていひ</rt></ruby>を<ruby>編集<rt>へんしゅう</rt></ruby>","Edit biaya rutin","inline"):dual("<ruby>固定費<rt>こていひ</rt></ruby>を<ruby>追加<rt>ついか</rt></ruby>","Tambah biaya rutin","inline");
    document.getElementById("fixedId").value=x?.id||"";
    document.getElementById("fixedName").value=x?.name||"";
    document.getElementById("fixedAmount").value=x?.amount||"";
    document.getElementById("fixedDay").value=x?.day||1;
    document.getElementById("fixedStart").value=x?.startMonth||currentYM();
    document.getElementById("fixedActive").checked=x?x.active!==false:true;
    const sel=document.getElementById("fixedCategory");
    sel.innerHTML=["Langganan","Kesehatan","Transportasi","Hiburan","Lainnya"].map(c=>'<option value="'+c+'">'+catPlain(c)+'</option>').join("");
    sel.value=x?.category||"Langganan";
    document.getElementById("fixedDelete").classList.toggle("hidden",!x);
    openModal("fixedEditModal");
  }
  document.addEventListener("submit",e=>{
    if(e.target.id!=="fixedForm") return;
    e.preventDefault();
    const id=document.getElementById("fixedId").value||makeId(),costs=loadFixed(),i=costs.findIndex(x=>x.id===id);
    const item={id:id,name:document.getElementById("fixedName").value.trim(),amount:Math.round(Number(document.getElementById("fixedAmount").value)),day:Number(document.getElementById("fixedDay").value),startMonth:document.getElementById("fixedStart").value,category:document.getElementById("fixedCategory").value,active:document.getElementById("fixedActive").checked};
    if(i>=0) costs[i]=item; else costs.push(item);
    saveFixed(costs);closeModal("fixedEditModal");ensureMonthlyFixed();render();openManager();toast("<ruby>固定費<rt>こていひ</rt></ruby>を<ruby>保存<rt>ほぞん</rt></ruby>しました","Biaya rutin tersimpan");
  });
  document.addEventListener("click",e=>{
    if(!e.target.closest("#fixedDelete")) return;
    const id=document.getElementById("fixedId").value;
    saveFixed(loadFixed().filter(x=>x.id!==id));closeModal("fixedEditModal");render();openManager();toast("<ruby>固定費<rt>こていひ</rt></ruby>を<ruby>削除<rt>さくじょ</rt></ruby>しました","Biaya rutin dihapus");
  });

  const beforeRender=render;
  render=function(){ensureMonthlyFixed();beforeRender();renderFixed()};
  const oldExport=document.getElementById("exportBtn").onclick;
  document.getElementById("exportBtn").onclick=function(){
    const backup={...db,baselineIncome:Number(localStorage.getItem(BASELINE_KEY)||130000),fixedCosts:loadFixed()};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="Money-Management-By-Tenka-Backup.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  document.getElementById("importBtn").onclick=function(){
    const input=document.createElement("input");input.type="file";input.accept=".json,application/json";
    input.onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!Array.isArray(x.tx)||typeof x.budget!=="object")throw Error();db={budget:{...DEFAULT_BUDGET,...x.budget},goal:Number(x.goal)||0,tx:x.tx,month:/^\d{4}-\d{2}$/.test(x.month||"")?x.month:month};month=db.month;if(Number.isFinite(Number(x.baselineIncome)))localStorage.setItem(BASELINE_KEY,String(x.baselineIncome));if(Array.isArray(x.fixedCosts))saveFixed(x.fixedCosts);persist();render();toast("バックアップを<ruby>復元<rt>ふくげん</rt></ruby>しました","Backup berhasil dipulihkan")}catch(_){toast("バックアップファイルが<ruby>無効<rt>むこう</rt></ruby>です","File backup tidak valid")}};r.readAsText(f)};input.click();
  };
  const oldReset=document.getElementById("confirmReset").onclick;
  document.getElementById("confirmReset").onclick=function(){localStorage.removeItem(FIXED_KEY);oldReset();render()};
  const style=document.createElement("style");
  style.textContent=".fixedChips{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.fixedChip{background:#f3f4f6;border-radius:99px;padding:5px 8px;font-size:10px}.fixedItem{width:100%;display:flex;align-items:center;justify-content:space-between;border:0;border-bottom:1px solid #eee;background:#fff;padding:12px 2px;text-align:left;color:var(--text)}.fixedItem span:first-child{display:flex;flex-direction:column;gap:3px}.fixedItem small{color:var(--muted)}.fixedItem.off{opacity:.55}.fixedCheck{display:flex;align-items:center;gap:10px}.fixedCheck input{width:22px;height:22px;margin:0}";
  document.head.appendChild(style);
  ensureUI();render();
})();