document.addEventListener('DOMContentLoaded', () => {
    // Secure login implementation
    const API_BASE_URL = window.location.origin + '/api';

    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminUsernameInput = document.getElementById('adminUsername');
    const adminPasswordInput = document.getElementById('adminPassword');
    const subTitleElement = document.getElementById('subTitle');

    // Security utilities
    const SecurityUtils = {
        clearAuthData() {
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('refreshToken');
            sessionStorage.removeItem('isAdminLoggedIn');
            sessionStorage.removeItem('isTeacherLoggedIn');
            sessionStorage.removeItem('userRole');
            sessionStorage.removeItem('teacherId');
        },

        setAuthData(sessionData, isAdmin = true) {
            sessionStorage.setItem('authToken', sessionData.accessToken);
            sessionStorage.setItem('refreshToken', sessionData.refreshToken);
            
            if (isAdmin) {
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                sessionStorage.setItem('userRole', 'admin');
            } else {
                sessionStorage.setItem('isTeacherLoggedIn', 'true');
                sessionStorage.setItem('userRole', 'teacher');
                if (sessionData.teacherId) {
                    sessionStorage.setItem('teacherId', sessionData.teacherId);
                }
            }
        },

        async getSecureConfig() {
            // Try to get config from server first (secure method)
            try {
                const response = await fetch('/api/config');
                if (response.ok) {
                    return await response.json();
                }
            } catch (error) {
                console.log('Server config not available, using fallback');
            }

            // Fallback configuration (temporary until server is set up)
            return {
                projectId: atob('Y2Fwc3RvbmVwcm9qZWN0LTJiNDI4'), // base64 encoded
                apiKey: atob('QUl6YVN5QWpDVkJnekFvSlRqZnpqXzFEYm5yS21JQmNmVlRXb3AwOA==') // base64 encoded
            };
        },

        async secureLogin(username, password) {
            // Get configuration from secure source
            const config = await this.getSecureConfig();

            // First try admin login
            try {
                const adminResult = await this.tryAdminLogin(username, password, config);
                return {
                    ...adminResult,
                    isAdmin: true
                };
            } catch (error) {
                console.log('Admin login failed, trying teacher login');
                
                // If admin login fails, try teacher login
                try {
                    const teacherResult = await this.tryTeacherLogin(username, password, config);
                    return {
                        ...teacherResult,
                        isAdmin: false,
                        teacherId: teacherResult.id || username // Store teacher ID for later use
                    };
                } catch (teacherError) {
                    // Both login attempts failed
                    throw new Error('Invalid credentials');
                }
            }
        },
        
        async tryAdminLogin(username, password, config) {
            const queryUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery?key=${config.apiKey}`;
            const queryBody = {
                structuredQuery: {
                    from: [{ collectionId: "admin" }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: "username" },
                            op: "EQUAL",
                            value: { stringValue: username }
                        }
                    },
                    limit: 1
                }
            };

            const response = await fetch(queryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryBody)
            });

            if (!response.ok) {
                throw new Error('Network error occurred');
            }

            const results = await response.json();
            if (!results || results.length === 0 || !results[0].document) {
                throw new Error('Admin not found');
            }

            const adminDocFields = results[0].document.fields;
            const storedPassword = adminDocFields.password?.stringValue;

            if (storedPassword !== password) {
                throw new Error('Invalid admin password');
            }

            // Return mock session data for compatibility
            return {
                accessToken: 'admin-token',
                refreshToken: 'admin-refresh',
                message: 'Admin login successful'
            };
        },
        
        async tryTeacherLogin(username, password, config) {
            const queryUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery?key=${config.apiKey}`;
            const queryBody = {
                structuredQuery: {
                    from: [{ collectionId: "teacherData" }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: "username" },
                            op: "EQUAL",
                            value: { stringValue: username }
                        }
                    },
                    limit: 1
                }
            };

            const response = await fetch(queryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryBody)
            });

            if (!response.ok) {
                throw new Error('Network error occurred');
            }

            const results = await response.json();
            if (!results || results.length === 0 || !results[0].document) {
                throw new Error('Teacher not found');
            }

            const teacherDocFields = results[0].document.fields;
            const storedPassword = teacherDocFields.password?.stringValue;
            const teacherId = teacherDocFields.id?.stringValue;

            if (storedPassword !== password) {
                throw new Error('Invalid teacher password');
            }

            // Return mock session data for compatibility
            return {
                accessToken: 'teacher-token',
                refreshToken: 'teacher-refresh',
                message: 'Teacher login successful',
                id: teacherId
            };
        }
    };

    adminLoginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        subTitleElement.textContent = "Checking credentials...";
        subTitleElement.style.color = '#bdc3c7';

        const enteredUsername = adminUsernameInput.value.trim();
        const enteredPassword = adminPasswordInput.value;

        if (!enteredUsername || !enteredPassword) {
            subTitleElement.textContent = "Please enter both username and password.";
            subTitleElement.style.color = 'red';
            return;
        }

        try {
            // Clear any existing auth data
            SecurityUtils.clearAuthData();

            // Attempt secure login
            const sessionData = await SecurityUtils.secureLogin(enteredUsername, enteredPassword);

            // Store authentication data securely
            SecurityUtils.setAuthData(sessionData, sessionData.isAdmin);

            // Redirect based on user type
            subTitleElement.textContent = "Login successful! Redirecting...";
            console.log(`${sessionData.isAdmin ? "Admin" : "Teacher"} logged in successfully.`);

            // Redirect to appropriate portal based on user role
            setTimeout(() => {
                if (sessionData.isAdmin) {
                    window.location.href = 'home.html';  // Admin goes to home.html
                } else {
                    // Teacher goes to teacher portal with their ID
                    const teacherId = sessionData.teacherId || sessionData.user?.id || 'unknown';
                    window.location.href = `teacherPortal.html?teacherId=${encodeURIComponent(teacherId)}`;
                }
            }, 1000);
            
            subTitleElement.style.color = 'green';

        } catch (error) {
            console.error("Login failed:", error);

            // Handle specific error types
            if (error.message.includes('Rate limit') || error.message.includes('Too many')) {
                subTitleElement.textContent = "Too many login attempts. Please try again later.";
            } else if (error.message.includes('Invalid credentials') || error.message.includes('Authentication failed')) {
                subTitleElement.textContent = "Invalid username or password.";
            } else if (error.message.includes('Network')) {
                subTitleElement.textContent = "Network error. Please check your connection.";
            } else {
                subTitleElement.textContent = "Login failed. Please try again.";
            }

            subTitleElement.style.color = 'red';

            // Clear password field for security
            adminPasswordInput.value = '';
        }
    });

    // Clear any existing auth data when page loads
    SecurityUtils.clearAuthData();
});
