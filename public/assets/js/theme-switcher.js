/**
 * Theme Switcher
 * Handles dark/light mode toggle functionality
 */

(function() {
    'use strict';

    // Theme management
    const ThemeManager = {
        STORAGE_KEY: 'userTheme',
        DARK_MODE_CLASS: 'dark-mode',

        // Initialize theme on page load
        init: function() {
            const savedTheme = this.getSavedTheme();
            if (savedTheme === 'dark') {
                this.enableDarkMode(false);
            } else {
                this.enableLightMode(false);
            }
        },

        // Get saved theme from localStorage
        getSavedTheme: function() {
            return localStorage.getItem(this.STORAGE_KEY) || 'light';
        },

        // Save theme to localStorage
        saveTheme: function(theme) {
            localStorage.setItem(this.STORAGE_KEY, theme);
        },

        // Enable dark mode
        enableDarkMode: function(save = true) {
            document.body.classList.add(this.DARK_MODE_CLASS);
            if (save) {
                this.saveTheme('dark');
            }
            this.updateToggleUI('dark');
        },

        // Enable light mode
        enableLightMode: function(save = true) {
            document.body.classList.remove(this.DARK_MODE_CLASS);
            if (save) {
                this.saveTheme('light');
            }
            this.updateToggleUI('light');
        },

        // Toggle between themes
        toggle: function() {
            if (document.body.classList.contains(this.DARK_MODE_CLASS)) {
                this.enableLightMode();
            } else {
                this.enableDarkMode();
            }
        },

        // Update toggle button UI
        updateToggleUI: function(theme) {
            const toggles = document.querySelectorAll('.theme-toggle');
            const isDark = theme === 'dark';

            toggles.forEach(toggle => {
                if (isDark) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }

                // Update icon
                const slider = toggle.querySelector('.theme-toggle-slider');
                if (slider) {
                    const icon = slider.querySelector('svg');
                    if (icon) {
                        if (isDark) {
                            // Moon icon
                            icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>';
                        } else {
                            // Sun icon
                            icon.innerHTML = '<circle cx="12" cy="12" r="5" fill="currentColor"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" stroke-width="2"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" stroke-width="2"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" stroke-width="2"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="2"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" stroke-width="2"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" stroke-width="2"/>';
                        }
                    }
                }
            });
        },

        // Setup event listeners for theme toggles
        setupEventListeners: function() {
            const toggles = document.querySelectorAll('.theme-toggle');
            toggles.forEach(toggle => {
                toggle.addEventListener('click', () => {
                    this.toggle();
                });
            });
        }
    };

    // Initialize theme when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            ThemeManager.init();
            ThemeManager.setupEventListeners();
        });
    } else {
        ThemeManager.init();
        ThemeManager.setupEventListeners();
    }

    // Expose ThemeManager globally for manual control if needed
    window.ThemeManager = ThemeManager;

})();
