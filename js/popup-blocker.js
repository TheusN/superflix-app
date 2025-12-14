/**
 * Popup Blocker - Superflix
 * Bloqueia popups e anúncios indesejados automaticamente
 */

(function() {
    'use strict';

    console.log('🛡️ Popup Blocker ativado');

    // Lista de padrões de URLs de anúncios conhecidos
    const adPatterns = [
        /\/ads?\//i,
        /\/adv\//i,
        /\/advertis/i,
        /\/banner/i,
        /\/popup/i,
        /doubleclick\.net/i,
        /googlesyndication/i,
        /googleadservices/i,
        /adnxs\.com/i,
        /adsystem/i,
        /adserver/i,
        /popads/i,
        /popcash/i,
        /propellerads/i,
        /exoclick/i,
        /clickadu/i,
        /adsterra/i
    ];

    // Armazena referências de popups abertos
    let openedPopups = new Set();
    let popupCheckInterval = null;

    /**
     * Verifica se uma URL é de anúncio
     */
    function isAdUrl(url) {
        if (!url) return false;

        try {
            const urlString = url.toString().toLowerCase();
            return adPatterns.some(pattern => pattern.test(urlString));
        } catch (e) {
            return false;
        }
    }

    /**
     * Fecha popup automaticamente
     */
    function closePopup(popup) {
        try {
            if (popup && !popup.closed) {
                popup.close();
                console.log('✅ Popup bloqueado e fechado');
                return true;
            }
        } catch (e) {
            console.warn('Não foi possível fechar popup:', e);
        }
        return false;
    }

    /**
     * Monitora e fecha popups periodicamente
     */
    function startPopupMonitor() {
        if (popupCheckInterval) return;

        popupCheckInterval = setInterval(() => {
            openedPopups.forEach(popup => {
                if (popup && !popup.closed) {
                    closePopup(popup);
                    window.focus(); // Garante que o foco volte
                } else {
                    openedPopups.delete(popup);
                }
            });

            // Limpa set se estiver vazio
            if (openedPopups.size === 0 && popupCheckInterval) {
                clearInterval(popupCheckInterval);
                popupCheckInterval = null;
            }
        }, 100); // Reduzido de 500ms para 100ms para fechar mais rápido
    }

    /**
     * Override do window.open para interceptar popups
     */
    const originalOpen = window.open;
    window.open = function(...args) {
        const url = args[0];
        const target = args[1];

        console.log('🔍 Tentativa de window.open:', url, target);

        // BLOQUEIA QUALQUER nova aba/janela (_blank, _new, etc)
        if (target === '_blank' || target === '_new' || !target || target === '') {
            console.warn('🚫 Nova aba bloqueada:', url);

            // Retorna uma referência fake para não quebrar scripts
            const fakeWindow = {
                closed: true,
                close: () => {},
                focus: () => {},
                blur: () => {},
                location: { href: '' }
            };

            return fakeWindow;
        }

        // Se abrir na mesma janela (_self, _parent, _top), permite
        const popup = originalOpen.apply(this, args);

        // Se por algum motivo abriu uma nova janela, fecha imediatamente
        if (popup && popup !== window) {
            console.warn('🚫 Popup detectado, fechando...');
            openedPopups.add(popup);

            // Fecha imediatamente
            setTimeout(() => {
                closePopup(popup);
                window.focus(); // Retorna foco para janela principal
            }, 50);

            startPopupMonitor();
        }

        return popup;
    };

    /**
     * Previne popups criados por eventos de click
     */
    let lastClickTime = 0;
    let clickCount = 0;

    document.addEventListener('click', function(e) {
        const now = Date.now();

        // Detecta múltiplos clicks rápidos (técnica comum de popups)
        if (now - lastClickTime < 1000) {
            clickCount++;
            if (clickCount > 1) {
                console.warn('⚠️ Múltiplos clicks detectados, possível popup');
            }
        } else {
            clickCount = 1;
        }

        lastClickTime = now;

        // BLOQUEIA TODOS os links que abrem em nova aba (_blank)
        const target = e.target.closest('a');
        if (target && target.target === '_blank') {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚫 Link _blank bloqueado:', target.href);
            return false;
        }
    }, true);

    /**
     * Previne popups criados via setTimeout/setInterval
     */
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
        // Wrapper para detectar popups criados em timeouts
        const wrappedCallback = function() {
            const openBefore = openedPopups.size;
            const result = callback.apply(this, args);
            const openAfter = openedPopups.size;

            // Se um popup foi criado, monitora
            if (openAfter > openBefore) {
                console.log('⏰ Popup detectado via setTimeout');
                startPopupMonitor();
            }

            return result;
        };

        return originalSetTimeout.call(window, wrappedCallback, delay);
    };

    /**
     * Detecta quando a página perde foco (possível popup)
     */
    let hadFocus = document.hasFocus();

    setInterval(() => {
        const hasFocus = document.hasFocus();

        if (hadFocus && !hasFocus) {
            console.log('⚠️ Página perdeu foco, provavelmente popup abriu!');

            // Tenta recuperar foco IMEDIATAMENTE
            setTimeout(() => {
                if (!document.hasFocus()) {
                    window.focus();
                    console.log('🔄 Foco forçado de volta à página principal');

                    // Fecha qualquer popup aberto
                    openedPopups.forEach(popup => closePopup(popup));
                }
            }, 100); // Reduzido de 500ms para 100ms
        }

        hadFocus = hasFocus;
    }, 100); // Reduzido de 200ms para 100ms para detecção mais rápida

    /**
     * Previne redirecionamentos de página inteira
     */
    const originalLocationSetter = Object.getOwnPropertyDescriptor(window, 'location').set;
    Object.defineProperty(window, 'location', {
        set: function(value) {
            // Se for URL de anúncio, bloqueia
            if (isAdUrl(value)) {
                console.warn('🚫 Redirecionamento bloqueado:', value);
                return;
            }
            originalLocationSetter.call(window, value);
        },
        get: function() {
            return window.location;
        }
    });

    /**
     * Mensagem de confirmação ao usuário
     */
    console.log('%c🛡️ Proteção Anti-Popup Ativada!', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
    console.log('%cPopups e anúncios serão bloqueados automaticamente.', 'color: #2196F3; font-size: 12px;');

    // Mostra notificação visual (opcional)
    const showNotification = () => {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        notification.innerHTML = '🛡️ Proteção anti-popup ativada';
        document.body.appendChild(notification);

        setTimeout(() => notification.style.opacity = '1', 100);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };

    // Mostra notificação quando a página carrega
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', showNotification);
    } else {
        showNotification();
    }

    // Exporta função de status
    window.PopupBlocker = {
        isActive: () => true,
        getBlockedCount: () => openedPopups.size,
        closeAllPopups: () => {
            openedPopups.forEach(popup => closePopup(popup));
            openedPopups.clear();
        }
    };

})();
