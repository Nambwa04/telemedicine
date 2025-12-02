/**
 * Button Ripple Effect Utility.
 * Adds a material-design style ripple effect to buttons on click.
 * Respects reduced motion preferences.
 */
// Lightweight ripple effect for buttons using event delegation
// Applies to <button>, elements with role="button", and .btn

function prefersReducedMotion() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}


export function initButtonRipple(root = document) {
    if (!root || prefersReducedMotion()) return () => { };

    const handler = (e) => {
        // Find closest button-like element
        const target = e.target.closest('button, .btn, [role="button"]');
        if (!target) return;
        // Respect disabled state
        if (target.disabled || target.getAttribute('aria-disabled') === 'true') return;

        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';

        // Position based on click coordinates
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x - size / 2}px`;
        ripple.style.top = `${y - size / 2}px`;

        target.appendChild(ripple);

        // Cleanup after animation ends
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    };

    root.addEventListener('click', handler, { passive: true });

    // Return a disposer to remove the listener (for tests/SSR)
    return () => {
        root.removeEventListener('click', handler);
    };
}
