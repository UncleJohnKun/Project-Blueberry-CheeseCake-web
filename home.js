document.addEventListener('DOMContentLoaded', () => {
    console.log("home.js: DOMContentLoaded");

    // --- ADMIN LOGIN CHECK ---
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        alert("Admin access required. Please log in as admin first.");
        window.location.href = 'index.html';
        return;
    }

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

    const TEACHER_COLLECTION = "teacherData";
    const STUDENT_COLLECTION = "studentData";
    const FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER = "id";

    // --- DOM ELEMENTS (Home Page) ---
    const logoutButton = document.getElementById('logoutButton');
    const teacherListContainer = document.getElementById('teacherListContainer');
    const loadingMessage = document.getElementById('loadingMessage');
    const searchTeacherInput = document.getElementById('searchTeacherInput');

    // --- MODAL DOM ELEMENTS ---
    const teacherInfoModal = document.getElementById('teacherInfoModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const modalTeacherName = document.getElementById('modalTeacherName');
    const modalTeacherInfo = document.getElementById('modalTeacherInfo');
    // REMOVED: modalSubcollectionTitle and modalTeacherSubcollectionData references
    const modalStudentListTitle = document.getElementById('modalStudentListTitle');
    const modalStudentList = document.getElementById('modalStudentList');
    const searchStudentInput = document.getElementById('searchStudentInput');

    let allTeachersData = [];
    let allStudentsData = []; // Store all students for current teacher
    let CONFIG = null; // Will store secure configuration

    // Initialize secure configuration
    async function initializeApp() {
        try {
            CONFIG = await getSecureConfig();
            console.log("home.js: Secure config loaded successfully");

            // Now that config is loaded, fetch teachers
            await fetchAllTeachers();
        } catch (error) {
            console.error("home.js: Failed to load configuration:", error);
            if(loadingMessage) {
                loadingMessage.textContent = "Configuration Error: Failed to load settings.";
                loadingMessage.style.color = "red";
            }
        }
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
    if (searchStudentInput) {
        searchStudentInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.toLowerCase();
            filterAndDisplayStudents(searchTerm);
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

    // --- MOBILE TAB SWITCHING ---
    function initializeMobileTabs() {
        const mobileNavButtons = document.querySelectorAll('.mobile-nav-btn');
        const tabContents = document.querySelectorAll('.mobile-tab-content');

        mobileNavButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                // Remove active class from all buttons and contents
                mobileNavButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button
                button.classList.add('active');

                // Show corresponding content
                const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    // Initialize mobile tabs when DOM is ready
    initializeMobileTabs();

    // --- MODAL FUNCTIONS ---
    function openTeacherModal() {
        if (teacherInfoModal) {
            teacherInfoModal.style.display = 'flex';
            setTimeout(() => teacherInfoModal.classList.add('active'), 10);
        } else {
            console.error("home.js: teacherInfoModal element not found.");
        }
    }

    function closeTeacherModal() {
        if (teacherInfoModal) {
            teacherInfoModal.classList.remove('active');
            setTimeout(() => teacherInfoModal.style.display = 'none', 300);
        }
    }

    function formatFirestoreValue(fieldValue) {
        if (fieldValue === null || fieldValue === undefined) return "<span class='value-na'>N/A</span>";
        if (typeof fieldValue !== 'object') return String(fieldValue);
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

    function filterAndDisplayStudents(searchTerm = "") {
        if (allStudentsData.length === 0) {
            return; // No students to filter
        }

        const filtered = allStudentsData.filter(studentDoc => {
            if (!studentDoc.fields) return false;
            const fields = studentDoc.fields;
            const st = searchTerm.toLowerCase();

            const fullname = formatFirestoreValue(fields.fullname) || '';
            const email = formatFirestoreValue(fields.email) || '';
            const id = formatFirestoreValue(fields.id) || '';
            const username = formatFirestoreValue(fields.username) || '';

            return (
                fullname.toLowerCase().includes(st) ||
                email.toLowerCase().includes(st) ||
                id.toLowerCase().includes(st) ||
                username.toLowerCase().includes(st)
            );
        });

        renderStudentList(filtered);
    }

    function displayTeacherDataInModal(mainDocFields, studentDocs = []) {
        if (!modalTeacherName || !modalTeacherInfo || !modalStudentListTitle || !modalStudentList) {
            console.error("home.js: Essential modal DOM elements not found for display.");
            return;
        }

        // Store students data for filtering
        allStudentsData = studentDocs;

        // Clear search input
        if (searchStudentInput) {
            searchStudentInput.value = '';
        }

        modalTeacherName.textContent = formatFirestoreValue(mainDocFields.fullname) || 'Teacher Details';

        // Clear previous content
        modalTeacherInfo.innerHTML = '';

        // Create teacher info fields
        const fields = [
            { label: 'Full Name', value: formatFirestoreValue(mainDocFields.fullname) },
            { label: 'Email', value: formatFirestoreValue(mainDocFields.email) },
            { label: 'Teacher ID', value: formatFirestoreValue(mainDocFields.id) },
            { label: 'Username', value: formatFirestoreValue(mainDocFields.username) },
            { label: 'Password', value: formatFirestoreValue(mainDocFields.password), isPassword: true }
        ];

        fields.forEach(field => {
            if (field.value && field.value !== '<span class="value-na">N/A</span>') {
                const p = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = `${field.label}:`;
                p.appendChild(strong);

                if (field.isPassword) {
                    // Create password field with toggle visibility
                    const passwordContainer = document.createElement('span');
                    passwordContainer.style.display = 'inline-flex';
                    passwordContainer.style.alignItems = 'center';
                    passwordContainer.style.marginLeft = '8px';
                    passwordContainer.style.gap = '8px';
                    passwordContainer.style.whiteSpace = 'nowrap';

                    const passwordSpan = document.createElement('span');
                    passwordSpan.textContent = '••••••••';
                    passwordSpan.style.fontFamily = 'monospace';
                    passwordSpan.style.fontSize = '14px';
                    passwordSpan.style.minWidth = '80px';
                    passwordSpan.style.overflow = 'hidden';
                    passwordSpan.style.textOverflow = 'ellipsis';
                    passwordSpan.style.whiteSpace = 'nowrap';

                    const toggleButton = document.createElement('button');
                    toggleButton.textContent = 'Show';
                    toggleButton.style.background = 'var(--secondary-action)';
                    toggleButton.style.color = 'var(--accent-text)';
                    toggleButton.style.border = '1px solid var(--border-color)';
                    toggleButton.style.borderRadius = '3px';
                    toggleButton.style.padding = '3px 8px';
                    toggleButton.style.cursor = 'pointer';
                    toggleButton.style.fontSize = '11px';
                    toggleButton.style.fontWeight = 'bold';
                    toggleButton.style.minWidth = '45px';
                    toggleButton.style.height = '24px';
                    toggleButton.style.flexShrink = '0';
                    toggleButton.style.whiteSpace = 'nowrap';
                    toggleButton.style.display = 'flex';
                    toggleButton.style.alignItems = 'center';
                    toggleButton.style.justifyContent = 'center';
                    toggleButton.title = 'Toggle password visibility';

                    let isPasswordVisible = false;
                    const actualPassword = field.value;

                    toggleButton.addEventListener('click', () => {
                        isPasswordVisible = !isPasswordVisible;
                        passwordSpan.textContent = isPasswordVisible ? actualPassword : '••••••••';
                        toggleButton.textContent = isPasswordVisible ? 'Hide' : 'Show';
                    });

                    passwordContainer.appendChild(passwordSpan);
                    passwordContainer.appendChild(toggleButton);
                    p.appendChild(passwordContainer);
                } else {
                    p.innerHTML += ` ${field.value}`;
                }

                modalTeacherInfo.appendChild(p);
            }
        });

        modalStudentListTitle.textContent = `Students (${studentDocs.length})`;

        // Render all students initially
        renderStudentList(studentDocs);
    }

    function renderStudentList(studentsToDisplay) {
        if (!modalStudentList) return;

        modalStudentList.innerHTML = ''; // Clear previous students

        if (studentsToDisplay.length > 0) {
            studentsToDisplay.forEach(studentDoc => {
                const studentItemDiv = document.createElement('div');
                studentItemDiv.classList.add('student-item');

                const studentSummaryDiv = document.createElement('div');
                studentSummaryDiv.classList.add('student-summary');

                const studentFullName = studentDoc.fields?.fullname?.stringValue || 'Unknown Student';
                const studentDocName = studentDoc.name.split('/').pop();

                const summaryHeading = document.createElement('h4');
                summaryHeading.textContent = studentFullName;

                const toggleButton = document.createElement('button');
                toggleButton.classList.add('student-toggle-button');
                toggleButton.textContent = 'See More';

                studentSummaryDiv.appendChild(summaryHeading);
                studentSummaryDiv.appendChild(toggleButton);

                const studentDetailsDiv = document.createElement('div');
                studentDetailsDiv.classList.add('student-details');
                studentDetailsDiv.style.display = 'none'; // Initially hidden

                if (studentDoc.fields) {
                    const levelInfoContainer = document.createElement('div');
                    levelInfoContainer.classList.add('level-info-container');
                    levelInfoContainer.innerHTML = '<h4>Level Progress:</h4>';
                    studentDetailsDiv.appendChild(levelInfoContainer);

                    const otherDetailsDiv = document.createElement('div');
                    otherDetailsDiv.classList.add('other-details');
                    studentDetailsDiv.appendChild(otherDetailsDiv);

                    const levelData = {};
                    for (const fieldName in studentDoc.fields) {
                        if (fieldName.startsWith('level') && (fieldName.endsWith('Finish') || fieldName.endsWith('Score'))) {
                            const levelNumMatch = fieldName.match(/level(\d+)/);
                            if (levelNumMatch) {
                                const levelNum = parseInt(levelNumMatch[1]);
                                if (!levelData[levelNum]) {
                                    levelData[levelNum] = {};
                                }
                                if (fieldName.endsWith('Finish')) {
                                    levelData[levelNum].finish = studentDoc.fields[fieldName].booleanValue;
                                } else if (fieldName.endsWith('Score')) {
                                    levelData[levelNum].score = formatFirestoreValue(studentDoc.fields[fieldName]);
                                }
                            }
                        } else {
                            const p = document.createElement('p');
                            const strong = document.createElement('strong');
                            strong.textContent = (fieldName === FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER) ?
                                "Teacher's ID (in student record):" :
                                `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}:`;

                            p.appendChild(strong);
                            p.innerHTML += ` ${formatFirestoreValue(studentDoc.fields[fieldName])}`; // Add space
                            otherDetailsDiv.appendChild(p);
                        }
                    }

                    // Sort and display level data
                    const sortedLevels = Object.keys(levelData).map(Number).sort((a, b) => a - b);
                    if (sortedLevels.length > 0) {
                        const ul = document.createElement('ul');
                        ul.classList.add('level-list');
                        sortedLevels.forEach(levelNum => {
                            const score = levelData[levelNum].score !== undefined ? levelData[levelNum].score : 'N/A';
                            const finish = levelData[levelNum].finish !== undefined ? (levelData[levelNum].finish ? '✅' : '❌') : '❓';
                            const li = document.createElement('li');
                            li.innerHTML = `<strong>Level ${levelNum}</strong> Score: ${score} ${finish}`;
                            ul.appendChild(li);
                        });
                        levelInfoContainer.appendChild(ul);
                    } else {
                        const p = document.createElement('p');
                        p.textContent = 'No level data available.';
                        levelInfoContainer.appendChild(p);
                    }

                } else {
                    const p = document.createElement('p');
                    p.textContent = '(No fields in this student document)';
                    studentDetailsDiv.appendChild(p);
                }

                studentItemDiv.appendChild(studentSummaryDiv);
                studentItemDiv.appendChild(studentDetailsDiv);
                modalStudentList.appendChild(studentItemDiv);

                // Add event listener for the toggle button
                toggleButton.addEventListener('click', () => {
                    const isHidden = studentDetailsDiv.style.display === 'none';
                    studentDetailsDiv.style.display = isHidden ? 'block' : 'none';
                    toggleButton.textContent = isHidden ? 'See Less' : 'See More';
                });
            });
        } else {
            modalStudentList.innerHTML = `<p>No students found associated with this teacher.</p>`;
        }
    }

    async function handleTeacherItemClick(teacherDocPath) {
        console.log("home.js: handleTeacherItemClick - Fetching details for teacher path:", teacherDocPath);
        if (!modalTeacherInfo || !modalTeacherName || !modalStudentList || !modalStudentListTitle) {
            openTeacherModal();
            console.error("home.js: One or more essential modal elements are missing.");
            if(modalTeacherName) modalTeacherName.textContent = "Error: Modal structure incomplete.";
            return;
        }
        modalTeacherName.textContent = "Loading Teacher...";
        modalTeacherInfo.innerHTML = "<p class='loading-text'>Loading main teacher data...</p>";
        modalStudentList.innerHTML = "<p class='loading-text'>Waiting for teacher ID...</p>";
        openTeacherModal();

        let mainDocFields = null;
        let studentDocsAssociated = [];
        let teacherIdToQueryStudents = "";

        try {
            if (!CONFIG) {
                throw new Error("Configuration not loaded. Please refresh the page.");
            }

            const mainDocUrl = `https://firestore.googleapis.com/v1/${teacherDocPath}?key=${CONFIG.apiKey}`;
            const mainDocResponse = await fetch(mainDocUrl);
            if (!mainDocResponse.ok) {
                let errorText = mainDocResponse.statusText; try { const ed = await mainDocResponse.json(); errorText = ed.error?.message || errorText; } catch(e){}
                throw new Error(`Failed to fetch main teacher document (${mainDocResponse.status}): ${errorText}`);
            }
            const mainDocData = await mainDocResponse.json();
            mainDocFields = mainDocData.fields;
            if (!mainDocFields) throw new Error("Main teacher document has no fields or data is malformed.");

            teacherIdToQueryStudents = (mainDocFields.id?.stringValue || "").trim();

            // --- FETCH ASSOCIATED STUDENTS (Direct query on studentData) ---
            if (teacherIdToQueryStudents && STUDENT_COLLECTION && FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER) {
                modalStudentList.innerHTML = `<p class='loading-text'>Loading students for teacher ID: ${teacherIdToQueryStudents}...</p>`;
                const studentQueryUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents:runQuery?key=${CONFIG.apiKey}`;
                const studentQueryBody = {
                    structuredQuery: {
                        from: [{ collectionId: STUDENT_COLLECTION }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER },
                                op: "EQUAL",
                                value: { stringValue: teacherIdToQueryStudents }
                            }
                        },
                        limit: 200 // Adjust as needed
                    }
                };
                const studentResponse = await fetch(studentQueryUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studentQueryBody)
                });

                if (studentResponse.ok) {
                    const studentResults = await studentResponse.json();
                    if (studentResults && studentResults.length > 0) {
                        studentDocsAssociated = studentResults.map(result => result.document).filter(doc => doc);
                    }
                } else {
                    let errorTextStudent = studentResponse.statusText;
                    try { const ed = await studentResponse.json(); errorTextStudent = ed.error?.message || errorTextStudent; } catch (e) {}
                    console.error(`home.js: Error fetching students (${studentResponse.status}):`, errorTextStudent);
                    modalStudentList.innerHTML = `<p class="error-message">Error fetching students: ${errorTextStudent}</p>`;
                }
            } else if (!teacherIdToQueryStudents) {
                 modalStudentList.innerHTML = `<p>Cannot fetch students: Teacher ID is missing from teacher data.</p>`;
            } else {
                 modalStudentList.innerHTML = `<p>Student data configuration error (collection or field name missing).</p>`;
            }

            displayTeacherDataInModal(mainDocFields, studentDocsAssociated);

        } catch (error) {
            console.error("home.js: Error in handleTeacherItemClick:", error);
            if (modalTeacherName) modalTeacherName.textContent = 'Error Loading Details';
            if (modalTeacherInfo) modalTeacherInfo.innerHTML = `<p class='error-message'>${error.message}</p>`;
            if (modalStudentList) modalStudentList.innerHTML = `<p class="error-message">Could not load student data due to an error: ${error.message}</p>`;
        }
    }

    // --- MAIN LIST FUNCTIONS ---
    function renderTeacherList(teachersToDisplay) {
        if (!teacherListContainer) { console.error("home.js: teacherListContainer not found"); return; }
        teacherListContainer.innerHTML = '';
        if (teachersToDisplay.length === 0) {
            const p = document.createElement('p'); p.id = "loadingMessage"; p.classList.add("loading-text");
            p.textContent = "No teachers found."; teacherListContainer.appendChild(p); return;
        }
        teachersToDisplay.forEach(teacherDoc => {
            if (!teacherDoc || !teacherDoc.fields || !teacherDoc.name) return;
            const d = teacherDoc.fields; const id = formatFirestoreValue(d.id) || teacherDoc.name.split('/').pop();
            const name = formatFirestoreValue(d.fullname) || 'N/A'; const path = teacherDoc.name;
            const item = document.createElement('div'); item.classList.add('teacher-item-box');
            item.setAttribute('data-teacher-id', id); item.setAttribute('data-teacher-doc-path', path);
            item.innerHTML = `<span class="teacher-name">${name}</span><span class="teacher-detail"><strong>Email:</strong> ${formatFirestoreValue(d.email)}</span><span class="teacher-detail"><strong>ID:</strong> ${id}</span>${d.username ? `<span class="teacher-detail"><strong>Username:</strong> ${formatFirestoreValue(d.username)}</span>` : ''}`;
            item.addEventListener('click', () => { const p = item.getAttribute('data-teacher-doc-path'); if (p) handleTeacherItemClick(p); else alert("Error: No path.");});
            teacherListContainer.appendChild(item);
        });
    }

    function filterAndDisplayTeachers(searchTerm = "") {
        if (allTeachersData.length === 0 && loadingMessage && loadingMessage.textContent.startsWith("Fetching")) {}
        else if (allTeachersData.length === 0) { renderTeacherList([]); return; }
        const filtered = allTeachersData.filter(doc => {
            if (!doc.fields) return false; const t = doc.fields; const id = formatFirestoreValue(t.id) || doc.name.split('/').pop();
            const st = searchTerm.toLowerCase();
            return ((formatFirestoreValue(t.fullname) || '').toLowerCase().includes(st) ||
                    (formatFirestoreValue(t.email) || '').toLowerCase().includes(st) ||
                    (id || '').toLowerCase().includes(st) ||
                    (formatFirestoreValue(t.username) || '').toLowerCase().includes(st));
        });
        renderTeacherList(filtered);
    }

    async function fetchAllTeachers() {
        if (!teacherListContainer || !loadingMessage) {
            console.error("home.js: Teacher list container or loading message not found for fetchAllTeachers.");
            return;
        }
        loadingMessage.textContent = `Fetching teachers from "${TEACHER_COLLECTION}"...`;
        loadingMessage.style.display = 'block';
        teacherListContainer.innerHTML = ''; // Clear existing list
        teacherListContainer.appendChild(loadingMessage); // Add loading message to the container

        try {
            if (!CONFIG) throw new Error("Configuration not loaded. Please refresh the page.");
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/${TEACHER_COLLECTION}?key=${CONFIG.apiKey}&pageSize=300`;
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(()=>({ error: { message: "Failed to parse error JSON."} }));
                throw new Error(`Failed to fetch teachers (${response.status}): ${errorData.error?.message || response.statusText}`);
            }
            const data = await response.json();
            if (data.documents && data.documents.length > 0) {
                allTeachersData = data.documents.filter(doc => doc && doc.fields && doc.name);
                filterAndDisplayTeachers(); // This will replace the loading message
            } else {
                allTeachersData = [];
                loadingMessage.textContent = `No teachers found in the "${TEACHER_COLLECTION}" collection.`;
                // Keep loading message if no teachers, or call renderTeacherList([]) which also handles empty.
            }
        } catch (error) {
            console.error("home.js: Exception in fetchAllTeachers:", error);
            allTeachersData = [];
            if (loadingMessage) {
                loadingMessage.textContent = `Error loading teachers: ${error.message}`;
                loadingMessage.style.color = 'red';
            }
        }
    }

    // --- INITIALIZATION ---
    initializeApp();
});
