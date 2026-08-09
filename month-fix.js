"use strict";
(function(){
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
})();
