# Sistema de Componentes - Superflix

## Estrutura

```
components/
├── header.html       # Header único reutilizável
├── mobile-nav.html   # Navegação mobile única
└── footer.html       # Footer único reutilizável

js/
└── components.js     # Script que carrega os componentes
```

## Como Usar

### 1. Em qualquer página HTML, adicione os placeholders:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <!-- seus meta tags e CSS -->
</head>
<body>
    <!-- Header Placeholder -->
    <div id="header-placeholder"></div>

    <!-- Mobile Navigation Placeholder -->
    <div id="mobile-nav-placeholder"></div>

    <!-- Seu conteúdo aqui -->
    <main>
        ...
    </main>

    <!-- Footer Placeholder -->
    <div id="footer-placeholder"></div>

    <!-- Scripts -->
    <script src="js/components.js"></script>
    <script src="js/auth.js"></script>
    <!-- outros scripts -->
</body>
</html>
```

### 2. O script `components.js` automaticamente:

- ✅ Carrega header, footer e mobile-nav
- ✅ Marca o link ativo baseado na página atual
- ✅ Funciona em todas as páginas

### 3. Páginas detectadas automaticamente:

| URL | Página | Link ativo |
|-----|--------|------------|
| `/` ou `/index.html` | home | Início |
| `/tv/` | tv | TV ao Vivo |
| `/calendario.html` | calendario | Lançamentos |
| `/profile/` | profile | Perfil |
| `/watch/` | watch | - |

## Vantagens

✅ **Um só lugar para editar** - Mude o header/footer em UM arquivo, aplica em TODAS as páginas
✅ **Manutenção fácil** - Adicione links, mude textos sem tocar em 10+ arquivos
✅ **Consistência** - Header e footer sempre iguais em todas as páginas
✅ **Performance** - Carrega em paralelo, não bloqueia renderização
✅ **Detecção automática** - Marca link ativo automaticamente

## Edição Futura

### Para mudar o logo:
Edite `components/header.html` linha 4-7

### Para adicionar link no menu:
Edite `components/header.html` linha 9-13

### Para mudar texto do footer:
Edite `components/footer.html` linha 3-15

### Para adicionar item no mobile nav:
Edite `components/mobile-nav.html`

**Uma mudança = aplica em TODAS as páginas automaticamente!**
