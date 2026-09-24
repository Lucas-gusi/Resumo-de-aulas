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
      ${M.comoCai?.length ? `<h3>🎯 Como a prova costuma ser</h3>${renderBlock({ tipo: "tabela", cabecalho: ["Parte", "Formato", "Peso", "Como garantir"], linhas: M.comoCai.map(x => [x.parte, x.formato, x.peso, x.dica]) })}` : ""}
      ${M.materiais?.length ? `<h3>📎 Materiais</h3><div class="files">${M.materiais.map(f =>
        `<a href="${esc(f.arquivo)}" target="_blank" rel="noopener"><span style="font-size:20px">📄</span><span><b>${esc(f.nome)}</b>${f.descricao ? `<div class="fd">${esc(f.descricao)}</div>` : ""}</span></a>`).join("")}</div>` : ""}`;
  }

  // ---------------- RESUMO ----------------
  // bloco "pergunta → Mostrar resposta"
  const pergunta = (n, p, r) => `<div class="qa"><div class="qa-p"><span class="k">${n}.</span><span>${p}</span></div>
      <input class="qa-in" type="text" placeholder="O que você acha que é?" aria-label="Sua resposta">
      <button class="qa-btn" type="button">Mostrar resposta</button>
      <div class="qa-r"><div class="ans">${r}</div><div class="mine"></div></div></div>`;
  // abre/fecha a resposta e mostra o palpite da pessoa ao lado
  const setQA = (qa, abrir) => {
    qa.classList.toggle("open", abrir);
    qa.querySelector(".qa-btn").textContent = abrir ? "Esconder" : "Mostrar resposta";
    const v = qa.querySelector(".qa-in").value.trim();
    qa.querySelector(".mine").textContent = abrir && v ? "Você respondeu: " + v : "";
  };

  function resumo() {
    let h = `<article class="doc">`;

    // Quick view
    h += `<section class="quick"><h2>⚡ Quick View</h2>
      <p class="lead">O essencial da matéria. Leia antes de estudar e de novo antes da prova.</p>
      ${M.quickView.map(it => `<div class="qitem">${it.topico ? `<b class="t">${esc(it.topico)}</b>` : ""}${md(it.texto)}</div>`).join("")}</section>`;

    // Perguntas-chave
    if (M.revisaoRapida?.length) {
      h += `<section><div class="row between"><h2>❓ Perguntas-chave</h2><button class="link-btn" id="all" type="button">Mostrar todas</button></div>
        <p class="lead">Escreva o que você acha que é e depois clique em Mostrar resposta para conferir.</p>
        <div class="qa-list">${M.revisaoRapida.map((x, k) => pergunta(k + 1, md(x.se), md(x.entao))).join("")}</div></section>`;
    }

    // Sumário + conteúdo
    h += `<nav class="toc"><b>Conteúdo</b><ol>${M.secoes.map(s => `<li><a href="#${esc(s.id)}">${esc(s.titulo)}</a></li>`).join("")}</ol></nav>`;
    M.secoes.forEach((s, i) => {
      h += `<section class="sec" id="${esc(s.id)}">
        <h2><span class="n">${i + 1}.</span> ${esc(s.titulo)}</h2>
        ${s.pergunta ? `<p class="hook">${md(s.pergunta)}</p>` : ""}
        ${s.emUmaFrase ? `<div class="oneline"><b class="lbl">Em uma frase</b>${md(s.emUmaFrase)}</div>` : ""}
        ${s.blocos.map(renderBlock).join("")}
        ${s.checkpoint?.length ? `<div class="check"><div class="ct">🧠 Teste rápido</div><div class="muted small">Responda antes de seguir.</div><div class="cp" data-sec="${i}"></div></div>` : ""}
      </section>`;
    });

    h += `<div class="cta"><b>Terminou de ler?</b> O que mais fixa é se testar.<br><a class="btn" href="${url("provas")}">Fazer uma mini prova →</a></div>`;
    if (M.fontes) h += `<footer class="src">Fontes: ${md(M.fontes)}${M.atualizadoEm ? ` · Atualizado em ${esc(M.atualizadoEm)}` : ""}</footer>`;
    view.innerHTML = h + `</article>`;

    view.querySelectorAll(".cp").forEach(el => Quiz(el, M.secoes[+el.dataset.sec].checkpoint, { modo: "estudo", numerar: false, placar: false }));
    view.querySelectorAll(".qa").forEach(qa => {
      qa.querySelector(".qa-btn").onclick = () => setQA(qa, !qa.classList.contains("open"));
      qa.querySelector(".qa-in").onkeydown = e => { if (e.key === "Enter") setQA(qa, true); };
    });
    const all = document.getElementById("all");
    if (all) all.onclick = () => {
      const abrir = all.textContent === "Mostrar todas";
      view.querySelectorAll(".qa-list .qa").forEach(qa => setQA(qa, abrir));
      all.textContent = abrir ? "Esconder todas" : "Mostrar todas";
    };
    botaoTopo();
  }

  function botaoTopo() {
    const b = document.createElement("button");
    b.className = "to-top"; b.type = "button"; b.title = "Voltar ao topo"; b.setAttribute("aria-label", "Voltar ao topo"); b.textContent = "↑";
    b.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
    document.body.appendChild(b);
    addEventListener("scroll", () => b.classList.toggle("show", scrollY > 600), { passive: true });
  }

  // ---------------- PROVAS ----------------
  let modo = "estudo";
  function provas() {
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

    const cobre = p => {
      const nomes = (p.secoes || []).map(id => M.secoes.find(x => x.id === id)?.titulo).filter(Boolean);
      return nomes.length ? " · Cobre: " + esc(nomes.join(", ")) : "";
    };
    const todas = (M.miniProvas || []).map(p => ({ ...p, ic: "📝" }));
    if (M.simulado) todas.push({ ...M.simulado, id: "simulado", ic: "🎯", big: true });
    const lista = document.createElement("div"); lista.className = "plist";
    todas.forEach(p => {
      const b = document.createElement("button"); b.className = "pitem" + (p.big ? " big" : "");
      b.innerHTML = `<span class="ic">${p.ic}</span><span><div class="pt">${esc(p.titulo)}</div>
        <div class="pm">${p.questoes.length} questões${p.descricao ? " · " + esc(p.descricao) : ""}${cobre(p)}</div></span><span class="go">Começar →</span>`;
      b.onclick = () => fazer(p);
      lista.appendChild(b);
    });
    view.appendChild(lista);

    function fazer(p) {
      view.innerHTML = "";
      const top = document.createElement("div");
      top.innerHTML = `<button class="btn ghost sm">← Voltar às provas</button>
        <h2>${p.ic} ${esc(p.titulo)}</h2><div class="muted small">${modo === "estudo" ? "Modo estudo: a correção aparece a cada resposta." : "Modo prova: responda tudo e clique em Corrigir no final."}</div>`;
      top.querySelector("button").onclick = () => { view.innerHTML = ""; provas(); window.scrollTo(0, 0); };
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
