document.addEventListener('DOMContentLoaded', () => {
    // --- ADMIN LOGIN CHECK ---
    // This MUST be the first thing that runs on this page.
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        alert("Admin access required. Please log in as admin first.");
        window.location.href = 'index.html'; // Redirect to admin login page
        return; // Stop further execution of this script
    }
    // If you want a logout button for admin:
    // const goBackButton = document.getElementById('goBackButton'); // Assuming you add this button
    // if (goBackButton) {
    //     goBackButton.addEventListener('click', () => {
    //         sessionStorage.removeItem('isAdminLoggedIn');
    //         alert('Admin logged out.');
    //         window.location.href = 'index.html';
    //     });
    // }


    // --- SECURE CONFIGURATION ---
    async function getSecureConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('Server config not available, using fallback');
        }

        // Fallback configuration (base64 encoded for basic obfuscation)
        return {
            projectId: atob('Y2Fwc3RvbmVwcm9qZWN0LTJiNDI4'),
            apiKey: atob('QUl6YVN5QWpDVkJnekFvSlRqZnpqXzFEYm5yS21JQmNmVlRXb3AwOA==')
        };
    }

    const COLLECTION = "teacherData";
    let CONFIG = null;

    const globalTotalStudents = 0;
    const globalRizalQuestions = {
        "level1": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level2": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level3": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level4": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level5": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level6": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level7": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level8": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level9": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level10": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level11": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ],
        "level12": [
            {
                "text": "",
                "choices": [
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false},
                    {"text": "", "correct": false}
                ]
            },
        ]
    }

    const globalLevelUnlocks = { level1: true, level2: false };

    // --- DOM ELEMENTS ---
    const signUpForm = document.getElementById('signUpForm');
    const emailInput = document.getElementById('email');
    const fullNameInput = document.getElementById('fullName');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rePasswordInput = document.getElementById('rePassword');
    const idInput = document.getElementById('id'); // Teacher ID
    const subTitleElement = document.getElementById('subTitle');

    // Settings modal elements
    const settingsLink = document.getElementById('settingsLink');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsButton = document.getElementById('closeSettingsButton');
    const logoutButton = document.getElementById('logoutButton');

    // Mobile sidebar elements
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    const mobileSidebarClose = document.getElementById('mobileSidebarClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');


    // --- SETTINGS MODAL FUNCTIONS ---
    function openSettingsModal() {
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            setTimeout(() => settingsModal.classList.add('active'), 10);
        } else {
            console.error("createAccount.js: settingsModal element not found.");
        }
    }

    function closeSettingsModal() {
        if (settingsModal) {
            settingsModal.classList.remove('active');
            setTimeout(() => settingsModal.style.display = 'none', 300);
        }
    }

    // --- EVENT LISTENERS ---
    // Logout functionality
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('isAdminLoggedIn');
            alert('Admin logged out.');
            window.location.href = 'index.html';
        });
    }

    // Mobile sidebar toggle functionality
    if (mobileSidebarToggle && sidebar && sidebarOverlay) {
        mobileSidebarToggle.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });

        // Mobile sidebar close button
        if (mobileSidebarClose) {
            mobileSidebarClose.addEventListener('click', () => {
                sidebar.classList.remove('mobile-open');
                sidebarOverlay.classList.remove('active');
            });
        }
    }

    // Settings modal functionality
    if (settingsLink && settingsModal) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            openSettingsModal();
        });
    }

    if (closeSettingsButton) {
        closeSettingsButton.addEventListener('click', closeSettingsModal);
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) closeSettingsModal();
        });
    }

    // Escape key functionality
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (settingsModal && settingsModal.classList.contains('active')) {
                closeSettingsModal();
            }
        }
    });

    // --- HELPER FUNCTION TO CONVERT JS VALUES TO FIRESTORE REST API FORMAT ---
    function toFirestoreValue(value) {
        if (typeof value === 'string') return { stringValue: value };
        if (typeof value === 'number') {
            if (Number.isInteger(value)) return { integerValue: String(value) };
            return { doubleValue: value };
        }
        if (typeof value === 'boolean') return { booleanValue: value };
        if (value instanceof Date) return { timestampValue: value.toISOString() };
        if (Array.isArray(value)) {
            return { arrayValue: { values: value.map(toFirestoreValue) } };
        }
        if (value === null) return { nullValue: null };
        if (typeof value === 'object' && value !== null) {
            const fields = {};
            for (const key in value) {
                if (Object.hasOwnProperty.call(value, key)) {
                    fields[key] = toFirestoreValue(value[key]);
                }
            }
            return { mapValue: { fields: fields } };
        }
        return { stringValue: String(value) };
    }


    // Initialize secure configuration and setup form submission
    async function initializeApp() {
        try {
            CONFIG = await getSecureConfig();
            console.log("createAccount.js: Secure config loaded successfully");
        } catch (error) {
            console.error("createAccount.js: Failed to load configuration:", error);
        }
    }

    // Add entrance animations to form elements
    const formRows = document.querySelectorAll('.form-row');
    const formActions = document.querySelector('.form-actions');

    // Animate form rows with staggered delays
    formRows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateY(20px)';
        setTimeout(() => {
            row.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, 200 + (index * 150));
    });

    // Animate form actions
    if (formActions) {
        formActions.style.opacity = '0';
        formActions.style.transform = 'translateY(20px)';
        setTimeout(() => {
            formActions.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            formActions.style.opacity = '1';
            formActions.style.transform = 'translateY(0)';
        }, 200 + (formRows.length * 150));
    }

    // Add focus animations to form inputs
    const formInputs = document.querySelectorAll('.form-group input');
    formInputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.style.transform = 'translateY(-2px)';
            input.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
        });

        input.addEventListener('blur', () => {
            input.style.transform = 'translateY(0)';
            input.style.boxShadow = '';
        });
    });

    // --- FORM SUBMISSION EVENT LISTENER ---
    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Ensure config is loaded
        if (!CONFIG) {
            CONFIG = await getSecureConfig();
        }

        const email = emailInput.value.trim();
        const fullName = fullNameInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const rePassword = rePasswordInput.value;
        const teacherId = idInput.value.trim(); // Teacher's chosen ID

        // Validations
        if (password !== rePassword) {
            alert("Passwords do not match!");
            return;
        }
        if (!email || !fullName || !username || !password || !teacherId) {
            alert("Please fill in all teacher account fields!");
            return;
        }
        // Prevent "admin" username for teachers if desired
        if (username.toLowerCase() === "admin") {
            alert("The username 'admin' is reserved.");
            return;
        }

        try {
            // 1. Check if email or Teacher ID already exists in COLLECTION
            const checkUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/${COLLECTION}?key=${CONFIG.apiKey}`;
            const checkResponse = await fetch(checkUrl);

            if (!checkResponse.ok) {
                let errorMsg = 'Failed to fetch existing teacher data.';
                try { const errorData = await checkResponse.json(); errorMsg = errorData.error?.message || `HTTP error ${checkResponse.status}`; } catch(e){}
                alert("Error: " + errorMsg);
                return;
            }

            const checkData = await checkResponse.json();
            let emailExists = false;
            let idExists = false;

            if (checkData.documents && checkData.documents.length > 0) {
                for (const doc of checkData.documents) {
                    if (doc && doc.fields) {
                        if (doc.fields.email && doc.fields.email.stringValue === email) {
                            emailExists = true;
                        }
                        // Assuming 'id' is the field for teacher ID in COLLECTION
                        if (doc.fields.id && doc.fields.id.stringValue === teacherId) {
                            idExists = true;
                        }
                    }
                }
            }

            if (emailExists) {
                alert("This Email already exists for a teacher!");
                return;
            }
            if (idExists) {
                alert("This Teacher ID is already taken!");
                return;
            }

            // 2. If not exists, proceed to send teacher data
            const timestamp = new Date().toISOString();
            const documentPath = teacherId; // Use the teacher's chosen ID as the Firestore Document ID for their record

            // Use server API to create teacher account with proper password hashing
            const teacherData = {
                email: email,
                fullname: fullName,
                username: username,
                password: password, // Will be hashed by server
                id: teacherId,
                totalStudents: globalTotalStudents,
                rizal_questions: globalRizalQuestions,
                levelUnlocks: globalLevelUnlocks
            };

            // Send to secure server endpoint
            const response = await fetch('/api/teachers/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teacherData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create teacher account');
            }

            console.log('✅ Teacher created successfully:', teacherId);
            alert("Teacher Account Created Successfully!");
            signUpForm.reset();

        } catch (error) {
            console.error("Request failed (teacher account creation):", error);
            alert("An error occurred. Please try again.");
        }
    });

    // --- DOWNLOAD GAME FUNCTIONALITY ---
    function initializeDownloadGame() {
        const downloadBtn = document.getElementById('downloadGameBtn');
        const downloadDropdown = document.getElementById('downloadDropdown');
        const downloadAndroid = document.getElementById('downloadAndroid');
        const downloadWindows = document.getElementById('downloadWindows');

        if (!downloadBtn || !downloadDropdown) return;

        // Toggle dropdown
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            downloadDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!downloadBtn.contains(e.target) && !downloadDropdown.contains(e.target)) {
                downloadDropdown.classList.remove('show');
            }
        });

        // Download handlers
        if (downloadAndroid) {
            downloadAndroid.addEventListener('click', (e) => {
                e.preventDefault();
                handleDownload('android');
                downloadDropdown.classList.remove('show');
            });
        }

        if (downloadWindows) {
            downloadWindows.addEventListener('click', (e) => {
                e.preventDefault();
                handleDownload('windows');
                downloadDropdown.classList.remove('show');
            });
        }
    }

    function handleDownload(platform) {
        // Define download URLs - replace these with actual download links
        const downloadUrls = {
            android: 'https://example.com/game.apk', // Replace with actual APK download URL
            windows: 'https://example.com/game.exe'  // Replace with actual EXE download URL
        };

        const url = downloadUrls[platform];
        if (!url) {
            alert(`Download for ${platform} is not available yet.`);
            return;
        }

        // Show download confirmation
        const platformName = platform === 'android' ? 'Android' : 'Windows';
        const fileType = platform === 'android' ? 'APK' : 'EXE';

        if (confirm(`Download ${platformName} version (${fileType} file)?`)) {
            // Create temporary link and trigger download
            const link = document.createElement('a');
            link.href = url;
            link.download = `game.${platform === 'android' ? 'apk' : 'exe'}`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success message
            setTimeout(() => {
                alert(`${platformName} download started! Check your downloads folder.`);
            }, 500);
        }
    }

    // Initialize download functionality
    initializeDownloadGame();

    // Initialize the app
    initializeApp();
});