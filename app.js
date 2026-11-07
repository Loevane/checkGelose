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
const nm = (id) => id.split("/").pop();

/* ---------- Étapes ----------
 p : géloses "id:type[:o]" (a = début+fin, e = fin seule, o = facultative)
 r : règles [type, gélose, références, famille, facultative] */
const S2 = (n, ov) => ({
  n,
  ov,
  grp: [
    {
      p: ["AB:a", "AH:a", "SH:e", "SB04:e", "SB05:e"],
      g: ["13_A", "14_A", "15_B"],
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
const hood = (num, a, b, sc, gl) => {
  const I1 = `I-AH${a}-1`,
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
    ["gap", "SB", [["AB-2", "AB-1"]], "sb"],
    ["air", "AB-1"],
    ["air", "AB-2", 0, 0, 1],
  ],
};
const h1 = hood("1000484036", "01", "02", "", [
  "01_A",
  "02_A",
  "03_A",
  "09_B",
  "10_B",
]);
const h2 = hood("A15325", "03", "04", "A15325/", [
  "05_A",
  "06_A",
  "07_A",
  "11_B",
  "12_B",
]);
const S = [
  {
    n: "Préparation Inoculation",
    ov: "OV159",
    grp: [
      {
        p: ["AB:a", "AH03:a", "AH04:a", "SH03:e", "SH04:e", "SB01:e", "SB03:e"],
        g: ["05_A", "06_A", "09_B", "10_B"],
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
  S2("Inoculation", "OV179"),
  S2("Récolte", "OV179"),
  {
    get n() {
      return $("#val").value.startsWith("BI")
        ? "Récolte godets - Antibiotiques - Stabilisateur - Répartition"
        : "Antibiotiques - Stabilisateur - Répartition";
    },
    ov: "OV159",
    grp: [box, h1, h2],
    r: [box, h1, h2].flatMap((x) => x.r),
  },
];

let V = ld("V", {}),
  M = ld("M", {}),
  cur = 0;
const m = (t) => {
  const x = /^(\d\d):(\d\d)$/.exec(t || "");
  return x && +x[1] < 24 && +x[2] < 60 ? +x[1] * 60 + +x[2] : null;
};
const g = (i, id, k) => m(V[`${i}|${id}|${k}`]);
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

function check(i) {
  const out = [],
    add = (s, t) => out.push({ s, t });
  S[i].r.forEach(([k, a, rf, f, o]) => {
    if (o && !ex(i, a)) return;
    const as = g(i, a, "s"),
      ae = g(i, a, "e"),
      A = nm(a);
    if (k == "cov") {
      const bs = g(i, rf, "s"),
        be = g(i, rf, "e");
      return [as, ae, bs, be].includes(null)
        ? add("skip", `${A} englobe ${rf}`)
        : add(
            as < bs && ae > be ? "ok" : "ko",
            `${A} commence avant ${rf} et finit après`,
          );
    }
    if (k == "bef")
      return rf.forEach((b) => {
        const bs = g(i, b, "s"),
          t = `${A} commence avant ${nm(b)}`;
        add(bs === null || as === null ? "skip" : as < bs ? "ok" : "ko", t);
      });
    if (k == "aft") {
      const gr = G(rf).find((x) => mx(i, x) !== null);
      if (as === null || !gr)
        return add(
          "skip",
          `${A} après la fin de ${G(rf)[0].map(nm).join(" / ")}`,
        );
      return add(
        as >= mx(i, gr) ? "ok" : "ko",
        `${A} commence après la fin de ${gr
          .filter((x) => g(i, x, "e") !== null)
          .map(nm)
          .join(" / ")}`,
      );
    }
    if (k == "gap") {
      const gr = G(rf).find((x) => mx(i, x) !== null);
      if (ae === null || !gr)
        return add("skip", `${A} après ${G(rf)[0].map(nm).join(" / ")}`);
      const d = ae - mx(i, gr);
      return add(
        grade(f, d),
        `${A} : ${d} min après la fin de ${gr
          .filter((x) => g(i, x, "e") !== null)
          .map(nm)
          .join(" / ")}`,
      );
    }
    if (k == "tol") {
      const be = g(i, rf, "e");
      if (as === null || be === null)
        return add("skip", `${A} par rapport à la fin de ${rf}`);
      const d = Math.abs(as - be);
      return add(
        d <= 5 ? "ok" : d <= 9 ? "chk" : "ko",
        `${A} : écart de ${d} min avec la fin de ${rf}`,
      );
    }
    const d = dur(i, a);
    if (d === null) return add("skip", `Durée de ${A}`);
    if (k == "imp")
      return add(impG(d), `${A} : ${d} min (9 à 12 min attendues)`);
    add(
      grade("air", d),
      `${A} : ${Math.floor(d / 60)}h${String(d % 60).padStart(2, "0")} (4h max)`,
    );
  });
  return out;
}

const fmt = (el) => {
  let d = el.value.replace(/\D/g, "").slice(0, 4);
  el.value = d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d;
};
const worst = (i) => {
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
        `<button class="tab ${i == cur ? "on" : ""}" data-i="${i}"><i class="dot ${worst(i)}"></i>${s.n}</button>`,
    ).join("") +
    `<button class="tab ${cur == "r" ? "on" : ""}" data-i="r">Opérateurs</button>`;
}

function form() {
  const s = S[cur];
  $("#form").innerHTML =
    `<div class="head"><div><h3>${s.n}</h3><span class="ov">${s.ov}</span></div><div class="prog" title="Progression"><i id="pb"></i></div></div>` +
    s.grp
      .map(
        (gp) =>
          (gp.t ? `<p class="sub grp">${gp.t}</p>` : "") +
          gp.p
            .map((x) => {
              const [id, t, o] = x.split(":");
              return `<div class="row"><b>${nm(id)}${o ? "<small>facultative</small>" : ""}</b>${t == "a" ? `<input data-k="${cur}|${id}|s" placeholder="début" inputmode="numeric" maxlength="5">` : "<span></span>"}<input data-k="${cur}|${id}|e" placeholder="fin" inputmode="numeric" maxlength="5"></div>`;
            })
            .join("") +
          (gp.g.length
            ? `<p class="sub">Gants :</p>` +
              gp.g
                .map(
                  (x) =>
                    `<div class="row"><b>${x}</b><input data-k="${cur}|G${x}|e" placeholder="fin" inputmode="numeric" maxlength="5"><span class="op"><input data-o="${cur}|G${x}|o" placeholder="n° opérateur" inputmode="numeric" maxlength="8"><i class="pa"></i></span></div>`,
                )
                .join("")
            : ""),
      )
      .join("");
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
  const r = check(cur),
    n = (k) => r.filter((x) => x.s == k).length;
  $("#res").innerHTML =
    `<div class="count"><span class="chip ok">${n("ok")}</span><span class="chip chk">${n("chk")}</span><span class="chip ko">${n("ko")}</span></div>` +
    r
      .map(
        (x, j) =>
          `<div class="res" style="--i:${j}"><span class="chip ${x.s}">${TXT[x.s]}</span><span>${x.t}</span></div>`,
      )
      .join("");
  const ks = [];
  S[cur].grp.forEach((gp) =>
    gp.p.forEach((x) => {
      const [id, t, o] = x.split(":");
      if (o) return;
      ks.push(`${cur}|${id}|e`);
      if (t == "a") ks.push(`${cur}|${id}|s`);
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
    `<h2>Opérateurs</h2><p class="sub">Liste définie dans le fichier operateurs.js (consultation seulement).</p><input id="oq" placeholder="Rechercher un numéro ou un paraphe" value="${q}"><div class="ogrid">` +
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
    t = (x) => x || "—";
  const tb = (i, gp) =>
    (gp.t ? `<h4>${gp.t}</h4>` : "") +
    `<table><tr><th>Gélose</th><th>Début</th><th>Fin</th></tr>${gp.p
      .map((x) => {
        const id = x.split(":")[0];
        return `<tr><td>${nm(id)}</td><td>${t(V[`${i}|${id}|s`])}</td><td>${t(V[`${i}|${id}|e`])}</td></tr>`;
      })
      .join("")}</table>` +
    (gp.g.length
      ? `<table><tr><th>Gants</th><th>Heure</th><th>Opérateur</th></tr>${gp.g
          .map((x) => {
            const o = V[`${i}|G${x}|o`];
            return `<tr><td>${x}</td><td>${t(V[`${i}|G${x}|e`])}</td><td>${o ? pa(o) : "—"}</td></tr>`;
          })
          .join("")}</table>`
      : "");
  $("#synth").innerHTML =
    `<h2>Synthèse géloses — ${$("#val").value}</h2><p>Dossier : ${$("#dossier").value || "—"} · ${d}</p>` +
    S.map(
      (s, i) =>
        `<h3>${s.n} (${s.ov})</h3>` + s.grp.map((gp) => tb(i, gp)).join(""),
    ).join("") +
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
    sv("M", M);
    $("#dossier").value = "";
    show();
  }
};
$("#dossier").value = M.d || "";
$("#val").value = M.v || "Newcastle VG";
show();
