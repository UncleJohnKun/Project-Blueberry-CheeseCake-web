document.addEventListener('DOMContentLoaded', () => {
    console.log("home.js: DOMContentLoaded");

    // --- ADMIN LOGIN CHECK ---
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        alert("Admin access required. Please log in as admin first.");
        window.location.href = 'index.html';
        return;
    }

    // --- CONFIGURATION ---
    const PROJECT_ID = "capstoneproject-2b428"; // YOUR ACTUAL PROJECT ID
    const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0"; // YOUR ACTUAL API KEY
    const TEACHER_COLLECTION = "teacherData";
    console.log("home.js: Config - PROJECT_ID:", PROJECT_ID, "API_KEY:", API_KEY ? "Loaded" : "MISSING!");


    // --- DOM ELEMENTS (Home Page) ---
    const logoutButton = document.getElementById('logoutButton');
    const teacherListContainer = document.getElementById('teacherListContainer');
    const loadingMessage = document.getElementById('loadingMessage'); // For the main list
    const searchTeacherInput = document.getElementById('searchTeacherInput');

    // --- MODAL DOM ELEMENTS ---
    const teacherInfoModal = document.getElementById('teacherInfoModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const modalTeacherName = document.getElementById('modalTeacherName');
    const modalTeacherInfo = document.getElementById('modalTeacherInfo');
    const modalSubcollectionTitle = document.getElementById('modalSubcollectionTitle');
    const modalTeacherSubcollectionData = document.getElementById('modalTeacherSubcollectionData');

    let allTeachersData = [];

    if (!PROJECT_ID || !API_KEY) {
        console.error("home.js: Firebase PROJECT_ID or API_KEY is not defined!");
        if(loadingMessage) {
            loadingMessage.textContent = "Configuration Error: Firebase settings missing.";
            loadingMessage.style.color = "red";
        }
        return; // Stop if config is bad
    }


    // --- EVENT LISTENERS ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            sessionStorage.removeItem('isAdminLoggedIn');
            alert('Admin logged out.');
            window.location.href = 'index.html';
        });
    }

    if (searchTeacherInput) {
        searchTeacherInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            filterAndDisplayTeachers(searchTerm);
        });
    }

    if (closeModalButton) closeModalButton.addEventListener('click', closeTeacherModal);
    if (teacherInfoModal) {
        teacherInfoModal.addEventListener('click', (event) => {
            if (event.target === teacherInfoModal) closeTeacherModal();
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && teacherInfoModal && teacherInfoModal.classList.contains('active')) {
            closeTeacherModal();
        }
    });

    // --- MODAL FUNCTIONS ---
    function openTeacherModal() {
        if (teacherInfoModal) {
            teacherInfoModal.style.display = 'flex';
            setTimeout(() => teacherInfoModal.classList.add('active'), 10); // For CSS transition
        } else {
            console.error("home.js: teacherInfoModal element not found.");
        }
    }

    function closeTeacherModal() {
        if (teacherInfoModal) {
            teacherInfoModal.classList.remove('active');
            setTimeout(() => teacherInfoModal.style.display = 'none', 300); // Match CSS transition
        }
    }

    function formatFirestoreValue(fieldValue) {
        if (fieldValue === null || fieldValue === undefined) return "<span class='value-na'>N/A</span>";
        if (typeof fieldValue !== 'object') return String(fieldValue); // Should not happen with REST API fields

        if (fieldValue.stringValue !== undefined) return fieldValue.stringValue;
        if (fieldValue.integerValue !== undefined) return String(fieldValue.integerValue);
        if (fieldValue.doubleValue !== undefined) return String(fieldValue.doubleValue);
        if (fieldValue.booleanValue !== undefined) return fieldValue.booleanValue.toString();
        if (fieldValue.timestampValue !== undefined) {
            try { return new Date(fieldValue.timestampValue).toLocaleString(); }
            catch (e) { return fieldValue.timestampValue + " (Invalid Date)"; }
        }
        if (fieldValue.mapValue !== undefined) {
            let mapHTML = "<div class='value-map'>";
            const fields = fieldValue.mapValue.fields;
            if (fields && Object.keys(fields).length > 0) {
                for (const key in fields) {
                    mapHTML += `<div><strong>${key}:</strong> ${formatFirestoreValue(fields[key])}</div>`;
                }
            } else { mapHTML += "{ Empty Map }"; }
            mapHTML += "</div>";
            return mapHTML;
        }
        if (fieldValue.arrayValue !== undefined && fieldValue.arrayValue.values) {
            if (fieldValue.arrayValue.values.length === 0) return "[ Empty Array ]";
            let arrayHTML = "<ul class='value-array'>";
            fieldValue.arrayValue.values.forEach(val => { arrayHTML += `<li>${formatFirestoreValue(val)}</li>`; });
            arrayHTML += "</ul>";
            return arrayHTML;
        }
        if (fieldValue.nullValue !== undefined) return "<span class='value-null'>null</span>";
        return "<span class='value-unknown'>[Unknown Field Type]</span>";
    }

    function displayTeacherDataInModal(mainDocFields, subcollectionDocs = [], dynamicSubcollectionName = "Details") {
        if (!modalTeacherName || !modalTeacherInfo || !modalTeacherSubcollectionData || !modalSubcollectionTitle) {
            console.error("home.js: Modal DOM elements not found for display.");
            return;
        }

        modalTeacherName.textContent = formatFirestoreValue(mainDocFields.fullname) || 'Teacher Details';
        modalTeacherInfo.innerHTML = `
            <p><strong>Email:</strong> ${formatFirestoreValue(mainDocFields.email)}</p>
            <p><strong>ID:</strong> ${formatFirestoreValue(mainDocFields.id)}</p>
            <p><strong>Username:</strong> ${formatFirestoreValue(mainDocFields.username)}</p>
            <p><strong>Full Name:</strong> ${formatFirestoreValue(mainDocFields.fullname)}</p>
            <p><strong>Password:</strong> ${formatFirestoreValue(mainDocFields.password)}</p>
            <p><strong>Total Students:</strong> ${formatFirestoreValue(mainDocFields.totalStudents)}</p>
            <p><strong>Timestamp:</strong> ${formatFirestoreValue(mainDocFields.timestamp)}</p>
        `;
        // Add any other main document fields you want to display directly

        modalSubcollectionTitle.textContent = `Data from "${dynamicSubcollectionName}" Subcollection:`;
        modalTeacherSubcollectionData.innerHTML = ''; // Clear previous

        if (subcollectionDocs.length > 0) {
            subcollectionDocs.forEach(subDoc => {
                const subItemDiv = document.createElement('div');
                subItemDiv.classList.add('sub-document-item'); // Changed class name from sub-item
                let itemHTML = `<h4>Document: ${subDoc.name.split('/').pop()}</h4>`; // Use h4 for subdoc name
                if (subDoc.fields) {
                    for (const fieldName in subDoc.fields) {
                        itemHTML += `<p><strong>${fieldName}:</strong> ${formatFirestoreValue(subDoc.fields[fieldName])}</p>`;
                    }
                } else {
                    itemHTML += '<p>(No fields in this subdocument)</p>';
                }
                subItemDiv.innerHTML = itemHTML;
                modalTeacherSubcollectionData.appendChild(subItemDiv);
            });
        } else {
            modalTeacherSubcollectionData.innerHTML = `<p>No data found in the "${dynamicSubcollectionName}" subcollection for this teacher, or the subcollection doesn't exist.</p>`;
        }
    }

    async function handleTeacherItemClick(teacherDocPath) {
        console.log("home.js: handleTeacherItemClick - Fetching details for teacher path:", teacherDocPath);
        if (!modalTeacherInfo || !modalTeacherSubcollectionData || !modalTeacherName) {
            console.error("home.js: Modal elements not ready for loading message.");
            openTeacherModal(); // Open modal even if elements are missing, to show it's trying
            return;
        }
        modalTeacherName.textContent = "Loading Teacher...";
        modalTeacherInfo.innerHTML = "<p class='loading-text'>Loading main teacher data...</p>";
        modalTeacherSubcollectionData.innerHTML = "<p class='loading-text'>Waiting for main data to determine subcollection...</p>";
        openTeacherModal();

        let mainDocFields = null;
        let subcollectionDocs = [];
        let subcollectionNameToFetch = "";

        try {
            const mainDocUrl = `https://firestore.googleapis.com/v1/${teacherDocPath}?key=${API_KEY}`;
            console.log("home.js: Fetching main doc from:", mainDocUrl);

            const mainDocResponse = await fetch(mainDocUrl);
            console.log("home.js: Main doc response status:", mainDocResponse.status);

            if (!mainDocResponse.ok) {
                let errorText = mainDocResponse.statusText;
                try { const errorData = await mainDocResponse.json(); errorText = errorData.error?.message || errorText; } catch (e) {}
                throw new Error(`Failed to fetch main teacher document (${mainDocResponse.status}): ${errorText}`);
            }
            const mainDocData = await mainDocResponse.json();
            console.log("home.js: Main doc data received:", JSON.stringify(mainDocData).substring(0, 500) + "..."); // Log snippet
            mainDocFields = mainDocData.fields;

            if (!mainDocFields) throw new Error("Main teacher document has no fields or data is malformed.");

            // --- !!! CRITICAL: DETERMINE SUBCOLLECTION NAME HERE !!! ---
            // Based on your example "les", "01", "aa" being both fullname/id AND subcollection name.
            // Adjust which field from mainDocFields you use to name the subcollection.
            subcollectionNameToFetch = (mainDocFields.fullname?.stringValue || "").trim(); // DEFAULT: Using fullname
            // Example: If subcollection name is always the 'id' field value from the parent document:
            // subcollectionNameToFetch = (mainDocFields.id?.stringValue || "").trim();
            console.log("home.js: Derived subcollection name to fetch (raw):", subcollectionNameToFetch);

            if (!subcollectionNameToFetch) {
                console.warn("home.js: Subcollection name derived as empty. Subcollection data will not be fetched.");
                displayTeacherDataInModal(mainDocFields, [], "N/A (Subcollection name undetermined)");
                return;
            }
            if (subcollectionNameToFetch.includes('/')) {
                console.error("home.js: Derived subcollection name contains invalid character '/':", subcollectionNameToFetch);
                displayTeacherDataInModal(mainDocFields, [], "N/A (Invalid subcollection name)");
                return;
            }

            console.log(`home.js: Attempting to fetch from subcollection: "${subcollectionNameToFetch}" under ${teacherDocPath}`);

            const subcollectionPath = `${teacherDocPath}/${subcollectionNameToFetch}`;
            const subcollectionListUrl = `https://firestore.googleapis.com/v1/${subcollectionPath}/documents?key=${API_KEY}&pageSize=100`;
            console.log("home.js: Fetching subcollection docs from:", subcollectionListUrl);

            const subcollectionResponse = await fetch(subcollectionListUrl);
            console.log("home.js: Subcollection response status:", subcollectionResponse.status);

            if (subcollectionResponse.ok) {
                const subcollectionData = await subcollectionResponse.json();
                console.log("home.js: Subcollection data received:", JSON.stringify(subcollectionData).substring(0,500) + "...");
                if (subcollectionData.documents && subcollectionData.documents.length > 0) {
                    subcollectionDocs = subcollectionData.documents;
                } else {
                    console.log(`home.js: No documents found in subcollection: "${subcollectionNameToFetch}"`);
                }
            } else if (subcollectionResponse.status === 404) {
                console.log(`home.js: Subcollection "${subcollectionNameToFetch}" not found (404).`);
            } else {
                let errorTextSub = subcollectionResponse.statusText;
                try { const errorDataSub = await subcollectionResponse.json(); errorTextSub = errorDataSub.error?.message || errorTextSub; } catch (e) {}
                console.error(`home.js: Error fetching subcollection "${subcollectionNameToFetch}" (${subcollectionResponse.status}):`, errorTextSub);
            }
            displayTeacherDataInModal(mainDocFields, subcollectionDocs, subcollectionNameToFetch);

        } catch (error) {
            console.error("home.js: Error in handleTeacherItemClick:", error);
            if (modalTeacherName) modalTeacherName.textContent = 'Error Loading Details';
            if (modalTeacherInfo) modalTeacherInfo.innerHTML = `<p class='error-message'>${error.message}</p>`;
            if (modalTeacherSubcollectionData) modalTeacherSubcollectionData.innerHTML = '<p class="error-message">Could not load subcollection data due to an error.</p>';
        }
    }

    // --- MAIN LIST FUNCTIONS ---
    function renderTeacherList(teachersToDisplay) {
        if (!teacherListContainer) {
            console.error("home.js: teacherListContainer not found in DOM");
            return;
        }
        teacherListContainer.innerHTML = '';

        if (teachersToDisplay.length === 0) {
            const noResultsMessage = document.createElement('p');
            noResultsMessage.id = "loadingMessage";
            noResultsMessage.classList.add("loading-text"); // Use class for styling
            noResultsMessage.textContent = "No teachers found matching your search or criteria.";
            teacherListContainer.appendChild(noResultsMessage);
            return;
        }

        teachersToDisplay.forEach(teacherDoc => {
            if (!teacherDoc || !teacherDoc.fields || !teacherDoc.name) {
                console.warn("home.js: Skipping teacher document due to missing fields or name:", teacherDoc);
                return;
            }
            const teacherData = teacherDoc.fields;
            const teacherId = formatFirestoreValue(teacherData.id) || teacherDoc.name.split('/').pop();
            const teacherFullname = formatFirestoreValue(teacherData.fullname) || 'N/A';
            const teacherDocPath = teacherDoc.name;

            const teacherItem = document.createElement('div');
            teacherItem.classList.add('teacher-item-box');
            teacherItem.setAttribute('data-teacher-id', teacherId);
            teacherItem.setAttribute('data-teacher-doc-path', teacherDocPath);

            teacherItem.innerHTML = `
                <span class="teacher-name">${teacherFullname}</span>
                <span class="teacher-detail">Email: ${formatFirestoreValue(teacherData.email)}</span>
                <span class="teacher-detail">ID: ${teacherId}</span>
                ${teacherData.username ? `<span class="teacher-detail">Username: ${formatFirestoreValue(teacherData.username)}</span>` : ''}
            `;

            teacherItem.addEventListener('click', () => {
                const docPathForNavigation = teacherItem.getAttribute('data-teacher-doc-path');
                if (docPathForNavigation) {
                    // Instead of navigating, we now open the modal with this teacher's data
                    handleTeacherItemClick(docPathForNavigation);
                } else {
                    console.error("home.js: Could not get document path for modal from teacher item.");
                    alert("Error: Could not get teacher details path.");
                }
            });
            teacherListContainer.appendChild(teacherItem);
        });
    }

    function filterAndDisplayTeachers(searchTerm = "") {
        if (allTeachersData.length === 0 && loadingMessage && loadingMessage.textContent.startsWith("Fetching")) {
            // Still loading
        } else if (allTeachersData.length === 0) {
             renderTeacherList([]);
             return;
        }

        const filteredTeachers = allTeachersData.filter(doc => {
            if (!doc.fields) return false;
            const teacher = doc.fields;
            const id = formatFirestoreValue(teacher.id) || doc.name.split('/').pop();
            const searchTermLower = searchTerm.toLowerCase();
            return (
                (formatFirestoreValue(teacher.fullname) || '').toLowerCase().includes(searchTermLower) ||
                (formatFirestoreValue(teacher.email) || '').toLowerCase().includes(searchTermLower) ||
                (id || '').toLowerCase().includes(searchTermLower) ||
                (formatFirestoreValue(teacher.username) || '').toLowerCase().includes(searchTermLower)
            );
        });
        renderTeacherList(filteredTeachers);
    }

    async function fetchAllTeachers() {
        if (!teacherListContainer || !loadingMessage) {
            console.error("home.js: Essential DOM elements for fetching teachers not found.");
            return;
        }
        loadingMessage.textContent = `Fetching teachers from "${TEACHER_COLLECTION}" collection...`;
        loadingMessage.style.display = 'block';
        teacherListContainer.innerHTML = ''; // Clear before appending loading message
        teacherListContainer.appendChild(loadingMessage);

        try {
            if (!PROJECT_ID || !API_KEY) {
                throw new Error("PROJECT_ID or API_KEY is undefined. Cannot fetch teachers.");
            }
            const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${TEACHER_COLLECTION}?key=${API_KEY}&pageSize=300`;
            console.log("home.js: Fetching teachers list from URL:", url);

            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: "Failed to parse error response as JSON."} }));
                throw new Error(`Failed to fetch teachers list (${response.status}): ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            if (data.documents && data.documents.length > 0) {
                allTeachersData = data.documents.filter(doc => doc && doc.fields && doc.name);
                filterAndDisplayTeachers(); // Initial display, will clear loading message via renderTeacherList
            } else {
                allTeachersData = [];
                loadingMessage.textContent = `No teachers found in the "${TEACHER_COLLECTION}" collection.`;
            }
        } catch (error) {
            console.error("home.js: Exception while fetching teachers list:", error);
            allTeachersData = [];
            if (loadingMessage) {
                loadingMessage.textContent = `Error loading teachers: ${error.message}`;
                loadingMessage.style.color = 'red';
            }
        }
    }

    // --- INITIALIZATION ---
    fetchAllTeachers();
});