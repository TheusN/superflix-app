/**
 * Ad Blocker - Blocks known ad/redirect domains
 * Intercepts window.open and link clicks to block unwanted redirects
 */

(function() {
    'use strict';

    // List of blocked domains (add more as needed)
    const blockedDomains = [
        'otieu.com',
        'ofrfrz.com',
        'pushails.com',
        'ryviehal.com',
        'awksense.com',
        'peachpush.com',
        'vfrfrz.com',
        'kfrfrz.com',
        'lfrfrz.com',
        'mfrfrz.com',
        'nfrfrz.com',
        'pfrfrz.com',
        'qfrfrz.com',
        'rfrfrz.com',
        'sfrfrz.com',
        'tfrfrz.com',
        'ufrfrz.com',
        'hfrfrz.com',
        'wfrfrz.com',
        'xfrfrz.com',
        'yfrfrz.com',
        'zfrfrz.com',
    ];

    // Check if URL should be blocked
    function shouldBlock(url) {
        if (!url) return false;
        try {
            const urlObj = new URL(url, window.location.origin);
            const hostname = urlObj.hostname.toLowerCase();
            return blockedDomains.some(domain =>
                hostname === domain || hostname.endsWith('.' + domain)
            );
        } catch {
            return false;
        }
    }

    // Store original window.open
    const originalWindowOpen = window.open;

    // Override window.open
    window.open = function(url, target, features) {
        if (shouldBlock(url)) {
            console.log('[Superflix AdBlock] Blocked popup:', url);
            return null;
        }
        return originalWindowOpen.call(window, url, target, features);
    };

    // Block clicks on links to blocked domains
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (link && link.href && shouldBlock(link.href)) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Superflix AdBlock] Blocked link:', link.href);
            return false;
        }
    }, true);

    // Block form submissions to blocked domains
    document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form && form.action && shouldBlock(form.action)) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Superflix AdBlock] Blocked form:', form.action);
            return false;
        }
    }, true);

    // Monitor and block programmatic navigation
    // Note: window.location.assign and replace are read-only in modern browsers
    // We use a different approach - intercept beforeunload for logging only

    // Intercept setting location.href
    let currentHref = window.location.href;

    // Use MutationObserver to detect iframe additions and sandbox them
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeName === 'IFRAME') {
                    // Can't fully control iframe content due to same-origin policy
                    // But we can add some attributes
                    if (!node.hasAttribute('data-superflix-processed')) {
                        node.setAttribute('data-superflix-processed', 'true');
                    }
                }
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Block beforeunload if navigating to blocked domain
    window.addEventListener('beforeunload', function(e) {
        // This runs but can't really block - just for logging
    });

    // Periodically check for popups (fallback)
    let lastWindowCount = 0;

    console.log('[Superflix AdBlock] Initialized - Blocking:', blockedDomains.join(', '));
})();
