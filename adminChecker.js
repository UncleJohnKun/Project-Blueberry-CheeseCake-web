document.addEventListener('DOMContentLoaded', () => {
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminUsernameInput = document.getElementById('adminUsername');
    const adminPasswordInput = document.getElementById('adminPassword');
    const subTitleElement = document.getElementById('subTitle');

    // Clear any existing auth data when page loads
    sessionStorage.clear();

    // Secure configuration function
    async function getSecureConfig() {
        try {
            // Try server first
            const response = await fetch('/api/config');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('Server not available, using direct Firebase access');
        }

        // Fallback to direct Firebase (for development)
        return {
            projectId: 'capstoneproject-2b428',
            apiKey: 'AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop08'
        };
    }

    // Secure authentication function
    async function authenticateUser(username, password) {
        const config = await getSecureConfig();

        // Try server authentication first
        try {
            const serverResponse = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (serverResponse.ok) {
                const data = await serverResponse.json();
                return { success: true, isAdmin: true, data, method: 'server' };
            }
        } catch (error) {
            console.log('Server auth failed, trying direct Firebase');
        }

        // Fallback to direct Firebase authentication
        try {
            // Check admin collection
            const adminResult = await checkFirebaseAuth(config, 'admin', username, password);
            if (adminResult.success) {
                return { ...adminResult, isAdmin: true, method: 'firebase' };
            }

            // Check teacher collection
            const teacherResult = await checkFirebaseAuth(config, 'teacherData', username, password);
            if (teacherResult.success) {
                return { ...teacherResult, isAdmin: false, method: 'firebase' };
            }

            throw new Error('Invalid credentials');
        } catch (error) {
            throw new Error('Authentication failed: ' + error.message);
        }
    }

    // Firebase authentication helper
    async function checkFirebaseAuth(config, collection, username, password) {
        const queryUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery?key=${config.apiKey}`;
        const queryBody = {
            structuredQuery: {
                from: [{ collectionId: collection }],
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
            throw new Error('Network error');
        }

        const results = await response.json();
        if (!results || results.length === 0 || !results[0].document) {
            return { success: false };
        }

        const userDoc = results[0].document.fields;
        const storedPassword = userDoc.password?.stringValue;
        const userId = userDoc.id?.stringValue;

        // Check if password is hashed (bcrypt format)
        if (storedPassword && storedPassword.startsWith('$2b$')) {
            // For hashed passwords, we need server verification
            throw new Error('Hashed password requires server authentication');
        }

        // Direct comparison for non-hashed passwords (temporary fallback)
        if (storedPassword === password) {
            return {
                success: true,
                user: {
                    id: userId,
                    username: username,
                    fullname: userDoc.fullname?.stringValue
                }
            };
        }

        return { success: false };
    }

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
            const result = await authenticateUser(enteredUsername, enteredPassword);

            // Set session data
            if (result.isAdmin) {
                sessionStorage.setItem('isAdminLoggedIn', 'true');
                sessionStorage.setItem('userRole', 'admin');

                // Store authentication tokens if available (from server auth)
                if (result.data && result.data.accessToken) {
                    sessionStorage.setItem('authToken', result.data.accessToken);
                    sessionStorage.setItem('refreshToken', result.data.refreshToken);
                    if (result.data.csrfToken) {
                        sessionStorage.setItem('csrfToken', result.data.csrfToken);
                    }
                }
            } else {
                sessionStorage.setItem('isTeacherLoggedIn', 'true');
                sessionStorage.setItem('userRole', 'teacher');
                if (result.user && result.user.id) {
                    sessionStorage.setItem('teacherId', result.user.id);
                }

                // Store authentication tokens if available (from server auth)
                if (result.data && result.data.accessToken) {
                    sessionStorage.setItem('authToken', result.data.accessToken);
                    sessionStorage.setItem('refreshToken', result.data.refreshToken);
                    if (result.data.csrfToken) {
                        sessionStorage.setItem('csrfToken', result.data.csrfToken);
                    }
                }
            }

            subTitleElement.textContent = "Login successful! Redirecting...";
            subTitleElement.style.color = 'green';
            console.log(`${result.isAdmin ? "Admin" : "Teacher"} logged in successfully via ${result.method}`);

            // Redirect to appropriate portal
            setTimeout(() => {
                if (result.isAdmin) {
                    window.location.href = 'home.html';
                } else {
                    window.location.href = 'teacherPortal.html';
                }
            }, 1000);

        } catch (error) {
            console.error("Login failed:", error);

            if (error.message.includes('Hashed password')) {
                subTitleElement.textContent = "Please use the secure server for login.";
            } else if (error.message.includes('Invalid credentials')) {
                subTitleElement.textContent = "Invalid username or password.";
            } else if (error.message.includes('Network')) {
                subTitleElement.textContent = "Network error. Please check your connection.";
            } else {
                subTitleElement.textContent = "Login failed. Please try again.";
            }

            subTitleElement.style.color = 'red';
            adminPasswordInput.value = '';
        }
    });
});
