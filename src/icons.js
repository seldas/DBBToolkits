import { createIcons, icons } from 'lucide';

/**
 * Render all `[data-lucide]` elements using the locally bundled Lucide icon set.
 */
export function refreshIcons() {
    createIcons({ icons });
}

if (typeof window !== 'undefined') {
    window.lucide = { createIcons: refreshIcons };
}
