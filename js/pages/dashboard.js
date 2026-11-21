(async function () {
  var page = await UI.init("dashboard");
  if (!page) return;
  var html = UI.html, money = UI.money, num = UI.num;

  page.innerHTML = '<div class="stack"><div class="skel" style="height:64px"></div>' +
    '<div class="stats">' + [1, 2, 3, 4].map(function () { return '<div class="skel" style="height:150px"></div>'; }).join("") + '</div>' +
    '<div class="skel" style="height:280px"></div></div>';

  var expenses = [], works = [], companies = [], registers = [], employees = [];
  try {
    var data = await Promise.all([
      DB.list("expenses"),
      DB.list("site_works"),
      DB.list("suppliers"),
      DB.list("cash_registers"),
      DB.list("employees"),
    ]);
    expenses = data[0] || [];
    works = data[1] || [];
    companies = data[2] || [];
    registers = data[3] || [];
    employees = data[4] || [];
  } catch (e) {
    page.innerHTML = '<div class="card error">تعذّر تحميل البيانات: ' + (e.message || e) + '</div>';
    return;
  }

  function sum(arr, f) { return arr.reduce(function (s, x) { return s + (Number(f(x)) || 0); }, 0); }
  var month = new Date().toISOString().slice(0, 7);
  var expTotal = sum(expenses, function (x) { return x.amount; });
  var expMonth = sum(expenses.filter(function (x) { return (x.date || "").slice(0, 7) === month; }), function (x) { return x.amount; });
  var worksTotal = sum(works, function (x) { return x.amount; });
  var worksMonth = sum(works.filter(function (x) { return (x.date || "").slice(0, 7) === month; }), function (x) { return x.amount; });
  var cashTotal = sum(registers, function (r) { return r.balance; });
  var activeEmps = employees.filter(function (e) { return e.status !== "inactive"; });
  var dueCompanies = companies.filter(function (c) { return (Number(c.balance) || 0) > 0; });

  // توزيع فئات المصاريف هذا الشهر
  var CAT = {
    labor: "عمالة", materials: "مواد", equipment: "معدات", transport: "نقل",
    fuel: "وقود", tools: "عدد", rent: "إيجار", food: "إعاشة", misc: "متنوعة"
  };
  var byCat = {};
  expenses.filter(function (x) { return (x.date || "").slice(0, 7) === month; }).forEach(function (x) {
    var k = x.category || "misc";
    byCat[k] = (byCat[k] || 0) + (Number(x.amount) || 0);
  });
  var catKeys = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });

  var recentExp = expenses.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).slice(0, 6);
  var recentWorks = works.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).slice(0, 6);

  function coName(id) {
    var c = companies.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : "—";
  }

  page.innerHTML = html`
    <div class="stack">
      <div class="page-toolbar">
        <div>
          <h2 style="margin:0">لوحة التحكم</h2>
          <p class="muted" style="margin:4px 0 0;font-size:12px">ملخص مصاريف الموقع والشركات والأعمال</p>
        </div>
        <div class="row gap wrap">
          <a class="button primary" href="expenses.html">+ مصروف</a>
          <a class="button small" href="site-works.html">+ عمل</a>
          <a class="button small" href="expense-report.html">التقرير الشهري</a>
        </div>
      </div>

      <div class="stats">
        <div class="stat red"><div class="label">مصاريف هذا الشهر</div><div class="value">${money(expMonth)}</div>
          <div class="muted" style="font-size:11px;margin-top:4px">إجمالي: ${money(expTotal)}</div></div>
        <div class="stat amber"><div class="label">أعمال الشركات هذا الشهر</div><div class="value">${money(worksMonth)}</div>
          <div class="muted" style="font-size:11px;margin-top:4px">إجمالي: ${money(worksTotal)}</div></div>
        <div class="stat teal"><div class="label">رصيد الخزائن</div><div class="value">${money(cashTotal)}</div></div>
        <div class="stat"><div class="label">شركات · موظفين</div><div class="value">${num(companies.length)} · ${num(activeEmps.length)}</div>
          <div class="muted" style="font-size:11px;margin-top:4px">${dueCompanies.length} شركة عليها مستحق</div></div>
      </div>

      <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card">
          <h3 style="margin:0 0 12px">توزيع مصاريف الشهر حسب الفئة</h3>
          ${catKeys.length === 0 ? html`<p class="muted empty">لا مصاريف هذا الشهر</p>` : html`
            <table>
              <thead><tr><th>الفئة</th><th>المبلغ</th></tr></thead>
              <tbody>
                ${catKeys.map(function (k) {
                  return html`<tr><td>${CAT[k] || k}</td><td><b>${money(byCat[k])}</b></td></tr>`;
                }).join("")}
              </tbody>
            </table>`}
        </div>
        <div class="card">
          <h3 style="margin:0 0 12px">شركات عليها مستحق</h3>
          ${dueCompanies.length === 0 ? html`<p class="muted empty">لا مستحقات</p>` : html`
            <table>
              <thead><tr><th>الشركة</th><th>المستحق</th></tr></thead>
              <tbody>
                ${dueCompanies.slice(0, 6).map(function (c) {
                  return html`<tr><td><a href="companies.html">${c.name}</a></td><td class="accent"><b>${money(c.balance)}</b></td></tr>`;
                }).join("")}
              </tbody>
            </table>`}
        </div>
      </div>

      <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div class="card table-wrap">
          <div class="row" style="justify-content:space-between;align-items:center;padding:12px 12px 0">
            <h3 style="margin:0">آخر المصاريف</h3>
            <a class="small button" href="expenses.html">الكل</a>
          </div>
          <table>
            <thead><tr><th>التاريخ</th><th>البيان</th><th>المبلغ</th></tr></thead>
            <tbody>
              ${recentExp.length === 0 ? html`<tr><td colspan="3" class="empty">لا مصاريف</td></tr>` :
                recentExp.map(function (x) {
                  return html`<tr><td dir="ltr">${x.date || ""}</td><td>${x.description || "—"}</td><td><b>${money(x.amount)}</b></td></tr>`;
                }).join("")}
            </tbody>
          </table>
        </div>
        <div class="card table-wrap">
          <div class="row" style="justify-content:space-between;align-items:center;padding:12px 12px 0">
            <h3 style="margin:0">آخر أعمال الشركات</h3>
            <a class="small button" href="site-works.html">الكل</a>
          </div>
          <table>
            <thead><tr><th>التاريخ</th><th>الشركة / البيان</th><th>المبلغ</th></tr></thead>
            <tbody>
              ${recentWorks.length === 0 ? html`<tr><td colspan="3" class="empty">لا أعمال</td></tr>` :
                recentWorks.map(function (w) {
                  return html`<tr><td dir="ltr">${w.date || ""}</td><td><b>${coName(w.company_id)}</b><div class="muted" style="font-size:11px">${w.description || ""}</div></td><td><b>${money(w.amount)}</b></td></tr>`;
                }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
})();
