/* ==========================================================
   Contrôle des géloses
   Dépend de operateurs.js (const OPERATEURS = { numéro: paraphe })
   1. Utilitaires   2. Seuils   3. Définition des étapes
   4. Heures & contrôles   5. Affichage   6. Synthèse   7. Événements
   ========================================================== */

/* ---------- 1. Utilitaires ---------- */
const $ = (s) => document.querySelector(s);
// Lecture / écriture dans le navigateur (échec silencieux si indisponible)
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
const pa = (n) => OPERATEURS[n] || n || ""; // paraphe, sinon le numéro tel quel
// lb : libellé court (formulaire) / nm : libellé complet (messages, avec la hotte si besoin)
const lb = (id) => id.split("/").pop();
const nm = (id) =>
  id.includes("/") ? `${lb(id)} (hotte ${id.split("/")[0]})` : id;
const hm = (x) =>
  String(Math.floor(x / 60)).padStart(2, "0") +
  ":" +
  String(x % 60).padStart(2, "0");
const fh = (d) => `${Math.floor(d / 60)}h${String(d % 60).padStart(2, "0")}`;

/* ---------- 2. Seuils (minutes entières, la saisie est à la minute) ----------
 sb  : surface de box   0 à 8 conforme, 9 à 14 à vérifier, 15+ non conforme
 sh  : surface de hotte 0 à 4 conforme, 5 à 9 à vérifier, 10+ non conforme
       (sb et sh : fin avant la référence = non conforme)
 air : durée d'une gélose d'air, 4h00 conforme, 4h01 à 4h14 à vérifier, 4h15+ non conforme */
const T = {
  sb: { ok: 8, chk: 14 },
  sh: { ok: 4, chk: 9 },
  air: { ok: 240, chk: 254 },
};

// Écart entre deux fins (sb / sh) ou durée d'une gélose d'air
const grade = (f, x) => {
  if (f == "air") return x <= T.air.ok ? "ok" : x <= T.air.chk ? "chk" : "ko";
  if (x < 0) return "ko";
  return x <= T[f].ok ? "ok" : x <= T[f].chk ? "chk" : "ko";
};
// Impacteur : 9 à 12 min conforme ; 8 min et 13 à 15 min à vérifier ; sinon non conforme
const impG = (d) =>
  d < 8 ? "ko" : d == 8 ? "chk" : d <= 12 ? "ok" : d <= 15 ? "chk" : "ko";
// AB-2 par rapport à la fin d'AB-1 (d > 0 : après, d < 0 : avant)
// Après : 0 à 4 conforme, 5 à 9 à vérifier, 10+ non conforme
// Avant : 0 à 1 conforme, 2 à vérifier, 3+ non conforme
const tolG = (d) =>
  d >= 0
    ? d <= 4
      ? "ok"
      : d <= 9
        ? "chk"
        : "ko"
    : d >= -1
      ? "ok"
      : d >= -2
        ? "chk"
        : "ko";

const TXT = { chk: "À vérifier", ko: "Non conforme" };

/* ---------- 3. Définition des étapes ----------
 id : identifiant stable (préfixe de l'enregistrement des heures)
 grp : groupes de géloses ; p : "id:type[:o]" (a = début+fin, e = fin seule, o = facultative)
 g : paires de gants (non vérifiées)
 r : règles [type, gélose, références, famille, facultative]
   cov : la gélose englobe la référence      bef : commence avant la référence
   aft : commence après la fin de la référence (hors délai)
   gap : écart entre les fins (famille sb / sh)    tol : AB-2 vs fin d'AB-1
   imp : durée d'impacteur                   air : durée d'une gélose d'air
 Références : liste de groupes ; le premier groupe renseigné est utilisé,
 et on retient la fin la plus tardive du groupe. */

// Étapes Inoculation et Récolte (mêmes géloses et mêmes règles)
const S2 = (id, n, ov) => ({
  id,
  n,
  ov,
  grp: [
    { p: ["AB:a", "AH:a", "SH:e", "SB04:e", "SB05:e"], g: ["13(A)", "14(A)"] },
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

// Hotte de l'étape 5 : a/b = numéros des deux AH (01/02 ou 03/04), gl = gants
const hood = (num, a, b, gl) => {
  const sc = num + "/", // préfixe pour distinguer SH-1 / SH-2 d'une hotte à l'autre
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
      ], // sinon, par rapport à la séquence 1
      ["aft", I2, [[H2], [H1]]],
      ["air", A1],
      ["air", B1],
      ["air", A2, 0, 0, 1],
      ["air", B2, 0, 0, 1],
    ],
  };
};

// Étape 5 : box (I-AB en dernier)
const box = {
  t: "Box",
  g: [],
  p: ["AB-1:a", "AB-2:a:o", "SB:e", "I-AB:a"],
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

// Étape colorant : petite étape, pas d'AB-2
const cbox = {
  t: "Box",
  g: [],
  p: ["AB-1:a", "SB:e", "I-AB:a"],
  r: [
    ["imp", "I-AB"],
    ["bef", "AB-1", ["I-AH01-1"]],
    ["gap", "SB", "AB-1", "sb"],
    ["air", "AB-1"],
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
    ["air", "AH01"],
    ["air", "AH02"],
  ],
};

// Liste ordonnée des étapes (l'ordre = l'ordre des onglets)
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
    // Le titre dépend de la valence choisie
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

/* ---------- État enregistré dans le navigateur ----------
 V : heures saisies (clé "étape|gélose|s/e", gants "étape|Ggant|e/o")
 M : réglages (d = n° de dossier, v = valence, off = étapes désactivées) */
let V = ld("V", {}),
  M = ld("M", {}),
  cur = 0; // onglet affiché : index d'étape ou "r" (opérateurs)
M.off = M.off || { C: true }; // le colorant est désactivé par défaut
const on = (i) => !M.off[S[i].id];

/* ---------- 4. Heures & contrôles ---------- */
// "HH:MM" -> minutes, ou null si invalide
const m = (t) => {
  const x = /^(\d\d):(\d\d)$/.exec(t || "");
  return x && +x[1] < 24 && +x[2] < 60 ? +x[1] * 60 + +x[2] : null;
};
const g = (i, id, k) => m(V[`${S[i].id}|${id}|${k}`]); // k : "s" début, "e" fin
const ex = (i, id) => g(i, id, "s") !== null || g(i, id, "e") !== null; // gélose renseignée ?
// Fin la plus tardive parmi des géloses (null si aucune n'est renseignée)
const mx = (i, ids) => {
  const e = ids.map((x) => g(i, x, "e")).filter((x) => x !== null);
  return e.length ? Math.max(...e) : null;
};
const G = (x) => (typeof x == "string" ? [[x]] : x); // référence simple -> liste de groupes
// Durée en minutes ; une fin avant le début donne une durée aberrante, donc signalée
const dur = (i, id) => {
  const s = g(i, id, "s"),
    e = g(i, id, "e");
  if (s === null || e === null) return null;
  return e >= s ? e - s : e - s + 1440;
};

// Retourne [{ s: statut, t: raison, a: gélose concernée }]
// Statuts : ok, chk (à vérifier), ko (non conforme), skip (saisie incomplète)
function check(i) {
  const out = [],
    add = (s, t, a) => out.push({ s, t, a });
  const names = (gr) =>
    gr
      .filter((x) => g(i, x, "e") !== null)
      .map(nm)
      .join(" / ");
  S[i].r.forEach(([k, a, rf, f, o]) => {
    if (o && !ex(i, a)) return; // gélose facultative non renseignée : pas de contrôle
    const as = g(i, a, "s"),
      ae = g(i, a, "e"),
      A = nm(a);

    if (k == "cov") {
      const bs = g(i, rf, "s"),
        be = g(i, rf, "e");
      if ([as, ae, bs, be].includes(null)) return add("skip", "", a);
      return add(
        as < bs && ae > be ? "ok" : "ko",
        `${A} (${hm(as)}–${hm(ae)}) n'englobe pas ${nm(rf)} (${hm(bs)}–${hm(be)})`,
        a,
      );
    }
    if (k == "bef")
      return rf.forEach((b) => {
        const bs = g(i, b, "s");
        if (bs === null || as === null) return add("skip", "", a);
        add(
          as < bs ? "ok" : "ko",
          `${A} commence à ${hm(as)}, il devrait commencer avant ${nm(b)} (${hm(bs)})`,
          a,
        );
      });
    if (k == "aft") {
      const gr = G(rf).find((x) => mx(i, x) !== null);
      if (as === null || !gr) return add("skip", "", a);
      return add(
        as >= mx(i, gr) ? "ok" : "ko",
        `${A} commence à ${hm(as)}, avant la fin de ${names(gr)} (${hm(mx(i, gr))})`,
        a,
      );
    }
    if (k == "gap") {
      const gr = G(rf).find((x) => mx(i, x) !== null);
      if (ae === null || !gr) return add("skip", "", a);
      const d = ae - mx(i, gr),
        exp = f == "sh" ? "0 à 4 min" : "0 à 8 min";
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
      if (as === null || be === null) return add("skip", "", a);
      const d = as - be;
      return add(
        tolG(d),
        `${A} commence ${d >= 0 ? `${d} min après` : `${-d} min avant`} la fin de ${nm(rf)} (attendu : jusqu'à 4 min après ou 1 min avant)`,
        a,
      );
    }
    // imp et air : contrôle de durée
    const d = dur(i, a);
    if (d === null) return add("skip", "", a);
    if (k == "imp")
      return add(impG(d), `${A} dure ${d} min (attendu : 9 à 12 min)`, a);
    add(grade("air", d), `${A} dure ${fh(d)} (attendu : 4h max)`, a);
  });
  return out;
}

// Pastille d'un onglet : seuls les écarts sont signalés
const worst = (i) => {
  if (!on(i)) return "off";
  const r = check(i).map((x) => x.s);
  return r.includes("ko") ? "ko" : r.includes("chk") ? "chk" : "none";
};

/* ---------- 5. Affichage ---------- */
// Formate la saisie en HH:MM (1430 -> 14:30)
const fmt = (el) => {
  const d = el.value.replace(/\D/g, "").slice(0, 4);
  el.value = d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d;
};

// Surligne une heure invalide (strict : aussi les heures incomplètes, à la sortie du champ)
function flag(el, strict) {
  const bad = strict && el.value !== "" && m(el.value) === null;
  el.classList.toggle("bad", bad);
  const row = el.closest(".row"),
    err = row && row.querySelector(".err");
  if (err) err.hidden = !row.querySelector("input.bad");
}

function tabs() {
  $("#tabs").innerHTML =
    S.map(
      (s, i) =>
        `<button class="tab ${i == cur ? "on" : ""} ${on(i) ? "" : "dis"}" data-i="${i}"><i class="dot ${worst(i)}"></i>${s.n}</button>`,
    ).join("") +
    `<button class="tab tab-ops ${cur == "r" ? "on" : ""}" data-i="r">Opérateurs</button>`;
}

// Formulaire de l'étape affichée
function form() {
  const s = S[cur],
    sid = s.id,
    o = on(cur),
    err = '<small class="err" hidden>Heure invalide</small>';
  const label = o ? "Étape active" : "Étape désactivée";
  $("#form").innerHTML =
    `<div class="head"><div><h3>${s.n}</h3><span class="ov">${s.ov}</span></div><div class="hr"><button class="sw ${o ? "on" : ""}" data-t="1" role="switch" aria-checked="${o}" aria-label="${label}" title="${label}"><i></i></button>${o ? '<div class="prog" title="Progression"><i id="pb"></i></div>' : ""}</div></div>` +
    (o
      ? s.grp
          .map(
            (gp) =>
              (gp.t ? `<p class="sub grp">${gp.t}</p>` : "") +
              gp.p
                .map((x) => {
                  const [id, t] = x.split(":");
                  return `<div class="row"><b>${lb(id)}</b>${t == "a" ? `<input data-k="${sid}|${id}|s" placeholder="début" inputmode="numeric" maxlength="5">` : "<span></span>"}<input data-k="${sid}|${id}|e" placeholder="fin" inputmode="numeric" maxlength="5">${err}</div>`;
                })
                .join("") +
              (gp.g.length
                ? `<p class="sub">Gants :</p>` +
                  gp.g
                    .map(
                      (x) =>
                        `<div class="row"><b>${x}</b><input data-k="${sid}|G${x}|e" placeholder="fin" inputmode="numeric" maxlength="5"><span class="op"><input data-o="${sid}|G${x}|o" placeholder="n° opérateur" inputmode="numeric" maxlength="8"><i class="pa"></i></span>${err}</div>`,
                    )
                    .join("")
                : ""),
          )
          .join("")
      : `<p class="sub">Étape non utilisée : elle n'apparaît pas dans la synthèse.</p>`);
  // Remplit les champs avec les heures enregistrées
  document.querySelectorAll("#form input").forEach((el) => {
    el.value = V[el.dataset.k || el.dataset.o] || "";
  });
  document
    .querySelectorAll("#form input[data-k]")
    .forEach((el) => flag(el, el.value.length == 5));
  pas();
  res();
  const r = $("#res");
  r.classList.add("fresh");
  setTimeout(() => r.classList.remove("fresh"), 800);
}

// Affiche le paraphe à côté de chaque n° d'opérateur connu
function pas() {
  document.querySelectorAll(".op").forEach((w) => {
    w.querySelector("i").textContent =
      OPERATEURS[w.querySelector("input").value] || "";
  });
}

// Panneau des écarts : uniquement « à vérifier » et « non conforme », avec la raison
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
    .sort((a, b) => (a.s == "ko" ? 0 : 1) - (b.s == "ko" ? 0 : 1)); // non conformes d'abord
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
  // Barre de progression : géloses obligatoires renseignées
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

// Onglet Opérateurs : liste en consultation avec recherche
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

// Affiche l'onglet courant avec une petite animation
function show() {
  const r = cur == "r";
  $("#saisie").hidden = r;
  $("#ops").hidden = !r;
  r ? ops() : form();
  tabs();
  ["#form", "#res", "#ops"].forEach((s) => {
    const e = $(s);
    e.classList.remove("enter");
    void e.offsetWidth; // relance l'animation
    e.classList.add("enter");
  });
}

/* ---------- 6. Synthèse imprimable ---------- */
function synth() {
  const d = new Date().toLocaleDateString("fr-FR"),
    t = (x) => x || "—",
    dot = (s) => (s ? `<i class="pt ${s}"></i>` : "");
  // Tableau d'un groupe de géloses (+ gants) ; st : statut le plus grave par gélose
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
  let any = false; // y a-t-il au moins un écart (pour afficher la légende) ?
  const body = S.map((s, i) => {
    if (!on(i)) return ""; // étape désactivée : absente de la synthèse
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

/* ---------- 7. Événements ---------- */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.k) {
    // On n'avance au champ suivant que si le dernier caractère vient d'être tapé
    const typed =
      e.inputType === "insertText" && el.selectionStart >= el.value.length;
    fmt(el);
    V[el.dataset.k] = el.value;
    sv("V", V);
    flag(el, el.value.length == 5);
    res();
    if (typed && el.value.length == 5 && m(el.value) !== null) {
      const l = [...document.querySelectorAll("#form input")],
        nx = l[l.indexOf(el) + 1];
      if (nx) nx.focus();
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
document.addEventListener("focusout", (e) => {
  if (e.target.dataset && e.target.dataset.k) flag(e.target, true);
});
document.addEventListener("change", (e) => {
  if (e.target.id == "val") {
    M.v = e.target.value;
    sv("M", M);
    show();
  }
});
document.addEventListener("click", (e) => {
  const tg = e.target.closest("[data-t]"); // interrupteur d'étape
  if (tg) {
    const k = S[cur].id;
    M.off[k] = !M.off[k];
    sv("M", M);
    show();
    return;
  }
  const el = e.target.closest("[data-i]"); // onglet
  if (el) {
    cur = el.dataset.i == "r" ? "r" : +el.dataset.i;
    show();
  }
});
// Halo lumineux qui suit la souris sur les cartes
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

/* ---------- Démarrage ---------- */
$("#dossier").value = M.d || "";
$("#val").value = M.v || "Newcastle VG";
show();
