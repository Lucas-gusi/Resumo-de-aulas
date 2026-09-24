# Resumos da Turma

Site estático com resumos, perguntas-chave e mini provas das matérias.

- `index.html`: lista de matérias
- `materia.html?m=<slug>`: escolha entre Resumo e Mini provas
- `conteudo/*.json`: o conteúdo de cada matéria (formato em `FORMATO.md`)
- `conteudo/materias.json`: lista de matérias (`"status": "pronto"` ou `"em-breve"`)

Rodar local: `python -m http.server 5500` nesta pasta e abrir http://localhost:5500
