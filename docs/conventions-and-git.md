# Guia de referência — Convenções e Git

**Projeto:** Jornada dos Materiais — Casa de Metal
**Para quem:** quem estiver desenvolvendo ou dando manutenção no sistema.
**Onde salvar:** `docs/conventions-and-git.md`, dentro do repositório.

Documento de consulta rápida. Não precisa ser lido de ponta a ponta — use o índice e volte aqui sempre que bater dúvida.

**Índice**

1. [Convenções de nomenclatura](#1-convenções-de-nomenclatura)
2. [Tags e versionamento](#2-tags-e-versionamento)
3. [O ciclo do dia a dia](#3-o-ciclo-do-dia-a-dia)
4. [Quando usar branch](#4-quando-usar-branch)
5. [Como desfazer coisas](#5-como-desfazer-coisas)
6. [O que nunca commitar](#6-o-que-nunca-commitar)

---

## 1. Convenções de nomenclatura

Regras simples, mas siga com disciplina — inconsistência aqui vira confusão daqui a três meses.

### Idioma

| O quê                                         | Idioma    | Exemplo                               |
| --------------------------------------------- | --------- | ------------------------------------- |
| Nomes de pastas, arquivos, variáveis, funções | Inglês    | `screen`, `material`, `playbackState` |
| Textos que o visitante lê                     | Português | `"Escolha um material"`, `"Aço"`      |
| Comentários no código                         | Português | `// avança para a próxima tela`       |
| Mensagens de commit                           | Português | `adiciona validação da configuração`  |

A regra em uma frase: **o código é em inglês, o conteúdo é em português.** Todo texto que aparece para o visitante mora em campos de exibição separados, nunca misturado com identificadores.

### Arquivos e pastas

| Tipo                | Padrão                                     | Exemplo                                 |
| ------------------- | ------------------------------------------ | --------------------------------------- |
| Componentes React   | PascalCase, extensão `.jsx`                | `MaterialCard.jsx`, `WaitingScreen.jsx` |
| Funções utilitárias | camelCase, extensão `.js`                  | `formatDuration.js`                     |
| Pastas              | minúsculas, sem acento, hífen para separar | `src/shared`, `content/videos`          |
| Documentos          | minúsculas, hífen                          | `conventions-and-git.md`                |

### Identificadores de material

Esses valores viram **nome de pasta e pedaço de endereço**, então não podem ter acento, espaço ou letra maiúscula:

| Material (exibição) | Identificador (código) | Pasta dos vídeos               |
| ------------------- | ---------------------- | ------------------------------ |
| Aço                 | `steel`                | `content/videos/steel/`        |
| Alumínio            | `aluminum`             | `content/videos/aluminum/`     |
| Nióbio              | `niobium`              | `content/videos/niobium/`      |
| Refratários         | `refractories`         | `content/videos/refractories/` |

Ao adicionar um material novo, siga o mesmo padrão: nome em inglês, minúsculo, sem acento, sem espaço.

### Arquivos de vídeo

Sempre `{id}/{numero-da-tela}.mp4`:

```
content/videos/steel/1.mp4     Aço - Minérios
content/videos/steel/2.mp4     Aço - Mineração
content/videos/steel/3.mp4     Aço - Metalurgia
content/videos/steel/4.mp4     Aço - Materiais
```

O número do arquivo é sempre o número da tela, de 1 a 4, na ordem da jornada.

---

## 2. Tags e versionamento

Ao concluir cada etapa, crie uma marca permanente naquele ponto:

```
git tag -a v0.1 -m "Etapa 1 concluída - fundação e estrutura"
git push origin v0.1
```

**Por que isso importa tanto neste projeto:** o sistema vai ficar instalado num museu, rodando sozinho. Se uma atualização quebrar alguma coisa durante a exposição, você precisa conseguir voltar em minutos para a última versão que funcionava. A tag é esse ponto de retorno.

### Plano de tags

| Tag    | Marco                             |
| ------ | --------------------------------- |
| `v0.1` | Etapa 1 — fundação                |
| `v0.2` | Etapa 2 — conteúdo e configuração |
| `v0.3` | Etapa 3 — servidor                |
| `v0.4` | Etapa 4 — app das telas           |
| `v0.5` | Etapa 5 — app do tablet           |
| `v0.6` | Etapa 6 — conteúdo real           |
| `v0.7` | Etapa 7 — modo museu              |
| `v1.0` | Etapa 8 — homologado e instalado  |

Depois da inauguração, correções viram `v1.1`, `v1.2`, e assim por diante.

### Comandos úteis de tag

| Situação                                | Comando                |
| --------------------------------------- | ---------------------- |
| Listar todas as tags                    | `git tag`              |
| Ver o que tem numa tag                  | `git show v0.3`        |
| Enviar uma tag para o GitHub            | `git push origin v0.3` |
| Enviar todas as tags de uma vez         | `git push --tags`      |
| Voltar o projeto para uma versão antiga | `git checkout v0.3`    |
| Voltar para o estado atual              | `git checkout main`    |

> `git checkout v0.3` te coloca num estado só de leitura daquela versão (o Git chama isso de _detached HEAD_). É seguro para olhar ou testar. Para voltar ao normal, `git checkout main`.

---

## 3. O ciclo do dia a dia

Enquanto desenvolve, este é o ritmo:

```
git status                          # o que mudou?
git add .                           # marca tudo que mudou
git commit -m "descrição do que fez"
git push                            # envia para o GitHub
```

### Com que frequência commitar

Sempre que terminar algo que funciona, mesmo pequeno. Um commit por tarefa concluída é melhor que um commit gigante no fim do dia — se algo quebrar, fica muito mais fácil descobrir onde.

### Boas mensagens de commit

Descreva o que a mudança faz, no presente:

|      | Exemplo                                       |
| ---- | --------------------------------------------- |
| Bom  | `adiciona validação de vídeo faltando`        |
| Bom  | `corrige transição preta entre telas`         |
| Bom  | `move lista de materiais para materials.json` |
| Ruim | `ajustes`                                     |
| Ruim | `mudanças`                                    |
| Ruim | `wip`                                         |
| Ruim | `teste`                                       |

O teste rápido: daqui a seis meses, lendo só a mensagem, você saberia o que aquele commit fez?

### Comandos de inspeção

| Situação                              | Comando                 |
| ------------------------------------- | ----------------------- |
| Ver o histórico resumido              | `git log --oneline`     |
| Ver as últimas 10 mudanças            | `git log --oneline -10` |
| Ver o que mudou nos arquivos          | `git diff`              |
| Ver o que já está marcado para commit | `git diff --staged`     |

---

## 4. Quando usar branch

Trabalhando sozinho, o normal é ficar direto na `main`. Vale criar uma branch quando você for mexer em algo arriscado e quiser poder desistir sem sujar o projeto.

```
git checkout -b experiment-preload     # cria e entra na branch
# ... trabalha, commita normalmente ...
git checkout main                      # volta para a principal
git merge experiment-preload           # traz o que deu certo
git branch -d experiment-preload       # apaga a branch
```

Se o experimento não der certo, é só voltar para a `main` e apagar a branch — a `main` nunca foi tocada:

```
git checkout main
git branch -D experiment-preload       # -D força a exclusão mesmo sem merge
```

**Exemplos de quando vale a pena neste projeto:** testar uma estratégia de pré-carregamento de vídeo, experimentar uma mudança grande no layout do tablet, ou tentar uma abordagem diferente de recuperação de falha.

---

## 5. Como desfazer coisas

A tabela que mais salva:

| Situação                                                       | Comando                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------ |
| Estraguei um arquivo e quero voltar ao último commit           | `git restore caminho/do/arquivo`                             |
| Quero descartar TODAS as mudanças não commitadas               | `git restore .`                                              |
| Commitei mas ainda não fiz push, e quero refazer               | `git reset --soft HEAD~1`                                    |
| Commitei e já fiz push — preciso desfazer sem apagar histórico | `git revert HEAD`                                            |
| Quero ver como estava numa versão antiga                       | `git checkout v0.3` (depois `git checkout main` para voltar) |
| Quero ver o histórico                                          | `git log --oneline`                                          |

### Regra de ouro

`git reset` só em commit que **ainda não foi enviado**. Se já fez push, use `git revert`, que cria um commit novo desfazendo o anterior em vez de reescrever a história.

O motivo prático: reescrever história que já está no GitHub causa conflito e, num projeto com mais gente, quebra o repositório dos outros. `git revert` é sempre seguro.

### Diferença entre os três comandos parecidos

| Comando                   | O que faz                                                          |
| ------------------------- | ------------------------------------------------------------------ |
| `git restore`             | Descarta mudanças em arquivos, sem mexer em commits                |
| `git reset --soft HEAD~1` | Desfaz o último commit, mas mantém as mudanças nos arquivos        |
| `git revert HEAD`         | Cria um commit novo que desfaz o anterior, preservando o histórico |

---

## 6. O que nunca commitar

- `node_modules/` — reinstalável a qualquer momento com `npm install`
- `dist/` — regerável a qualquer momento com `npm run build`
- Vídeos e imagens pesadas — são conteúdo, e seguem seu próprio fluxo de entrega
- Senhas, chaves ou credenciais de qualquer tipo

Tudo isso já está coberto pelo `.gitignore` do projeto. Mas **confira com `git status` antes de commitar**, principalmente depois de mexer na estrutura de pastas.

### Se algo errado entrou por engano

Se você commitou `node_modules` ou um vídeo pesado sem querer e **ainda não fez push**:

```
git reset --soft HEAD~1
```

Corrija o `.gitignore`, rode `git status` para confirmar que o arquivo sumiu da lista, e commite de novo.

Se **já fez push**, o arquivo continua no histórico mesmo depois de apagado — e aí a limpeza é bem mais trabalhosa. Por isso o hábito de rodar `git status` antes de commitar vale tanto.
