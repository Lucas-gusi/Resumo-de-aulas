(async () => {
  const params = new URLSearchParams(location.search);
  const slug = params.get("m"), tela = params.get("v");
  const view = document.getElementById("view");
  const back = document.querySelector("header.top .back");
  let M;
  try { M = await loadJSON(`conteudo/${slug}.json`); }
  catch (e) { document.getElementById("nome").textContent = "Ainda não resumido"; view.innerHTML = `<p class="muted">Essa matéria ainda não tem resumo. <a href="index.html">Voltar</a></p>`; return; }

  document.title = `${M.nome} · Resumos da Turma`;
  document.getElementById("nome").textContent = M.nome;
  document.getElementById("sub").textContent = [M.professor, M.avaliacao].filter(Boolean).join(" · ");
  const url = v => `materia.html?m=${encodeURIComponent(slug)}${v ? "&v=" + v : ""}`;


  // ---------------- ESCOLHA ----------------
  function escolher() {
    const nq = (M.miniProvas || []).length + (M.simulado ? 1 : 0);
    view.innerHTML = `<div class="choose">
        <a class="opt-big" href="${url("resumo")}"><span class="ic">📖</span><span><b>Resumo</b>
          <span class="d">Quick view, perguntas-chave e o conteúdo explicado</span></span></a>
        <a class="opt-big" href="${url("provas")}"><span class="ic">📝</span><span><b>Mini provas</b>
          <span class="d">${nq} provas com correção e explicação</span></span></a>
      </div>
      ${M.materiais?.length ? `<h3>📎 Materiais</h3><div class="files">${M.materiais.map(f =>
        `<a href="${esc(f.arquivo)}" target="_blank" rel="noopener"><span style="font-size:20px">📄</span><span><b>${esc(f.nome)}</b>${f.descricao ? `<div class="fd">${esc(f.descricao)}</div>` : ""}</span></a>`).join("")}</div>` : ""}`;
  }

  // ---------------- RESUMO ----------------
  // bloco "pergunta → Mostrar resposta"
  const pergunta = (p, r) => `<div class="qa"><div class="qa-p">${p}</div>
      <button class="qa-btn" type="button">Mostrar resposta</button><div class="qa-r">${r}</div></div>`;
  const respostaDe = q => q.tipo === "multipla" ? `<b>${md(q.opcoes[q.correta])}</b>${q.explicacao ? `<br>${md(q.explicacao)}` : ""}`
    : q.tipo === "numerica" ? q.campos.map(c => `${esc(c.rotulo)} = <b>${c.resposta.toLocaleString("pt-BR")}</b>`).join(" · ") + (q.explicacao ? `<br>${md(q.explicacao)}` : "")
    : md(q.respostaEsperada || "");

  function resumo() {
    let h = `<article class="doc">`;

    // Quick view
    h += `<section class="quick"><h2>⚡ Quick View</h2>
      <p class="lead">O essencial da matéria. Leia antes de estudar e de novo antes da prova.</p>
      <ul>${M.quickView.map(it => `<li>${it.topico ? `<b>${esc(it.topico)}:</b> ` : ""}${md(it.texto)}</li>`).join("")}</ul></section>`;

    // Perguntas-chave
    if (M.revisaoRapida?.length) {
      h += `<section><div class="row between"><h2>❓ Perguntas-chave</h2><button class="link-btn" id="all" type="button">Mostrar todas</button></div>
        <p class="lead">Tente responder de cabeça e depois confira.</p>
        <div class="qa-list">${M.revisaoRapida.map(x => pergunta(md(x.se), md(x.entao))).join("")}</div></section>`;
    }

    // Como cai
    if (M.comoCai?.length) {
      h += `<section><h2>🎯 Como a prova costuma ser</h2>${renderBlock({ tipo: "tabela", cabecalho: ["Parte", "Formato", "Peso", "Como garantir"], linhas: M.comoCai.map(x => [x.parte, x.formato, x.peso, x.dica]) })}</section>`;
    }

    // Sumário + conteúdo
    h += `<nav class="toc"><b>Conteúdo</b><ol>${M.secoes.map(s => `<li><a href="#${esc(s.id)}">${esc(s.titulo)}</a></li>`).join("")}</ol></nav>`;
    M.secoes.forEach((s, i) => {
      h += `<section class="sec" id="${esc(s.id)}">
        <h2><span class="n">${i + 1}.</span> ${esc(s.titulo)}</h2>
        ${s.pergunta ? `<p class="hook">${md(s.pergunta)}</p>` : ""}
        ${s.emUmaFrase ? `<div class="oneline"><b class="lbl">Em uma frase</b>${md(s.emUmaFrase)}</div>` : ""}
        ${s.blocos.map(renderBlock).join("")}
        ${s.checkpoint?.length ? `<div class="check"><div class="ct">🧠 Teste rápido</div>${s.checkpoint.map(q => pergunta(md(q.enunciado), respostaDe(q))).join("")}</div>` : ""}
      </section>`;
    });

    h += `<div class="cta"><b>Terminou de ler?</b> O que mais fixa é se testar.<br><a class="btn" href="${url("provas")}">Fazer uma mini prova →</a></div>`;
    if (M.fontes) h += `<footer class="src">Fontes: ${md(M.fontes)}${M.atualizadoEm ? ` · Atualizado em ${esc(M.atualizadoEm)}` : ""}</footer>`;
    view.innerHTML = h + `</article>`;

    view.querySelectorAll(".qa-btn").forEach(b => b.onclick = () => b.closest(".qa").classList.toggle("open"));
    const all = document.getElementById("all");
    if (all) all.onclick = () => {
      const abrir = all.textContent === "Mostrar todas";
      all.closest("section").querySelectorAll(".qa").forEach(q => q.classList.toggle("open", abrir));
      all.textContent = abrir ? "Esconder todas" : "Mostrar todas";
    };
    // rótulo do botão acompanha o estado
    new MutationObserver(ms => ms.forEach(m => { const b = m.target.querySelector(".qa-btn"); if (b) b.textContent = m.target.classList.contains("open") ? "Esconder" : "Mostrar resposta"; }))
      .observe(view, { attributes: true, subtree: true, attributeFilter: ["class"] });
  }

  // ---------------- PROVAS ----------------
  function provas() {
    let modo = "estudo";
    const topo = document.createElement("div");
    topo.innerHTML = `<h2 style="margin-top:0">📝 Mini provas</h2>
      <div class="mode">
        <button data-m="estudo"><b>Modo estudo</b><small>corrige cada questão na hora</small></button>
        <button data-m="prova"><b>Modo prova</b><small>corrige tudo no final</small></button>
      </div>`;
    const pintaModo = () => topo.querySelectorAll(".mode button").forEach(b => b.classList.toggle("on", b.dataset.m === modo));
    topo.querySelectorAll(".mode button").forEach(b => b.onclick = () => { modo = b.dataset.m; pintaModo(); });
    pintaModo();
    view.appendChild(topo);

    const todas = (M.miniProvas || []).map(p => ({ ...p, ic: "📝" }));
    if (M.simulado) todas.push({ ...M.simulado, id: "simulado", ic: "🎯", big: true });
    const lista = document.createElement("div"); lista.className = "plist";
    todas.forEach(p => {
      const b = document.createElement("button"); b.className = "pitem" + (p.big ? " big" : "");
      b.innerHTML = `<span class="ic">${p.ic}</span><span><div class="pt">${esc(p.titulo)}</div>
        <div class="pm">${p.questoes.length} questões${p.descricao ? " · " + esc(p.descricao) : ""}</div></span><span class="go">Começar →</span>`;
      b.onclick = () => fazer(p);
      lista.appendChild(b);
    });
    view.appendChild(lista);

    function fazer(p) {
      view.innerHTML = "";
      const top = document.createElement("div");
      top.innerHTML = `<button class="btn ghost sm">← Voltar às provas</button>
        <h2>${p.ic} ${esc(p.titulo)}</h2><div class="muted small">${modo === "estudo" ? "Modo estudo: a correção aparece a cada resposta." : "Modo prova: responda tudo e clique em Corrigir no final."}</div>`;
      top.querySelector("button").onclick = () => { view.innerHTML = ""; provas(); };
      view.appendChild(top);
      const box = document.createElement("div"); view.appendChild(box);
      Quiz(box, p.questoes, { modo });
      window.scrollTo(0, 0);
    }
  }

  if (tela === "resumo") { back.href = url(); back.textContent = "← " + M.nome; resumo(); }
  else if (tela === "provas") { back.href = url(); back.textContent = "← " + M.nome; provas(); }
  else escolher();
})();
