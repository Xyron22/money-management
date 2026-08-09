"use strict";
(function(){
  // Keep stored Indonesian category keys unchanged; only polish what users see.
  CAT_LABELS["Makan & Minum"].html = "<ruby>食費<rt>しょくひ</rt></ruby>";
  CAT_LABELS["Makan & Minum"].plain = "食費（しょくひ）";
  CAT_LABELS["Hiburan"].html = "<ruby>趣味<rt>しゅみ</rt></ruby>・<ruby>娯楽<rt>ごらく</rt></ruby>";
  CAT_LABELS["Hiburan"].plain = "趣味・娯楽（しゅみ・ごらく）";
  CAT_LABELS["Kebutuhan Kerja"].html = "<ruby>仕事関連<rt>しごとかんれん</rt></ruby>";
  CAT_LABELS["Kebutuhan Kerja"].plain = "仕事関連（しごとかんれん）";

  function polishStaticLabels(){
    const heroLabel = document.querySelector("#home .hero > .dual.light");
    if(heroLabel){
      heroLabel.innerHTML = '<div class="jp"><ruby>残<rt>のこ</rt></ruby>りのお<ruby>金<rt>かね</rt></ruby></div><div class="idn">Uang yang tersisa</div>';
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

  render();
})();
