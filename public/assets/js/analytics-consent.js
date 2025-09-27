/**
 * Google Analytics Consent Mode Integration
 * This script helps integrate cookie preferences with Google Analytics consent mode
 */

// Initialize Google Analytics with consent mode
window.dataLayer = window.dataLayer || [];

function gtag() {
    dataLayer.push(arguments);
}

// Default consent state (denied until user makes a choice)
gtag('consent', 'default', {
    'analytics_storage': 'denied',
    'ad_storage': 'denied',
    'functionality_storage': 'granted',
    'security_storage': 'granted'
});

// Function to update consent based on cookie preferences
function updateAnalyticsConsent(preferences) {
    if (!preferences) return;

    gtag('consent', 'update', {
        'analytics_storage': preferences.analytics ? 'granted' : 'denied',
        'ad_storage': preferences.marketing ? 'granted' : 'denied',
        'functionality_storage': preferences.functional ? 'granted' : 'denied',
        'security_storage': 'granted' // Always granted for security
    });
}

// Listen for cookie preference changes
document.addEventListener('DOMContentLoaded', function() {
    // Check if cookie preferences are available
    if (window.cookiePreferences) {
        const preferences = window.cookiePreferences.getPreferences();
        updateAnalyticsConsent(preferences);
        
        // Listen for preference changes
        window.addEventListener('cookiePreferencesChanged', function(event) {
            updateAnalyticsConsent(event.detail.preferences);
        });
    }
});

// Initialize Google Analytics (replace GA_MEASUREMENT_ID with your actual ID)
// gtag('config', 'GA_MEASUREMENT_ID');

// Export for use in other scripts
window.updateAnalyticsConsent = updateAnalyticsConsent;