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

  function currentMonthLocal(){
    const d = new Date();
    return String(d.getFullYear()) + "-" + String(d.getMonth()+1).padStart(2,"0");
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

  function polishStaticLabels(){
    const heroLabel = document.querySelector("#home .hero > .dual.light");
    if(heroLabel){
      heroLabel.innerHTML = '<div class="jp"><ruby>今月<rt>こんげつ</rt></ruby><ruby>使<rt>つか</rt></ruby>えるお<ruby>金<rt>かね</rt></ruby></div><div class="idn">Uang yang bisa dipakai bulan ini</div>';
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
  }

  const baseRender = render;
  render = function(){
    baseRender();
    polishStaticLabels();
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

  // Reset should always return to the actual current local month, not a hard-coded month.
  document.getElementById("confirmReset").onclick = function(){
    const ym = currentMonthLocal();
    db = {budget:{...DEFAULT_BUDGET},goal:0,tx:[],month:ym};
    month = ym;
    persist();
    closeModal("resetModal");
    setPage("home");
    toast(`すべてのデータをリセットしました`,`Semua data sudah direset`);
  };

  render();
})();
