# Cookie Preferences System Documentation

## Overview

The Cookie Preferences System provides a comprehensive, GDPR-compliant solution for managing user consent and cookie preferences across the Quiztoría Educational Platform. The system includes a user-friendly interface, persistent storage, and integration with analytics services.

## Features

### ✅ Core Features
- **Cookie Banner**: Non-intrusive banner that appears for first-time visitors
- **Preferences Modal**: Detailed modal for granular cookie control
- **Persistent Storage**: Preferences saved in localStorage
- **Category-based Management**: Four distinct cookie categories
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Accessibility Compliant**: WCAG 2.1 compliant with keyboard navigation
- **Real-time Updates**: Immediate application of preference changes

### 🍪 Cookie Categories

#### Essential Cookies
- **Required**: Always enabled
- **Purpose**: Critical website functionality
- **Examples**: `session`, `csrf_token`, `auth_state`

#### Functional Cookies
- **Optional**: User controllable
- **Purpose**: Enhanced functionality and personalization
- **Examples**: `language_preference`, `theme_preference`, `dashboard_layout`

#### Analytics Cookies
- **Optional**: User controllable
- **Purpose**: Understanding user behavior and improving services
- **Examples**: `_ga`, `_gid`, `analytics_session`

#### Marketing Cookies
- **Optional**: User controllable
- **Purpose**: Targeted advertising and conversion tracking
- **Examples**: `marketing_id`, `ad_preferences`, `conversion_tracking`

## Implementation

### Files Structure
```
public/
├── assets/
│   ├── css/
│   │   └── cookie-preferences.css     # Styling for cookie system
│   └── js/
│       ├── cookie-preferences.js      # Main cookie management logic
│       └── analytics-consent.js       # Google Analytics integration
└── pages/
    └── cookie-preferences.html        # Dedicated preferences page
```

### Integration Steps

1. **Add CSS and JavaScript to HTML pages**:
```html
<head>
    <link rel="stylesheet" href="assets/css/cookie-preferences.css">
</head>
<body>
    <!-- Your content -->
    <script src="assets/js/cookie-preferences.js"></script>
</body>
```

2. **Footer Integration**:
```html
<a href="pages/cookie-preferences.html" class="footer-link">COOKIE PREFERENCES</a>
```

## API Reference

### JavaScript API

#### CookiePreferences Class

##### Methods

```javascript
// Open preferences modal
window.cookiePreferences.openPreferences()

// Get current preferences
const preferences = window.cookiePreferences.getPreferences()

// Check if category is enabled
const isEnabled = window.cookiePreferences.isCategoryEnabled('analytics')

// Accept all cookies
window.cookiePreferences.acceptAllCookies()

// Reject optional cookies
window.cookiePreferences.rejectOptionalCookies()
```

##### Events

```javascript
// Listen for preference changes
window.addEventListener('cookiePreferencesChanged', function(event) {
    const preferences = event.detail.preferences;
    // Handle preference changes
});
```

### CSS Classes

#### Main Components
- `.cookie-banner` - Cookie consent banner
- `.cookie-modal` - Preferences modal
- `.cookie-category` - Individual category container
- `.toggle-switch` - Toggle switch styling
- `.cookie-notification` - Success notifications

#### State Classes
- `.show` - Display banner/modal
- `.modal-open` - Body class when modal is open
- `.enabled` - Enabled toggle state
- `.disabled` - Disabled toggle state
- `.required` - Required category indicator

## Usage Examples

### Basic Implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Page</title>
    <link rel="stylesheet" href="assets/css/cookie-preferences.css">
</head>
<body>
    <!-- Your content -->
    
    <footer>
        <a href="javascript:void(0)" onclick="window.cookiePreferences?.openPreferences()">
            Cookie Preferences
        </a>
    </footer>
    
    <script src="assets/js/cookie-preferences.js"></script>
</body>
</html>
```

### Programmatic Control

```javascript
// Check if user has given consent
if (window.cookiePreferences.hasConsentBeenGiven()) {
    // User has made a choice
}

// Get specific category status
if (window.cookiePreferences.isCategoryEnabled('analytics')) {
    // Initialize analytics
    initializeAnalytics();
}

// Listen for changes
window.addEventListener('cookiePreferencesChanged', function(event) {
    const { analytics, marketing, functional } = event.detail.preferences;
    
    if (analytics) {
        enableAnalytics();
    } else {
        disableAnalytics();
    }
});
```

## Google Analytics Integration

The system includes Google Analytics Consent Mode integration:

```html
<script src="assets/js/analytics-consent.js"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Customization

### Styling Customization

Override CSS variables to match your brand:

```css
:root {
    --cookie-primary-color: #your-brand-color;
    --cookie-background: rgba(your-rgba-values);
    --cookie-border-radius: 12px;
}
```

### Category Customization

Modify categories in the JavaScript constructor:

```javascript
this.cookieCategories = {
    essential: {
        name: 'Essential Cookies',
        description: 'Your description',
        required: true,
        cookies: ['your', 'cookie', 'names']
    },
    // Add custom categories
    custom: {
        name: 'Custom Category',
        description: 'Custom description',
        required: false,
        cookies: ['custom_cookie']
    }
};
```

## Browser Support

- **Modern Browsers**: Full support (Chrome 60+, Firefox 60+, Safari 12+, Edge 79+)
- **Older Browsers**: Graceful degradation with basic functionality
- **Mobile**: Responsive design works on all mobile devices

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Readers**: ARIA labels and semantic HTML structure
- **High Contrast**: Support for high contrast mode
- **Reduced Motion**: Respects prefers-reduced-motion setting

## GDPR Compliance

The system is designed to meet GDPR requirements:

- ✅ **Consent Before Cookies**: No optional cookies set without consent
- ✅ **Granular Control**: Users can enable/disable specific categories
- ✅ **Easy Withdrawal**: Users can change preferences anytime
- ✅ **Clear Information**: Transparent about what cookies are used
- ✅ **Consent Records**: Timestamps stored for consent given

## Testing

### Manual Testing Checklist

1. **First Visit**:
   - [ ] Cookie banner appears
   - [ ] No optional cookies set initially
   - [ ] All buttons functional

2. **Accept All**:
   - [ ] All categories enabled
   - [ ] Banner disappears
   - [ ] Preferences saved

3. **Customize**:
   - [ ] Modal opens correctly
   - [ ] Toggles work properly
   - [ ] Save applies changes

4. **Subsequent Visits**:
   - [ ] Banner doesn't reappear
   - [ ] Preferences maintained
   - [ ] Settings accessible via footer

### Browser Testing

Test across multiple browsers and devices to ensure compatibility.

## Troubleshooting

### Common Issues

1. **Banner not appearing**: Check JavaScript console for errors
2. **Preferences not saving**: Verify localStorage is available
3. **Styling issues**: Ensure CSS file is loaded correctly
4. **Analytics not working**: Check consent mode integration

### Debug Mode

Enable debug logging by adding to console:
```javascript
window.cookiePreferences.debug = true;
```

## Support

For technical support or questions:
- **Email**: dev@quiztoria.edu
- **Documentation**: See inline code comments
- **Issues**: Report bugs through the project repository

---

*Last updated: September 27, 2025*