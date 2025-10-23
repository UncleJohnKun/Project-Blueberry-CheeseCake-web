/**
 * Secure Authentication Module
 * Integrates with server-side API for proper authentication
 */

class SecureAuth {
    constructor() {
        this.API_BASE_URL = window.location.origin + '/api';
        this.tokenRefreshTimer = null;
    }

    /**
     * Clear all authentication data
     */
    clearAuthData() {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('isAdminLoggedIn');
        sessionStorage.removeItem('isTeacherLoggedIn');
        sessionStorage.removeItem('userRole');
        sessionStorage.removeItem('teacherId');
        sessionStorage.removeItem('csrfToken');
        
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
            this.tokenRefreshTimer = null;
        }
    }

    /**
     * Set authentication data securely
     */
    setAuthData(sessionData, isAdmin = false) {
        sessionStorage.setItem('authToken', sessionData.accessToken);
        sessionStorage.setItem('refreshToken', sessionData.refreshToken);
        
        if (sessionData.csrfToken) {
            sessionStorage.setItem('csrfToken', sessionData.csrfToken);
        }
        
        if (isAdmin) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            sessionStorage.setItem('userRole', 'admin');
        } else {
            sessionStorage.setItem('isTeacherLoggedIn', 'true');
            sessionStorage.setItem('userRole', 'teacher');
            if (sessionData.user && sessionData.user.id) {
                sessionStorage.setItem('teacherId', sessionData.user.id);
            }
        }

        // Set up automatic token refresh
        this.setupTokenRefresh(sessionData.expiresIn);
    }

    /**
     * Get authentication headers for API requests
     */
    getAuthHeaders() {
        const token = sessionStorage.getItem('authToken');
        const csrfToken = sessionStorage.getItem('csrfToken');
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }
        
        return headers;
    }

    /**
     * Login with username and password using secure API
     */
    async login(username, password) {
        try {
            // Clear any existing auth data
            this.clearAuthData();

            // Try admin login first
            try {
                const adminResponse = await fetch(`${this.API_BASE_URL}/auth/admin/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (adminResponse.ok) {
                    const sessionData = await adminResponse.json();
                    this.setAuthData(sessionData, true);
                    return {
                        success: true,
                        isAdmin: true,
                        data: sessionData
                    };
                }
            } catch (adminError) {
                console.log('Admin login failed, trying teacher login');
            }

            // Try teacher login
            const teacherResponse = await fetch(`${this.API_BASE_URL}/auth/teacher/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (teacherResponse.ok) {
                const sessionData = await teacherResponse.json();
                this.setAuthData(sessionData, false);
                return {
                    success: true,
                    isAdmin: false,
                    data: sessionData
                };
            }

            // Both login attempts failed
            const errorData = await teacherResponse.json();
            throw new Error(errorData.message || 'Invalid credentials');

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Logout and clear all session data
     */
    async logout() {
        try {
            const token = sessionStorage.getItem('authToken');
            
            if (token) {
                // Call server logout endpoint
                await fetch(`${this.API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: this.getAuthHeaders()
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local auth data
            this.clearAuthData();
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshToken() {
        try {
            const refreshToken = sessionStorage.getItem('refreshToken');
            
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await fetch(`${this.API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const sessionData = await response.json();
            const isAdmin = sessionStorage.getItem('userRole') === 'admin';
            
            this.setAuthData(sessionData, isAdmin);
            return true;

        } catch (error) {
            console.error('Token refresh error:', error);
            this.clearAuthData();
            return false;
        }
    }

    /**
     * Setup automatic token refresh
     */
    setupTokenRefresh(expiresIn) {
        if (this.tokenRefreshTimer) {
            clearTimeout(this.tokenRefreshTimer);
        }

        // Refresh token 5 minutes before expiry
        const refreshTime = (expiresIn * 1000) - (5 * 60 * 1000);
        
        this.tokenRefreshTimer = setTimeout(async () => {
            const success = await this.refreshToken();
            if (!success) {
                // Redirect to login if refresh fails
                window.location.href = '/public/index.html';
            }
        }, refreshTime);
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = sessionStorage.getItem('authToken');
        const isAdmin = sessionStorage.getItem('isAdminLoggedIn') === 'true';
        const isTeacher = sessionStorage.getItem('isTeacherLoggedIn') === 'true';
        
        return !!(token && (isAdmin || isTeacher));
    }

    /**
     * Get current user role
     */
    getUserRole() {
        return sessionStorage.getItem('userRole');
    }

    /**
     * Get current teacher ID
     */
    getTeacherId() {
        return sessionStorage.getItem('teacherId');
    }

    /**
     * Make authenticated API request
     */
    async apiRequest(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${this.API_BASE_URL}${endpoint}`;
        
        const config = {
            ...options,
            headers: {
                ...this.getAuthHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // Token expired, try to refresh
                const refreshSuccess = await this.refreshToken();
                if (refreshSuccess) {
                    // Retry the request with new token
                    config.headers = {
                        ...this.getAuthHeaders(),
                        ...options.headers
                    };
                    return await fetch(url, config);
                } else {
                    // Refresh failed, redirect to login
                    window.location.href = 'index.html';
                    return null;
                }
            }
            
            return response;
        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }
}

// Create global instance
window.secureAuth = new SecureAuth();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecureAuth;
}
