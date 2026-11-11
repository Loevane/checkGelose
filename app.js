const $ = (s) => document.querySelector(s);
const ld = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) || d;
  } catch (e) {
    return d;
  }
};
const sv = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};

// Seuils (en minutes)
const T = {
  sb: { lo: 5, ok: 9, chk: 14 },
  sh: { ok: 5, chk: 9 },
  air: { ok: 240, chk: 254 },
};
const pa = (n) => OPERATEURS[n] || n || "";
// lb : libellé court (formulaire) / nm : libellé complet (messages, avec la hotte si besoin)
const lb = (id) => id.split("/").pop();
const nm = (id) =>
  id.includes("/") ? `${lb(id)} (hotte ${id.split("/")[0]})` : id;
const hm = (x) =>
  String(Math.floor(x / 60)).padStart(2, "0") +
  ":" +
  String(x % 60).padStart(2, "0");
const fh = (d) => `${Math.floor(d / 60)}h${String(d % 60).padStart(2, "0")}`;

/* ---------- Étapes ----------
 id : identifiant stable (sert de préfixe pour l'enregistrement des heures)
 p : géloses "id:type[:o]" (a = début+fin, e = fin seule, o = facultative)
 r : règles [type, gélose, références, famille, facultative] */
const S2 = (id, n, ov) => ({
  id,
  n,
  ov,
  grp: [
    {
      p: ["AB:a", "AH:a", "SH:e", "SB04:e", "SB05:e"],
      g: ["13(A)", "14(A)"],
    },
  ],
  r: [
    ["cov", "AB", "AH"],
    ["gap", "SH", "AH", "sh"],
    ["gap", "SB04", "AB", "sb"],
    ["gap", "SB05", "AB", "sb"],
    ["air", "AB"],
    ["air", "AH"],
  ],
});
const hood = (num, a, b, gl) => {
  const sc = num + "/",
    I1 = `I-AH${a}-1`,
    A1 = `AH${a}-1`,
    B1 = `AH${b}-1`,
    H1 = sc + "SH-1",
    A2 = `AH${a}-2`,
    B2 = `AH${b}-2`,
    H2 = sc + "SH-2",
    I2 = `I-AH${a}-2`;
  return {
    t: "Hotte " + num,
    g: gl,
    p: [
      I1 + ":a",
      A1 + ":a",
      B1 + ":a",
      H1 + ":e",
      A2 + ":a:o",
      B2 + ":a:o",
      H2 + ":e",
      I2 + ":a",
    ],
    r: [
      ["imp", I1],
      ["imp", I2],
      ["aft", A1, [[I1]]],
      ["aft", B1, [[I1]]],
      ["gap", H1, [[A1, B1]], "sh"],
      ["aft", A2, [[A1, B1, H1]], 0, 1],
      ["aft", B2, [[A1, B1, H1]], 0, 1],
      [
        "gap",
        H2,
        [
          [A2, B2],
          [A1, B1],
        ],
        "sh",
      ],
      ["aft", I2, [[H2], [H1]]],
      ["air", A1],
      ["air", B1],
      ["air", A2, 0, 0, 1],
      ["air", B2, 0, 0, 1],
    ],
  };
};
const box = {
  t: "Box",
  g: [],
  p: ["I-AB:a", "AB-1:a", "AB-2:a:o", "SB:e"],
  r: [
    ["imp", "I-AB"],
    ["bef", "AB-1", ["I-AH01-1", "I-AH03-1"]],
    ["tol", "AB-2", "AB-1", 0, 1],
    ["gap", "SB", [["AB-2"], ["AB-1"]], "sb"],
    ["air", "AB-1"],
    ["air", "AB-2", 0, 0, 1],
  ],
};
const h1 = hood("1000484036", "01", "02", ["01(A)", "02(A)", "03(A)", "12(B)"]);
const h2 = hood("A15325", "03", "04", [
  "05(A)",
  "06(A)",
  "07(A)",
  "09(B)",
  "10(B)",
  "11(B)",
]);

// Étape colorant (facultative)
const cbox = {
  t: "Box",
  g: [],
  p: ["AB-1:a", "AB-2:a:o", "SB:e", "I-AB:a"],
  r: [
    ["imp", "I-AB"],
    ["bef", "AB-1", ["I-AH01-1"]],
    ["gap", "SB", [["AB-2"], ["AB-1"]], "sb"],
  ],
};
const chood = {
  t: "Hotte 1000484036",
  g: ["01(A)", "09(B)"],
  p: ["I-AH01-1:a", "AH01:a", "AH02:a", "SH01:e", "SH02:e", "I-AH01-2:a"],
  r: [
    ["imp", "I-AH01-1"],
    ["imp", "I-AH01-2"],
    ["aft", "AH01", [["I-AH01-1"]]],
    ["aft", "AH02", [["I-AH01-1"]]],
    ["gap", "SH01", [["AH01", "AH02"]], "sh"],
    ["gap", "SH02", [["AH01", "AH02"]], "sh"],
    ["aft", "I-AH01-2", [["SH01", "SH02"]]],
  ],
};

const S = [
  {
    id: 0,
    n: "Préparation Inoculum",
    ov: "OV159",
    grp: [
      {
        p: ["AB:a", "AH03:a", "AH04:a", "SH03:e", "SH04:e", "SB01:e", "SB03:e"],
        g: ["01(A)", "02(A)", "09(B)"],
      },
    ],
    r: [
      ["cov", "AB", "AH03"],
      ["cov", "AB", "AH04"],
      ["gap", "SH03", "AH03", "sh"],
      ["gap", "SH04", "AH04", "sh"],
      ["gap", "SB01", "AB", "sb"],
      ["gap", "SB03", "AB", "sb"],
      ["air", "AB"],
      ["air", "AH03"],
      ["air", "AH04"],
    ],
  },
  S2(1, "Inoculation", "OV179"),
  {
    id: "C",
    n: "Préparation colorant",
    ov: "OV159",
    grp: [cbox, chood],
    r: [cbox, chood].flatMap((x) => x.r),
  },
  S2(2, "Récolte", "OV179"),
  {
    id: 3,
    get n() {
      return $("#val").value.startsWith("BI")
        ? "Récolte godets - AB - Stab - Répartition"
        : "AB - Stab - Répartition";
    },
    ov: "OV159",
    grp: [box, h1, h2],
    r: [box, h1, h2].flatMap((x) => x.r),
  },
];

let V = ld("V", {}),
  M = ld("M", {}),
  cur = 0;
// Étapes désactivées (le colorant est désactivé par défaut)
M.off = M.off || { C: true };
const on = (i) => !M.off[S[i].id];

const m = (t) => {
  const x = /^(\d\d):(\d\d)$/.exec(t || "");
  return x && +x[1] < 24 && +x[2] < 60 ? +x[1] * 60 + +x[2] : null;
};
const g = (i, id, k) => m(V[`${S[i].id}|${id}|${k}`]);
const ex = (i, id) => g(i, id, "s") !== null || g(i, id, "e") !== null;
const mx = (i, ids) => {
  const e = ids.map((x) => g(i, x, "e")).filter((x) => x !== null);
  return e.length ? Math.max(...e) : null;
};
const G = (x) => (typeof x == "string" ? [[x]] : x);
const dur = (i, id) => {
  const s = g(i, id, "s"),
    e = g(i, id, "e");
  if (s === null || e === null) return null;
  let d = e - s;
  if (d < 0) d += 1440;
  return d;
};
const impG = (d) =>
  d < 8 ? "ko" : d < 9 ? "chk" : d <= 12 ? "ok" : d <= 15 ? "chk" : "ko";
const grade = (f, x) => {
  if (f == "air") return x <= T.air.ok ? "ok" : x <= T.air.chk ? "chk" : "ko";
  if (x < 0) return "ko";
  if (f == "sh") return x <= T.sh.ok ? "ok" : x <= T.sh.chk ? "chk" : "ko";
  return x < T.sb.lo
    ? "chk"
    : x <= T.sb.ok
      ? "ok"
      : x <= T.sb.chk
        ? "chk"
        : "ko";
};
const TXT = {
  ok: "Conforme",
  chk: "À vérifier",
  ko: "Non conforme",
  skip: "Incomplet",
};

// Retourne [{s: statut, t: raison, a: gélose concernée}]
function check(i) {
  const out = [],
    add = (s, t, a) => out.push({ s, t, a });
  const names = (gr) =>
    gr
      .filter((x) => g(i, x, "e") !== null)
      .map(nm)
      .join(" / ");
  S[i].r.forEach(([k, a, rf, f, o]) => {
    if (o && !ex(i, a)) return;
    const as = g(i, a, "s"),
      ae = g(i, a, "e"),
      A = nm(a);
    if (k == "cov") {
      const bs = g(i, rf, "s"),
        be = g(i, rf, "e");
      if ([as, ae, bs, be].includes(null))
        return add("skip", `${A} englobe ${nm(rf)}`, a);
      return add(
        as < bs && ae > be ? "ok" : "ko",
        `${A} (${hm(as)}–${hm(ae)}) n'englobe pas ${nm(rf)} (${hm(bs)}–${hm(be)})`,
        a,
      );
    }
    if (k == "bef")
      return rf.forEach((b) => {
        const bs = g(i, b, "s");
        add(
          bs === null || as === null ? "skip" : as < bs ? "ok" : "ko",
          `${A} commence à ${as === null ? "?" : hm(as)}, il devrait commencer avant ${nm(b)} (${bs === null ? "?" : hm(bs)})`,
          a,
        );
      });
    if (k == "aft") {
      const gr = G(rf).find((x) => mx(i, x) !== null);
      if (as === null || !gr)
        return add(
          "skip",
          `${A} après la fin de ${G(rf)[0].map(nm).join(" / ")}`,
          a,
        );
      return add(
        as >= mx(i, gr) ? "ok" : "ko",
        `${A} commence à ${hm(as)}, avant la fin de ${names(gr)} (${hm(mx(i, gr))})`,
        a,
      );
    }
    if (k == "gap") {
      const gr = G(rf).find((x) => mx(i, x) !== null);
      if (ae === null || !gr)
        return add("skip", `${A} après ${G(rf)[0].map(nm).join(" / ")}`, a);
      const d = ae - mx(i, gr),
        exp = f == "sh" ? "5 min max" : "5 à 9 min";
      return add(
        grade(f, d),
        d < 0
          ? `${A} finit ${-d} min avant la fin de ${names(gr)}`
          : `${A} finit ${d} min après la fin de ${names(gr)} (attendu : ${exp})`,
        a,
      );
    }
    if (k == "tol") {
      const be = g(i, rf, "e");
      if (as === null || be === null)
        return add("skip", `${A} par rapport à la fin de ${nm(rf)}`, a);
      const d = Math.abs(as - be);
      return add(
        d <= 5 ? "ok" : d <= 9 ? "chk" : "ko",
        `${A} commence à ${d} min de la fin de ${nm(rf)} (attendu : 5 min max)`,
        a,
      );
    }
    const d = dur(i, a);
    if (d === null) return add("skip", `Durée de ${A}`, a);
    if (k == "imp")
      return add(impG(d), `${A} dure ${d} min (attendu : 9 à 12 min)`, a);
    add(grade("air", d), `${A} dure ${fh(d)} (attendu : 4h max)`, a);
  });
  return out;
}

const fmt = (el) => {
  let d = el.value.replace(/\D/g, "").slice(0, 4);
  el.value = d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d;
};
const worst = (i) => {
  if (!on(i)) return "off";
  const r = check(i).map((x) => x.s);
  return r.includes("ko")
    ? "ko"
    : r.includes("chk")
      ? "chk"
      : !r.length || r.includes("skip")
        ? "skip"
        : "ok";
};

function tabs() {
  $("#tabs").innerHTML =
    S.map(
      (s, i) =>
        `<button class="tab ${i == cur ? "on" : ""} ${on(i) ? "" : "dis"}" data-i="${i}"><i class="dot ${worst(i)}"></i>${s.n}</button>`,
    ).join("") +
    `<button class="tab ${cur == "r" ? "on" : ""}" data-i="r">Opérateurs</button>`;
}

function form() {
  const s = S[cur],
    sid = s.id,
    o = on(cur);
  $("#form").innerHTML =
    `<div class="head"><div><h3>${s.n}</h3><span class="ov">${s.ov}</span></div><div class="hr"><button class="sw ${o ? "on" : ""}" data-t="1" role="switch" aria-checked="${o}"><i></i>${o ? "Étape active" : "Étape désactivée"}</button>${o ? '<div class="prog" title="Progression"><i id="pb"></i></div>' : ""}</div></div>` +
    (o
      ? s.grp
          .map(
            (gp) =>
              (gp.t ? `<p class="sub grp">${gp.t}</p>` : "") +
              gp.p
                .map((x) => {
                  const [id, t, op] = x.split(":");
                  return `<div class="row"><b>${lb(id)}${op ? "<small>facultative</small>" : ""}</b>${t == "a" ? `<input data-k="${sid}|${id}|s" placeholder="début" inputmode="numeric" maxlength="5">` : "<span></span>"}<input data-k="${sid}|${id}|e" placeholder="fin" inputmode="numeric" maxlength="5"></div>`;
                })
                .join("") +
              (gp.g.length
                ? `<p class="sub">Gants :</p>` +
                  gp.g
                    .map(
                      (x) =>
                        `<div class="row"><b>${x}</b><input data-k="${sid}|G${x}|e" placeholder="fin" inputmode="numeric" maxlength="5"><span class="op"><input data-o="${sid}|G${x}|o" placeholder="n° opérateur" inputmode="numeric" maxlength="8"><i class="pa"></i></span></div>`,
                    )
                    .join("")
                : ""),
          )
          .join("")
      : `<p class="sub">Étape non utilisée : elle n'apparaît pas dans la synthèse.</p>`);
  document.querySelectorAll("#form input").forEach((el) => {
    el.value = V[el.dataset.k || el.dataset.o] || "";
  });
  pas();
  res();
  const r = $("#res");
  r.classList.add("fresh");
  setTimeout(() => r.classList.remove("fresh"), 800);
}
function pas() {
  document.querySelectorAll(".op").forEach((w) => {
    w.querySelector("i").textContent =
      OPERATEURS[w.querySelector("input").value] || "";
  });
}
function res() {
  if (!on(cur)) {
    $("#res").innerHTML =
      `<p class="sub">Étape désactivée : aucun contrôle.</p>`;
    tabs();
    return;
  }
  const r = check(cur),
    n = (k) => r.filter((x) => x.s == k).length;
  const pts = r
    .filter((x) => x.s == "ko" || x.s == "chk")
    .sort((a, b) => (a.s == "ko" ? 0 : 1) - (b.s == "ko" ? 0 : 1));
  $("#res").innerHTML =
    `<div class="count"><span class="chip chk">${n("chk")} à vérifier</span><span class="chip ko">${n("ko")} non conf.</span></div>` +
    (pts.length
      ? pts
          .map(
            (x, j) =>
              `<div class="res" style="--i:${j}"><span class="chip ${x.s}">${TXT[x.s]}</span><span>${x.t}</span></div>`,
          )
          .join("")
      : `<p class="sub">Aucun point à signaler${n("skip") ? ` (${n("skip")} contrôle(s) en attente de saisie)` : ""}.</p>`);
  const ks = [],
    sid = S[cur].id;
  S[cur].grp.forEach((gp) =>
    gp.p.forEach((x) => {
      const [id, t, o] = x.split(":");
      if (o) return;
      ks.push(`${sid}|${id}|e`);
      if (t == "a") ks.push(`${sid}|${id}|s`);
    }),
  );
  const pb = $("#pb");
  if (pb)
    pb.style.width =
      (100 * ks.filter((k) => m(V[k]) !== null).length) / ks.length + "%";
  tabs();
}

function ops(q = "") {
  const k = Object.keys(OPERATEURS)
    .sort()
    .filter((n) => (n + OPERATEURS[n]).toLowerCase().includes(q.toLowerCase()));
  $("#ops").innerHTML =
    `<h2>Opérateurs</h2><p class="sub">Liste définie dans le fichier operateurs.js (consultation seulement).</p><input id="oq" placeholder="Rechercher un numéro ou un paraphe" value="${q.replace(/"/g, "&quot;")}"><div class="ogrid">` +
    (k
      .map(
        (n) =>
          `<div class="ocard"><b>${n}</b><span>${OPERATEURS[n]}</span></div>`,
      )
      .join("") || '<p class="sub">Aucun résultat.</p>') +
    "</div>";
  const el = $("#oq");
  if (q) {
    el.focus();
    el.setSelectionRange(q.length, q.length);
  }
}

function show() {
  const r = cur == "r";
  $("#saisie").hidden = r;
  $("#ops").hidden = !r;
  r ? ops() : form();
  tabs();
  ["#form", "#res", "#ops"].forEach((s) => {
    const e = $(s);
    e.classList.remove("enter");
    void e.offsetWidth;
    e.classList.add("enter");
  });
}

function synth() {
  const d = new Date().toLocaleDateString("fr-FR"),
    t = (x) => x || "—",
    dot = (s) => (s ? `<i class="pt ${s}"></i>` : "");
  const tb = (i, gp, st) =>
    (gp.t ? `<h4>${gp.t}</h4>` : "") +
    `<table><tr><th>Gélose</th><th>Début</th><th>Fin</th></tr>${gp.p
      .map((x) => {
        const id = x.split(":")[0],
          sid = S[i].id;
        return `<tr><td>${dot(st[id])}${lb(id)}</td><td>${t(V[`${sid}|${id}|s`])}</td><td>${t(V[`${sid}|${id}|e`])}</td></tr>`;
      })
      .join("")}</table>` +
    (gp.g.length
      ? `<table><tr><th>Gants</th><th>Heure</th><th>Opérateur</th></tr>${gp.g
          .map((x) => {
            const o = V[`${S[i].id}|G${x}|o`];
            return `<tr><td>${x}</td><td>${t(V[`${S[i].id}|G${x}|e`])}</td><td>${o ? pa(o) : "—"}</td></tr>`;
          })
          .join("")}</table>`
      : "");
  let any = false;
  const body = S.map((s, i) => {
    if (!on(i)) return "";
    const ev = check(i).filter((x) => x.s == "ko" || x.s == "chk"),
      st = {};
    ev.forEach((x) => {
      if (st[x.a] != "ko") st[x.a] = x.s;
    });
    if (ev.length) any = true;
    return (
      `<h3>${s.n} (${s.ov})</h3>` +
      s.grp.map((gp) => tb(i, gp, st)).join("") +
      (ev.length
        ? `<ul class="evt">${ev.map((x) => `<li>${dot(x.s)}${x.t}</li>`).join("")}</ul>`
        : "")
    );
  }).join("");
  $("#synth").innerHTML =
    `<h2>Synthèse géloses — ${$("#val").value}</h2><p>Dossier : ${$("#dossier").value || "—"} · ${d}</p>` +
    (any
      ? `<p class="leg"><i class="pt chk"></i>À vérifier &nbsp; <i class="pt ko"></i>Non conforme</p>`
      : "") +
    body +
    "<p>Visa : ______________________</p>";
  window.print();
}

document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.k) {
    fmt(el);
    V[el.dataset.k] = el.value;
    sv("V", V);
    res();
    if (el.value.length == 5) {
      const l = [...document.querySelectorAll("#form input")],
        j = l.indexOf(el);
      if (l[j + 1]) l[j + 1].focus();
    }
  }
  if (el.dataset.o) {
    V[el.dataset.o] = el.value;
    sv("V", V);
    pas();
  }
  if (el.id == "oq") ops(el.value);
  if (el.id == "dossier") {
    M.d = el.value;
    sv("M", M);
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id == "val") {
    M.v = e.target.value;
    sv("M", M);
    show();
  }
});
document.addEventListener("click", (e) => {
  const tg = e.target.closest("[data-t]");
  if (tg) {
    const k = S[cur].id;
    M.off[k] = !M.off[k];
    sv("M", M);
    show();
    return;
  }
  const el = e.target.closest("[data-i]");
  if (el) {
    cur = el.dataset.i == "r" ? "r" : +el.dataset.i;
    show();
  }
});
document.addEventListener("mousemove", (e) => {
  const c = e.target.closest && e.target.closest(".glass");
  if (c) {
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", e.clientX - r.left + "px");
    c.style.setProperty("--my", e.clientY - r.top + "px");
  }
});
$("#print").onclick = synth;
$("#reset").onclick = () => {
  if (confirm("Effacer toutes les heures saisies ?")) {
    V = {};
    sv("V", V);
    M.d = "";
    M.off = { C: true };
    sv("M", M);
    $("#dossier").value = "";
    show();
  }
};
$("#dossier").value = M.d || "";
$("#val").value = M.v || "Newcastle VG";
show();
