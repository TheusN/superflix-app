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
                } else {
                    openedPopups.delete(popup);
                }
            });

            // Limpa set se estiver vazio
            if (openedPopups.size === 0 && popupCheckInterval) {
                clearInterval(popupCheckInterval);
                popupCheckInterval = null;
            }
        }, 500);
    }

    /**
     * Override do window.open para interceptar popups
     */
    const originalOpen = window.open;
    window.open = function(...args) {
        const url = args[0];
        const target = args[1];

        console.log('🔍 Tentativa de window.open:', url, target);

        // Se for um popup (_blank, _new, etc) ou URL de anúncio, bloqueia
        if (target === '_blank' || target === '_new' || isAdUrl(url)) {
            console.warn('🚫 Popup bloqueado:', url);

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

        // Permite aberturas normais (mesma janela)
        const popup = originalOpen.apply(this, args);

        // Monitora o popup aberto
        if (popup && popup !== window) {
            openedPopups.add(popup);
            startPopupMonitor();

            // Tenta fechar após um delay curto (alguns anúncios demoram a carregar)
            setTimeout(() => {
                if (popup && !popup.closed) {
                    // Verifica se a URL é de anúncio
                    try {
                        const popupUrl = popup.location.href;
                        if (isAdUrl(popupUrl)) {
                            closePopup(popup);
                        }
                    } catch (e) {
                        // Cross-origin, provavelmente é anúncio
                        console.log('🔒 Popup cross-origin detectado, fechando...');
                        closePopup(popup);
                    }
                }
            }, 100);
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

        // Se o target for um link externo ou suspeito, previne
        const target = e.target.closest('a');
        if (target && target.target === '_blank') {
            const href = target.href;
            if (isAdUrl(href)) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🚫 Link de anúncio bloqueado:', href);
                return false;
            }
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
            console.log('⚠️ Página perdeu foco, verificando popups...');

            // Após 500ms, tenta recuperar foco
            setTimeout(() => {
                if (!document.hasFocus()) {
                    window.focus();
                    console.log('🔄 Foco retornado à página principal');

                    // Fecha qualquer popup aberto
                    openedPopups.forEach(popup => closePopup(popup));
                }
            }, 500);
        }

        hadFocus = hasFocus;
    }, 200);

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
