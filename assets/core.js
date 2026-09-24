// ---------- utilidades ----------
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// texto do conteúdo: escapa HTML, **negrito**, quebra de linha
const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

async function loadJSON(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error("Não achei " + url);
  return r.json();
}

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg; t.classList.add("show");
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2200);
}

// número no formato brasileiro: "1.380.000" / "12,5" / "94.6"
const num = s => parseFloat(String(s).trim().replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));

const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- blocos do resumo ----------
function renderBlock(b) {
  switch (b.tipo) {
    case "texto": return `<p>${md(b.texto)}</p>`;
    case "lista": return `<${b.numerada ? "ol" : "ul"}>${b.itens.map(i => `<li>${md(i)}</li>`).join("")}</${b.numerada ? "ol" : "ul"}>`;
    case "tabela": return `<div class="tbl"><table>
        <thead><tr>${b.cabecalho.map(h => `<th>${md(h)}</th>`).join("")}</tr></thead>
        <tbody>${b.linhas.map(l => `<tr>${l.map(c => `<td>${md(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
    case "destaque": {
      const nomes = { pegadinha: "⚠️ Pegadinha de prova", dica: "💡 Dica", exemplo: "📌 Exemplo", analogia: "🧠 Pensa assim", atencao: "👀 Atenção" };
      return `<div class="callout ${esc(b.estilo)}"><div class="ct">${esc(b.titulo || nomes[b.estilo] || "")}</div>${md(b.texto)}</div>`;
    }
    case "formula": return `<div class="formulas">${b.itens.map(f =>
        `<div class="formula"><code>${esc(f.formula)}</code><span>${md(f.significado || "")}</span></div>`).join("")}</div>`;
    case "exemplo": return `<div class="worked"><div class="wt">✏️ ${esc(b.titulo || "Exemplo resolvido")}</div>
        ${b.enunciado ? `<p>${md(b.enunciado)}</p>` : ""}
        <ol>${b.passos.map(p => `<li>${md(p)}</li>`).join("")}</ol>
        ${b.conclusao ? `<div class="concl">${md(b.conclusao)}</div>` : ""}</div>`;
    case "flashcards": return `<div class="fc-hint">Clique no cartão para virar. Tente responder antes.</div>
        <div class="flash">${b.cards.map(c =>
          `<button class="fc" onclick="this.classList.toggle('flip')"><div class="in"><div class="f">${md(c.frente)}</div><div class="v">${md(c.verso)}</div></div></button>`).join("")}</div>`;
    case "esquema": return `<pre class="esquema">${esc(b.texto)}</pre>`;
    case "imagem": return `<figure><img src="${esc(b.src)}" alt="${esc(b.legenda || "")}">${b.legenda ? `<figcaption>${md(b.legenda)}</figcaption>` : ""}</figure>`;
    default: return "";
  }
}

// ---------- motor de questões ----------
// modo "estudo": corrige cada questão na hora. modo "prova": corrige tudo no final.
function Quiz(root, questoes, { modo = "estudo", numerar = true, placar = true, onFim } = {}) {
  const L = "ABCDEFGH";
  const estado = questoes.map(() => ({ feito: false, certo: false }));
  root.innerHTML = "";
  const objetivas = questoes.filter(q => q.tipo !== "dissertativa").length;

  let live = null;
  if (placar && modo === "estudo" && objetivas > 1) {
    live = document.createElement("div"); live.className = "live"; root.appendChild(live);
  }
  const atualizaLive = () => {
    if (!live) return;
    const f = estado.filter((e, i) => e.feito && questoes[i].tipo !== "dissertativa");
    live.innerHTML = `<span>Respondidas: ${f.length}/${objetivas}</span><span style="color:var(--green)">Acertos: ${f.filter(e => e.certo).length}</span>`;
    if (f.length === objetivas) fim();
  };

  const corretores = questoes.map((q, i) => {
    const el = document.createElement("div"); el.className = "q";
    const tag = { numerica: "Cálculo", dissertativa: "Dissertativa" }[q.tipo] || "";
    el.innerHTML = `${tag ? `<div class="tag">${tag}</div>` : ""}<p class="enun">${numerar ? `<span class="n">${i + 1}.</span>` : ""}${md(q.enunciado)}</p>`;
    const fb = document.createElement("div"); fb.className = "fb";
    const mostra = (ok, extra = "") => {
      fb.innerHTML = (ok === null ? "" : `<span class="res ${ok ? "ok" : "bad"}">${ok ? "✔ Certo!" : "✘ Não foi dessa vez."}</span> `) + extra;
      fb.classList.add("show");
    };
    let corrigir;

    if (q.tipo === "multipla" || !q.tipo) {
      const ordem = q.embaralhar === false ? q.opcoes.map((_, k) => k) : shuffle(q.opcoes.map((_, k) => k));
      let escolha = null;
      const btns = ordem.map((k, pos) => {
        const b = document.createElement("button"); b.className = "opt";
        b.innerHTML = `<span class="l">${L[pos]})</span><span>${md(q.opcoes[k])}</span>`;
        b.onclick = () => {
          escolha = k;
          btns.forEach(x => x.classList.remove("sel")); b.classList.add("sel");
          if (modo === "estudo") corrigir();
        };
        el.appendChild(b); return b;
      });
      corrigir = () => {
        if (estado[i].feito) return;
        const ok = escolha === q.correta;
        btns.forEach((b, pos) => { b.disabled = true; b.classList.remove("sel");
          if (ordem[pos] === q.correta) b.classList.add("ok"); else if (ordem[pos] === escolha) b.classList.add("bad"); });
        estado[i] = { feito: true, certo: ok };
        mostra(ok, md(q.explicacao || ""));
        atualizaLive();
      };
    } else if (q.tipo === "numerica") {
      const box = document.createElement("div"); box.className = "nfields";
      const ins = q.campos.map(c => {
        const lb = document.createElement("label"); lb.innerHTML = `<span>${md(c.rotulo)}</span>`;
        const inp = document.createElement("input"); inp.inputMode = "decimal"; inp.placeholder = "sua resposta";
        lb.appendChild(inp); box.appendChild(lb); return inp;
      });
      el.appendChild(box);
      if (modo === "estudo") {
        const b = document.createElement("button"); b.className = "btn sm"; b.textContent = "Conferir";
        b.onclick = () => corrigir(); el.appendChild(b);
      }
      corrigir = () => {
        if (estado[i].feito) return;
        let ok = true;
        q.campos.forEach((c, k) => {
          const v = num(ins[k].value), tol = c.tolerancia ?? Math.max(0.011, Math.abs(c.resposta) * 0.001);
          const bom = ins[k].value.trim() !== "" && Math.abs(v - c.resposta) <= tol;
          ins[k].classList.add(bom ? "ok" : "bad"); ins[k].disabled = true; if (!bom) ok = false;
        });
        estado[i] = { feito: true, certo: ok };
        const gab = q.campos.map(c => `${esc(c.rotulo)} = <b>${c.resposta.toLocaleString("pt-BR")}</b>`).join(" · ");
        mostra(ok, `<div>${gab}</div>${q.explicacao ? `<div style="margin-top:6px">${md(q.explicacao)}</div>` : ""}`);
        el.querySelector(".btn")?.remove();
        atualizaLive();
      };
    } else if (q.tipo === "dissertativa") {
      const ta = document.createElement("textarea"); ta.placeholder = "Escreva sua resposta antes de ver o gabarito.";
      el.appendChild(ta);
      const revelar = () => {
        if (estado[i].feito) return;
        estado[i] = { feito: true, certo: null };
        el.querySelector(".btn")?.remove();
        mostra(null, `<b>Resposta esperada:</b> ${md(q.respostaEsperada)}
          ${q.criterios ? `<div style="margin-top:8px"><b>Sua resposta precisa citar:</b></div>
          <ul>${q.criterios.map(c => `<li>${md(c)}</li>`).join("")}</ul>` : ""}`);
      };
      if (modo === "estudo") {
        const b = document.createElement("button"); b.className = "btn sm"; b.textContent = "Ver resposta esperada";
        b.onclick = revelar; el.appendChild(b);
      }
      corrigir = revelar;
    }
    el.appendChild(fb); root.appendChild(el);
    return corrigir;
  });

  const resultado = document.createElement("div");
  let acabou = false;
  const fim = () => {
    if (acabou) return; acabou = true;
    const certos = estado.filter((e, i) => e.certo && questoes[i].tipo !== "dissertativa").length;
    const pct = objetivas ? Math.round(certos / objetivas * 100) : 0;
    const msg = pct >= 80 ? "Mandou bem! Você está pronto nesse conteúdo." : pct >= 50 ? "Quase lá. Releia as explicações das que errou." : "Vale voltar no resumo dessa parte e refazer.";
    if (onFim) onFim({ certos, total: objetivas, pct });
    if (!placar || (!objetivas && modo === "estudo")) return;
    resultado.innerHTML = `<div class="card score">${objetivas ? `<div class="big">${certos}/${objetivas}</div><div class="msg">${pct}% · ${msg}</div>` : ""}
      <button class="btn" data-r>Refazer</button></div>`;
    resultado.querySelector("[data-r]").onclick = () => { Quiz(root, questoes, { modo, numerar, placar, onFim }); root.scrollIntoView({ behavior: "smooth" }); };
  };

  if (modo === "prova") {
    const b = document.createElement("button"); b.className = "btn"; b.textContent = "Corrigir prova";
    b.onclick = () => { corretores.forEach(c => c()); b.remove(); fim(); resultado.scrollIntoView({ behavior: "smooth", block: "center" }); };
    root.appendChild(b);
  }
  root.appendChild(resultado);
  atualizaLive();
}
