document.addEventListener('DOMContentLoaded', () => {


    const PROJECT_ID = "capstoneproject-2b428";
    const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0"; 
    const ADMIN_COLLECTION = "admin"; 

    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminUsernameInput = document.getElementById('adminUsername');
    const adminPasswordInput = document.getElementById('adminPassword');
    const subTitleElement = document.getElementById('subTitle');

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
            const queryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
            const queryBody = {
                structuredQuery: {
                    from: [{ collectionId: ADMIN_COLLECTION }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: "username" },
                            op: "EQUAL",
                            value: { stringValue: enteredUsername }
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

            if (response.ok) {
                const results = await response.json();
                if (results && results.length > 0 && results[0].document) {
                    const adminDocFields = results[0].document.fields;
                    const storedPassword = adminDocFields.password?.stringValue;

                    // WARNING: Comparing plaintext passwords! In a real app, use hashed passwords.
                    if (storedPassword === enteredPassword) {
                        subTitleElement.textContent = "Admin login successful! Redirecting...";
                        subTitleElement.style.color = 'green';
                        console.log("Admin logged in successfully.");

                        // Store a flag indicating admin is logged in
                        sessionStorage.setItem('isAdminLoggedIn', 'true');

                        // Redirect to the create account page
                        window.location.href = 'home.html';
                    } else {
                        subTitleElement.textContent = "Invalid admin username or password.";
                        subTitleElement.style.color = 'red';
                    }
                } else {
                    subTitleElement.textContent = "Invalid admin username or password.";
                    subTitleElement.style.color = 'red';
                }
            } else {
                const errorData = await response.json();
                console.error("Error checking admin credentials:", errorData.error?.message || response.statusText);
                subTitleElement.textContent = "Error checking credentials. Please try again.";
                subTitleElement.style.color = 'red';
            }
        } catch (err) {
            console.error("Exception during admin login:", err);
            subTitleElement.textContent = "An error occurred. Please try again.";
            subTitleElement.style.color = 'red';
        }
    });
});