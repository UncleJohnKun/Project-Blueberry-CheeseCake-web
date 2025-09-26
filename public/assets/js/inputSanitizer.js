/**
 * Input Sanitization Utilities
 * Prevents XSS attacks and ensures data integrity
 */

class InputSanitizer {
    /**
     * Escape HTML characters to prevent XSS
     */
    static escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
            '/': '&#x2F;'
        };
        
        return text.replace(/[&<>"'/]/g, (s) => map[s]);
    }

    /**
     * Sanitize text input by removing dangerous characters
     */
    static sanitizeText(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .substring(0, 1000); // Limit length
    }

    /**
     * Sanitize email input
     */
    static sanitizeEmail(email) {
        if (typeof email !== 'string') return '';
        
        return email
            .trim()
            .toLowerCase()
            .replace(/[<>"']/g, '')
            .substring(0, 254); // RFC 5321 limit
    }

    /**
     * Sanitize username input
     */
    static sanitizeUsername(username) {
        if (typeof username !== 'string') return '';
        
        return username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '') // Only allow alphanumeric, underscore, hyphen
            .substring(0, 30);
    }

    /**
     * Sanitize full name input
     */
    static sanitizeFullName(name) {
        if (typeof name !== 'string') return '';
        
        return name
            .trim()
            .replace(/[<>"']/g, '')
            .replace(/[^a-zA-Z\s'-]/g, '') // Only allow letters, spaces, apostrophes, hyphens
            .substring(0, 100);
    }

    /**
     * Sanitize section name input
     */
    static sanitizeSectionName(section) {
        if (typeof section !== 'string') return '';
        
        return section
            .trim()
            .replace(/[<>"']/g, '')
            .replace(/[^a-zA-Z0-9\s-]/g, '') // Only allow alphanumeric, spaces, hyphens
            .substring(0, 50);
    }

    /**
     * Sanitize question text
     */
    static sanitizeQuestionText(text) {
        if (typeof text !== 'string') return '';
        
        return text
            .trim()
            .replace(/[<>"']/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .substring(0, 500);
    }

    /**
     * Validate and sanitize form data
     */
    static sanitizeFormData(formData) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(formData)) {
            switch (key) {
                case 'email':
                    sanitized[key] = this.sanitizeEmail(value);
                    break;
                case 'username':
                    sanitized[key] = this.sanitizeUsername(value);
                    break;
                case 'fullname':
                case 'fullName':
                    sanitized[key] = this.sanitizeFullName(value);
                    break;
                case 'section':
                    sanitized[key] = this.sanitizeSectionName(value);
                    break;
                case 'questionText':
                case 'question':
                    sanitized[key] = this.sanitizeQuestionText(value);
                    break;
                case 'password':
                    // Don't sanitize passwords, just validate length
                    sanitized[key] = typeof value === 'string' ? value.substring(0, 128) : '';
                    break;
                default:
                    sanitized[key] = this.sanitizeText(value);
                    break;
            }
        }
        
        return sanitized;
    }

    /**
     * Validate email format
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    /**
     * Validate username format
     */
    static isValidUsername(username) {
        const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        return usernameRegex.test(username);
    }

    /**
     * Validate password strength
     */
    static isValidPassword(password) {
        if (typeof password !== 'string') return false;
        
        return password.length >= 8 && 
               password.length <= 128 &&
               /[A-Z]/.test(password) && // At least one uppercase
               /[a-z]/.test(password) && // At least one lowercase
               /\d/.test(password);      // At least one number
    }

    /**
     * Validate full name format
     */
    static isValidFullName(name) {
        if (typeof name !== 'string') return false;
        
        const nameRegex = /^[a-zA-Z\s'-]{2,100}$/;
        return nameRegex.test(name.trim());
    }

    /**
     * Create safe HTML for display
     */
    static createSafeHTML(template, data) {
        let safeHTML = template;
        
        for (const [key, value] of Object.entries(data)) {
            const placeholder = `{{${key}}}`;
            const safeValue = this.escapeHtml(String(value));
            safeHTML = safeHTML.replace(new RegExp(placeholder, 'g'), safeValue);
        }
        
        return safeHTML;
    }

    /**
     * Sanitize JSON data before sending to server
     */
    static sanitizeJSONData(data) {
        if (typeof data !== 'object' || data === null) return data;
        
        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeJSONData(item));
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeText(value);
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeJSONData(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }
}

// Make available globally
window.InputSanitizer = InputSanitizer;

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputSanitizer;
}
