// Secure client configuration
// API keys and sensitive data are now handled server-side
export const API_BASE_URL = window.location.origin + '/api';
export const STUDENT_COLLECTION = "studentData";
export const FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER = "id";

// Security utilities for client-side
export const SecurityUtils = {
    // Get CSRF token from meta tag or API
    getCSRFToken() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : null;
    },

    // Get auth token from secure storage
    getAuthToken() {
        return sessionStorage.getItem('authToken');
    },

    // Set auth token in secure storage
    setAuthToken(token) {
        if (token) {
            sessionStorage.setItem('authToken', token);
        } else {
            sessionStorage.removeItem('authToken');
        }
    },

    // Clear all auth data
    clearAuthData() {
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('isAdminLoggedIn');
        sessionStorage.removeItem('userRole');
    },

    // Create secure headers for API requests
    createSecureHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getAuthToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }

        return headers;
    },

    // Secure fetch wrapper
    async secureFetch(url, options = {}) {
        const secureOptions = {
            ...options,
            headers: {
                ...this.createSecureHeaders(),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, secureOptions);

            // Handle token refresh if needed
            if (response.status === 401) {
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry with new token
                    secureOptions.headers = {
                        ...this.createSecureHeaders(),
                        ...options.headers
                    };
                    return await fetch(url, secureOptions);
                } else {
                    // Redirect to login
                    this.clearAuthData();
                    window.location.href = '/index.html';
                    return null;
                }
            }

            return response;
        } catch (error) {
            console.error('Secure fetch error:', error);
            throw error;
        }
    },

    // Refresh authentication token
    async refreshToken() {
        const refreshToken = sessionStorage.getItem('refreshToken');
        if (!refreshToken) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                this.setAuthToken(data.accessToken);
                sessionStorage.setItem('refreshToken', data.refreshToken);
                return true;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        return false;
    }
};

// Shared utility functions
export function formatFirestoreValue(fieldValue) {
    if (!fieldValue) return '';
    if (fieldValue.stringValue) return fieldValue.stringValue;
    if (fieldValue.integerValue) return fieldValue.integerValue;
    if (fieldValue.doubleValue) return fieldValue.doubleValue;
    if (fieldValue.booleanValue) return fieldValue.booleanValue ? 'Yes' : 'No';
    if (fieldValue.timestampValue) return new Date(fieldValue.timestampValue).toLocaleString();
    if (fieldValue.arrayValue) return fieldValue.arrayValue.values?.map(v => formatFirestoreValue(v)).join(', ') || '';
    if (fieldValue.mapValue) return JSON.stringify(fieldValue.mapValue.fields || {});
    return '';
}

// Secure API functions using the new security utilities
export async function fetchTeacherData(teacherId) {
    try {
        const response = await SecurityUtils.secureFetch(`${API_BASE_URL}/teachers/${teacherId}`);
        if (!response || !response.ok) {
            throw new Error(`Failed to fetch teacher: ${response?.statusText || 'Network error'}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching teacher data:', error);
        throw error;
    }
}

export async function fetchStudentsForTeacher(teacherId) {
    try {
        const response = await SecurityUtils.secureFetch(`${API_BASE_URL}/teachers/${teacherId}/students`);
        if (!response || !response.ok) {
            throw new Error(`Failed to fetch students: ${response?.statusText || 'Network error'}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching students:', error);
        throw error;
    }
}

export async function fetchAllTeachers() {
    try {
        const response = await SecurityUtils.secureFetch(`${API_BASE_URL}/teachers`);
        if (!response || !response.ok) {
            throw new Error(`Failed to fetch teachers: ${response?.statusText || 'Network error'}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching teachers:', error);
        throw error;
    }
}

export async function createTeacherAccount(teacherData) {
    try {
        const response = await SecurityUtils.secureFetch(`${API_BASE_URL}/teachers`, {
            method: 'POST',
            body: JSON.stringify(teacherData)
        });

        if (!response || !response.ok) {
            const errorData = await response?.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to create teacher account: ${response?.statusText || 'Network error'}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating teacher account:', error);
        throw error;
    }
}