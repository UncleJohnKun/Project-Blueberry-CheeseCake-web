document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const PROJECT_ID = "capstoneproject-2b428";
    const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0";
    const COLLECTION = "teacherData";

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
    const idInput = document.getElementById('id');
    const subTitleElement = document.getElementById('subTitle');
    const goBackButton = document.getElementById('goBackButton');

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

    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        subTitleElement.textContent = "Processing...";
        subTitleElement.style.color = '#bdc3c7';

        const email = emailInput.value.trim();
        const fullName = fullNameInput.value.trim();
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const rePassword = rePasswordInput.value;
        const id = idInput.value.trim();

        if (password !== rePassword) {
            subTitleElement.textContent = "Passwords do not match!";
            subTitleElement.style.color = 'red';
            return;
        }
        if (!email || !fullName || !username || !password || !id) {
            subTitleElement.textContent = "Please fill in all fields!";
            subTitleElement.style.color = 'red';
            return;
        }

        try {
            // 1. Check if email or ID already exists
            const checkUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}?key=${API_KEY}`;
            const checkResponse = await fetch(checkUrl);

            // ---- MODIFICATION START ----
            // Check if the HTTP request to fetch documents was successful
            if (!checkResponse.ok) {
                let errorMsg = 'Failed to fetch existing data for check.';
                try {
                    const errorData = await checkResponse.json(); // Try to get more details from Firestore error
                    errorMsg = errorData.error?.message || `HTTP error ${checkResponse.status}`;
                    console.error("Error fetching documents for check:", errorData);
                } catch (e) {
                    // If parsing errorData fails, use the statusText
                    console.error("Error fetching documents for check (and failed to parse error JSON):", checkResponse.statusText);
                    errorMsg = `HTTP error ${checkResponse.status}: ${checkResponse.statusText}`;
                }
                subTitleElement.textContent = "Error: " + errorMsg;
                subTitleElement.style.color = 'red';
                return; // Stop further processing
            }
            // ---- MODIFICATION END ----

            const checkData = await checkResponse.json();

            let emailExists = false;
            let idExists = false;

            // checkData.documents might be undefined if the collection is empty or has no documents
            if (checkData.documents && checkData.documents.length > 0) {
                for (const doc of checkData.documents) {
                    // ---- MODIFICATION START ----
                    // Ensure 'doc' and 'doc.fields' exist before trying to access sub-properties
                    // This handles cases where a document in Firestore might not have a 'fields' property
                    // (e.g., an empty document, or one only serving as a parent for subcollections).
                    if (doc && doc.fields) {
                        // Check for email field
                        if (doc.fields.email && doc.fields.email.stringValue === email) {
                            emailExists = true;
                        }
                        // Check for id field
                        if (doc.fields.id && doc.fields.id.stringValue === id) {
                            idExists = true;
                        }
                    } else {
                        // Optionally log documents that are skipped or seem malformed
                        console.warn('Document encountered without "fields" property during check:', doc ? doc.name : 'Undefined document object');
                    }
                    // ---- MODIFICATION END ----
                }
            }

            if (emailExists) {
                subTitleElement.textContent = "Email already exists!";
                subTitleElement.style.color = 'red';
                console.log("Email already exists!");
                return;
            }
            if (idExists) {
                subTitleElement.textContent = "ID already taken!";
                subTitleElement.style.color = 'red';
                console.log("ID already exists!");
                return;
            }

            // 2. If not exists, proceed to send teacher data
            const timestamp = new Date().toISOString();
            const documentPath = id;

            const firestoreData = {
                fields: {
                    email: { stringValue: email },
                    fullname: { stringValue: fullName },
                    username: { stringValue: username },
                    password: { stringValue: password },
                    id: { stringValue: id },
                    timestamp: { timestampValue: timestamp },
                    totalStudents: { integerValue: String(globalTotalStudents) },
                    rizal_questions: toFirestoreValue(globalRizalQuestions),
                    levelUnlocks: toFirestoreValue(globalLevelUnlocks)
                }
            };

            const createUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${documentPath}?key=${API_KEY}`;

            const createResponse = await fetch(createUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(firestoreData)
            });

            if (createResponse.ok) {
                const responseData = await createResponse.json();
                console.log("Data successfully stored in Firestore!", responseData);
                subTitleElement.textContent = "Account Created Successfully!";
                subTitleElement.style.color = 'green';
                signUpForm.reset();
            } else {
                const errorData = await createResponse.json();
                console.error("Error storing data:", errorData);
                subTitleElement.textContent = "Error creating account: " + (errorData.error?.message || 'Unknown error');
                subTitleElement.style.color = 'red';
            }

        } catch (error) {
            console.error("Request failed overall:", error); // Catching other potential errors (network, etc.)
            subTitleElement.textContent = "An error occurred. Please try again.";
            subTitleElement.style.color = 'red';
        }
    });

    goBackButton.addEventListener('click', () => {
        subTitleElement.textContent = "Navigation to 'Go Back' page (not implemented).";
        console.log("Go Back clicked");
    });
});