# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) para trabalhar com o código deste repositório.

## Visão Geral do Projeto

Superflix é uma aplicação web estilo Netflix para streaming de filmes, séries e animes. É uma aplicação frontend estática (HTML/CSS/JavaScript puro) que integra com a API do TMDB para metadados e SuperflixAPI para streaming de vídeo.

## Comandos de Build e Deploy

```bash
# Build da imagem Docker
docker build -t superflix .

# Rodar localmente com Docker
docker run -d -p 80:80 superflix

# Modo desenvolvimento (servidor local)
npx serve .
# ou
python -m http.server 8000
```

A aplicação não tem etapa de build - são arquivos estáticos puros servidos via Nginx.

## Arquitetura

### Módulos JavaScript Principais (js/)

- **api.js**: Singleton `SuperflixAPI` - gerencia toda comunicação com TMDB (metadados) e SuperflixAPI (streaming). Inclui cache em memória com TTL de 10 minutos.
- **app.js**: Classe `SuperflixApp` - controlador principal da aplicação, gerencia estado da UI, navegação, modais, busca e renderização de conteúdo.
- **storage.js**: Singleton `SuperflixStorage` - abstração do LocalStorage para preferências de tema, histórico, continuar assistindo e favoritos.
- **calendario.js**: Classe `CalendarApp` - controlador independente para a página de calendário/lançamentos.
- **welcome.js**: Popup de boas-vindas com detecção de dispositivo.
- **adblock.js**: Script de bloqueio de anúncios no cliente.

### Páginas

- `index.html`: Aplicação principal (views de início, filmes, séries, animes)
- `calendario.html`: Página de calendário de lançamentos (busca de superflixapi.run/calendario.php)

### Integração com APIs

**TMDB API** (metadados):
- URL Base: `https://api.themoviedb.org/3`
- Usado para: conteúdo em alta, detalhes, busca, gêneros, temporadas/episódios

**SuperflixAPI** (streaming):
- URL Base: `https://superflixapi.run`
- URLs do Player: `/filme/{imdb_id}` para filmes, `/serie/{tmdb_id}/{season}/{episode}` para séries

### Fluxo de Dados

1. App busca listas de conteúdo da API do TMDB
2. Cards de conteúdo são renderizados dinamicamente
3. Ao reproduzir: filmes requerem conversão de ID IMDB via endpoint external_ids do TMDB
4. Player carrega iframe da SuperflixAPI com o ID de conteúdo apropriado

### Gerenciamento de Estado

- Parâmetros de URL: `?category=movie|serie|anime` para filtro de categoria
- Chaves do LocalStorage: `superflix_theme`, `superflix_history`, `superflix_continue`, `superflix_favorites`
- Todos os módulos expostos globalmente via `window.SuperflixAPI`, `window.SuperflixStorage`, `window.app`
