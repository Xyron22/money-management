"use strict";

(() => {
  const APP_VERSION = "2.0.0";
  const STORAGE_KEY = "kaigo_money_final_v1";
  const LEGACY_BASELINE_KEY = "money_management_baseline_income_v1";
  const LEGACY_FIXED_KEY = "money_management_fixed_costs_v1";
  const DEFAULT_BASELINE = 130000;

  const BUDGET_CATS = [
    "Kirim Keluarga",
    "Tabungan",
    "Rokok",
    "Makan & Minum",
    "Shopping",
    "Hiburan",
    "Emergency",
    "Buffer",
    "Langganan",
  ];
  const DEFAULT_BUDGET = Object.fromEntries(BUDGET_CATS.map((key) => [key, 0]));
  const CATEGORY_MAP = {
    income: ["Gaji", "Pemasukan Lainnya"],
    expense: [
      "Kirim Keluarga",
      "Rokok",
      "Makan & Minum",
      "Shopping",
      "Hiburan",
      "Langganan",
      "Buffer",
      "Transportasi",
      "Kebutuhan Kerja",
      "Kesehatan",
      "Lainnya",
    ],
    transfer: ["Tabungan", "Emergency"],
  };
  const FIXED_CATEGORIES = [
    "Langganan",
    "Kesehatan",
    "Transportasi",
    "Hiburan",
    "Lainnya",
  ];
  const TRANSACTION_TYPES = new Set(["income", "expense", "transfer"]);

  const CAT_LABELS = {
    Gaji: {
      html: "<ruby>給料<rt>きゅうりょう</rt></ruby>",
      plain: "給料（きゅうりょう）",
    },
    "Pemasukan Lainnya": {
      html: "その<ruby>他<rt>た</rt></ruby>の<ruby>収入<rt>しゅうにゅう</rt></ruby>",
      plain: "その他の収入（そのたのしゅうにゅう）",
    },
    "Kirim Keluarga": {
      html: "<ruby>家族<rt>かぞく</rt></ruby>への<ruby>送金<rt>そうきん</rt></ruby>",
      plain: "家族への送金（かぞくへのそうきん）",
    },
    Tabungan: {
      html: "<ruby>貯金<rt>ちょきん</rt></ruby>",
      plain: "貯金（ちょきん）",
    },
    Rokok: { html: "たばこ", plain: "たばこ" },
    "Makan & Minum": {
      html: "<ruby>食費<rt>しょくひ</rt></ruby>",
      plain: "食費（しょくひ）",
    },
    Shopping: {
      html: "<ruby>買<rt>か</rt></ruby>い<ruby>物<rt>もの</rt></ruby>",
      plain: "買い物（かいもの）",
    },
    Hiburan: {
      html: "<ruby>趣味<rt>しゅみ</rt></ruby>・<ruby>娯楽<rt>ごらく</rt></ruby>",
      plain: "趣味・娯楽（しゅみ・ごらく）",
    },
    Emergency: {
      html: "<ruby>緊急資金<rt>きんきゅうしきん</rt></ruby>",
      plain: "緊急資金（きんきゅうしきん）",
    },
    Buffer: {
      html: "<ruby>予備費<rt>よびひ</rt></ruby>",
      plain: "予備費（よびひ）",
    },
    Langganan: {
      html: "<ruby>固定費<rt>こていひ</rt></ruby>・サブスク",
      plain: "固定費・サブスク（こていひ）",
    },
    Transportasi: {
      html: "<ruby>交通費<rt>こうつうひ</rt></ruby>",
      plain: "交通費（こうつうひ）",
    },
    "Kebutuhan Kerja": {
      html: "<ruby>仕事関連<rt>しごとかんれん</rt></ruby>",
      plain: "仕事関連（しごとかんれん）",
    },
    Kesehatan: {
      html: "<ruby>健康<rt>けんこう</rt></ruby>・<ruby>医療<rt>いりょう</rt></ruby>",
      plain: "健康・医療（けんこう・いりょう）",
    },
    Lainnya: {
      html: "その<ruby>他<rt>た</rt></ruby>",
      plain: "その他（そのた）",
    },
  };

  const $ = (id) => document.getElementById(id);
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[character],
    );
  const yen = (value) =>
    `¥${Math.round(Number(value) || 0).toLocaleString("ja-JP")}`;
  const dual = (jp, idn, extra = "") =>
    `<span class="dual ${extra}"><span class="jp">${jp}</span><span class="idn">${esc(idn)}</span></span>`;
  const catHtml = (key) => {
    const label = CAT_LABELS[key];
    return label
      ? dual(label.html, key, "catlabel")
      : dual(esc(key), key, "catlabel");
  };
  const catPlain = (key) => {
    const label = CAT_LABELS[key];
    return label ? `${label.plain} — ${key}` : key;
  };
  const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value));
  const validDate = (value) => {
    const text = String(value);
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(text)) {
      return false;
    }
    const [year, monthNumber, day] = text.split("-").map(Number);
    const date = new Date(year, monthNumber - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === monthNumber - 1 &&
      date.getDate() === day
    );
  };
  const clampInteger = (value, min, max) => {
    const number = Math.round(Number(value));
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
  };
  const makeId = (prefix = "") =>
    `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

  function currentLocalDate() {
    const testDate = window.__MM_TEST_DATE__;
    return validDate(testDate) ? new Date(`${testDate}T12:00:00`) : new Date();
  }

  function localISODate(date = currentLocalDate()) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function currentMonthLocal() {
    return localISODate().slice(0, 7);
  }

  function billingDate(yearMonth, requestedDay) {
    const [year, monthNumber] = yearMonth.split("-").map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    const day = Math.min(clampInteger(requestedDay, 1, 31), lastDay);
    return `${yearMonth}-${String(day).padStart(2, "0")}`;
  }

  function idDate(date) {
    if (!validDate(date)) return String(date || "");
    const [year, monthNumber, day] = date.split("-").map(Number);
    return new Date(year, monthNumber - 1, day).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function jpDate(date) {
    if (!validDate(date)) return String(date || "");
    const [year, monthNumber, day] = date.split("-").map(Number);
    return `${year}年${monthNumber}月${day}日`;
  }

  function monthSequence(start, end) {
    if (!validMonth(start) || !validMonth(end) || start > end) return [];
    const [startYear, startMonth] = start.split("-").map(Number);
    const [endYear, endMonth] = end.split("-").map(Number);
    const first = startYear * 12 + startMonth - 1;
    const last = endYear * 12 + endMonth - 1;
    const result = [];
    for (let index = first; index <= last; index += 1) {
      const year = Math.floor(index / 12);
      result.push(`${year}-${String((index % 12) + 1).padStart(2, "0")}`);
    }
    return result;
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function normalizeTransaction(raw, index) {
    if (!raw || typeof raw !== "object") return null;
    const type = TRANSACTION_TYPES.has(raw.type) ? raw.type : null;
    const amount = Math.round(Number(raw.amount));
    const date = String(raw.date || "");
    const category = String(raw.category || "").trim();
    if (
      !type ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !validDate(date) ||
      !category
    ) {
      return null;
    }
    return {
      ...raw,
      id: String(raw.id || makeId(`migrated_${index}_`)),
      type,
      category,
      amount,
      date,
      note: String(raw.note || "").slice(0, 160),
      created: Number.isFinite(Number(raw.created))
        ? Number(raw.created)
        : new Date(`${date}T12:00:00`).getTime(),
      ...(raw.fixedCostId ? { fixedCostId: String(raw.fixedCostId) } : {}),
    };
  }

  function normalizeTransactions(rawTransactions) {
    if (!Array.isArray(rawTransactions)) return [];
    const unique = new Map();
    rawTransactions.forEach((rawTransaction, index) => {
      const transaction = normalizeTransaction(rawTransaction, index);
      if (transaction) unique.set(transaction.id, transaction);
    });
    return [...unique.values()];
  }

  function normalizeFixedCost(raw, index) {
    if (!raw || typeof raw !== "object") return null;
    const name = String(raw.name || "")
      .trim()
      .slice(0, 40);
    const amount = Math.round(Number(raw.amount));
    if (!name || !Number.isFinite(amount) || amount <= 0) return null;
    const startMonth = validMonth(raw.startMonth)
      ? raw.startMonth
      : currentMonthLocal();
    return {
      id: String(raw.id || makeId(`fixed_migrated_${index}_`)),
      name,
      amount,
      day: clampInteger(raw.day, 1, 31),
      startMonth,
      activeFromMonth: validMonth(raw.activeFromMonth)
        ? raw.activeFromMonth
        : startMonth,
      category: FIXED_CATEGORIES.includes(raw.category)
        ? raw.category
        : "Langganan",
      active: raw.active !== false,
      skippedMonths: Array.isArray(raw.skippedMonths)
        ? [...new Set(raw.skippedMonths.filter(validMonth))]
        : [],
    };
  }

  function normalizeFixedCosts(rawCosts) {
    if (!Array.isArray(rawCosts)) return [];
    const unique = new Map();
    rawCosts.forEach((rawCost, index) => {
      const cost = normalizeFixedCost(rawCost, index);
      if (cost) unique.set(cost.id, cost);
    });
    return [...unique.values()];
  }

  function parseJSON(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function normalizeDatabase(raw = {}, { useLegacy = true } = {}) {
    const legacyBaseline = Number(safeStorageGet(LEGACY_BASELINE_KEY));
    const baselineCandidate = Number(raw.baselineIncome);
    const baselineIncome =
      Number.isFinite(baselineCandidate) && baselineCandidate >= 0
        ? Math.round(baselineCandidate)
        : useLegacy && Number.isFinite(legacyBaseline) && legacyBaseline >= 0
          ? Math.round(legacyBaseline)
          : DEFAULT_BASELINE;
    const legacyFixed = parseJSON(safeStorageGet(LEGACY_FIXED_KEY), []);
    const fixedSource = Array.isArray(raw.fixedCosts)
      ? raw.fixedCosts
      : useLegacy
        ? legacyFixed
        : [];
    const budgetSource =
      raw.budget && typeof raw.budget === "object" ? raw.budget : {};
    const budget = { ...DEFAULT_BUDGET };
    Object.keys(budget).forEach((key) => {
      const value = Math.round(Number(budgetSource[key]));
      budget[key] = Number.isFinite(value) && value >= 0 ? value : 0;
    });
    return {
      schemaVersion: 2,
      appVersion: APP_VERSION,
      budget,
      goal: Math.max(0, Math.round(Number(raw.goal) || 0)),
      tx: normalizeTransactions(raw.tx),
      month: validMonth(raw.month) ? raw.month : currentMonthLocal(),
      baselineIncome,
      fixedCosts: normalizeFixedCosts(fixedSource),
    };
  }

  function loadDatabase() {
    const raw = parseJSON(safeStorageGet(STORAGE_KEY), {});
    return normalizeDatabase(raw && typeof raw === "object" ? raw : {});
  }

  let db = loadDatabase();
  let month = db.month;
  let toastTimer = null;

  function persist({ silent = false } = {}) {
    db.month = month;
    db.schemaVersion = 2;
    db.appVersion = APP_VERSION;
    const saved = safeStorageSet(STORAGE_KEY, JSON.stringify(db));
    if (!saved && !silent) {
      toast(
        "<ruby>保存<rt>ほぞん</rt></ruby>できませんでした",
        "Data gagal disimpan. Periksa penyimpanan Safari.",
      );
    }
    return saved;
  }

  function toast(jp, idn) {
    const element = $("toast");
    if (!element) return;
    window.clearTimeout(toastTimer);
    element.innerHTML = dual(jp, idn, "compact");
    element.classList.add("show");
    toastTimer = window.setTimeout(
      () => element.classList.remove("show"),
      2200,
    );
  }

  function recurringTransactionId(fixedCostId, yearMonth) {
    return `fixed:${fixedCostId}:${yearMonth}`;
  }

  function isAutomaticTransaction(transaction) {
    return Boolean(
      transaction &&
        (transaction.fixedCostId ||
          String(transaction.id).startsWith("fixed:")),
    );
  }

  function reconcileRecurringCosts(today = localISODate()) {
    let changed = false;

    // A legacy version posted future charges immediately. Always clean those
    // before totals are calculated.
    const cleanedTransactions = db.tx.filter((transaction) => {
      const premature =
        isAutomaticTransaction(transaction) && transaction.date > today;
      if (premature) changed = true;
      return !premature;
    });
    if (cleanedTransactions.length !== db.tx.length)
      db.tx = cleanedTransactions;

    const currentYearMonth = today.slice(0, 7);
    db.fixedCosts
      .filter((cost) => cost.active)
      .forEach((cost) => {
        const scheduleStart =
          cost.activeFromMonth > cost.startMonth
            ? cost.activeFromMonth
            : cost.startMonth;
        monthSequence(scheduleStart, currentYearMonth).forEach((yearMonth) => {
          if (cost.skippedMonths.includes(yearMonth)) return;
          const chargeDate = billingDate(yearMonth, cost.day);
          if (chargeDate > today) return;
          const id = recurringTransactionId(cost.id, yearMonth);
          const exists = db.tx.some(
            (transaction) =>
              String(transaction.id) === id ||
              (String(transaction.fixedCostId || "") === cost.id &&
                String(transaction.date || "").slice(0, 7) === yearMonth),
          );
          if (exists) return;
          db.tx.push({
            id,
            type: "expense",
            category: cost.category,
            amount: cost.amount,
            date: chargeDate,
            note: `${cost.name} • 自動登録 / Biaya rutin otomatis`,
            created: new Date(`${chargeDate}T12:00:00`).getTime(),
            fixedCostId: cost.id,
          });
          changed = true;
        });
      });

    if (changed) persist({ silent: true });
    return changed;
  }

  function monthTx() {
    return db.tx.filter(
      (transaction) => String(transaction.date || "").slice(0, 7) === month,
    );
  }

  function totals() {
    const transactions = monthTx();
    const sumType = (type) =>
      transactions
        .filter((transaction) => transaction.type === type)
        .reduce((total, transaction) => total + transaction.amount, 0);
    return {
      income: sumType("income"),
      expense: sumType("expense"),
      transfer: sumType("transfer"),
    };
  }

  function budgetUsed(category) {
    return monthTx()
      .filter((transaction) => {
        if (category === "Tabungan" || category === "Emergency") {
          return (
            transaction.type === "transfer" && transaction.category === category
          );
        }
        return (
          transaction.type === "expense" && transaction.category === category
        );
      })
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  function fmtMonth(yearMonth) {
    const [year, monthNumber] = yearMonth.split("-").map(Number);
    const indonesia = new Date(year, monthNumber - 1, 1).toLocaleDateString(
      "id-ID",
      { month: "long", year: "numeric" },
    );
    return dual(
      `${year}<ruby>年<rt>ねん</rt></ruby>${monthNumber}<ruby>月<rt>がつ</rt></ruby>`,
      indonesia,
      "compact",
    );
  }

  function sortedMonthTransactions() {
    return [...monthTx()].sort(
      (left, right) =>
        String(right.date).localeCompare(String(left.date)) ||
        Number(right.created || 0) - Number(left.created || 0),
    );
  }

  function txHtml(transaction) {
    const sign =
      transaction.type === "income"
        ? "+"
        : transaction.type === "expense"
          ? "-"
          : "↗";
    const detail = [idDate(transaction.date), transaction.note]
      .filter(Boolean)
      .map(esc)
      .join(" · ");
    const badge = isAutomaticTransaction(transaction)
      ? '<span class="txAutoBadge">自動・Otomatis</span>'
      : "";
    return `<div class="item clickable" data-txid="${esc(transaction.id)}"><div class="row"><div>${catHtml(transaction.category)}<div class="small">${detail} ${badge}</div></div><b class="${esc(transaction.type)}">${sign}${yen(transaction.amount)}</b></div></div>`;
  }

  function renderBudget() {
    $("budget").innerHTML = BUDGET_CATS.map((category) => {
      const budget = Number(db.budget[category] || 0);
      const used = budgetUsed(category);
      const percentage = budget > 0 ? Math.min(100, (used / budget) * 100) : 0;
      const over = budget > 0 && used > budget;
      const right = budget > 0 ? `${Math.round((used / budget) * 100)}%` : "—";
      return `<div class="baritem"><div class="row"><div>${catHtml(category)}<div class="small">${yen(used)} / ${yen(budget)} ${over ? `<span class="pill"><span><ruby>超過<rt>ちょうか</rt></ruby></span><span class="idn">melebihi</span></span>` : ""}</div></div><b>${right}</b></div><div class="progress"><div class="fill ${over ? "over" : ""}" style="width:${percentage}%"></div></div></div>`;
    }).join("");
  }

  function renderGoal() {
    const saved = db.tx
      .filter(
        (transaction) =>
          transaction.type === "transfer" &&
          transaction.category === "Tabungan",
      )
      .reduce((total, transaction) => total + transaction.amount, 0);
    const percentage = db.goal > 0 ? Math.min(100, (saved / db.goal) * 100) : 0;
    $("saved").textContent = yen(saved);
    $("goalPct").innerHTML =
      db.goal > 0
        ? `${percentage.toFixed(1)}%`
        : dual(
            "<ruby>未設定<rt>みせってい</rt></ruby>",
            "Belum diatur",
            "compact",
          );
    $("goalFill").style.width = `${percentage}%`;
    $("goalText").innerHTML =
      db.goal > 0
        ? dual(
            `<ruby>目標<rt>もくひょう</rt></ruby> ${yen(db.goal)} ・ <ruby>残<rt>のこ</rt></ruby>り ${yen(Math.max(0, db.goal - saved))}`,
            `Target ${yen(db.goal)} · sisa ${yen(Math.max(0, db.goal - saved))}`,
          )
        : dual(
            `<ruby>変更<rt>へんこう</rt></ruby>を<ruby>押<rt>お</rt></ruby>して<ruby>貯金目標<rt>ちょきんもくひょう</rt></ruby>を<ruby>設定<rt>せってい</rt></ruby>してください。`,
            "Tekan Ubah untuk menentukan target tabungan.",
          );
  }

  function renderStats() {
    const expenses = monthTx().filter(
      (transaction) => transaction.type === "expense",
    );
    const transfers = monthTx().filter(
      (transaction) => transaction.type === "transfer",
    );
    const totalExpense = expenses.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    const categoryTotals = {};
    expenses.forEach((transaction) => {
      categoryTotals[transaction.category] =
        (categoryTotals[transaction.category] || 0) + transaction.amount;
    });
    const rows = Object.entries(categoryTotals).sort(
      (left, right) => right[1] - left[1],
    );
    const saved = transfers.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );
    $("statistics").innerHTML =
      `<div class="grid"><div class="stat"><small>${dual("<ruby>支出合計<rt>ししゅつごうけい</rt></ruby>", "Total pengeluaran", "compact")}</small><b>${yen(totalExpense)}</b></div><div class="stat"><small>${dual("<ruby>貯蓄合計<rt>ちょちくごうけい</rt></ruby>", "Total disimpan", "compact")}</small><b>${yen(saved)}</b></div></div>` +
      (rows.length
        ? rows
            .map(([category, value]) => {
              const percentage = totalExpense
                ? Math.round((value / totalExpense) * 100)
                : 0;
              return `<div class="baritem"><div class="row">${catHtml(category)}<b>${yen(value)}</b></div><div class="progress"><div class="fill" style="width:${percentage}%"></div></div><div class="small">${dual(`<ruby>支出<rt>ししゅつ</rt></ruby>の ${percentage}%`, `${percentage}% dari pengeluaran`, "compact")}</div></div>`;
            })
            .join("")
        : `<div class="empty">${dual("<ruby>支出<rt>ししゅつ</rt></ruby>はまだありません。", "Belum ada pengeluaran.")}</div>`);
  }

  function renderBaseline() {
    const actual = totals().income;
    const difference = actual - db.baselineIncome;
    $("baselineValue").textContent = yen(db.baselineIncome);
    $("actualIncomeValue").textContent = yen(actual);
    const element = $("incomeDifference");
    element.classList.remove("income", "expense");
    if (actual <= 0) {
      element.textContent = "—";
      return;
    }
    element.textContent = `${difference > 0 ? "+" : difference < 0 ? "-" : ""}${yen(Math.abs(difference))}`;
    if (difference > 0) element.classList.add("income");
    if (difference < 0) element.classList.add("expense");
  }

  function fixedCostAppliesToMonth(cost, yearMonth) {
    if (!cost.active) return false;
    const scheduleStart =
      cost.activeFromMonth > cost.startMonth
        ? cost.activeFromMonth
        : cost.startMonth;
    return yearMonth >= scheduleStart;
  }

  function renderFixedCosts() {
    const today = localISODate();
    const costs = db.fixedCosts.filter((cost) =>
      fixedCostAppliesToMonth(cost, month),
    );
    const entries = costs.map((cost) => {
      const scheduledDate = billingDate(month, cost.day);
      const id = recurringTransactionId(cost.id, month);
      const transaction = db.tx.find(
        (item) =>
          String(item.id) === id ||
          (String(item.fixedCostId || "") === cost.id &&
            String(item.date || "").slice(0, 7) === month),
      );
      return {
        cost,
        transaction,
        date: transaction?.date || scheduledDate,
        amount: transaction?.amount || cost.amount,
      };
    });
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    if (!costs.length) {
      $("fixedSummary").innerHTML =
        `<div class="empty">${dual("<ruby>固定費<rt>こていひ</rt></ruby>はまだありません。", "Belum ada biaya rutin.")}</div>`;
      return;
    }
    $("fixedSummary").innerHTML = `
      <div class="row fixedTotal">
        <span class="small">${costs.length} layanan aktif</span>
        <div class="fixedTotalValue"><small>月額合計・Total bulan ini</small><b>${yen(total)} / 月</b></div>
      </div>
      <div class="fixedRows">
        ${entries
          .map(({ cost, transaction, date, amount }) => {
            const exists = Boolean(transaction);
            const skipped = cost.skippedMonths.includes(month);
            let statusClass = "pending",
              statusJp = "予定",
              statusId = "Belum dipotong";
            if (exists) {
              statusClass = "posted";
              statusJp = "✓ 自動登録済み";
              statusId = "Tercatat otomatis";
            } else if (skipped) {
              statusClass = "skipped";
              statusJp = "除外";
              statusId = "Dilewati";
            } else if (date <= today) {
              statusClass = "attention";
              statusJp = "未登録";
              statusId = "Belum tercatat";
            }
            return `<div class="fixedRow"><div class="fixedInfo"><b>${esc(cost.name)}</b><small>${esc(jpDate(date))}<br>${esc(idDate(date))}</small></div><div class="fixedRight"><b>${yen(amount)}</b><span class="autoBadge ${statusClass}">${statusJp}</span><small>${statusId}</small></div></div>`;
          })
          .join("")}
      </div>
      <p class="fixedHelp">Tanggal belum tiba = belum masuk pengeluaran dan belum mengurangi saldo. Pada/selepas tanggal tagihan, transaksi dibuat saat aplikasi dibuka.</p>`;
  }

  function bindTransactionRows() {
    document.querySelectorAll("[data-txid]").forEach((element) => {
      element.onclick = () => openEdit(element.dataset.txid);
    });
  }

  function render() {
    $("monthName").innerHTML = fmtMonth(month);
    const total = totals();
    $("income").textContent = yen(total.income);
    $("expense").textContent = yen(total.expense);
    $("transfers").textContent = yen(total.transfer);
    $("balance").textContent = yen(
      total.income - total.expense - total.transfer,
    );
    renderBaseline();
    renderGoal();
    renderBudget();
    renderFixedCosts();
    renderStats();

    const transactions = sortedMonthTransactions();
    const empty = dual(
      `この<ruby>月<rt>つき</rt></ruby>にはまだ<ruby>取引<rt>とりひき</rt></ruby>がありません。`,
      "Belum ada transaksi pada bulan ini.",
    );
    $("recent").innerHTML = transactions.length
      ? transactions.slice(0, 7).map(txHtml).join("")
      : `<div class="empty">${empty}</div>`;
    $("all").innerHTML = transactions.length
      ? transactions.map(txHtml).join("")
      : `<div class="empty">${empty}</div>`;
    bindTransactionRows();
  }

  function openModal(id) {
    $(id)?.classList.remove("hidden");
  }

  function closeModal(id) {
    $(id)?.classList.add("hidden");
  }

  function setPage(page) {
    document
      .querySelectorAll(".page")
      .forEach((element) => element.classList.add("hidden"));
    $(page).classList.remove("hidden");
    document.querySelectorAll("nav [data-page]").forEach((element) => {
      element.classList.toggle("active", element.dataset.page === page);
    });
    render();
  }

  function shiftMonth(delta) {
    const [year, monthNumber] = month.split("-").map(Number);
    const index = year * 12 + monthNumber - 1 + delta;
    const newYear = Math.floor(index / 12);
    const newMonth = (((index % 12) + 12) % 12) + 1;
    month = `${newYear}-${String(newMonth).padStart(2, "0")}`;
    persist({ silent: true });
    render();
  }

  function populateCats(selected) {
    const categories = CATEGORY_MAP[$("type").value] || CATEGORY_MAP.expense;
    $("category").innerHTML = categories
      .map(
        (category) =>
          `<option value="${esc(category)}">${esc(catPlain(category))}</option>`,
      )
      .join("");
    if (selected && categories.includes(selected))
      $("category").value = selected;
  }

  function defaultDate() {
    const today = localISODate();
    return today.slice(0, 7) === month ? today : `${month}-01`;
  }

  function openAdd(preferredCategory = null, preferredType = null) {
    $("txModalTitle").innerHTML = dual(
      "<ruby>取引<rt>とりひき</rt></ruby>を<ruby>追加<rt>ついか</rt></ruby>",
      "Tambah transaksi",
    );
    $("editId").value = "";
    $("type").disabled = false;
    $("category").disabled = false;
    $("type").value = preferredType || "expense";
    populateCats(preferredCategory);
    $("amount").value = "";
    $("date").value = defaultDate();
    $("note").value = "";
    $("deleteBtn").classList.add("hidden");
    $("autoTxHint").classList.add("hidden");
    openModal("txModal");
  }

  function openEdit(id) {
    const transaction = db.tx.find((item) => String(item.id) === String(id));
    if (!transaction) return;
    const automatic = isAutomaticTransaction(transaction);
    $("txModalTitle").innerHTML = automatic
      ? dual(
          "<ruby>固定費<rt>こていひ</rt></ruby>の<ruby>取引<rt>とりひき</rt></ruby>",
          "Transaksi biaya rutin",
        )
      : dual(
          "<ruby>取引<rt>とりひき</rt></ruby>を<ruby>編集<rt>へんしゅう</rt></ruby>",
          "Edit transaksi",
        );
    $("editId").value = transaction.id;
    $("type").disabled = automatic;
    $("category").disabled = false;
    $("type").value = transaction.type;
    populateCats(transaction.category);
    $("amount").value = transaction.amount;
    $("date").value = transaction.date;
    $("note").value = transaction.note || "";
    $("deleteBtn").classList.remove("hidden");
    $("autoTxHint").classList.toggle("hidden", !automatic);
    openModal("txModal");
  }

  function openGoal() {
    $("goalInput").value = Number(db.goal) || 0;
    openModal("goalModal");
  }

  function openBudget() {
    $("budgetInputs").innerHTML = BUDGET_CATS.map(
      (category) =>
        `<div class="budgetInputs"><label for="b_${category.replace(/\W/g, "_")}">${catHtml(category)}</label><input id="b_${category.replace(/\W/g, "_")}" data-bcat="${esc(category)}" inputmode="numeric" type="number" min="0" step="1" value="${Number(db.budget[category] || 0)}"></div>`,
    ).join("");
    openModal("budgetModal");
  }

  function openBaseline() {
    $("baselineInput").value = db.baselineIncome;
    openModal("baselineModal");
  }

  function fixedManagerHtml() {
    if (!db.fixedCosts.length) {
      return `<div class="empty">${dual("登録された固定費はありません。", "Belum ada biaya rutin.")}</div>`;
    }
    return db.fixedCosts
      .map(
        (cost) =>
          `<button class="fixedItem ${cost.active ? "" : "off"}" data-fixed-id="${esc(cost.id)}"><span><b>${esc(cost.name)}</b><small>${yen(cost.amount)}・毎月${cost.day}日<br>Mulai ${esc(cost.startMonth)}</small></span><span>${cost.active ? "›" : "停止・Nonaktif"}</span></button>`,
      )
      .join("");
  }

  function openFixedManager() {
    $("fixedList").innerHTML = fixedManagerHtml();
    $("fixedList")
      .querySelectorAll("[data-fixed-id]")
      .forEach((element) => {
        element.onclick = () => openFixedEdit(element.dataset.fixedId);
      });
    openModal("fixedModal");
  }

  function openFixedEdit(id = "") {
    const cost = db.fixedCosts.find((item) => item.id === id);
    $("fixedEditTitle").innerHTML = cost
      ? dual(
          "<ruby>固定費<rt>こていひ</rt></ruby>を<ruby>編集<rt>へんしゅう</rt></ruby>",
          "Edit biaya rutin",
          "inline",
        )
      : dual(
          "<ruby>固定費<rt>こていひ</rt></ruby>を<ruby>追加<rt>ついか</rt></ruby>",
          "Tambah biaya rutin",
          "inline",
        );
    $("fixedId").value = cost?.id || "";
    $("fixedName").value = cost?.name || "";
    $("fixedAmount").value = cost?.amount || "";
    $("fixedDay").value = cost?.day || 1;
    $("fixedStart").value = cost?.startMonth || currentMonthLocal();
    $("fixedActive").checked = cost ? cost.active : true;
    $("fixedCategory").innerHTML = FIXED_CATEGORIES.map(
      (category) =>
        `<option value="${esc(category)}">${esc(catPlain(category))}</option>`,
    ).join("");
    $("fixedCategory").value = cost?.category || "Langganan";
    $("fixedDelete").classList.toggle("hidden", !cost);
    openModal("fixedEditModal");
  }

  function skipAutomaticTransaction(transaction) {
    const cost = db.fixedCosts.find(
      (item) => item.id === String(transaction.fixedCostId || ""),
    );
    const transactionMonth = String(transaction.date || "").slice(0, 7);
    if (cost && validMonth(transactionMonth)) {
      cost.skippedMonths = [
        ...new Set([...(cost.skippedMonths || []), transactionMonth]),
      ];
    }
  }

  function exportBackup() {
    const backup = {
      ...db,
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `Money-Management-By-Tenka-Backup-${localISODate()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("バックアップを保存しました", "File backup berhasil dibuat");
  }

  function importBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          if (
            !parsed ||
            typeof parsed !== "object" ||
            !Array.isArray(parsed.tx) ||
            !parsed.budget ||
            typeof parsed.budget !== "object"
          ) {
            throw new Error("Invalid backup shape");
          }
          db = normalizeDatabase(parsed, { useLegacy: false });
          month = db.month;
          reconcileRecurringCosts();
          persist();
          render();
          toast(
            "バックアップを<ruby>復元<rt>ふくげん</rt></ruby>しました",
            "Backup berhasil dipulihkan",
          );
        } catch (_) {
          toast(
            "バックアップファイルが<ruby>無効<rt>むこう</rt></ruby>です",
            "File backup tidak valid",
          );
        }
      };
      reader.onerror = () =>
        toast("ファイルを読み込めませんでした", "File tidak dapat dibaca");
      reader.readAsText(file);
    };
    input.click();
  }

  function ensureExtraUI() {
    if (!$("baselineCard")) {
      const card = document.createElement("section");
      card.className = "card";
      card.id = "baselineCard";
      card.innerHTML = `
        <div class="row">
          <div class="title">💼 ${dual("<ruby>収入比較<rt>しゅうにゅうひかく</rt></ruby>", "Perbandingan pemasukan", "inline")}</div>
          <button class="btn outline" id="baselineBtn" type="button">${dual("<ruby>基準設定<rt>きじゅんせってい</rt></ruby>", "Atur patokan", "compact")}</button>
        </div>
        <div class="grid3">
          <div class="stat"><small>${dual("<ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby>", "Patokan", "compact")}</small><b id="baselineValue">¥0</b></div>
          <div class="stat"><small>${dual("<ruby>実収入<rt>じつしゅうにゅう</rt></ruby>", "Aktual", "compact")}</small><b id="actualIncomeValue">¥0</b></div>
          <div class="stat"><small>${dual("<ruby>差額<rt>さがく</rt></ruby>", "Selisih", "compact")}</small><b id="incomeDifference">—</b></div>
        </div>
        <div class="note baselineNote">${dual("<ruby>実収入<rt>じつしゅうにゅう</rt></ruby>は<ruby>収入取引<rt>しゅうにゅうとりひき</rt></ruby>から<ruby>自動計算<rt>じどうけいさん</rt></ruby>されます。", "Aktual dihitung otomatis dari transaksi pemasukan.", "compact")}</div>
        <button class="btn dark wideButton" id="actualIncomeBtn" type="button">${dual("<ruby>実収入<rt>じつしゅうにゅう</rt></ruby>を<ruby>入力<rt>にゅうりょく</rt></ruby>", "Input pemasukan aktual", "compact")}</button>`;
      document
        .querySelector("#home .hero")
        .insertAdjacentElement("afterend", card);
    }

    if (!$("fixedCostCard")) {
      const card = document.createElement("section");
      card.className = "card";
      card.id = "fixedCostCard";
      card.innerHTML = `
        <div class="row">
          <div class="title">🔁 ${dual("<ruby>固定費<rt>こていひ</rt></ruby>・サブスク", "Biaya rutin & langganan", "inline")}</div>
          <button class="btn outline" id="fixedManage" type="button">${dual("<ruby>管理<rt>かんり</rt></ruby>", "Kelola", "compact")}</button>
        </div>
        <div id="fixedSummary"></div>`;
      const recentCard = $("recent").closest(".card");
      recentCard.parentNode.insertBefore(card, recentCard);
    }

    const settingsCard = document.querySelector("#settings .card");
    const resetActions = $("resetBtn").closest(".actions");
    if (!$("baselineSet")) {
      const actions = document.createElement("div");
      actions.className = "actions";
      actions.innerHTML = `
        <button class="btn outline" id="baselineSet" type="button">💼 ${dual("<ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby>", "Patokan pemasukan", "compact")}</button>
        <button class="btn outline" id="fixedSet" type="button">🔁 ${dual("<ruby>固定費<rt>こていひ</rt></ruby>・サブスク", "Biaya rutin", "compact")}</button>`;
      settingsCard.insertBefore(actions, resetActions);
    }

    if (!$("baselineModal")) {
      const modal = document.createElement("div");
      modal.className = "modal hidden";
      modal.id = "baselineModal";
      modal.innerHTML = `<div class="sheet">
        <div class="row"><b>💼 ${dual("<ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby>の<ruby>設定<rt>せってい</rt></ruby>", "Atur patokan pemasukan", "inline")}</b><button class="btn outline" data-close-extra="baselineModal" type="button">✕</button></div>
        <p class="note">${dual("ここには<ruby>毎月<rt>まいつき</rt></ruby>の<ruby>基準額<rt>きじゅんがく</rt></ruby>だけを<ruby>入力<rt>にゅうりょく</rt></ruby>してください。", "Isi hanya angka patokan bulanan di sini.")}</p>
        <form id="baselineForm" class="form">
          <label>${dual("<ruby>月<rt>つき</rt></ruby>の<ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby> (¥)", "Patokan pemasukan bulanan (¥)", "formdual")}<input id="baselineInput" inputmode="numeric" type="number" min="0" step="1" required></label>
          <button class="btn dark" type="submit">${dual("<ruby>保存<rt>ほぞん</rt></ruby>", "Simpan", "compact")}</button>
        </form>
      </div>`;
      document.body.appendChild(modal);
    }

    if (!$("fixedModal")) {
      const modal = document.createElement("div");
      modal.id = "fixedModal";
      modal.className = "modal hidden";
      modal.innerHTML = `<div class="sheet">
        <div class="row"><b>🔁 ${dual("<ruby>固定費<rt>こていひ</rt></ruby>・サブスク", "Biaya rutin & langganan", "inline")}</b><button class="btn outline" data-close-extra="fixedModal">✕</button></div>
        <p class="note">${dual("<ruby>請求日<rt>せいきゅうび</rt></ruby>になるまで<ruby>残高<rt>ざんだか</rt></ruby>から<ruby>引<rt>ひ</rt></ruby>かれません。", "Saldo baru berkurang pada/selepas tanggal tagihan saat aplikasi dibuka.")}</p>
        <div id="fixedList"></div>
        <button class="btn dark wideButton" id="fixedAdd" type="button">${dual("＋ <ruby>固定費<rt>こていひ</rt></ruby>を<ruby>追加<rt>ついか</rt></ruby>", "Tambah biaya rutin", "compact")}</button>
      </div>`;
      document.body.appendChild(modal);
    }

    if (!$("fixedEditModal")) {
      const modal = document.createElement("div");
      modal.id = "fixedEditModal";
      modal.className = "modal hidden";
      modal.innerHTML = `<div class="sheet">
        <div class="row"><b id="fixedEditTitle"></b><button class="btn outline" data-close-extra="fixedEditModal">✕</button></div>
        <form id="fixedForm" class="form modalForm">
          <input type="hidden" id="fixedId">
          <label>${dual("<ruby>名前<rt>なまえ</rt></ruby>", "Nama layanan", "formdual")}<input id="fixedName" maxlength="40" placeholder="例：iCloud+" required></label>
          <label>${dual("<ruby>月額<rt>げつがく</rt></ruby> (¥)", "Biaya bulanan (¥)", "formdual")}<input id="fixedAmount" type="number" inputmode="numeric" min="1" step="1" required></label>
          <label>${dual("<ruby>請求日<rt>せいきゅうび</rt></ruby>", "Tanggal tagihan", "formdual")}<input id="fixedDay" type="number" inputmode="numeric" min="1" max="31" required></label>
          <label>${dual("<ruby>開始月<rt>かいしづき</rt></ruby>", "Mulai bulan", "formdual")}<input id="fixedStart" type="month" required></label>
          <label>${dual("カテゴリー", "Kategori", "formdual")}<select id="fixedCategory"></select></label>
          <label class="fixedCheck"><input id="fixedActive" type="checkbox"><span>${dual("<ruby>有効<rt>ゆうこう</rt></ruby>", "Aktif", "formdual")}</span></label>
          <button class="btn dark" type="submit">${dual("<ruby>保存<rt>ほぞん</rt></ruby>", "Simpan", "compact")}</button>
          <button class="btn red hidden" id="fixedDelete" type="button">${dual("<ruby>削除<rt>さくじょ</rt></ruby>", "Hapus biaya rutin", "compact")}</button>
        </form>
      </div>`;
      document.body.appendChild(modal);
    }

    if (!$("autoTxHint")) {
      const hint = document.createElement("p");
      hint.id = "autoTxHint";
      hint.className = "note autoTxHint hidden";
      hint.innerHTML = dual(
        "この<ruby>取引<rt>とりひき</rt></ruby>は<ruby>固定費<rt>こていひ</rt></ruby>から<ruby>自動登録<rt>じどうとうろく</rt></ruby>されました。",
        "Transaksi ini dibuat otomatis dari biaya rutin. Jika dihapus, bulan ini akan dilewati.",
      );
      $("txForm").insertBefore(hint, $("txForm").firstElementChild.nextSibling);
    }
  }

  function polishStaticLabels() {
    document.querySelector("#home .hero > .dual.light").innerHTML =
      '<div class="jp"><ruby>残<rt>のこ</rt></ruby>りのお<ruby>金<rt>かね</rt></ruby></div><div class="idn">Sisa uang</div>';
    $("budgetBtn").parentElement.querySelector(".title").innerHTML =
      `📦 ${dual("<ruby>月<rt>つき</rt></ruby>の<ruby>予算<rt>よさん</rt></ruby>", "Budget bulanan", "inline")}`;
    document.querySelector("#budgetModal .sheet > .row > b").innerHTML =
      `💴 ${dual("<ruby>月<rt>つき</rt></ruby>の<ruby>予算<rt>よさん</rt></ruby>", "Budget bulanan", "inline")}`;
    document.querySelector("#stats .title").innerHTML =
      `📊 ${dual("<ruby>支出分析<rt>ししゅつぶんせき</rt></ruby>", "Analisis pengeluaran", "inline")}`;
    document.querySelector('nav [data-page="stats"] .dual').innerHTML =
      '<span class="jp"><ruby>分析<rt>ぶんせき</rt></ruby></span><span class="idn">Analisis</span>';
    document.querySelector('nav [data-page="home"] .dual').innerHTML =
      '<span class="jp">ホーム</span><span class="idn">Beranda</span>';
    $("type").options[2].textContent = "振替（ふりかえ）— Pindah ke simpanan";
    $("category").closest("label").querySelector(".jp").textContent =
      "カテゴリー";
    $("note").closest("label").querySelector(".jp").textContent = "メモ";
    $("goalInput").closest("label").querySelector(".jp").innerHTML =
      "<ruby>目標金額<rt>もくひょうきんがく</rt></ruby> (¥)";
  }

  function bindEvents() {
    document.querySelectorAll("[data-page]").forEach((button) => {
      button.onclick = () => setPage(button.dataset.page);
    });
    document.querySelectorAll("[data-close]").forEach((button) => {
      button.onclick = () => closeModal(button.dataset.close);
    });
    document.querySelectorAll("[data-close-extra]").forEach((button) => {
      button.onclick = () => closeModal(button.dataset.closeExtra);
    });
    $("prevTop").onclick = () => shiftMonth(-1);
    $("nextTop").onclick = () => shiftMonth(1);
    $("allBtn").onclick = () => setPage("history");
    $("addNav").onclick = () => openAdd();
    $("type").onchange = () => populateCats();
    $("goalBtn").onclick = openGoal;
    $("goalSet").onclick = openGoal;
    $("budgetBtn").onclick = openBudget;
    $("budgetSet").onclick = openBudget;
    $("baselineBtn").onclick = openBaseline;
    $("baselineSet").onclick = openBaseline;
    $("fixedManage").onclick = openFixedManager;
    $("fixedSet").onclick = openFixedManager;
    $("fixedAdd").onclick = () => openFixedEdit();
    $("exportBtn").onclick = exportBackup;
    $("importBtn").onclick = importBackup;
    $("resetBtn").onclick = () => openModal("resetModal");

    $("actualIncomeBtn").onclick = () => {
      const salaryTransactions = monthTx().filter(
        (transaction) =>
          transaction.type === "income" && transaction.category === "Gaji",
      );
      if (salaryTransactions.length === 1) openEdit(salaryTransactions[0].id);
      else openAdd("Gaji", "income");
    };

    $("txForm").onsubmit = (event) => {
      event.preventDefault();
      const amount = Math.round(Number($("amount").value));
      const date = $("date").value;
      const category = $("category").value;
      const type = $("type").value;
      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !validDate(date) ||
        !category ||
        !TRANSACTION_TYPES.has(type)
      ) {
        toast(
          "<ruby>金額<rt>きんがく</rt></ruby>・<ruby>日付<rt>ひづけ</rt></ruby>・カテゴリーを<ruby>確認<rt>かくにん</rt></ruby>してください。",
          "Periksa nominal, tanggal, dan kategori.",
        );
        return;
      }
      const id = $("editId").value;
      if (id) {
        const index = db.tx.findIndex(
          (transaction) => String(transaction.id) === String(id),
        );
        if (index >= 0) {
          db.tx[index] = {
            ...db.tx[index],
            type,
            category,
            amount,
            date,
            note: $("note").value.trim(),
            created: db.tx[index].created || Date.now(),
          };
        }
      } else {
        db.tx.push({
          id: makeId("tx_"),
          type,
          category,
          amount,
          date,
          note: $("note").value.trim(),
          created: Date.now(),
        });
      }
      month = date.slice(0, 7);
      persist();
      closeModal("txModal");
      render();
      toast(
        "<ruby>取引<rt>とりひき</rt></ruby>を<ruby>保存<rt>ほぞん</rt></ruby>しました",
        "Transaksi tersimpan",
      );
    };

    $("deleteBtn").onclick = () => {
      const id = $("editId").value;
      const transaction = db.tx.find((item) => String(item.id) === String(id));
      if (!transaction) return;
      if (isAutomaticTransaction(transaction))
        skipAutomaticTransaction(transaction);
      db.tx = db.tx.filter((item) => String(item.id) !== String(id));
      persist();
      closeModal("txModal");
      render();
      toast(
        "<ruby>取引<rt>とりひき</rt></ruby>を<ruby>削除<rt>さくじょ</rt></ruby>しました",
        isAutomaticTransaction(transaction)
          ? "Transaksi dihapus; bulan ini dilewati"
          : "Transaksi dihapus",
      );
    };

    $("goalForm").onsubmit = (event) => {
      event.preventDefault();
      db.goal = Math.max(0, Math.round(Number($("goalInput").value) || 0));
      persist();
      closeModal("goalModal");
      render();
      toast(
        "<ruby>目標<rt>もくひょう</rt></ruby>を<ruby>更新<rt>こうしん</rt></ruby>しました",
        "Target diperbarui",
      );
    };

    $("budgetForm").onsubmit = (event) => {
      event.preventDefault();
      document.querySelectorAll("[data-bcat]").forEach((input) => {
        db.budget[input.dataset.bcat] = Math.max(
          0,
          Math.round(Number(input.value) || 0),
        );
      });
      persist();
      closeModal("budgetModal");
      render();
      toast(
        "<ruby>予算<rt>よさん</rt></ruby>を<ruby>更新<rt>こうしん</rt></ruby>しました",
        "Budget diperbarui",
      );
    };

    $("baselineForm").onsubmit = (event) => {
      event.preventDefault();
      const value = Math.round(Number($("baselineInput").value));
      if (!Number.isFinite(value) || value < 0) return;
      db.baselineIncome = value;
      persist();
      closeModal("baselineModal");
      render();
      toast(
        "<ruby>基準収入<rt>きじゅんしゅうにゅう</rt></ruby>を<ruby>更新<rt>こうしん</rt></ruby>しました",
        "Patokan pemasukan diperbarui",
      );
    };

    $("fixedForm").onsubmit = (event) => {
      event.preventDefault();
      const id = $("fixedId").value || makeId("fixed_");
      const existingIndex = db.fixedCosts.findIndex((cost) => cost.id === id);
      const existing = existingIndex >= 0 ? db.fixedCosts[existingIndex] : null;
      const active = $("fixedActive").checked;
      const startMonth = $("fixedStart").value;
      const item = {
        id,
        name: $("fixedName").value.trim().slice(0, 40),
        amount: Math.round(Number($("fixedAmount").value)),
        day: clampInteger($("fixedDay").value, 1, 31),
        startMonth,
        category: FIXED_CATEGORIES.includes($("fixedCategory").value)
          ? $("fixedCategory").value
          : "Langganan",
        active,
        activeFromMonth:
          existing && !existing.active && active
            ? currentMonthLocal()
            : startMonth,
        skippedMonths: existing?.skippedMonths || [],
      };
      if (
        !item.name ||
        !Number.isFinite(item.amount) ||
        item.amount <= 0 ||
        !validMonth(item.startMonth)
      ) {
        toast(
          "<ruby>入力内容<rt>にゅうりょくないよう</rt></ruby>を<ruby>確認<rt>かくにん</rt></ruby>してください",
          "Periksa nama, nominal, tanggal, dan bulan mulai.",
        );
        return;
      }
      if (existingIndex >= 0) db.fixedCosts[existingIndex] = item;
      else db.fixedCosts.push(item);
      reconcileRecurringCosts();
      persist();
      closeModal("fixedEditModal");
      render();
      openFixedManager();
      toast(
        "<ruby>固定費<rt>こていひ</rt></ruby>を<ruby>保存<rt>ほぞん</rt></ruby>しました",
        "Biaya rutin tersimpan",
      );
    };

    $("fixedDelete").onclick = () => {
      const id = $("fixedId").value;
      db.fixedCosts = db.fixedCosts.filter((cost) => cost.id !== id);
      // Historical charges stay in the ledger; only the schedule is removed.
      persist();
      closeModal("fixedEditModal");
      render();
      openFixedManager();
      toast(
        "<ruby>固定費<rt>こていひ</rt></ruby>を<ruby>削除<rt>さくじょ</rt></ruby>しました",
        "Jadwal biaya rutin dihapus",
      );
    };

    $("confirmReset").onclick = () => {
      db = normalizeDatabase(
        {
          budget: DEFAULT_BUDGET,
          goal: 0,
          tx: [],
          month: currentMonthLocal(),
          baselineIncome: DEFAULT_BASELINE,
          fixedCosts: [],
        },
        { useLegacy: false },
      );
      month = db.month;
      try {
        localStorage.removeItem(LEGACY_BASELINE_KEY);
        localStorage.removeItem(LEGACY_FIXED_KEY);
      } catch (_) {
        // The main reset still succeeds when legacy storage is unavailable.
      }
      persist();
      closeModal("resetModal");
      setPage("home");
      toast("すべてのデータをリセットしました", "Semua data sudah direset");
    };

    window.addEventListener("pageshow", () => {
      if (reconcileRecurringCosts()) render();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && reconcileRecurringCosts()) {
        render();
      }
    });
  }

  function renderQuickButtons() {
    const quick = [
      ["💰", "Gaji", "income"],
      ["🚬", "Rokok", "expense"],
      ["🍚", "Makan & Minum", "expense"],
      ["👨‍👩‍👦", "Kirim Keluarga", "expense"],
      ["👕", "Shopping", "expense"],
      ["🎮", "Hiburan", "expense"],
      ["🏦", "Tabungan", "transfer"],
      ["🆘", "Emergency", "transfer"],
      ["＋", "Lainnya", "expense"],
    ];
    $("quick").innerHTML = quick
      .map(
        ([icon, category, type]) =>
          `<button class="btn" data-qcat="${esc(category)}" data-qtype="${esc(type)}"><span>${icon}</span> ${catHtml(category)}</button>`,
      )
      .join("");
    $("quick")
      .querySelectorAll("[data-qcat]")
      .forEach((button) => {
        button.onclick = () =>
          openAdd(button.dataset.qcat, button.dataset.qtype);
      });
  }

  function initialize() {
    ensureExtraUI();
    polishStaticLabels();
    renderQuickButtons();
    bindEvents();
    reconcileRecurringCosts();
    persist({ silent: true });
    render();
  }

  initialize();
})();
