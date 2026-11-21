(async function () {
  var page = await UI.init("expenses");
  if (!page) return;
  var html = UI.html, money = UI.money;
  var expenses = [], accounts = [];

  var CATEGORIES = [
    { key: "labor", label: "عمالة وأجور" },
    { key: "materials", label: "مواد خام (رمل/أسمنت/حديد)" },
    { key: "equipment", label: "معدات وآلات" },
    { key: "transport", label: "نقل ومواصلات" },
    { key: "fuel", label: "وقود وطاقة" },
    { key: "tools", label: "عدد وأدوات" },
    { key: "rent", label: "إيجار موقع/معدات" },
    { key: "food", label: "إعاشة ووجبات" },
    { key: "misc", label: "مصروفات متنوعة" },
  ];

  function catLabel(k) {
    var c = CATEGORIES.filter(function (x) { return x.key === k; })[0];
    return c ? c.label : (k || "—");
  }

  page.innerHTML = html`
    <div class="stack">
      <div class="page-toolbar">
        <div>
          <h2 style="margin:0">مصاريف الموقع</h2>
          <p class="muted" style="margin:4px 0 0;font-size:12px">تسجيل مصاريف التشغيل اليومية · تقرير شهري كامل</p>
        </div>
        <div class="row gap wrap">
          <a class="button small" href="expense-report.html">التقرير الشهري</a>
          <button type="button" class="primary" id="btn-add">+ مصروف جديد</button>
        </div>
      </div>
      <div class="stats" id="exp-stats"></div>
      <div class="row gap wrap" style="align-items:center">
        <input id="q" placeholder="بحث بالبيان أو الفئة..." autocomplete="off" style="flex:1 1 220px;max-width:320px">
        <select id="f-cat" style="max-width:200px">
          <option value="">كل الفئات</option>
          ${CATEGORIES.map(function (c) { return html`<option value="${c.key}">${c.label}</option>`; }).join("")}
        </select>
        <input id="f-month" type="month" style="max-width:160px" title="تصفية بالشهر">
      </div>
      <div class="card table-wrap" id="list"></div>
    </div>`;

  function accName(id) {
    var a = accounts.filter(function (x) { return x.id === id; })[0];
    return a ? a.name : "—";
  }

  function filtered() {
    var q = (document.getElementById("q").value || "").toLowerCase();
    var cat = document.getElementById("f-cat").value;
    var month = document.getElementById("f-month").value;
    return expenses.filter(function (x) {
      if (cat && (x.category || "misc") !== cat) return false;
      if (month && (x.date || "").slice(0, 7) !== month) return false;
      if (q && ((x.description || "") + " " + catLabel(x.category)).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function render() {
    var list = filtered();
    var total = expenses.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
    var month = new Date().toISOString().slice(0, 7);
    var mTotal = expenses.filter(function (x) { return (x.date || "").slice(0, 7) === month; })
      .reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
    var se = document.getElementById("exp-stats");
    if (se) se.innerHTML = html`
      <div class="stat red"><div class="label">إجمالي المصاريف</div><div class="value">${money(total)}</div></div>
      <div class="stat amber"><div class="label">مصاريف هذا الشهر</div><div class="value">${money(mTotal)}</div></div>
      <div class="stat"><div class="label">عدد الحركات</div><div class="value">${UI.num(expenses.length)}</div></div>
      <div class="stat teal"><div class="label">المعروض حالياً</div><div class="value">${money(list.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0))}</div></div>`;

    document.getElementById("list").innerHTML = html`
      <table>
        <thead><tr><th>التاريخ</th><th>البيان</th><th>الفئة</th><th>حساب المصروف</th><th>الطريقة</th><th>المبلغ</th><th></th></tr></thead>
        <tbody>
          ${list.length === 0 ? html`<tr><td colspan="7" class="empty">لا توجد مصاريف</td></tr>` :
            list.map(function (x) {
              return html`<tr>
                <td dir="ltr" style="text-align:start">${x.date || ""}</td>
                <td><b>${x.description || "—"}</b></td>
                <td><span class="badge">${catLabel(x.category)}</span></td>
                <td>${accName(x.account_id)}</td>
                <td><span class="badge ${x.method === "bank" ? "" : "ok"}">${x.method === "bank" ? "بنك" : "نقدي"}</span></td>
                <td><b>${money(x.amount)}</b></td>
                <td><button class="small danger" data-act="del" data-id="${x.id}">حذف</button></td>
              </tr>`;
            }).join("")}
        </tbody>
      </table>`;
  }

  function openForm() {
    var expAccounts = accounts.filter(function (a) { return a.type === "expense"; });
    if (!expAccounts.length) {
      expAccounts = [{ id: "a10", name: "المصروفات العمومية" }];
    }
    var ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = html`<div class="modal card">
      <h3 style="margin-top:0">مصروف موقع جديد</h3>
      <form id="f" class="stack">
        <div class="form-grid">
          <div class="field full"><label>البيان</label><input id="desc" required placeholder="مثال: أجرة عمال، نقل رمل، إيجار لودر…"></div>
          <div class="field"><label>المبلغ</label><input id="amount" type="number" step="0.01" required min="0.01"></div>
          <div class="field"><label>الفئة</label>
            <select id="cat">${CATEGORIES.map(function (c) {
              return html`<option value="${c.key}">${c.label}</option>`;
            }).join("")}</select>
          </div>
          <div class="field"><label>حساب المصروف</label>
            <select id="acc">${expAccounts.map(function (a) {
              return html`<option value="${a.id}">${a.name}</option>`;
            }).join("")}</select>
          </div>
          <div class="field"><label>الطريقة</label>
            <select id="method"><option value="cash">نقدي</option><option value="bank">بنك</option></select>
          </div>
          <div class="field"><label>التاريخ</label><input id="date" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
        </div>
        <div class="row gap" style="justify-content:flex-end">
          <button type="button" class="ghost" id="cancel">إلغاء</button>
          <button class="primary" type="submit">حفظ</button>
        </div>
      </form>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector("#cancel").onclick = function () { ov.remove(); };
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };
    ov.querySelector("#f").onsubmit = async function (e) {
      e.preventDefault();
      var amount = Number(document.getElementById("amount").value) || 0;
      var accId = document.getElementById("acc").value;
      var method = document.getElementById("method").value;
      var date = document.getElementById("date").value;
      var cat = document.getElementById("cat").value;
      var desc = document.getElementById("desc").value.trim();
      try {
        await DB.insert("expenses", {
          description: desc,
          amount: amount, account_id: accId, method: method, date: date,
          category: cat,
        });
        try {
          var jn = await DB.nextNumber("journal_entries");
          var entry = await DB.insert("journal_entries", {
            number: jn, date: date, memo: "مصروف موقع: " + desc, source: "expense",
          });
          var cashAcc = method === "bank" ? "a2" : "a1";
          await DB.insert("journal_lines", { entry_id: entry.id, account_id: accId, debit: amount, credit: 0 });
          await DB.insert("journal_lines", { entry_id: entry.id, account_id: cashAcc, debit: 0, credit: amount });
        } catch (je) { /* قيد اختياري */ }
        ov.remove();
        UI.toast("تم حفظ المصروف");
        await load();
      } catch (err) {
        UI.toast(err.message || "خطأ في الحفظ", true);
      }
    };
  }

  async function load() {
    try {
      var data = await Promise.all([DB.list("expenses"), DB.list("accounts")]);
      expenses = (data[0] || []).slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
      accounts = data[1] || [];
      render();
    } catch (e) {
      page.innerHTML = '<div class="card error">تعذّر التحميل: ' + (e.message || e) + '</div>';
    }
  }

  document.getElementById("btn-add").onclick = openForm;
  document.getElementById("q").oninput = render;
  document.getElementById("f-cat").onchange = render;
  document.getElementById("f-month").onchange = render;
  document.getElementById("list").onclick = async function (e) {
    var btn = e.target.closest("[data-act=del]");
    if (!btn) return;
    if (!confirm("حذف هذا المصروف؟")) return;
    try {
      await DB.remove("expenses", btn.getAttribute("data-id"));
      UI.toast("تم الحذف");
      await load();
    } catch (err) {
      UI.toast(err.message || "خطأ", true);
    }
  };

  await load();
})();
