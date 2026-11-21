(async function () {
  var page = await UI.init("expense-report");
  if (!page) return;
  var html = UI.html, money = UI.money, num = UI.num;

  var CATEGORIES = {
    labor: "عمالة وأجور",
    materials: "مواد خام (رمل/أسمنت/حديد)",
    equipment: "معدات وآلات",
    transport: "نقل ومواصلات",
    fuel: "وقود وطاقة",
    tools: "عدد وأدوات",
    rent: "إيجار موقع/معدات",
    food: "إعاشة ووجبات",
    misc: "مصروفات متنوعة",
  };

  var now = new Date();
  var defaultMonth = now.toISOString().slice(0, 7);

  page.innerHTML = html`
    <div class="stack">
      <div class="page-toolbar">
        <div>
          <h2 style="margin:0">التقرير الشهري للمصاريف</h2>
          <p class="muted" style="margin:4px 0 0;font-size:12px">تقرير كامل بمصاريف الموقع لشهر محدد · طباعة وتصدير Excel</p>
        </div>
        <div class="row gap wrap">
          <input type="month" id="month" value="${defaultMonth}" style="max-width:160px">
          <button type="button" class="small" id="btn-print">طباعة</button>
          <button type="button" class="small" id="btn-xlsx">تصدير Excel</button>
          <button type="button" class="primary" id="btn-run">عرض التقرير</button>
        </div>
      </div>
      <div class="stats" id="stats"></div>
      <div class="card" id="by-cat"></div>
      <div class="card table-wrap" id="detail"></div>
    </div>`;

  var expenses = [];

  function catLabel(k) { return CATEGORIES[k] || k || "متنوعة"; }

  function monthList() {
    var month = document.getElementById("month").value || defaultMonth;
    return expenses.filter(function (x) { return (x.date || "").slice(0, 7) === month; })
      .sort(function (a, b) { return (a.date || "").localeCompare(b.date || ""); });
  }

  function render() {
    var month = document.getElementById("month").value || defaultMonth;
    var list = monthList();
    var total = list.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);

    var byCat = {};
    list.forEach(function (x) {
      var k = x.category || "misc";
      byCat[k] = (byCat[k] || 0) + (Number(x.amount) || 0);
    });
    var catRows = Object.keys(byCat).sort(function (a, b) { return byCat[b] - byCat[a]; });

    document.getElementById("stats").innerHTML = html`
      <div class="stat red"><div class="label">إجمالي الشهر</div><div class="value">${money(total)}</div></div>
      <div class="stat"><div class="label">عدد الحركات</div><div class="value">${num(list.length)}</div></div>
      <div class="stat teal"><div class="label">عدد الفئات</div><div class="value">${num(catRows.length)}</div></div>
      <div class="stat amber"><div class="label">الشهر</div><div class="value" style="font-size:18px">${month}</div></div>`;

    document.getElementById("by-cat").innerHTML = html`
      <h3 style="margin:0 0 12px">التوزيع حسب الفئة</h3>
      <table>
        <thead><tr><th>الفئة</th><th>المبلغ</th><th>النسبة</th></tr></thead>
        <tbody>
          ${catRows.length === 0 ? html`<tr><td colspan="3" class="empty">لا توجد مصاريف لهذا الشهر</td></tr>` :
            catRows.map(function (k) {
              var pct = total ? ((byCat[k] / total) * 100).toFixed(1) : "0";
              return html`<tr><td><b>${catLabel(k)}</b></td><td>${money(byCat[k])}</td><td>${pct}%</td></tr>`;
            }).join("")}
        </tbody>
        ${catRows.length ? html`<tfoot><tr><td><b>الإجمالي</b></td><td><b>${money(total)}</b></td><td>100%</td></tr></tfoot>` : ""}
      </table>`;

    document.getElementById("detail").innerHTML = html`
      <h3 style="margin:0 0 12px;padding:12px 12px 0">تفاصيل الحركات</h3>
      <table>
        <thead><tr><th>التاريخ</th><th>البيان</th><th>الفئة</th><th>الطريقة</th><th>المبلغ</th></tr></thead>
        <tbody>
          ${list.length === 0 ? html`<tr><td colspan="5" class="empty">لا توجد مصاريف</td></tr>` :
            list.map(function (x) {
              return html`<tr>
                <td dir="ltr" style="text-align:start">${x.date || ""}</td>
                <td>${x.description || "—"}</td>
                <td><span class="badge">${catLabel(x.category)}</span></td>
                <td>${x.method === "bank" ? "بنك" : "نقدي"}</td>
                <td><b>${money(x.amount)}</b></td>
              </tr>`;
            }).join("")}
        </tbody>
        ${list.length ? html`<tfoot><tr><td colspan="4"><b>الإجمالي</b></td><td><b>${money(total)}</b></td></tr></tfoot>` : ""}
      </table>`;
  }

  function exportXlsx() {
    var month = document.getElementById("month").value || defaultMonth;
    var list = monthList();
    var total = list.reduce(function (s, x) { return s + (Number(x.amount) || 0); }, 0);
    if (!window.Xlsx || !Xlsx.download) {
      UI.toast("مكتبة Excel غير متاحة", true);
      return;
    }
    var rows = [
      [{ v: "تقرير مصاريف الموقع — " + month, s: "title" }],
      [],
      [{ v: "التاريخ", s: "head" }, { v: "البيان", s: "head" }, { v: "الفئة", s: "head" }, { v: "الطريقة", s: "head" }, { v: "المبلغ", s: "head" }],
    ];
    list.forEach(function (x) {
      rows.push([
        { v: x.date || "", s: "date" },
        { v: x.description || "", s: "text" },
        { v: catLabel(x.category), s: "text" },
        { v: x.method === "bank" ? "بنك" : "نقدي", s: "text" },
        { v: Number(x.amount) || 0, s: "num" },
      ]);
    });
    rows.push([]);
    rows.push([{ v: "الإجمالي", s: "boldtext" }, "", "", "", { v: total, s: "boldnum" }]);
    Xlsx.download("مصاريف-الموقع-" + month + ".xlsx", {
      sheet: "مصاريف",
      cols: [14, 36, 28, 12, 14],
      rows: rows,
      merges: ["A1:E1"],
    });
    UI.toast("تم تنزيل ملف Excel");
  }

  document.getElementById("btn-run").onclick = render;
  document.getElementById("month").onchange = render;
  document.getElementById("btn-xlsx").onclick = exportXlsx;
  document.getElementById("btn-print").onclick = function () {
    var month = document.getElementById("month").value;
    var body = document.getElementById("stats").outerHTML +
      document.getElementById("by-cat").outerHTML +
      document.getElementById("detail").outerHTML;
    if (UI.printReport) {
      UI.printReport("تقرير مصاريف الموقع — " + month, body);
    } else {
      var w = window.open("", "_blank");
      w.document.write("<!doctype html><html lang=ar dir=rtl><head><meta charset=utf-8><title>تقرير " + month + "</title>");
      w.document.write("<style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;direction:rtl}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #ddd;padding:8px;text-align:right}th{background:#182763;color:#fff}.stat{display:inline-block;margin:8px;padding:12px 18px;border:1px solid #e4e8f0;border-radius:10px}.value{font-size:20px;font-weight:700}</style></head><body>");
      w.document.write("<h1>تقرير مصاريف الموقع — " + month + "</h1>" + body);
      w.document.write("</body></html>");
      w.document.close();
      setTimeout(function () { w.print(); }, 300);
    }
  };

  try {
    expenses = await DB.list("expenses") || [];
    render();
  } catch (e) {
    page.innerHTML = '<div class="card error">تعذّر التحميل: ' + (e.message || e) + '</div>';
  }
})();
