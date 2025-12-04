/**
 * Welcome Popup - Shows once per device
 * Detects device type and recommends Brave browser
 */

class WelcomePopup {
    constructor() {
        this.storageKey = 'superflix_welcome_shown';
        this.init();
    }

    init() {
        // Check if popup was already shown
        if (localStorage.getItem(this.storageKey)) {
            return;
        }

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.show());
        } else {
            this.show();
        }
    }

    detectDevice() {
        const ua = navigator.userAgent.toLowerCase();
        const platform = navigator.platform?.toLowerCase() || '';

        // Check for mobile devices first
        if (/iphone|ipad|ipod/.test(ua)) {
            return {
                type: 'ios',
                name: 'iPhone/iPad',
                icon: '📱',
                braveUrl: 'https://apps.apple.com/app/brave-private-web-browser/id1052879175'
            };
        }

        if (/android/.test(ua)) {
            return {
                type: 'android',
                name: 'Android',
                icon: '📱',
                braveUrl: 'https://play.google.com/store/apps/details?id=com.brave.browser'
            };
        }

        // Desktop detection
        if (/macintosh|mac os x/.test(ua)) {
            return {
                type: 'mac',
                name: 'macOS',
                icon: '💻',
                braveUrl: 'https://brave.com/download/'
            };
        }

        if (/windows/.test(ua)) {
            return {
                type: 'windows',
                name: 'Windows',
                icon: '🖥️',
                braveUrl: 'https://brave.com/download/'
            };
        }

        if (/linux/.test(ua)) {
            return {
                type: 'linux',
                name: 'Linux',
                icon: '🐧',
                braveUrl: 'https://brave.com/download/'
            };
        }

        // Default fallback
        return {
            type: 'unknown',
            name: 'seu dispositivo',
            icon: '🌐',
            braveUrl: 'https://brave.com/download/'
        };
    }

    createPopupHTML(device) {
        const isMobile = device.type === 'ios' || device.type === 'android';

        return `
            <div class="welcome-overlay" id="welcomeOverlay">
                <div class="welcome-popup">
                    <div class="welcome-header">
                        <div class="welcome-logo">
                            <span class="logo-icon">S</span>
                            <span class="logo-text">Superflix</span>
                        </div>
                    </div>

                    <div class="welcome-body">
                        <h2 class="welcome-title">Bem-vindo ao Superflix! 🎬</h2>

                        <div class="welcome-author">
                            <div class="author-avatar">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                            </div>
                            <div class="author-info">
                                <p class="author-label">Desenvolvido por</p>
                                <a href="https://github.com/TheusN" target="_blank" rel="noopener" class="author-name">
                                    TheusN
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                </a>
                            </div>
                        </div>

                        <div class="welcome-device">
                            <span class="device-icon">${device.icon}</span>
                            <span class="device-text">Detectamos que você está usando <strong>${device.name}</strong></span>
                        </div>

                        <div class="welcome-warning">
                            <div class="warning-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                            <div class="warning-content">
                                <p class="warning-title">Aviso sobre Anúncios</p>
                                <p class="warning-text">
                                    O player de vídeo é fornecido por terceiros e pode exibir anúncios ou pop-ups.
                                    ${isMobile ? 'Para uma melhor experiência no celular, ' : 'Para uma experiência sem anúncios, '}
                                    recomendamos usar o navegador <strong>Brave</strong>, que bloqueia anúncios automaticamente.
                                </p>
                            </div>
                        </div>

                        <a href="${device.braveUrl}" target="_blank" rel="noopener" class="brave-download-btn">
                            <svg class="brave-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l1.5 14L12 22l8.5-1L22 7L12 2zm0 2.3l7.3 3.7l-.8 7.3L12 19.7l-6.5-4.4l-.8-7.3L12 4.3zm0 3.7c-2.2 0-4 1.8-4 4s1.8 4 4 4s4-1.8 4-4s-1.8-4-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2s-2-.9-2-2s.9-2 2-2z"/>
                            </svg>
                            Baixar Brave para ${device.name}
                        </a>

                        <button class="welcome-continue-btn" id="welcomeContinue">
                            Continuar para o Superflix
                        </button>

                        <p class="welcome-note">
                            Esta mensagem aparece apenas uma vez.
                        </p>
                    </div>
                </div>
            </div>
        `;
    }

    show() {
        const device = this.detectDevice();

        // Create popup container
        const container = document.createElement('div');
        container.innerHTML = this.createPopupHTML(device);
        document.body.appendChild(container.firstElementChild);

        // Add styles
        this.injectStyles();

        // Bind close event
        const continueBtn = document.getElementById('welcomeContinue');
        const overlay = document.getElementById('welcomeOverlay');

        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.close());
        }

        // Close on overlay click (outside popup)
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close();
                }
            });
        }

        // Animate in
        requestAnimationFrame(() => {
            overlay?.classList.add('active');
        });
    }

    close() {
        const overlay = document.getElementById('welcomeOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }

        // Mark as shown
        localStorage.setItem(this.storageKey, 'true');
    }

    injectStyles() {
        if (document.getElementById('welcome-popup-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'welcome-popup-styles';
        styles.textContent = `
            .welcome-overlay {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(8px);
                padding: 20px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .welcome-overlay.active {
                opacity: 1;
            }

            .welcome-popup {
                background: linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%);
                border-radius: 20px;
                max-width: 480px;
                width: 100%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 80px rgba(0, 0, 0, 0.8),
                            0 0 0 1px rgba(255, 255, 255, 0.1);
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .welcome-overlay.active .welcome-popup {
                transform: scale(1);
            }

            .welcome-header {
                padding: 24px;
                text-align: center;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .welcome-header .welcome-logo {
                display: inline-flex;
                align-items: center;
                gap: 10px;
            }

            .welcome-header .logo-icon {
                width: 45px;
                height: 45px;
                background: #e50914;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 1.5rem;
                color: white;
            }

            .welcome-header .logo-text {
                font-size: 1.8rem;
                font-weight: 700;
                color: white;
            }

            .welcome-body {
                padding: 24px;
            }

            .welcome-title {
                text-align: center;
                font-size: 1.5rem;
                font-weight: 700;
                color: white;
                margin-bottom: 24px;
            }

            .welcome-author {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 16px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .author-avatar {
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #e50914 0%, #b20710 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .author-avatar svg {
                width: 26px;
                height: 26px;
                color: white;
            }

            .author-info {
                flex: 1;
            }

            .author-label {
                font-size: 0.85rem;
                color: #808080;
                margin-bottom: 4px;
            }

            .author-name {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 1.1rem;
                font-weight: 600;
                color: #e50914;
                text-decoration: none;
                transition: color 0.2s;
            }

            .author-name:hover {
                color: #ff1a1a;
            }

            .welcome-device {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 14px 16px;
                background: rgba(59, 130, 246, 0.1);
                border: 1px solid rgba(59, 130, 246, 0.3);
                border-radius: 10px;
                margin-bottom: 20px;
            }

            .device-icon {
                font-size: 1.5rem;
            }

            .device-text {
                font-size: 0.9rem;
                color: #b3b3b3;
            }

            .device-text strong {
                color: #60a5fa;
            }

            .welcome-warning {
                display: flex;
                gap: 14px;
                padding: 16px;
                background: rgba(245, 158, 11, 0.1);
                border: 1px solid rgba(245, 158, 11, 0.3);
                border-radius: 12px;
                margin-bottom: 24px;
            }

            .warning-icon {
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                background: rgba(245, 158, 11, 0.2);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .warning-icon svg {
                width: 22px;
                height: 22px;
                color: #f59e0b;
            }

            .warning-content {
                flex: 1;
            }

            .warning-title {
                font-weight: 600;
                color: #fbbf24;
                margin-bottom: 6px;
            }

            .warning-text {
                font-size: 0.9rem;
                color: #b3b3b3;
                line-height: 1.5;
            }

            .warning-text strong {
                color: #fb923c;
            }

            .brave-download-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                width: 100%;
                padding: 14px 20px;
                background: linear-gradient(135deg, #fb542b 0%, #ff7139 100%);
                border: none;
                border-radius: 10px;
                color: white;
                font-size: 1rem;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
                margin-bottom: 12px;
            }

            .brave-download-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(251, 84, 43, 0.4);
            }

            .brave-icon {
                width: 22px;
                height: 22px;
            }

            .welcome-continue-btn {
                width: 100%;
                padding: 14px 20px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 10px;
                color: white;
                font-size: 1rem;
                font-weight: 500;
                cursor: pointer;
                transition: background 0.2s;
            }

            .welcome-continue-btn:hover {
                background: rgba(255, 255, 255, 0.15);
            }

            .welcome-note {
                text-align: center;
                font-size: 0.8rem;
                color: #666;
                margin-top: 16px;
            }

            @media (max-width: 480px) {
                .welcome-popup {
                    border-radius: 16px;
                }

                .welcome-header, .welcome-body {
                    padding: 20px;
                }

                .welcome-title {
                    font-size: 1.3rem;
                }

                .welcome-author {
                    padding: 14px;
                }

                .author-avatar {
                    width: 44px;
                    height: 44px;
                }

                .welcome-warning {
                    flex-direction: column;
                    gap: 12px;
                }

                .warning-icon {
                    width: 36px;
                    height: 36px;
                }
            }
        `;

        document.head.appendChild(styles);
    }
}

// Initialize welcome popup
new WelcomePopup();
