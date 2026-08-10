"use strict";
(function(){
  function updateIncomeComparisonUI(){
    const card = document.getElementById("baselineCard");
    if(!card) return;

    const title = card.querySelector(".title");
    if(title){
      title.innerHTML = '💼 <span class="dual inline"><span class="jp"><ruby>収入比較<rt>しゅうにゅうひかく</rt></ruby></span><span class="idn">Perbandingan pemasukan</span></span>';
    }

    const baselineBtn = document.getElementById("baselineBtn");
    if(baselineBtn){
      baselineBtn.innerHTML = '<span class="dual compact"><span class="jp"><ruby>基準設定<rt>きじゅんせってい</rt></ruby></span><span class="idn">Atur patokan</span></span>';
    }

    let guide = document.getElementById("actualIncomeGuide");
    if(!guide){
      guide = document.createElement("div");
      guide.id = "actualIncomeGuide";
      guide.className = "note";
      guide.style.marginTop = "10px";
      guide.innerHTML = '<span class="dual compact"><span class="jp"><ruby>実収入<rt>じつしゅうにゅう</rt></ruby>は<ruby>収入取引<rt>しゅうにゅうとりひき</rt></ruby>から<ruby>自動計算<rt>じどうけいさん</rt></ruby>されます。</span><span class="idn">Aktual dihitung otomatis dari transaksi pemasukan.</span></span>';
      card.appendChild(guide);
    }

    let actualBtn = document.getElementById("actualIncomeBtn");
    if(!actualBtn){
      actualBtn = document.createElement("button");
      actualBtn.id = "actualIncomeBtn";
      actualBtn.type = "button";
      actualBtn.className = "btn dark";
      actualBtn.style.width = "100%";
      actualBtn.style.marginTop = "10px";
      actualBtn.innerHTML = '<span class="dual compact"><span class="jp"><ruby>実収入<rt>じつしゅうにゅう</rt></ruby>を<ruby>入力<rt>にゅうりょく</rt></ruby></span><span class="idn">Input pemasukan aktual</span></span>';
      actualBtn.onclick = function(){
        const salaryTx = monthTx().filter(x => x.type === "income" && x.category === "Gaji");
        if(salaryTx.length === 1) openEdit(salaryTx[0].id);
        else openAdd("Gaji","income");
      };
      card.appendChild(actualBtn);
    }

    const baselineModalTitle = document.querySelector("#baselineModal .sheet > .row > b");
    if(baselineModalTitle){
      baselineModalTitle.innerHTML = '💼 <span class="dual inline"><span class="jp"><ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby>の<ruby>設定<rt>せってい</rt></ruby></span><span class="idn">Atur patokan pemasukan</span></span>';
    }

    const baselineModalNote = document.querySelector("#baselineModal .note");
    if(baselineModalNote){
      baselineModalNote.innerHTML = '<span class="dual"><span class="jp">ここには<ruby>毎月<rt>まいつき</rt></ruby>の<ruby>基準額<rt>きじゅんがく</rt></ruby>だけを<ruby>入力<rt>にゅうりょく</rt></ruby>してください。<ruby>実際<rt>じっさい</rt></ruby>に<ruby>振<rt>ふ</rt></ruby>り<ruby>込<rt>こ</rt></ruby>まれた<ruby>給与<rt>きゅうよ</rt></ruby>は「<ruby>実収入<rt>じつしゅうにゅう</rt></ruby>を<ruby>入力<rt>にゅうりょく</rt></ruby>」から<ruby>登録<rt>とうろく</rt></ruby>します。</span><span class="idn">Isi hanya angka patokan bulanan di sini. Gaji yang benar-benar masuk dicatat lewat “Input pemasukan aktual”.</span></span>';
    }
  }

  const priorRender = render;
  render = function(){
    priorRender();
    updateIncomeComparisonUI();
  };

  updateIncomeComparisonUI();
})();
