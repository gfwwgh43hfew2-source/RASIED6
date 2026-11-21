(async function () {
  var page = await UI.init("companies");
  if (!page) return;
  var html = UI.html, money = UI.money;

  var TYPES = [
    { key: "sand", label: "رمل" },
    { key: "cement", label: "أسمنت" },
    { key: "equipment", label: "معدات" },
    { key: "steel", label: "حديد" },
    { key: "transport", label: "نقل" },
    { key: "general", label: "مقاولات عامة" },
    { key: "other", label: "أخرى" },
  ];
  function typeLabel(k) {
    var t = TYPES.filter(function (x) { return x.key === k; })[0];
    return t ? t.label : (k || "—");
  }

  var items = [], works = [];

  page.innerHTML = html`
    <div class="stack">
      <div class="page-toolbar">
        <div>
          <h2 style="margin:0">الشركات المتعاملة</h2>
          <p class="muted" style="margin:4px 0 0;font-size:12px">شركات الرمل والأسمنت والمعدات والمقاولات</p>
        </div>
        <div class="row gap wrap">
          <a class="button small" href="site-works.html">أعمال الشركات</a>
          <button type="button" class="primary" id="btn-add">+ شركة جديدة</button>
        </div>
      </div>
      <div class="stats" id="stats"></div>
      <div class="row gap wrap" style="align-items:center">
        <input id="q" placeholder="بحث بالاسم أو الهاتف..." autocomplete="off" style="flex:1 1 240px;max-width:360px">
        <select id="f-type" style="max-width:180px">
          <option value="">كل الأنواع</option>
          ${TYPES.map(function (t) { return html`<option value="${t.key}">${t.label}</option>`; }).join("")}
        </select>
      </div>
      <div class="card table-wrap" id="list"></div>
    </div>`;

  function filtered() {
    var q = (document.getElementById("q").value || "").toLowerCase();
    var ty = document.getElementById("f-type").value;
    return items.filter(function (c) {
      if (ty && (c.company_type || "other") !== ty) return false;
      if (q && ((c.name || "") + " " + (c.phone || "") + " " + (c.notes || "")).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function worksTotal(companyId) {
    return works.filter(function (w) { return w.company_id === companyId; })
      .reduce(function (s, w) { return s + (Number(w.amount) || 0); }, 0);
  }
  function worksCount(companyId) {
    return works.filter(function (w) { return w.company_id === companyId; }).length;
  }

  function render() {
    var list = filtered();
    var totalBal = list.reduce(function (s, c) { return s + (Number(c.balance) || 0); }, 0);
    document.getElementById("stats").innerHTML = html`
      <div class="stat teal"><div class="label">عدد الشركات</div><div class="value">${list.length}</div></div>
      <div class="stat amber"><div class="label">إجمالي المستحق</div><div class="value">${money(totalBal)}</div></div>
      <div class="stat"><div class="label">إجمالي الأعمال المسجّلة</div><div class="value">${money(works.reduce(function (s, w) { return s + (Number(w.amount) || 0); }, 0))}</div></div>`;

    document.getElementById("list").innerHTML = html`
      <table>
        <thead><tr><th>الاسم</th><th>النوع</th><th>الهاتف</th><th>عدد الأعمال</th><th>قيمة الأعمال</th><th>المستحق</th><th></th></tr></thead>
        <tbody>
          ${list.length === 0 ? html`<tr><td colspan="7" class="empty">لا توجد شركات — أضف شركة للبدء</td></tr>` :
            list.map(function (c) {
              return html`<tr>
                <td><b>${c.name || "—"}</b>${c.notes ? html`<div class="muted" style="font-size:11px">${c.notes}</div>` : ""}</td>
                <td><span class="badge">${typeLabel(c.company_type)}</span></td>
                <td dir="ltr">${c.phone || "—"}</td>
                <td>${worksCount(c.id)}</td>
                <td>${money(worksTotal(c.id))}</td>
                <td class="${(c.balance || 0) > 0 ? "accent" : ""}">${money(c.balance)}</td>
                <td><div class="actions-cell">
                  <a class="small button" href="site-works.html?company=${c.id}">الأعمال</a>
                  <button class="small" data-act="edit" data-id="${c.id}">تعديل</button>
                  <button class="small danger" data-act="del" data-id="${c.id}">حذف</button>
                </div></td>
              </tr>`;
            }).join("")}
        </tbody>
      </table>`;
  }

  function openForm(edit) {
    var ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = html`<div class="modal card">
      <h3 style="margin-top:0">${edit ? "تعديل شركة" : "شركة جديدة"}</h3>
      <form id="f" class="stack">
        <div class="form-grid">
          <div class="field full"><label>اسم الشركة</label><input id="name" required value="${edit ? (edit.name || "") : ""}" placeholder="مثال: شركة الرمال الذهبية"></div>
          <div class="field"><label>النوع</label>
            <select id="ctype">${TYPES.map(function (t) {
              return html`<option value="${t.key}" ${edit && edit.company_type === t.key ? "selected" : ""}>${t.label}</option>`;
            }).join("")}</select>
          </div>
          <div class="field"><label>الهاتف</label><input id="phone" value="${edit ? (edit.phone || "") : ""}" dir="ltr"></div>
          <div class="field"><label>المستحق (رصيد)</label><input id="balance" type="number" step="0.01" value="${edit ? (edit.balance || 0) : 0}"></div>
          <div class="field full"><label>ملاحظات</label><input id="notes" value="${edit ? (edit.notes || "") : ""}" placeholder="عنوان، مسؤول، شروط…"></div>
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
        name: document.getElementById("name").value.trim(),
        company_type: document.getElementById("ctype").value,
        phone: document.getElementById("phone").value.trim(),
        balance: Number(document.getElementById("balance").value) || 0,
        notes: document.getElementById("notes").value.trim(),
      };
      try {
        if (edit) {
          await DB.update("suppliers", edit.id, payload);
          UI.toast("تم التحديث");
        } else {
          await DB.insert("suppliers", payload);
          UI.toast("تمت إضافة الشركة");
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
      var data = await Promise.all([DB.list("suppliers"), DB.list("site_works")]);
      items = data[0] || [];
      works = data[1] || [];
      render();
    } catch (e) {
      page.innerHTML = '<div class="card error">تعذّر التحميل: ' + (e.message || e) + '</div>';
    }
  }

  document.getElementById("btn-add").onclick = function () { openForm(null); };
  document.getElementById("q").oninput = render;
  document.getElementById("f-type").onchange = render;
  document.getElementById("list").onclick = async function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var id = btn.getAttribute("data-id");
    var act = btn.getAttribute("data-act");
    if (act === "edit") {
      var item = items.filter(function (x) { return x.id === id; })[0];
      if (item) openForm(item);
    } else if (act === "del") {
      if (!confirm("حذف هذه الشركة؟")) return;
      try {
        await DB.remove("suppliers", id);
        UI.toast("تم الحذف");
        await load();
      } catch (err) {
        UI.toast(err.message || "خطأ", true);
      }
    }
  };

  await load();
})();
