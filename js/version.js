/**
 * Version Control & Cache Management
 * Automatically clears cache when app version changes
 */

const AppVersion = {
    // Increment this version whenever you deploy updates
    CURRENT_VERSION: '1.4.2',
    VERSION_KEY: 'superflix_app_version',

    /**
     * Check and update version, clearing cache if needed
     */
    checkVersion() {
        const savedVersion = localStorage.getItem(this.VERSION_KEY);

        if (savedVersion !== this.CURRENT_VERSION) {
            console.log(`Version update detected: ${savedVersion} -> ${this.CURRENT_VERSION}`);
            this.clearAllCache();
            localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);

            // Show update notification
            this.showUpdateNotification();
        }
    },

    /**
     * Clear all caches
     */
    async clearAllCache() {
        try {
            // Clear API cache
            if (typeof SuperflixAPI !== 'undefined' && SuperflixAPI.cache) {
                SuperflixAPI.cache.clear();
                console.log('API cache cleared');
            }

            // Clear Service Worker caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
                console.log('Service Worker caches cleared');
            }

            // Unregister service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(registration => registration.unregister())
                );
                console.log('Service Workers unregistered');
            }

            // Clear session storage (except important data)
            const preserveKeys = ['superflix_theme', 'superflix_favorites', 'superflix_history', 'superflix_continue', 'superflix_token', 'superflix_user'];
            const allKeys = Object.keys(localStorage);

            allKeys.forEach(key => {
                if (!preserveKeys.includes(key) && key !== this.VERSION_KEY) {
                    localStorage.removeItem(key);
                }
            });

            console.log('Cache cleared successfully');
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    },

    /**
     * Show update notification to user
     */
    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'version-update-toast';
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <div>
                    <strong>Superflix Atualizado!</strong>
                    <p style="margin: 4px 0 0; font-size: 0.9em; opacity: 0.9;">Versão ${this.CURRENT_VERSION} - Cache limpo automaticamente</p>
                </div>
            </div>
        `;

        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: '10000',
            maxWidth: '400px',
            animation: 'slideInRight 0.5s ease',
            cursor: 'pointer'
        });

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 5000);

        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        });
    },

    /**
     * Force reload page to ensure latest version
     */
    forceReload() {
        if (window.location.reload) {
            window.location.reload(true);
        }
    }
};

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }

    .version-update-toast:hover {
        transform: scale(1.02);
        transition: transform 0.2s ease;
    }
`;
document.head.appendChild(style);

// Run version check on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AppVersion.checkVersion());
} else {
    AppVersion.checkVersion();
}

// Export for use in other modules
window.AppVersion = AppVersion;
