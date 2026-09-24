# Formato dos resumos (portal "Resumos da Turma")

Cada matéria é **um arquivo JSON** em `portal/conteudo/<slug>.json`. O site só lê esse
JSON e desenha tudo sozinho. Não mexa em HTML/CSS/JS para criar conteúdo.
Modelos prontos para copiar a estrutura: `conteudo/estrategia.json` e `conteudo/ciencia-da-decisao.json`.

A lista de matérias da tela inicial fica em `conteudo/materias.json`. Quando uma matéria
ficar pronta, troque `"status": "em-breve"` por `"status": "pronto"`.

---

## Por que o formato é assim (ciência da aprendizagem)

| Princípio (evidência) | Onde aparece no formato |
|---|---|
| **Prática de recuperação / testing effect** (Roediger & Karpicke 2006; Dunlosky et al. 2013: técnica de "alta utilidade") | `checkpoint` em toda seção, `miniProvas`, `simulado`, Quick View como autoteste, Revisão com respostas escondidas |
| **Reler e grifar têm baixa utilidade** (Dunlosky 2013) | O texto é curto de propósito. O que ensina é a pergunta, não o parágrafo |
| **Segmentação / carga cognitiva** (Mayer; Sweller) | Seções curtas (1 ideia central), blocos pequenos, tabela no lugar de texto corrido |
| **Sinalização / "bottom line up front"** | `emUmaFrase` no topo de cada seção |
| **Pergunta-gancho / pré-questionamento** (curiosidade melhora retenção) | `pergunta` que aparece no título da seção |
| **Exemplos concretos + analogias** (elaborative interrogation, concrete examples) | `destaque` estilo `exemplo`/`analogia` |
| **Exemplos resolvidos** (worked examples, Sweller) | bloco `exemplo` com passos, obrigatório em matéria com conta |
| **Discriminar conceitos parecidos** (intercalação / contraste) | tabelas "X × Y", `pegadinha`, simulado misturando temas |
| **Feedback explicado** | toda questão tem `explicacao` dizendo POR QUE está certo |
| **Prática espaçada** | mini prova logo depois da aula + simulado perto da prova + Quick View na véspera |

---

## Estrutura do arquivo

```jsonc
{
  "slug": "logistica-internacional",       // igual ao nome do arquivo
  "nome": "Logística Internacional",       // nome curto (aparece no topo)
  "nomeCompleto": "…",                     // opcional
  "professor": "Prof. Fulano",
  "avaliacao": "P1 · Aulas 1 a 6",         // o que o resumo cobre
  "atualizadoEm": "DD/MM/AAAA",
  "fontes": "De onde saiu o conteúdo (ex.: slides das aulas 1-6 no Classroom)",

  "quickView": [ { "topico": "…", "texto": "…" } ],   // 5 a 8 itens explicativos
  "comoCai":   [ { "parte": "", "formato": "", "peso": "", "dica": "" } ],  // OPCIONAL, só se souber como é a prova
  "secoes":    [ /* ver abaixo */ ],
  "revisaoRapida": [ { "se": "Se a questão fala de…", "entao": "a resposta provavelmente é…" } ],  // 8 a 16 linhas
  "miniProvas": [ { "id": "mp1", "titulo": "Mini prova 1: <tema>", "secoes": ["id1","id2"], "questoes": [ … ] } ],
  "simulado":   { "titulo": "Simulado P1 completo", "descricao": "…", "questoes": [ … ] },
  "materiais":  [ { "nome": "", "arquivo": "arquivos/<arquivo>", "descricao": "" } ]   // opcional
}
```

### Quick View (a parte mais importante)
- 5 a 8 tópicos, um por grande tema da matéria. `topico` = nome curto, `texto` = 2 a 3 frases explicando de forma didática.
- É para ler antes de estudar e na véspera da prova: tem que dar a visão geral sozinho.
- Termos técnicos em **negrito**.

### Seção
```jsonc
{
  "id": "incoterms",                            // curto, sem acento/espaço
  "titulo": "Incoterms",
  "pergunta": "Quem paga o frete e quando o risco passa?",   // gancho
  "emUmaFrase": "…",                            // a ideia central em 1 frase
  "blocos": [ … ],
  "checkpoint": [ 1 ou 2 questões rápidas ]     // diferentes das da mini prova
}
```
Uma seção corresponde a um tema/aula. Ideal: 4 a 8 seções por matéria, cada uma lida em 2-4 min.

### Blocos disponíveis
| tipo | campos | uso |
|---|---|---|
| `texto` | `texto` | parágrafo curto (máx. 3 linhas) |
| `lista` | `itens[]`, `numerada?` | tópicos |
| `tabela` | `cabecalho[]`, `linhas[][]` | comparações, classificações, "X × Y" |
| `destaque` | `estilo`, `texto`, `titulo?` | `pegadinha`, `dica`, `exemplo`, `analogia`, `atencao` |
| `formula` | `itens[{formula, significado}]` | fórmulas |
| `exemplo` | `titulo`, `enunciado?`, `passos[]`, `conclusao?` | exemplo resolvido passo a passo |
| `flashcards` | `cards[{frente, verso}]` | termos/definições para decorar |
| `esquema` | `texto` | diagrama em texto (fluxo com setas) |
| `imagem` | `src`, `legenda?` | imagem em `portal/arquivos/` |

Texto aceita `**negrito**` e `\n` para quebra de linha. Nada de HTML.

### Questões
```jsonc
// múltipla escolha (as opções são embaralhadas; use "embaralhar": false se a ordem importa)
{ "tipo": "multipla", "enunciado": "…", "opcoes": ["…","…","…","…"], "correta": 1, "explicacao": "…" }

// cálculo (1 ou mais campos; tolerancia opcional, padrão 0,1%)
{ "tipo": "numerica", "enunciado": "…", "campos": [ { "rotulo": "VEC", "resposta": 120, "tolerancia": 0.5 } ], "explicacao": "…" }

// dissertativa (autocorreção)
{ "tipo": "dissertativa", "enunciado": "…", "respostaEsperada": "…", "criterios": ["termo/ideia que precisa aparecer", "…"] }
```
- `correta` é o índice começando em **0**.
- Toda questão tem `explicacao`. Ela diz por que a certa está certa e, se possível, por que a pegadinha mais comum está errada.
- Questões de **caso curto** ("A empresa X fez Y. Isso é:") são melhores que "O que é X?".
- Distratores plausíveis: use os conceitos que o aluno confunde.
- Mini prova: 5 a 7 questões por grupo de 1 a 3 seções. Simulado: 8 a 15 misturando temas, com dissertativa se a prova tiver.
