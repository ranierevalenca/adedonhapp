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
- Timer de 5 minutos com alerta no último minuto
- Validação automática por letra
- Pontuação automática (10 único, 5 repetido, 0 inválido/vazio)
- Ranking acumulado (pontos, vitórias, média)
- Histórico de rodadas
- Tema claro/escuro
- Persistência local com `localStorage`
- Exportação de ranking para PDF (via impressão do navegador)

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
