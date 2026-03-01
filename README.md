# Adedonha Bribs Championship

**Competição oficial de criatividade.**

Webapp moderno para jogar Adedonha em modo campeonato com cadastro de jogadores, múltiplas rodadas, pontuação automática e ranking geral acumulado.

## Link do site (GitHub Pages)

URL final deste repositório:

```txt
https://ranierevalenca.github.io/Adedonhapp/
```

> Se o GitHub Pages ainda estiver processando, aguarde 1–3 minutos e atualize.

## Como usar

1. Cadastre de 2 a 10 jogadores com nome e avatar (emoji/cor).
2. Escolha o número de rodadas (ou ilimitado).
3. Clique em **Iniciar Campeonato**.
4. Em cada rodada, clique em **Nova Rodada** para sortear a letra e iniciar o timer.
5. Preencha as categorias e clique em **Finalizar Rodada e Pontuar**.
6. Abra **Ranking Geral** para acompanhar pódio, vitórias e média por rodada.

## Funcionalidades

- Cadastro de jogadores (2 a 10)
- Rodadas com sorteio de letra sem repetição
- Definição manual do número de rodadas (ou ilimitado)
- Timer de 5 minutos com alerta no último minuto
- Validação automática por letra
- Validação básica por dicionário português embutido (evita palavras aleatórias)
- Pontuação automática (10 único, 5 repetido, 0 inválido/vazio)
- Ranking acumulado (pontos, vitórias, média)
- Histórico de rodadas
- Tema claro/escuro
- Persistência local com `localStorage`
- Exportação de ranking para PDF (via impressão do navegador)
- Botão **Instalar App** (PWA) para criar atalho no celular
- Botão **Atualizar App** para limpar cache/service worker e carregar a versão mais nova
- QR Code da partida para compartilhar o estado inicial e entrar em outros dispositivos
- Botão **Compartilhar WhatsApp** para enviar link da partida
- Permissões por link/QR: convidado não pode adicionar/editar jogadores e não pode iniciar nova rodada
- Botão **Stop** disponível para todos os participantes da partida

## Rodar localmente

Sem build:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Abra `http://localhost:4173`.

---

## Publicar no GitHub Pages (passo a passo exato para `ranierevalenca/Adedonhapp`)

> Execute estes comandos no terminal, dentro da pasta do projeto.

### 1) Inicializar Git e conectar ao repositório correto

```bash
git init
git add .
git commit -m "feat: publicar Adedonha Bribs Championship"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/ranierevalenca/Adedonhapp.git"
git push -u origin main
```

### 2) Ativar GitHub Pages

No GitHub:
- Abra: `https://github.com/ranierevalenca/Adedonhapp`
- Vá em **Settings** → **Pages**
- Em **Source**, selecione **Deploy from a branch**
- Escolha **Branch: main** e **Folder: / (root)**
- Clique em **Save**

### 3) Abrir o site publicado

```txt
https://ranierevalenca.github.io/Adedonhapp/
```

---

## Open Graph / WhatsApp preview

Este projeto já inclui:
- `favicon.svg` (ícone do site)
- `og-image.svg` (imagem para preview)
- metas Open Graph e Twitter no `index.html`

Após publicar, para preview mais consistente no WhatsApp, prefira usar URL absoluta da imagem OG, por exemplo:

```txt
https://ranierevalenca.github.io/Adedonhapp/og-image.svg
```


## Sobre o QR Code

O QR Code compartilha um **snapshot da partida** (jogadores, limite de rodadas e letras usadas).
Não há sincronização em tempo real entre dispositivos nesta versão sem backend.


## Corrigir merge com conflito resolvido em "both" (guia rápido)

Se você fez merge e marcou **both** por engano, use este fluxo:

### Opção A — antes de concluir o merge

```bash
git status
# para aceitar o que já estava na sua branch (current/ours)
git checkout --ours app.js index.html styles.css README.md
# para aceitar o que veio da outra branch (incoming/theirs)
git checkout --theirs app.js index.html styles.css README.md

# depois revise e marque como resolvido
git add app.js index.html styles.css README.md
git commit -m "Resolve conflitos escolhendo current/theirs corretamente"
```

### Opção B — merge já concluído e quebrado

```bash
# 1) encontre o commit anterior ao merge ruim
git log --oneline --graph -n 15

# 2) volte para o commit anterior (mantendo histórico limpo)
git reset --hard <COMMIT_ANTES_DO_MERGE>

# 3) refaça o merge
git merge <NOME_DA_BRANCH>

# 4) em cada arquivo conflitante, escolha a versão correta
# current
# git checkout --ours <arquivo>
# incoming
# git checkout --theirs <arquivo>

# 5) finalize
git add .
git commit -m "Refaz merge e resolve conflitos corretamente"
git push --force-with-lease
```

### Dica

Depois de resolver, rode pelo menos:

```bash
node --check app.js
python3 -m http.server 4173 --bind 0.0.0.0
```

E abra o app para validar layout/pontuação antes do merge final.


## Se o site publicado abrir com layout duplicado ou botões sem funcionar

Isso normalmente é cache antigo do navegador/service worker após merge com conflito.

1. Faça deploy da versão mais recente do repositório.
2. No navegador, use **Ctrl+F5** (ou "Limpar dados do site").
3. Feche e abra novamente a aba do app.
4. Se necessário, desinstale o app PWA e instale de novo.

Nesta versão o cache foi versionado para forçar atualização dos arquivos mais novos.
