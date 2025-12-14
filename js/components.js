/**
 * Component Loader - Superflix
 * Carrega header, footer e mobile-nav dinamicamente
 */

class ComponentLoader {
    constructor() {
        this.componentsPath = '/components/';
        this.currentPage = this.detectCurrentPage();
    }

    /**
     * Detecta a página atual baseada na URL
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');

        // Se está na home com filtro de categoria
        if ((path === '/' || path === '/index.html') && category) {
            return category; // 'movie', 'serie', 'anime'
        }

        if (path === '/' || path === '/index.html') return 'home';
        if (path.includes('/tv/')) return 'tv';
        if (path.includes('/calendario')) return 'calendario';
        if (path.includes('/profile/')) return 'profile';
        if (path.includes('/watch/')) return 'watch';

        return 'other';
    }

    /**
     * Carrega um componente HTML
     */
    async loadComponent(name) {
        try {
            const response = await fetch(`${this.componentsPath}${name}.html`);
            if (!response.ok) throw new Error(`Failed to load ${name}`);
            return await response.text();
        } catch (error) {
            console.error(`Error loading component ${name}:`, error);
            return '';
        }
    }

    /**
     * Injeta o header na página
     */
    async injectHeader() {
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (!headerPlaceholder) return;

        const headerHTML = await this.loadComponent('header');
        headerPlaceholder.innerHTML = headerHTML;

        // Marca o link ativo
        this.setActiveNavLink();
    }

    /**
     * Injeta o footer na página
     */
    async injectFooter() {
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (!footerPlaceholder) return;

        const footerHTML = await this.loadComponent('footer');
        footerPlaceholder.innerHTML = footerHTML;
    }

    /**
     * Injeta a navegação mobile na página
     */
    async injectMobileNav() {
        const mobileNavPlaceholder = document.getElementById('mobile-nav-placeholder');
        if (!mobileNavPlaceholder) return;

        const mobileNavHTML = await this.loadComponent('mobile-nav');
        mobileNavPlaceholder.innerHTML = mobileNavHTML;

        // Marca o link ativo
        this.setActiveMobileNavLink();
    }

    /**
     * Marca o link ativo no header
     */
    setActiveNavLink() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const page = link.getAttribute('data-page');
            const category = link.getAttribute('data-category');

            // Verifica se é página ou categoria
            if (page === this.currentPage || category === this.currentPage) {
                link.classList.add('active');
            }
        });
    }

    /**
     * Marca o link ativo na navegação mobile
     */
    setActiveMobileNavLink() {
        const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
        mobileNavItems.forEach(item => {
            const page = item.getAttribute('data-page');
            const category = item.getAttribute('data-category');

            // Verifica se é página ou categoria
            if (page === this.currentPage || category === this.currentPage) {
                item.classList.add('active');
            }
        });
    }

    /**
     * Carrega todos os componentes
     */
    async loadAll() {
        await Promise.all([
            this.injectHeader(),
            this.injectFooter(),
            this.injectMobileNav()
        ]);

        console.log('✅ Components loaded successfully');

        // Dispara evento customizado informando que componentes foram carregados
        window.dispatchEvent(new Event('componentsLoaded'));
    }
}

// Carrega componentes quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        const loader = new ComponentLoader();
        await loader.loadAll();
    });
} else {
    (async () => {
        const loader = new ComponentLoader();
        await loader.loadAll();
    })();
}

// Exporta para uso global
window.ComponentLoader = ComponentLoader;
