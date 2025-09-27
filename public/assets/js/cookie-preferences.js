/**
 * Cookie Preferences Management System
 * Handles cookie consent, preferences storage, and compliance
 */

class CookiePreferences {
    constructor() {
        this.cookieCategories = {
            essential: {
                name: 'Essential Cookies',
                description: 'These cookies are necessary for the website to function and cannot be switched off.',
                required: true,
                cookies: ['session', 'csrf_token', 'auth_state']
            },
            functional: {
                name: 'Functional Cookies',
                description: 'These cookies enable enhanced functionality and personalization.',
                required: false,
                cookies: ['language_preference', 'theme_preference', 'dashboard_layout']
            },
            analytics: {
                name: 'Analytics Cookies',
                description: 'These cookies help us understand how visitors interact with our website.',
                required: false,
                cookies: ['_ga', '_gid', 'analytics_session']
            },
            marketing: {
                name: 'Marketing Cookies',
                description: 'These cookies are used to track visitors and display relevant advertisements.',
                required: false,
                cookies: ['marketing_id', 'ad_preferences', 'conversion_tracking']
            }
        };

        this.preferences = this.loadPreferences();
        this.consentGiven = this.hasConsentBeenGiven();
        
        this.init();
    }

    init() {
        this.createCookieBanner();
        this.createPreferencesModal();
        this.bindEvents();
        
        // Ensure toggle events are bound after DOM creation
        setTimeout(() => {
            this.bindToggleEvents();
            this.updateToggleStates();
        }, 100);
        
        // Show banner if no consent has been given
        if (!this.consentGiven) {
            this.showCookieBanner();
        }
        
        // Apply current preferences
        this.applyPreferences();
    }

    createCookieBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'cookie-banner';
        banner.innerHTML = `
            <div class="cookie-banner-content">
                <div class="cookie-banner-text">
                    <h3>We value your privacy</h3>
                    <p>We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.</p>
                </div>
                <div class="cookie-banner-actions">
                    <button id="cookie-accept-all" class="btn btn-primary">Accept All</button>
                    <button id="cookie-customize" class="btn btn-secondary">Customize</button>
                    <button id="cookie-reject-optional" class="btn btn-text">Reject Optional</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }

    createPreferencesModal() {
        const modal = document.createElement('div');
        modal.id = 'cookie-preferences-modal';
        modal.className = 'cookie-modal';
        
        let categoriesHTML = '';
        Object.entries(this.cookieCategories).forEach(([key, category]) => {
            const isChecked = this.preferences[key] ? 'checked' : '';
            const isDisabled = category.required ? 'disabled' : '';
            
            categoriesHTML += `
                <div class="cookie-category">
                    <div class="cookie-category-header">
                        <div class="cookie-category-info">
                            <h4>${category.name}</h4>
                            <p>${category.description}</p>
                        </div>
                        <div class="cookie-toggle">
                            <input type="checkbox" 
                                   id="cookie-${key}" 
                                   ${isChecked} 
                                   ${isDisabled}
                                   data-category="${key}">
                            <label for="cookie-${key}" class="toggle-switch">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    <div class="cookie-details">
                        <strong>Cookies used:</strong> ${category.cookies.join(', ')}
                    </div>
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="cookie-modal-overlay"></div>
            <div class="cookie-modal-content">
                <div class="cookie-modal-header">
                    <h2>Cookie Preferences</h2>
                    <button id="cookie-modal-close" class="modal-close">&times;</button>
                </div>
                <div class="cookie-modal-body">
                    <p>Manage your cookie preferences below. You can enable or disable different types of cookies based on your preferences.</p>
                    <div class="cookie-categories">
                        ${categoriesHTML}
                    </div>
                </div>
                <div class="cookie-modal-footer">
                    <button id="cookie-save-preferences" class="btn btn-primary">Save Preferences</button>
                    <button id="cookie-accept-all-modal" class="btn btn-secondary">Accept All</button>
                    <button id="cookie-reject-optional-modal" class="btn btn-text">Reject Optional</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    bindToggleEvents() {
        // Bind category toggle events
        Object.keys(this.cookieCategories).forEach(category => {
            const toggle = document.getElementById(`cookie-${category}`);
            if (toggle) {
                // Remove any existing listeners
                toggle.removeEventListener('change', toggle._cookieHandler);
                
                // Create new handler
                const handler = (e) => {
                    if (!toggle.disabled) {
                        this.updateCategoryPreference(category, e.target.checked);
                    }
                };
                
                // Store handler reference and add listener
                toggle._cookieHandler = handler;
                toggle.addEventListener('change', handler);
            }
        });
    }

    bindEvents() {
        // Banner events
        const acceptAllBtn = document.getElementById('cookie-accept-all');
        const customizeBtn = document.getElementById('cookie-customize');
        const rejectOptionalBtn = document.getElementById('cookie-reject-optional');

        if (acceptAllBtn) {
            acceptAllBtn.addEventListener('click', () => this.acceptAllCookies());
        }
        if (customizeBtn) {
            customizeBtn.addEventListener('click', () => this.showPreferencesModal());
        }
        if (rejectOptionalBtn) {
            rejectOptionalBtn.addEventListener('click', () => this.rejectOptionalCookies());
        }

        // Modal events
        const modalClose = document.getElementById('cookie-modal-close');
        const savePrefsBtn = document.getElementById('cookie-save-preferences');
        const acceptAllModalBtn = document.getElementById('cookie-accept-all-modal');
        const rejectOptionalModalBtn = document.getElementById('cookie-reject-optional-modal');

        if (modalClose) {
            modalClose.addEventListener('click', () => this.hidePreferencesModal());
        }
        if (savePrefsBtn) {
            savePrefsBtn.addEventListener('click', () => this.savePreferences());
        }
        if (acceptAllModalBtn) {
            acceptAllModalBtn.addEventListener('click', () => this.acceptAllCookies());
        }
        if (rejectOptionalModalBtn) {
            rejectOptionalModalBtn.addEventListener('click', () => this.rejectOptionalCookies());
        }

        // Bind toggle events immediately after modal creation
        this.bindToggleEvents();

        // Close modal when clicking outside or pressing Escape
        setTimeout(() => {
            const modal = document.getElementById('cookie-preferences-modal');
            const overlay = modal?.querySelector('.cookie-modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    this.hidePreferencesModal();
                });
            }
        }, 100);

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('cookie-preferences-modal');
                if (modal && modal.classList.contains('show')) {
                    this.hidePreferencesModal();
                }
            }
        });
    }

    showCookieBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.add('show');
        }
    }

    hideCookieBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.remove('show');
        }
    }

    showPreferencesModal() {
        const modal = document.getElementById('cookie-preferences-modal');
        if (modal) {
            // Update toggle states before showing
            this.updateToggleStates();
            
            // Re-bind toggle events to ensure they work
            setTimeout(() => {
                this.bindToggleEvents();
            }, 50);
            
            modal.classList.add('show');
            document.body.classList.add('modal-open');
            
            // Focus management for accessibility
            const firstToggle = modal.querySelector('input[type="checkbox"]:not([disabled])');
            if (firstToggle) {
                setTimeout(() => firstToggle.focus(), 150);
            }
        }
    }

    hidePreferencesModal() {
        const modal = document.getElementById('cookie-preferences-modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.classList.remove('modal-open');
        }
    }

    acceptAllCookies() {
        Object.keys(this.cookieCategories).forEach(category => {
            this.preferences[category] = true;
        });
        this.saveConsentAndPreferences();
        this.hideCookieBanner();
        this.hidePreferencesModal();
        this.applyPreferences();
    }

    rejectOptionalCookies() {
        Object.entries(this.cookieCategories).forEach(([key, category]) => {
            this.preferences[key] = category.required;
        });
        this.saveConsentAndPreferences();
        this.hideCookieBanner();
        this.hidePreferencesModal();
        this.applyPreferences();
    }

    updateCategoryPreference(category, enabled) {
        console.log(`Cookie category ${category} ${enabled ? 'enabled' : 'disabled'}`);
        
        this.preferences[category] = enabled;
        
        // Apply changes immediately
        this.applyPreferences();
        
        // Save to localStorage for persistence
        localStorage.setItem('cookie_preferences', JSON.stringify(this.preferences));
        
        // Update visual state immediately
        this.updateToggleStates();
        
        // Show feedback
        const categoryName = this.cookieCategories[category].name;
        const status = enabled ? 'enabled' : 'disabled';
        this.showNotification(`${categoryName} ${status}`);
        
        // Dispatch event for other scripts
        window.dispatchEvent(new CustomEvent('cookiePreferencesChanged', {
            detail: { 
                preferences: this.preferences,
                category: category,
                enabled: enabled
            }
        }));
    }

    savePreferences() {
        this.saveConsentAndPreferences();
        this.hidePreferencesModal();
        this.hideCookieBanner();
        this.applyPreferences();
        
        // Show success message
        this.showNotification('Cookie preferences saved successfully!');
    }

    saveConsentAndPreferences() {
        // Save consent timestamp
        localStorage.setItem('cookie_consent_given', new Date().toISOString());
        
        // Save preferences
        localStorage.setItem('cookie_preferences', JSON.stringify(this.preferences));
        
        this.consentGiven = true;
        
        // Dispatch event for other scripts to listen to
        window.dispatchEvent(new CustomEvent('cookiePreferencesChanged', {
            detail: { preferences: this.preferences }
        }));
    }

    loadPreferences() {
        const saved = localStorage.getItem('cookie_preferences');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Default preferences (essential only)
        const defaults = {};
        Object.entries(this.cookieCategories).forEach(([key, category]) => {
            defaults[key] = category.required;
        });
        return defaults;
    }

    hasConsentBeenGiven() {
        return !!localStorage.getItem('cookie_consent_given');
    }

    applyPreferences() {
        console.log('Applying cookie preferences:', this.preferences);
        
        // Apply analytics cookies
        if (this.preferences.analytics) {
            this.enableAnalytics();
        } else {
            this.disableAnalytics();
        }

        // Apply marketing cookies
        if (this.preferences.marketing) {
            this.enableMarketing();
        } else {
            this.disableMarketing();
        }

        // Apply functional cookies
        if (this.preferences.functional) {
            this.enableFunctional();
        }

        // Update UI toggles
        this.updateToggleStates();
    }

    enableAnalytics() {
        // Enable Google Analytics or other analytics services
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }
    }

    disableAnalytics() {
        // Disable analytics
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
        }
        
        // Clear analytics cookies
        this.clearCookiesByCategory('analytics');
    }

    enableMarketing() {
        // Enable marketing cookies
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'ad_storage': 'granted'
            });
        }
    }

    disableMarketing() {
        // Disable marketing
        if (typeof gtag !== 'undefined') {
            gtag('consent', 'update', {
                'ad_storage': 'denied'
            });
        }
        
        // Clear marketing cookies
        this.clearCookiesByCategory('marketing');
    }

    enableFunctional() {
        // Enable functional cookies - these enhance user experience
        // No special action needed as they're handled by the application
    }

    clearCookiesByCategory(category) {
        const cookies = this.cookieCategories[category].cookies;
        cookies.forEach(cookieName => {
            this.deleteCookie(cookieName);
        });
    }

    deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
    }

    updateToggleStates() {
        Object.entries(this.preferences).forEach(([category, enabled]) => {
            const toggle = document.getElementById(`cookie-${category}`);
            if (toggle) {
                toggle.checked = enabled;
                
                // Update visual state of the toggle switch
                const switchElement = toggle.nextElementSibling;
                if (switchElement && switchElement.classList.contains('toggle-switch')) {
                    if (enabled) {
                        switchElement.classList.add('checked');
                    } else {
                        switchElement.classList.remove('checked');
                    }
                }
            }
        });
    }

    showNotification(message) {
        // Remove any existing notifications
        const existing = document.querySelectorAll('.cookie-notification');
        existing.forEach(n => n.remove());

        // Create and show a notification
        const notification = document.createElement('div');
        notification.className = 'cookie-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Hide and remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // Public method to open preferences modal (for settings links)
    openPreferences() {
        this.showPreferencesModal();
    }

    // Public method to get current preferences
    getPreferences() {
        return { ...this.preferences };
    }

    // Public method to check if a specific category is enabled
    isCategoryEnabled(category) {
        return this.preferences[category] || false;
    }

    // Public method to reset all cookie preferences (for testing)
    resetCookiePreferences() {
        localStorage.removeItem('cookie_consent_given');
        localStorage.removeItem('cookie_preferences');
        
        // Clear all non-essential cookies
        Object.entries(this.cookieCategories).forEach(([category, data]) => {
            if (!data.required) {
                this.clearCookiesByCategory(category);
            }
        });
        
        // Reset preferences to defaults
        this.preferences = this.loadPreferences();
        this.consentGiven = false;
        
        // Show banner again
        this.showCookieBanner();
        
        this.showNotification('Cookie preferences have been reset');
    }
}

// Initialize cookie preferences when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.cookiePreferences = new CookiePreferences();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CookiePreferences;
}