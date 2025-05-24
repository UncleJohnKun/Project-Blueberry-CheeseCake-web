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
            const response = await fetch(`${API_BASE_URL}/auth/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Login failed: ${response.statusText}`);
            }

            return await response.json();
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