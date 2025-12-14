# Superflix

Uma aplicação web completa estilo Netflix para streaming de filmes, séries e animes, com autenticação de usuários, sistema de favoritos e histórico de visualização.

![Superflix](https://img.shields.io/badge/version-1.8.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-13%2B-blue.svg)

## ✨ Funcionalidades

### Frontend
- **Interface Moderna** - Design inspirado na Netflix com tema escuro/claro
- **Catálogo Completo** - Filmes, séries e animes organizados por categorias
- **Sistema de Busca** - Pesquise por títulos em tempo real
- **Player Integrado** - Reprodução direta via SuperflixAPI
- **TV ao Vivo** - Canais de TV ao vivo com suporte HLS
- **Calendário de Lançamentos** - Acompanhe novos episódios
- **Responsivo** - Funciona perfeitamente em desktop, tablet e celular
- **PWA Ready** - Instale como app no dispositivo

### Backend (API Node.js + PostgreSQL)
- **Autenticação JWT** - Sistema seguro de login e registro
- **Perfil de Usuário** - Salve seu nome e preferências
- **Favoritos** - Adicione filmes/séries à sua lista
- **Histórico** - Continue de onde parou
- **Sincronização** - Dados salvos na nuvem (PostgreSQL)
- **Modo Offline** - Funciona mesmo sem banco de dados

## 🛠️ Tecnologias

### Frontend
- HTML5, CSS3, JavaScript (Vanilla ES6+)
- Service Worker (PWA)
- LocalStorage (cache e preferências)
- Fetch API (requisições)

### Backend
- Node.js 18+ (runtime)
- Express.js (servidor HTTP)
- PostgreSQL 13+ (banco de dados)
- JWT (autenticação)
- bcryptjs (hash de senhas)

### Infraestrutura
- Docker & Docker Compose
- Nginx (servidor web estático)
- Easypanel (deploy simplificado)

### APIs Externas
- TMDB API (metadados de filmes/séries)
- SuperflixAPI (streaming de vídeo)

## 📁 Estrutura do Projeto

```
superflix-app/
├── 📄 Frontend (Static Site)
│   ├── index.html              # Página principal
│   ├── login.html              # Página de login/registro
│   ├── tv/index.html           # TV ao vivo
│   ├── profile/index.html      # Perfil do usuário
│   ├── watch/index.html        # Player de vídeo
│   ├── calendario.html         # Calendário de lançamentos
│   │
│   ├── components/             # Componentes reutilizáveis
│   │   ├── header.html         # Cabeçalho
│   │   ├── footer.html         # Rodapé
│   │   └── mobile-nav.html     # Navegação mobile
│   │
│   ├── css/                    # Estilos
│   │   ├── style.css           # Estilos globais
│   │   ├── tv.css              # Estilos da TV
│   │   └── profile.css         # Estilos do perfil
│   │
│   └── js/                     # Scripts
│       ├── api.js              # Integração com TMDB API
│       ├── app.js              # Lógica principal
│       ├── auth.js             # Autenticação
│       ├── storage.js          # LocalStorage
│       ├── components.js       # Loader de componentes
│       ├── profile.js          # Perfil do usuário
│       └── tv.js               # TV ao vivo
│
├── 🖥️ Backend (Node.js API)
│   ├── api/
│   │   ├── server.js           # Servidor Express
│   │   ├── db.js               # Conexão PostgreSQL
│   │   ├── package.json        # Dependências Node
│   │   │
│   │   ├── routes/             # Rotas da API
│   │   │   ├── auth.js         # Login/Registro
│   │   │   └── history.js      # Histórico/Favoritos
│   │   │
│   │   ├── middleware/         # Middlewares
│   │   │   └── auth.js         # JWT Authentication
│   │   │
│   │   ├── migrations/         # SQL Migrations
│   │   │   └── 001_init.sql    # Schema inicial
│   │   │
│   │   ├── .env.example        # Template de configuração
│   │   └── .env                # Configuração (NÃO commitar!)
│   │
│   ├── Dockerfile              # Build do frontend
│   ├── nginx.conf              # Config do Nginx
│   ├── docker-compose.yml      # Orquestração completa
│   └── .gitignore              # Arquivos ignorados
```

## Instalação

### Com Docker

```bash
# Clone o repositório
git clone https://github.com/TheusN/superflix-app.git
cd superflix-app

# Build da imagem
docker build -t superflix .

# Execute o container
docker run -d -p 80:80 superflix
```

### Com Docker Compose

```bash
docker-compose up -d
```

### Deploy no Easypanel

1. Crie um novo serviço do tipo **App**
2. Conecte ao repositório GitHub
3. Selecione **Dockerfile** como método de build
4. Configure o domínio desejado
5. Faça o deploy

## Configuração

A aplicação usa a API pública do TMDB para metadados. Nenhuma configuração adicional é necessária.

### Variáveis de Ambiente (Opcional)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| PORT | Porta do servidor | 80 |

## Uso

1. Acesse a aplicação pelo navegador
2. Navegue pelas categorias (Início, Filmes, Séries, Animes)
3. Use a busca para encontrar títulos específicos
4. Clique em um título para ver detalhes
5. Clique em "Assistir" para reproduzir

## API Endpoints Utilizados

### TMDB API
- `/trending/{type}/{time}` - Conteúdo em alta
- `/movie/popular` - Filmes populares
- `/tv/popular` - Séries populares
- `/search/multi` - Busca

### SuperflixAPI
- `/filme/{imdb_id}` - Player de filme
- `/serie/{tmdb_id}/{season}/{episode}` - Player de episódio

## Screenshots

### Desktop
- Página inicial com hero banner e carrosséis de conteúdo
- Modal de detalhes com informações e lista de episódios
- Player em tela cheia

### Mobile
- Navegação inferior para fácil acesso
- Cards responsivos
- Interface touch-friendly

## Contribuindo

1. Faça um fork do projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## Aviso Legal

Este projeto é apenas para fins educacionais. O uso de conteúdo protegido por direitos autorais pode ser ilegal em sua jurisdição. Os desenvolvedores não se responsabilizam pelo uso indevido desta aplicação.

---

Desenvolvido com ❤️ usando SuperflixAPI
