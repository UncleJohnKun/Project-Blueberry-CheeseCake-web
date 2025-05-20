document.addEventListener('DOMContentLoaded', () => {
    // --- ADMIN LOGIN CHECK (Optional but good practice for protected pages) ---
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        alert("Admin access required. Please log in as admin first.");
        window.location.href = 'index.html'; // Redirect to admin login page
        return;
    }

    // --- CONFIGURATION 
    const PROJECT_ID = "capstoneproject-2b428";
    const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0";
    // No need for TEACHER_COLLECTION here as we get the full path

    // --- DOM ELEMENTS ---
    const teacherNameHeading = document.getElementById('teacherNameHeading');
    const mainTeacherInfoContent = document.getElementById('mainTeacherInfoContent');
    const subcollectionNameHeading = document.getElementById('subcollectionNameHeading');
    const subcollectionInfoContent = document.getElementById('subcollectionInfoContent');
    const backToHomeButton = document.getElementById('backToHomeButton');

    // --- HELPER: Format Firestore Value (same as in home.js) ---
    function formatFirestoreValue(fieldValue) {
        if (!fieldValue) return "<span class='value-na'>N/A</span>";
        if (fieldValue.stringValue !== undefined) return fieldValue.stringValue;
        if (fieldValue.integerValue !== undefined) return fieldValue.integerValue;
        if (fieldValue.doubleValue !== undefined) return fieldValue.doubleValue;
        if (fieldValue.booleanValue !== undefined) return fieldValue.booleanValue.toString();
        if (fieldValue.timestampValue !== undefined) return new Date(fieldValue.timestampValue).toLocaleString();
        if (fieldValue.mapValue !== undefined) {
            let mapHTML = "<div class='value-map'>";
            const fields = fieldValue.mapValue.fields;
            if (fields) {
                for (const key in fields) {
                    mapHTML += `<div><strong>${key}:</strong> ${formatFirestoreValue(fields[key])}</div>`;
                }
            } else {
                mapHTML += "{ Empty Map }";
            }
            mapHTML += "</div>";
            return mapHTML;
        }
        if (fieldValue.arrayValue !== undefined && fieldValue.arrayValue.values) {
            if (fieldValue.arrayValue.values.length === 0) return "[ Empty Array ]";
            let arrayHTML = "<ul class='value-array'>";
            fieldValue.arrayValue.values.forEach(val => {
                arrayHTML += `<li>${formatFirestoreValue(val)}</li>`;
            });
            arrayHTML += "</ul>";
            return arrayHTML;
        }
        if (fieldValue.nullValue !== undefined) return "<span class='value-null'>null</span>";
        return "<span class='value-unknown'>[Unknown Type]</span>";
    }


    // --- MAIN FUNCTION TO FETCH AND DISPLAY ---
    async function loadTeacherInformation() {
        const params = new URLSearchParams(window.location.search);
        const teacherDocPathFromURL = params.get('path'); // Expecting full path projects/.../teacherData/DOC_ID
        const teacherIdFromURL = params.get('id'); // Fallback or primary identifier

        if (!teacherDocPathFromURL && !teacherIdFromURL) {
            teacherNameHeading.textContent = "Error";
            mainTeacherInfoContent.innerHTML = "<p class='error-message'>No teacher document path or ID provided in the URL.</p>";
            subcollectionInfoContent.innerHTML = "";
            return;
        }

        // Construct the document path if only ID was provided (less ideal, but a fallback)
        let teacherDocPath = teacherDocPathFromURL;
        if (!teacherDocPath && teacherIdFromURL) {
            // This assumes teacherIdFromURL is the direct document ID under 'teacherData'
            teacherDocPath = `projects/${PROJECT_ID}/databases/(default)/documents/teacherData/${teacherIdFromURL}`;
            console.warn("Using constructed teacherDocPath from ID:", teacherDocPath);
        }


        let mainDocFields = null;
        let subcollectionNameToFetch = "";

        try {
            // 1. Fetch Main Teacher Document
            mainTeacherInfoContent.innerHTML = "<p>Loading main teacher data...</p>";
            const mainDocUrl = `https://firestore.googleapis.com/v1/${teacherDocPath}?key=${API_KEY}`;
            const mainDocResponse = await fetch(mainDocUrl);

            if (!mainDocResponse.ok) {
                const errorData = await mainDocResponse.json().catch(() => ({}));
                throw new Error(`Failed to fetch main teacher document (${mainDocResponse.status}): ${errorData.error?.message || mainDocResponse.statusText}`);
            }
            const mainDocData = await mainDocResponse.json();
            mainDocFields = mainDocData.fields;

            if (!mainDocFields) {
                throw new Error("Main teacher document data is missing or malformed.");
            }

            teacherNameHeading.textContent = formatFirestoreValue(mainDocFields.fullname) || "Teacher Information";

            // Display all main fields, including password
            mainTeacherInfoContent.innerHTML = ""; // Clear loading
            const fieldsToShow = [
                "fullname", "email", "id", "username", "password",
                "totalStudents", "timestamp"
                // Add any other top-level fields you want to display by default
            ];

            for (const fieldName of fieldsToShow) {
                const p = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: `;
                p.appendChild(strong);
                p.innerHTML += formatFirestoreValue(mainDocFields[fieldName]); // Append formatted value
                mainTeacherInfoContent.appendChild(p);
            }

            // Also display any other fields not in fieldsToShow (e.g. mapValue, arrayValue)
            for (const fieldName in mainDocFields) {
                if (!fieldsToShow.includes(fieldName)) {
                    const p = document.createElement('p');
                    const strong = document.createElement('strong');
                    strong.textContent = `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}: `;
                    p.appendChild(strong);
                    p.innerHTML += formatFirestoreValue(mainDocFields[fieldName]);
                    mainTeacherInfoContent.appendChild(p);
                }
            }


            // 2. Determine Subcollection Name and Fetch its Data
            // Using 'fullname' as the subcollection name (adjust if different)
            subcollectionNameToFetch = (mainDocFields.fullname?.stringValue || "").trim();
            // OR use ID: subcollectionNameToFetch = (mainDocFields.id?.stringValue || "").trim();
            // OR use Username: subcollectionNameToFetch = (mainDocFields.username?.stringValue || "").trim();


            if (!subcollectionNameToFetch || subcollectionNameToFetch.includes('/')) {
                console.warn("Invalid or undetermined subcollection name:", subcollectionNameToFetch);
                subcollectionNameHeading.textContent = "Subcollection Data (N/A)";
                subcollectionInfoContent.innerHTML = "<p>Could not determine a valid subcollection to fetch.</p>";
                return; // Stop if no valid subcollection name
            }

            subcollectionNameHeading.textContent = `Data from "${subcollectionNameToFetch}" Subcollection`;
            subcollectionInfoContent.innerHTML = `<p>Loading data from "${subcollectionNameToFetch}"...</p>`;

            const subcollectionPath = `${teacherDocPath}/${subcollectionNameToFetch}`;
            const subcollectionListUrl = `https://firestore.googleapis.com/v1/${subcollectionPath}?key=${API_KEY}&pageSize=100`;

            const subcollectionResponse = await fetch(subcollectionListUrl);
            subcollectionInfoContent.innerHTML = ""; // Clear loading

            if (subcollectionResponse.ok) {
                const subcollectionData = await subcollectionResponse.json();
                if (subcollectionData.documents && subcollectionData.documents.length > 0) {
                    subcollectionData.documents.forEach(subDoc => {
                        const subItemContainer = document.createElement('div');
                        subItemContainer.classList.add('sub-document-item');

                        const subDocNameEl = document.createElement('h4');
                        subDocNameEl.textContent = `Document: ${subDoc.name.split('/').pop()}`;
                        subItemContainer.appendChild(subDocNameEl);

                        if (subDoc.fields) {
                            for (const fieldName in subDoc.fields) {
                                const p = document.createElement('p');
                                const strong = document.createElement('strong');
                                strong.textContent = `${fieldName}: `;
                                p.appendChild(strong);
                                p.innerHTML += formatFirestoreValue(subDoc.fields[fieldName]);
                                subItemContainer.appendChild(p);
                            }
                        } else {
                            subItemContainer.innerHTML += "<p>(No fields in this subdocument)</p>";
                        }
                        subcollectionInfoContent.appendChild(subItemContainer);
                    });
                } else {
                    subcollectionInfoContent.innerHTML = `<p>No documents found in the "${subcollectionNameToFetch}" subcollection.</p>`;
                }
            } else if (subcollectionResponse.status === 404) {
                subcollectionInfoContent.innerHTML = `<p>Subcollection "${subcollectionNameToFetch}" not found.</p>`;
            } else {
                const errorData = await subcollectionResponse.json().catch(() => ({}));
                subcollectionInfoContent.innerHTML = `<p class='error-message'>Error fetching subcollection data (${subcollectionResponse.status}): ${errorData.error?.message || subcollectionResponse.statusText}</p>`;
            }

        } catch (error) {
            console.error("Error loading teacher information:", error);
            teacherNameHeading.textContent = "Error Loading Data";
            mainTeacherInfoContent.innerHTML = `<p class='error-message'>${error.message}</p>`;
            subcollectionNameHeading.textContent = "Subcollection Data (Error)";
            subcollectionInfoContent.innerHTML = `<p class='error-message'>Could not load subcollection data due to an error.</p>`;
        }
    }

    // --- INITIALIZATION ---
    loadTeacherInformation();

    // --- Back Button ---
    if(backToHomeButton) {
        // Not strictly necessary if it's an <a> tag, but good for consistency or if it were a <button>
        backToHomeButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default if it were a button submitting a form
            window.location.href = 'home.html';
        });
    }
});