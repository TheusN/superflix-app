# Superflix

Uma aplicação web estilo Netflix para streaming de filmes, séries e animes, integrada com a SuperflixAPI.

![Superflix](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Funcionalidades

- **Interface Moderna** - Design inspirado na Netflix com tema escuro
- **Catálogo Completo** - Filmes, séries e animes organizados por categorias
- **Sistema de Busca** - Pesquise por títulos em tempo real
- **Player Integrado** - Reprodução direta via SuperflixAPI
- **Responsivo** - Funciona em desktop, tablet e celular
- **Navegação Intuitiva** - Menu por categorias e navegação mobile

## Tecnologias

- HTML5, CSS3, JavaScript (Vanilla)
- Nginx (servidor web)
- Docker (containerização)
- TMDB API (metadados de filmes/séries)
- SuperflixAPI (streaming)

## Estrutura do Projeto

```
superflix/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos da aplicação
├── js/
│   ├── api.js          # Integração com APIs
│   └── app.js          # Lógica da aplicação
├── nginx.conf          # Configuração do Nginx
└── Dockerfile          # Build da imagem Docker
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
