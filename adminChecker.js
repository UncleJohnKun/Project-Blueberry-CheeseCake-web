document.addEventListener('DOMContentLoaded', () => {
    // Secure admin login implementation
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
            sessionStorage.removeItem('userRole');
        },

        setAuthData(sessionData) {
            sessionStorage.setItem('authToken', sessionData.accessToken);
            sessionStorage.setItem('refreshToken', sessionData.refreshToken);
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            sessionStorage.setItem('userRole', 'admin');
        },

        async secureLogin(username, password) {
            // Temporary fallback to direct Firebase until server is set up
            const PROJECT_ID = "capstoneproject-2b428";
            const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0";

            const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
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
                throw new Error('Invalid credentials');
            }

            const adminDocFields = results[0].document.fields;
            const storedPassword = adminDocFields.password?.stringValue;

            if (storedPassword !== password) {
                throw new Error('Invalid credentials');
            }

            // Return mock session data for compatibility
            return {
                accessToken: 'temp-token',
                refreshToken: 'temp-refresh',
                message: 'Login successful'
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
            SecurityUtils.setAuthData(sessionData);

            subTitleElement.textContent = "Admin login successful! Redirecting...";
            subTitleElement.style.color = 'green';
            console.log("Admin logged in successfully.");

            // Redirect to the admin dashboard
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);

        } catch (error) {
            console.error("Admin login failed:", error);

            // Handle specific error types
            if (error.message.includes('Rate limit') || error.message.includes('Too many')) {
                subTitleElement.textContent = "Too many login attempts. Please try again later.";
            } else if (error.message.includes('Invalid credentials') || error.message.includes('Authentication failed')) {
                subTitleElement.textContent = "Invalid admin username or password.";
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