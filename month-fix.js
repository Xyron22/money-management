"use strict";
(function(){
  // Keep stored Indonesian category keys unchanged; only polish what users see.
  CAT_LABELS["Makan & Minum"].html = "<ruby>食費<rt>しょくひ</rt></ruby>";
  CAT_LABELS["Makan & Minum"].plain = "食費（しょくひ）";
  CAT_LABELS["Hiburan"].html = "<ruby>趣味<rt>しゅみ</rt></ruby>・<ruby>娯楽<rt>ごらく</rt></ruby>";
  CAT_LABELS["Hiburan"].plain = "趣味・娯楽（しゅみ・ごらく）";
  CAT_LABELS["Kebutuhan Kerja"].html = "<ruby>仕事関連<rt>しごとかんれん</rt></ruby>";
  CAT_LABELS["Kebutuhan Kerja"].plain = "仕事関連（しごとかんれん）";
  CAT_LABELS["Emergency"].html = "<ruby>緊急資金<rt>きんきゅうしきん</rt></ruby>";
  CAT_LABELS["Emergency"].plain = "緊急資金（きんきゅうしきん）";

  const BASELINE_KEY = "money_management_baseline_income_v1";
  const DEFAULT_BASELINE = 130000;

  function currentMonthLocal(){
    const d = new Date();
    return String(d.getFullYear()) + "-" + String(d.getMonth()+1).padStart(2,"0");
  }

  function getBaselineIncome(){
    const raw = localStorage.getItem(BASELINE_KEY);
    if(raw === null) return DEFAULT_BASELINE;
    const n = Math.round(Number(raw));
    return Number.isFinite(n) && n >= 0 ? n : DEFAULT_BASELINE;
  }

  function setBaselineIncome(value){
    const n = Math.max(0, Math.round(Number(value)||0));
    localStorage.setItem(BASELINE_KEY, String(n));
    return n;
  }

  if(localStorage.getItem(BASELINE_KEY) === null){
    setBaselineIncome(DEFAULT_BASELINE);
  }

  // Migration for a truly fresh/cleared browser: don't leave it stuck on the old 2026-08 fallback.
  const INIT_KEY = "money_management_init_v2";
  if(!localStorage.getItem(INIT_KEY)){
    const isBlank = db.tx.length === 0 && Number(db.goal||0) === 0 && Object.values(db.budget||{}).every(v=>Number(v||0)===0);
    const nowMonth = currentMonthLocal();
    if(isBlank && month === "2026-08" && nowMonth !== "2026-08"){
      month = nowMonth;
      db.month = nowMonth;
      persist();
    }
    localStorage.setItem(INIT_KEY,"1");
  }

  function ensureBaselineUI(){
    if(!document.getElementById("baselineCard")){
      const card = document.createElement("section");
      card.className = "card";
      card.id = "baselineCard";
      card.innerHTML = `
        <div class="row">
          <div class="title">💼 <span class="dual inline"><span class="jp"><ruby>収入基準<rt>しゅうにゅうきじゅん</rt></ruby></span><span class="idn">Patokan pemasukan</span></span></div>
          <button class="btn outline" id="baselineBtn" type="button"><span class="dual compact"><span class="jp"><ruby>変更<rt>へんこう</rt></ruby></span><span class="idn">Ubah</span></span></button>
        </div>
        <div class="grid3">
          <div class="stat"><small><span class="dual compact"><span class="jp"><ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby></span><span class="idn">Patokan</span></span></small><b id="baselineValue">¥0</b></div>
          <div class="stat"><small><span class="dual compact"><span class="jp"><ruby>実収入<rt>じつしゅうにゅう</rt></ruby></span><span class="idn">Aktual</span></span></small><b id="actualIncomeValue">¥0</b></div>
          <div class="stat"><small><span class="dual compact"><span class="jp"><ruby>差額<rt>さがく</rt></ruby></span><span class="idn">Selisih</span></span></small><b id="incomeDifference">—</b></div>
        </div>
        <div class="note" style="margin:10px 0 0"><span class="dual compact"><span class="jp"><ruby>予算<rt>よさん</rt></ruby>を<ruby>立<rt>た</rt></ruby>てるときの<ruby>目安<rt>めやす</rt></ruby>です。<ruby>残高<rt>ざんだか</rt></ruby>は<ruby>実際<rt>じっさい</rt></ruby>の<ruby>収入<rt>しゅうにゅう</rt></ruby>で<ruby>計算<rt>けいさん</rt></ruby>します。</span><span class="idn">Patokan untuk menyusun budget; saldo tetap dihitung dari pemasukan aktual.</span></span></div>`;
      const hero = document.querySelector("#home .hero");
      if(hero) hero.insertAdjacentElement("afterend", card);
    }

    if(!document.getElementById("baselineSet")){
      const settingsSection = document.querySelector("#settings .card");
      if(settingsSection){
        const action = document.createElement("div");
        action.className = "actions";
        action.innerHTML = `<button class="btn outline" id="baselineSet" type="button">💼 <span class="dual compact"><span class="jp"><ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby></span><span class="idn">Patokan pemasukan</span></span></button>`;
        const resetAction = document.getElementById("resetBtn")?.closest(".actions");
        if(resetAction) settingsSection.insertBefore(action, resetAction);
        else settingsSection.appendChild(action);
      }
    }

    if(!document.getElementById("baselineModal")){
      const modal = document.createElement("div");
      modal.className = "modal hidden";
      modal.id = "baselineModal";
      modal.innerHTML = `<div class="sheet">
        <div class="row"><b>💼 <span class="dual inline"><span class="jp"><ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby></span><span class="idn">Patokan pemasukan</span></span></b><button class="btn outline" id="closeBaselineModal" type="button">✕</button></div>
        <p class="note"><span class="dual"><span class="jp"><ruby>毎月<rt>まいつき</rt></ruby>の<ruby>生活予算<rt>せいかつよさん</rt></ruby>を<ruby>考<rt>かんが</rt></ruby>えるときの<ruby>基準額<rt>きじゅんがく</rt></ruby>です。</span><span class="idn">Angka tetap untuk menjadi patokan budget bulanan.</span></span></p>
        <form id="baselineForm" class="form">
          <label><span class="dual formdual"><span class="jp"><ruby>月<rt>つき</rt></ruby>の<ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby> (¥)</span><span class="idn">Patokan pemasukan bulanan (¥)</span></span><input id="baselineInput" inputmode="numeric" type="number" min="0" step="1"></label>
          <button class="btn dark" type="submit"><span class="dual compact"><span class="jp"><ruby>保存<rt>ほぞん</rt></ruby></span><span class="idn">Simpan</span></span></button>
        </form>
      </div>`;
      document.body.appendChild(modal);
    }

    const openBaseline = function(){
      const input = document.getElementById("baselineInput");
      if(input) input.value = getBaselineIncome();
      openModal("baselineModal");
    };
    const topBtn = document.getElementById("baselineBtn");
    const settingsBtn = document.getElementById("baselineSet");
    if(topBtn) topBtn.onclick = openBaseline;
    if(settingsBtn) settingsBtn.onclick = openBaseline;

    const closeBtn = document.getElementById("closeBaselineModal");
    if(closeBtn) closeBtn.onclick = function(){ closeModal("baselineModal"); };

    const form = document.getElementById("baselineForm");
    if(form) form.onsubmit = function(e){
      e.preventDefault();
      const input = document.getElementById("baselineInput");
      setBaselineIncome(input ? input.value : DEFAULT_BASELINE);
      closeModal("baselineModal");
      render();
      toast(`<ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby>を<ruby>更新<rt>こうしん</rt></ruby>しました`,`Patokan pemasukan diperbarui`);
    };
  }

  function renderBaseline(){
    ensureBaselineUI();
    const baseline = getBaselineIncome();
    const actual = totals().income;
    const baselineEl = document.getElementById("baselineValue");
    const actualEl = document.getElementById("actualIncomeValue");
    const diffEl = document.getElementById("incomeDifference");
    if(baselineEl) baselineEl.textContent = yen(baseline);
    if(actualEl) actualEl.textContent = yen(actual);
    if(diffEl){
      diffEl.classList.remove("income","expense");
      if(actual <= 0){
        diffEl.textContent = "—";
      }else{
        const diff = actual - baseline;
        diffEl.textContent = (diff > 0 ? "+" : diff < 0 ? "-" : "") + yen(Math.abs(diff));
        if(diff > 0) diffEl.classList.add("income");
        if(diff < 0) diffEl.classList.add("expense");
      }
    }
  }

  function refreshQuickButtons(){
    const icons={
      "Gaji":"💰","Rokok":"🚬","Makan & Minum":"🍚","Kirim Keluarga":"👨‍👩‍👦",
      "Shopping":"👕","Hiburan":"🎮","Tabungan":"🏦","Emergency":"🆘"
    };
    Object.entries(icons).forEach(([cat,icon])=>{
      const btn=document.querySelector(`#quick [data-qcat="${cat}"]`);
      if(btn) btn.innerHTML=`<span>${icon}</span> ${catHtml(cat)}`;
    });

    const other=document.querySelector('#quick [data-qcat=""]');
    if(other){
      other.dataset.qcat="Lainnya";
      other.dataset.qtype="expense";
      other.innerHTML=`<span>＋</span> ${catHtml("Lainnya")}`;
    }
  }

  function polishStaticLabels(){
    const heroLabel = document.querySelector("#home .hero > .dual.light");
    if(heroLabel){
      heroLabel.innerHTML = '<div class="jp"><ruby>残<rt>のこ</rt></ruby>りのお<ruby>金<rt>かね</rt></ruby></div><div class="idn">Sisa uang</div>';
    }

    const budgetTitle = document.getElementById("budgetBtn")?.parentElement?.querySelector(".title");
    if(budgetTitle){
      budgetTitle.innerHTML = '📦 <span class="dual inline"><span class="jp"><ruby>月<rt>つき</rt></ruby>の<ruby>予算<rt>よさん</rt></ruby></span><span class="idn">Budget bulanan</span></span>';
    }

    const budgetModalTitle = document.querySelector("#budgetModal .sheet > .row > b");
    if(budgetModalTitle){
      budgetModalTitle.innerHTML = '💴 <span class="dual inline"><span class="jp"><ruby>月<rt>つき</rt></ruby>の<ruby>予算<rt>よさん</rt></ruby></span><span class="idn">Budget bulanan</span></span>';
    }

    const statsTitle = document.querySelector("#stats .title");
    if(statsTitle){
      statsTitle.innerHTML = '📊 <span class="dual inline"><span class="jp"><ruby>支出分析<rt>ししゅつぶんせき</rt></ruby></span><span class="idn">Analisis pengeluaran</span></span>';
    }

    const statsNav = document.querySelector('nav [data-page="stats"] .dual');
    if(statsNav){
      statsNav.innerHTML = '<span class="jp"><ruby>分析<rt>ぶんせき</rt></ruby></span><span class="idn">Analisis</span>';
    }

    const homeNav = document.querySelector('nav [data-page="home"] .dual');
    if(homeNav){
      homeNav.innerHTML = '<span class="jp">ホーム</span><span class="idn">Beranda</span>';
    }

    const typeSelect = document.getElementById("type");
    if(typeSelect && typeSelect.options.length >= 3){
      typeSelect.options[0].textContent = "収入（しゅうにゅう）— Pemasukan";
      typeSelect.options[1].textContent = "支出（ししゅつ）— Pengeluaran";
      typeSelect.options[2].textContent = "振替（ふりかえ）— Pindah ke simpanan";
    }

    const categoryLabel = document.querySelector('#category')?.closest('label')?.querySelector('.jp');
    if(categoryLabel) categoryLabel.textContent = "カテゴリー";

    const noteLabel = document.querySelector('#note')?.closest('label')?.querySelector('.jp');
    if(noteLabel) noteLabel.textContent = "メモ";

    const goalAmountLabel = document.querySelector('#goalInput')?.closest('label')?.querySelector('.jp');
    if(goalAmountLabel){
      goalAmountLabel.innerHTML = '<ruby>目標金額<rt>もくひょうきんがく</rt></ruby> (¥)';
    }

    const settingsNote = document.querySelector('#settings .note .jp');
    if(settingsNote){
      settingsNote.innerHTML = settingsNote.innerHTML.replace('<ruby>データ<rt>でーた</rt></ruby>', 'データ');
    }

    document.querySelectorAll('#recent .empty .jp, #all .empty .jp').forEach(el=>{
      el.innerHTML = 'この<ruby>月<rt>つき</rt></ruby>にはまだ<ruby>取引<rt>とりひき</rt></ruby>がありません。';
    });
    document.querySelectorAll('#recent .empty .idn, #all .empty .idn').forEach(el=>{
      el.textContent = 'Belum ada transaksi pada bulan ini.';
    });

    refreshQuickButtons();
  }

  const baseRender = render;
  render = function(){
    baseRender();
    polishStaticLabels();
    renderBaseline();
  };

  function shiftMonthSafe(delta){
    const parts = String(month).split("-");
    let year = Number(parts[0]);
    let mon = Number(parts[1]);
    let index = year * 12 + (mon - 1) + delta;
    year = Math.floor(index / 12);
    mon = ((index % 12) + 12) % 12 + 1;
    month = String(year) + "-" + String(mon).padStart(2,"0");
    render();
  }

  document.getElementById("prevTop").onclick = function(){ shiftMonthSafe(-1); };
  document.getElementById("nextTop").onclick = function(){ shiftMonthSafe(1); };

  // Include the baseline-income setting in future backups.
  document.getElementById("exportBtn").onclick = function(){
    const backup = {...db, baselineIncome:getBaselineIncome()};
    const blob = new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Money-Management-By-Tenka-Backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  document.getElementById("importBtn").onclick = function(){
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = function(e){
      const f = e.target.files && e.target.files[0];
      if(!f) return;
      const r = new FileReader();
      r.onload = function(){
        try{
          const x = JSON.parse(r.result);
          if(!Array.isArray(x.tx) || typeof x.budget !== "object") throw new Error();
          db = {budget:{...DEFAULT_BUDGET,...x.budget},goal:Number(x.goal)||0,tx:x.tx,month:/^\d{4}-\d{2}$/.test(x.month||"")?x.month:month};
          month = db.month;
          if(Number.isFinite(Number(x.baselineIncome)) && Number(x.baselineIncome) >= 0){
            setBaselineIncome(x.baselineIncome);
          }
          persist();
          render();
          toast(`バックアップを<ruby>復元<rt>ふくげん</rt></ruby>しました`,`Backup berhasil dipulihkan`);
        }catch(_){
          toast(`バックアップファイルが<ruby>無効<rt>むこう</rt></ruby>です`,`File backup tidak valid`);
        }
      };
      r.readAsText(f);
    };
    input.click();
  };

  // Reset should always return to the actual current local month, not a hard-coded month.
  document.getElementById("confirmReset").onclick = function(){
    const ym = currentMonthLocal();
    db = {budget:{...DEFAULT_BUDGET},goal:0,tx:[],month:ym};
    month = ym;
    setBaselineIncome(DEFAULT_BASELINE);
    persist();
    closeModal("resetModal");
    setPage("home");
    toast(`すべてのデータをリセットしました`,`Semua data sudah direset`);
  };

  ensureBaselineUI();
  render();
})();
