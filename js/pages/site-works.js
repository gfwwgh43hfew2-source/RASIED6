(async function () {
  var page = await UI.init("site-works");
  if (!page) return;
  var html = UI.html, money = UI.money, num = UI.num;

  var WORK_TYPES = [
    { key: "sand", label: "رمل" },
    { key: "cement", label: "أسمنت" },
    { key: "equipment", label: "معدة / آلة" },
    { key: "steel", label: "حديد" },
    { key: "gravel", label: "زلط / حصى" },
    { key: "transport", label: "نقل" },
    { key: "other", label: "أخرى" },
  ];
  function typeLabel(k) {
    var t = WORK_TYPES.filter(function (x) { return x.key === k; })[0];
    return t ? t.label : (k || "—");
  }

  var works = [], companies = [];
  var urlCompany = (function () {
    try { return new URLSearchParams(location.search).get("company") || ""; } catch (e) { return ""; }
  })();

  page.innerHTML = html`
    <div class="stack">
      <div class="page-toolbar">
        <div>
          <h2 style="margin:0">أعمال الرمل والأسمنت والمعدات</h2>
          <p class="muted" style="margin:4px 0 0;font-size:12px">تسجيل الشغل المأخوذ من الشركات المتعاملة</p>
        </div>
        <div class="row gap wrap">
          <a class="button small" href="companies.html">الشركات</a>
          <button type="button" class="primary" id="btn-add">+ عمل جديد</button>
        </div>
      </div>
      <div class="stats" id="stats"></div>
      <div class="row gap wrap" style="align-items:center">
        <input id="q" placeholder="بحث بالبيان أو الشركة..." autocomplete="off" style="flex:1 1 220px;max-width:320px">
        <select id="f-company" style="max-width:220px"><option value="">كل الشركات</option></select>
        <select id="f-type" style="max-width:160px">
          <option value="">كل الأنواع</option>
          ${WORK_TYPES.map(function (t) { return html`<option value="${t.key}">${t.label}</option>`; }).join("")}
        </select>
        <input id="f-month" type="month" style="max-width:150px">
      </div>
      <div class="card table-wrap" id="list"></div>
    </div>`;

  function coName(id) {
    var c = companies.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : "—";
  }

  function fillCompanies() {
    var sel = document.getElementById("f-company");
    var cur = sel.value || urlCompany;
    sel.innerHTML = '<option value="">كل الشركات</option>' +
      companies.map(function (c) {
        return '<option value="' + c.id + '"' + (c.id === cur ? " selected" : "") + ">" + (c.name || "") + "</option>";
      }).join("");
  }

  function filtered() {
    var q = (document.getElementById("q").value || "").toLowerCase();
    var co = document.getElementById("f-company").value;
    var ty = document.getElementById("f-type").value;
    var month = document.getElementById("f-month").value;
    return works.filter(function (w) {
      if (co && w.company_id !== co) return false;
      if (ty && (w.work_type || "other") !== ty) return false;
      if (month && (w.date || "").slice(0, 7) !== month) return false;
      if (q && ((w.description || "") + " " + coName(w.company_id) + " " + typeLabel(w.work_type)).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function render() {
    var list = filtered().slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); });
    var total = works.reduce(function (s, w) { return s + (Number(w.amount) || 0); }, 0);
    var month = new Date().toISOString().slice(0, 7);
    var mTotal = works.filter(function (w) { return (w.date || "").slice(0, 7) === month; })
      .reduce(function (s, w) { return s + (Number(w.amount) || 0); }, 0);

    document.getElementById("stats").innerHTML = html`
      <div class="stat teal"><div class="label">إجمالي الأعمال</div><div class="value">${money(total)}</div></div>
      <div class="stat amber"><div class="label">أعمال هذا الشهر</div><div class="value">${money(mTotal)}</div></div>
      <div class="stat"><div class="label">عدد السجلات</div><div class="value">${num(works.length)}</div></div>
      <div class="stat red"><div class="label">المعروض</div><div class="value">${money(list.reduce(function (s, w) { return s + (Number(w.amount) || 0); }, 0))}</div></div>`;

    document.getElementById("list").innerHTML = html`
      <table>
        <thead><tr><th>التاريخ</th><th>الشركة</th><th>النوع</th><th>البيان / الكمية</th><th>الوحدة</th><th>المبلغ</th><th></th></tr></thead>
        <tbody>
          ${list.length === 0 ? html`<tr><td colspan="7" class="empty">لا توجد أعمال مسجّلة</td></tr>` :
            list.map(function (w) {
              return html`<tr>
                <td dir="ltr" style="text-align:start">${w.date || ""}</td>
                <td><b>${coName(w.company_id)}</b></td>
                <td><span class="badge">${typeLabel(w.work_type)}</span></td>
                <td>${w.description || "—"}${w.qty != null ? html` <span class="muted">(${w.qty})</span>` : ""}</td>
                <td>${w.unit || "—"}</td>
                <td><b>${money(w.amount)}</b></td>
                <td><div class="actions-cell">
                  <button class="small" data-act="edit" data-id="${w.id}">تعديل</button>
                  <button class="small danger" data-act="del" data-id="${w.id}">حذف</button>
                </div></td>
              </tr>`;
            }).join("")}
        </tbody>
      </table>`;
  }

  function openForm(edit) {
    if (!companies.length) {
      UI.toast("أضف شركة أولاً من صفحة الشركات المتعاملة", true);
      return;
    }
    var ov = document.createElement("div");
    ov.className = "modal-overlay";
    var preCo = edit ? edit.company_id : (urlCompany || companies[0].id);
    ov.innerHTML = html`<div class="modal card">
      <h3 style="margin-top:0">${edit ? "تعديل عمل" : "تسجيل عمل جديد"}</h3>
      <form id="f" class="stack">
        <div class="form-grid">
          <div class="field"><label>الشركة</label>
            <select id="company" required>
              ${companies.map(function (c) {
                return html`<option value="${c.id}" ${c.id === preCo ? "selected" : ""}>${c.name}</option>`;
              }).join("")}
            </select>
          </div>
          <div class="field"><label>نوع الشغل</label>
            <select id="wtype">
              ${WORK_TYPES.map(function (t) {
                return html`<option value="${t.key}" ${edit && edit.work_type === t.key ? "selected" : ""}>${t.label}</option>`;
              }).join("")}
            </select>
          </div>
          <div class="field full"><label>البيان</label>
            <input id="desc" required value="${edit ? (edit.description || "") : ""}" placeholder="مثال: توريد 20 م³ رمل ناعم / إيجار لودر يومين">
          </div>
          <div class="field"><label>الكمية</label>
            <input id="qty" type="number" step="0.01" value="${edit && edit.qty != null ? edit.qty : ""}" placeholder="اختياري">
          </div>
          <div class="field"><label>الوحدة</label>
            <input id="unit" value="${edit ? (edit.unit || "") : ""}" placeholder="م³ · طن · يوم · شيكارة">
          </div>
          <div class="field"><label>المبلغ</label>
            <input id="amount" type="number" step="0.01" required min="0" value="${edit ? (edit.amount || "") : ""}">
          </div>
          <div class="field"><label>التاريخ</label>
            <input id="date" type="date" value="${edit ? (edit.date || "") : new Date().toISOString().slice(0,10)}">
          </div>
          <div class="field full"><label>ملاحظات</label>
            <input id="notes" value="${edit ? (edit.notes || "") : ""}">
          </div>
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
      var payload = {
        company_id: document.getElementById("company").value,
        work_type: document.getElementById("wtype").value,
        description: document.getElementById("desc").value.trim(),
        qty: document.getElementById("qty").value === "" ? null : Number(document.getElementById("qty").value),
        unit: document.getElementById("unit").value.trim(),
        amount: Number(document.getElementById("amount").value) || 0,
        date: document.getElementById("date").value,
        notes: document.getElementById("notes").value.trim(),
      };
      try {
        if (edit) {
          await DB.update("site_works", edit.id, payload);
          UI.toast("تم التحديث");
        } else {
          await DB.insert("site_works", payload);
          UI.toast("تم تسجيل العمل");
        }
        ov.remove();
        await load();
      } catch (err) {
        UI.toast(err.message || "خطأ", true);
      }
    };
  }

  async function load() {
    try {
      var data = await Promise.all([DB.list("site_works"), DB.list("suppliers")]);
      works = data[0] || [];
      companies = data[1] || [];
      fillCompanies();
      render();
    } catch (e) {
      page.innerHTML = '<div class="card error">تعذّر التحميل: ' + (e.message || e) + '</div>';
    }
  }

  document.getElementById("btn-add").onclick = function () { openForm(null); };
  document.getElementById("q").oninput = render;
  document.getElementById("f-company").onchange = render;
  document.getElementById("f-type").onchange = render;
  document.getElementById("f-month").onchange = render;
  document.getElementById("list").onclick = async function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var act = btn.getAttribute("data-act");
    if (act === "edit") {
      var item = works.filter(function (x) { return x.id === id; })[0];
      if (item) openForm(item);
    } else if (act === "del") {
      if (!confirm("حذف هذا السجل؟")) return;
      try {
        await DB.remove("site_works", id);
        UI.toast("تم الحذف");
        await load();
      } catch (err) {
        UI.toast(err.message || "خطأ", true);
      }
    }
  };

  await load();
})();
