// Direct Firestore access (similar to other parts of the app)
let CONFIG = null;

// Get secure configuration with fallback
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

// Helper function to convert Firestore values
function convertFirestoreValue(firestoreValue) {
    if (!firestoreValue) return null;

    if (firestoreValue.stringValue !== undefined) return firestoreValue.stringValue;
    if (firestoreValue.integerValue !== undefined) return parseInt(firestoreValue.integerValue);
    if (firestoreValue.doubleValue !== undefined) return parseFloat(firestoreValue.doubleValue);
    if (firestoreValue.booleanValue !== undefined) return firestoreValue.booleanValue;
    if (firestoreValue.timestampValue !== undefined) return firestoreValue.timestampValue;
    if (firestoreValue.nullValue !== undefined) return null;

    if (firestoreValue.mapValue && firestoreValue.mapValue.fields) {
        const result = {};
        for (const [key, value] of Object.entries(firestoreValue.mapValue.fields)) {
            result[key] = convertFirestoreValue(value);
        }
        return result;
    }

    if (firestoreValue.arrayValue && firestoreValue.arrayValue.values) {
        return firestoreValue.arrayValue.values.map(convertFirestoreValue);
    }

    return firestoreValue;
}

// Helper function to convert JS values to Firestore format
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

// Calculate student progress based on completed levels
function calculateStudentProgress(studentFields) {
    if (!studentFields) return 0;

    let completedLevels = 0;
    let totalLevels = 12; // Updated to 12 levels total

    // Count completed levels
    for (let i = 1; i <= totalLevels; i++) {
        const levelFinishField = `level${i}Finish`;
        if (studentFields[levelFinishField]?.booleanValue === true) {
            completedLevels++;
        }
    }

    return completedLevels / totalLevels;
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("teacherPortal.js: DOMContentLoaded");
    await initializeTeacherPortal();
});

async function initializeTeacherPortal() {
    try {
        console.log("Starting teacher portal initialization...");

        // Load configuration
        try {
            CONFIG = await getSecureConfig();
            console.log("Configuration loaded successfully");
        } catch (configError) {
            console.error("Configuration error:", configError);
            alert("Failed to load configuration. Please check your connection and try again.");
            return;
        }

        // --- AUTH CHECK ---
        const isLoggedIn = sessionStorage.getItem('isTeacherLoggedIn') === 'true' ||
                           sessionStorage.getItem('isAdminLoggedIn') === 'true';

        console.log("Authentication check:", { isLoggedIn });

        if (!isLoggedIn) {
            console.log("User not authenticated, redirecting to login");
            alert("Please log in to access the teacher portal.");
            window.location.href = 'index.html';
            return;
        }

        const isAdmin = sessionStorage.getItem('isAdminLoggedIn') === 'true';
        const isTeacher = sessionStorage.getItem('isTeacherLoggedIn') === 'true';

        console.log("User roles:", { isAdmin, isTeacher });

    // Redirect admins to their proper dashboard
    if (isAdmin && !isTeacher) {
        alert("Redirecting to Admin Dashboard...");
        window.location.href = 'home.html';
        return;
    }

    // Show/hide admin-only elements
    const adminOnlyElements = document.querySelectorAll('.admin-only');
    adminOnlyElements.forEach(el => {
        el.style.display = isAdmin ? 'block' : 'none';
    });

    // --- DOM ELEMENTS ---
    console.log("Getting DOM elements...");

    const logoutButton = document.getElementById('logoutButton');
    const studentTableBody = document.getElementById('studentTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const searchStudentInput = document.getElementById('searchStudentInput');
    const exportExcelButton = document.getElementById('exportExcelButton');
    const exportAccountButton = document.getElementById('exportAccountButton');

    // Check if essential elements exist
    if (!studentTableBody) {
        console.error("Critical DOM element missing: studentTableBody");
        alert("Page not loaded properly. Please refresh the page.");
        return;
    }

    if (!loadingMessage) {
        console.error("Critical DOM element missing: loadingMessage");
        alert("Page not loaded properly. Please refresh the page.");
        return;
    }

    console.log("Essential DOM elements found");

    // Add logout functionality
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                // Clear session data
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        });
        console.log("Logout functionality added");
    } else {
        console.warn("Logout button not found");
    }
    
    // Navigation elements and view containers will be retrieved in initializeUI()

    // Section filter
    const sectionFilter = document.getElementById('sectionFilter');

    // Mobile sidebar elements
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    const mobileSidebarClose = document.getElementById('mobileSidebarClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Settings modal elements
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsButton = document.getElementById('closeSettingsButton');
    const settingsLogoutButton = document.getElementById('settingsLogoutButton');

    // Add Student modal elements
    const addStudentModal = document.getElementById('addStudentModal');
    const closeAddStudentButton = document.getElementById('closeAddStudentButton');
    const studentCountInput = document.getElementById('studentCountInput');
    const sectionSelectInput = document.getElementById('sectionSelectInput');
    const createAccountsButton = document.getElementById('createAccountsButton');
    const addStudentError = document.getElementById('addStudentError');

    // Creating Accounts modal elements
    const creatingAccountsModal = document.getElementById('creatingAccountsModal');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const cancelCreationButton = document.getElementById('cancelCreationButton');

    // Section modal elements
    const addSectionModal = document.getElementById('addSectionModal');
    const closeAddSectionButton = document.getElementById('closeAddSectionButton');
    const sectionNameInput = document.getElementById('sectionNameInput');
    const sectionDescriptionInput = document.getElementById('sectionDescriptionInput');
    const createSectionButton = document.getElementById('createSectionButton');
    const addSectionError = document.getElementById('addSectionError');

    const editSectionModal = document.getElementById('editSectionModal');
    const closeEditSectionButton = document.getElementById('closeEditSectionButton');
    const editSectionNameInput = document.getElementById('editSectionNameInput');
    const editSectionDescriptionInput = document.getElementById('editSectionDescriptionInput');
    const updateSectionButton = document.getElementById('updateSectionButton');
    const editSectionError = document.getElementById('editSectionError');

    const addSectionButton = document.getElementById('addSectionButton');

    // --- TEACHER DATA ---
    let currentTeacherId = null;
    let teacherData = null;
    let allStudentsData = [];
    let sectionsData = [];
    let currentEditingSectionId = null;

    // --- INITIALIZE APP ---
    async function initializeApp() {
        try {
            console.log("initializeApp: Starting...");

            // Get current teacher ID from session storage
            currentTeacherId = sessionStorage.getItem('teacherId');
            console.log("initializeApp: Teacher ID from session:", currentTeacherId);

            // For admin users, allow them to view teacher portal with 'admin' ID
            if (!currentTeacherId && isAdmin) {
                console.log("Admin user accessing teacher portal, using 'admin' as teacher ID");
                currentTeacherId = 'admin';
            }

            // Try to get from URL parameters as fallback
            if (!currentTeacherId) {
                const params = new URLSearchParams(window.location.search);
                currentTeacherId = params.get('teacherId') || params.get('id');
                console.log("initializeApp: Teacher ID from URL:", currentTeacherId);
            }

            if (!currentTeacherId) {
                console.error("No teacher ID found. Please log in properly.");
                if (loadingMessage) {
                    loadingMessage.textContent = "Error: Teacher ID not found. Please log in properly.";
                    loadingMessage.style.color = "red";
                }
                throw new Error("Teacher ID not found");
            }

            console.log("Using teacher ID:", currentTeacherId);

            // Fetch teacher data
            console.log("initializeApp: Fetching teacher data...");
            await fetchTeacherData();
            console.log("initializeApp: Teacher data fetched successfully");

            // Fetch sections for this teacher
            await fetchSectionsForTeacher();

            // Fetch students for this teacher
            await fetchStudentsForTeacher();

            // Initialize UI components
            initializeUI();

        } catch (error) {
            console.error("teacherPortal.js: Failed to initialize:", error);
            loadingMessage.textContent = "Error: " + error.message;
            loadingMessage.style.color = "red";
        }
    }

    // --- FIRESTORE FUNCTIONS ---
    async function fetchTeacherData() {
        try {
            if (!CONFIG) {
                throw new Error("Configuration not loaded");
            }

            console.log("Fetching teacher data for ID:", currentTeacherId);

            // Query teachers by id field (not document ID)
            const queryUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents:runQuery?key=${CONFIG.apiKey}`;
            const queryBody = {
                structuredQuery: {
                    from: [{ collectionId: 'teacherData' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'id' },
                            op: "EQUAL",
                            value: { stringValue: currentTeacherId }
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
                throw new Error(`Failed to fetch teacher: ${response.statusText}`);
            }

            const results = await response.json();

            if (!results || results.length === 0) {
                throw new Error("Teacher not found");
            }

            const teacherDoc = results[0].document;
            if (!teacherDoc || !teacherDoc.fields) {
                throw new Error("Invalid teacher data");
            }

            // Convert Firestore format to regular object
            const rawLevelUnlocks = convertFirestoreValue(teacherDoc.fields.levelUnlocks) || {};

            teacherData = {
                id: teacherDoc.fields.id?.stringValue || currentTeacherId,
                fullname: teacherDoc.fields.fullname?.stringValue || 'Unknown Teacher',
                email: teacherDoc.fields.email?.stringValue || '',
                username: teacherDoc.fields.username?.stringValue || '',
                levelUnlocks: ensureAllLevels(rawLevelUnlocks), // Ensure all levels 1-12 exist (legacy)
                rizal_questions: convertFirestoreValue(teacherDoc.fields.rizal_questions) || {}
            };

            // Load all section-specific level unlocks
            Object.keys(teacherDoc.fields).forEach(fieldName => {
                if (fieldName.startsWith('levelUnlocks') && fieldName !== 'levelUnlocks') {
                    const sectionLevelUnlocks = convertFirestoreValue(teacherDoc.fields[fieldName]) || {};
                    teacherData[fieldName] = ensureAllLevels(sectionLevelUnlocks);
                }
            });

            console.log("Teacher data loaded:", teacherData);

            // Update page title with teacher name
            document.title = `${teacherData.fullname} - Teacher Portal`;

            // Update sidebar title
            const sidebarTitle = document.querySelector('.sidebar-title');
            if (sidebarTitle) {
                sidebarTitle.textContent = isAdmin ? 'Admin View: Teacher' : 'Teacher Portal';
            }

        } catch (error) {
            console.error("Error fetching teacher data:", error);
            throw error;
        }
    }

    async function fetchStudentsForTeacher() {
        try {
            loadingMessage.textContent = "Loading students...";

            // Make sure we have a valid teacher ID
            if (!currentTeacherId) {
                throw new Error("Teacher ID not found");
            }

            if (!CONFIG) {
                throw new Error("Configuration not loaded");
            }

            console.log("Fetching students for teacher ID:", currentTeacherId);

            // Query students by id field (students have id matching teacher's ID)
            const queryUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents:runQuery?key=${CONFIG.apiKey}`;
            const queryBody = {
                structuredQuery: {
                    from: [{ collectionId: 'studentData' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'id' },
                            op: "EQUAL",
                            value: { stringValue: currentTeacherId }
                        }
                    },
                    limit: 200
                }
            };

            const response = await fetch(queryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryBody)
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch students: ${response.statusText}`);
            }

            const results = await response.json();
            console.log("Raw student results:", results);

            allStudentsData = [];

            if (results && results.length > 0) {
                results.forEach(result => {
                    if (result.document && result.document.fields) {
                        const studentDoc = result.document;
                        // Extract the actual document ID from the document path
                        const documentId = studentDoc.name.split('/').pop();

                        const studentData = {
                            id: studentDoc.fields.id?.stringValue || 'N/A',
                            documentId: documentId, // Store the actual Firestore document ID
                            fullname: studentDoc.fields.fullname?.stringValue || 'Unknown',
                            username: studentDoc.fields.username?.stringValue || 'N/A',
                            email: studentDoc.fields.email?.stringValue || 'N/A',
                            password: studentDoc.fields.password?.stringValue || 'N/A',
                            teacherID: studentDoc.fields.teacherID?.stringValue || studentDoc.fields.id?.stringValue || 'N/A',
                            section: studentDoc.fields.section?.stringValue || 'No Section',
                            timestamp: studentDoc.fields.timestamp?.timestampValue || studentDoc.fields.timestamp?.stringValue || null,
                            progress: calculateStudentProgress(studentDoc.fields),
                            lastActive: studentDoc.fields.timestamp?.timestampValue || studentDoc.fields.timestamp?.stringValue || null
                        };

                        // Add level data from Firebase (updated to 12 levels)
                        for (let i = 1; i <= 12; i++) {
                            // Extract level finish status
                            if (studentDoc.fields[`level${i}Finish`] !== undefined) {
                                studentData[`level${i}Finish`] = studentDoc.fields[`level${i}Finish`].booleanValue || false;
                            }

                            // Extract level score
                            if (studentDoc.fields[`level${i}Score`] !== undefined) {
                                studentData[`level${i}Score`] = studentDoc.fields[`level${i}Score`].integerValue ||
                                                               studentDoc.fields[`level${i}Score`].doubleValue || 0;
                            }

                            // Extract level date finished if available
                            if (studentDoc.fields[`level${i}DateFinished`] !== undefined) {
                                studentData[`level${i}DateFinished`] = studentDoc.fields[`level${i}DateFinished`].timestampValue ||
                                                                       studentDoc.fields[`level${i}DateFinished`].stringValue || null;
                            }
                        }

                        allStudentsData.push(studentData);
                    }
                });
            }

            console.log("Students loaded:", allStudentsData.length);

            // Set initial filtered students and render the student list
            filteredStudents = allStudentsData;
            renderStudentList(allStudentsData);

        } catch (error) {
            console.error("Error fetching students:", error);
            loadingMessage.textContent = "Error loading students: " + error.message;
            loadingMessage.style.color = "red";
        }
    }

    // --- PAGINATION VARIABLES ---
    let currentPage = 1;
    const studentsPerPage = 10;
    let filteredStudents = [];

    // --- SORTING VARIABLES ---
    let currentSortField = '';
    let currentSortDirection = 'asc'; // 'asc' or 'desc'

    // --- SORTING FUNCTIONS ---
    function sortStudents(students, field, direction) {
        return [...students].sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];

            // Handle different data types
            if (field === 'progress') {
                aValue = aValue || 0;
                bValue = bValue || 0;
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = (bValue || '').toLowerCase();
            }

            // Compare values
            if (aValue < bValue) {
                return direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    function handleColumnSort(field) {
        // Toggle direction if same field, otherwise start with ascending
        if (currentSortField === field) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortField = field;
            currentSortDirection = 'asc';
        }

        // Update header indicators
        updateSortIndicators();

        // Sort and render the current filtered students
        const sortedStudents = sortStudents(filteredStudents, currentSortField, currentSortDirection);
        currentPage = 1; // Reset to first page when sorting
        renderStudentList(sortedStudents);
    }

    function updateSortIndicators() {
        // Remove all sort classes
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
        });

        // Add sort class to current sorted column
        if (currentSortField) {
            const currentHeader = document.querySelector(`[data-sort="${currentSortField}"]`);
            if (currentHeader) {
                currentHeader.classList.add(`sort-${currentSortDirection}`);
            }
        }
    }

    // --- RENDER FUNCTIONS ---
    function renderStudentList(students) {
        if (!studentTableBody) {
            console.error("Student table body element not found");
            return;
        }

        // Always clear table before rendering
        studentTableBody.innerHTML = '';

        if (!students || students.length === 0) {
            loadingMessage.textContent = "No students found.";
            updatePaginationControls(0);
            return;
        }

        loadingMessage.style.display = 'none';
        filteredStudents = students;

        // Calculate pagination
        const totalPages = Math.ceil(students.length / studentsPerPage);
        const startIndex = (currentPage - 1) * studentsPerPage;
        const endIndex = startIndex + studentsPerPage;
        const studentsToShow = students.slice(startIndex, endIndex);

        console.log(`Pagination: ${students.length} total students, ${totalPages} pages, showing ${studentsToShow.length} students on page ${currentPage}`);

        studentsToShow.forEach(student => {
            try {
                const row = document.createElement('tr');

                // Set initial hidden state for animation
                row.style.opacity = '0';
                row.style.transform = 'translateY(20px)';

                // Calculate progress percentage (handle missing data gracefully)
                const progress = student.progress || 0;
                const progressPercent = Math.round(progress * 100);

                // Sanitize student data for safe display (with fallback)
                const escapeHtml = (text) => {
                    if (typeof text !== 'string') return text;
                    return text.replace(/[&<>"']/g, (s) => ({
                        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
                    }[s]));
                };
                const safeStudentData = {
                    id: escapeHtml(student.id || ''),
                    fullname: escapeHtml(student.fullname || 'Unknown'),
                    username: escapeHtml(student.username || 'N/A'),
                    section: escapeHtml(student.section || 'No Section')
                };

                // Always clickable
                const nameCellContent = `<a href="#" class="student-name-link" data-id="${safeStudentData.id}" data-student='${escapeHtml(JSON.stringify(student))}'>${safeStudentData.fullname}</a>`;

                row.innerHTML = `
                    <td>${nameCellContent}</td>
                    <td>${safeStudentData.username}</td>
                    <td>${safeStudentData.section}</td>
                    <td>
                        <div class="progress-display">
                            <div class="progress-percentage">${progressPercent}%</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <button class="button small edit-student" data-id="${safeStudentData.id}" data-student='${escapeHtml(JSON.stringify(student))}'>Edit</button>
                    </td>
                `;

                // Always add event listener
                const nameLink = row.querySelector('.student-name-link');
                if (nameLink) {
                    nameLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        viewStudentDetails(student.id, student);
                    });
                }

                studentTableBody.appendChild(row);
            } catch (err) {
                console.error("Error rendering student row:", err, student);
            }
        });

        // Update pagination controls
        updatePaginationControls(totalPages);

        // Scope event listeners to studentTableBody only
        Array.from(studentTableBody.querySelectorAll('.student-name-link')).forEach(link => {
            link.onclick = function(e) {
                e.preventDefault();
                const studentId = this.getAttribute('data-id');
                const studentData = this.getAttribute('data-student');
                if (studentId && studentData) {
                    let parsedData;
                    try {
                        const unescaped = studentData
                            .replace(/&quot;/g, '"')
                            .replace(/&#039;/g, "'")
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&');
                        parsedData = JSON.parse(unescaped);
                    } catch (err) {
                        parsedData = JSON.parse(studentData);
                    }
                    viewStudentDetails(studentId, parsedData);
                }
            };
        });

        Array.from(studentTableBody.querySelectorAll('.edit-student')).forEach(btn => {
            btn.onclick = async function(e) {
                const studentId = this.getAttribute('data-id');
                const studentData = this.getAttribute('data-student');
                if (studentId && studentData) {
                    await editStudentDetails(studentId, JSON.parse(studentData.replace(/&apos;/g, "'")));
                }
            };
        });

        // Add entrance animations to student rows (fixed)
        const studentRows = studentTableBody.querySelectorAll('tr');
        animateElements(studentRows, 60);

        // Add hover animations after rendering (with delay to avoid conflicts)
        setTimeout(() => {
            addHoverAnimations();
        }, studentRows.length * 60 + 150);
    }

    function updatePaginationControls(totalPages) {
        console.log(`updatePaginationControls called with totalPages: ${totalPages}`);
        let paginationContainer = document.getElementById('paginationContainer');

        if (!paginationContainer) {
            // Create pagination container if it doesn't exist
            paginationContainer = document.createElement('div');
            paginationContainer.id = 'paginationContainer';
            paginationContainer.className = 'pagination-container';

            // Insert after the student table
            const studentTable = document.querySelector('.table-container');
            if (studentTable) {
                studentTable.parentNode.insertBefore(paginationContainer, studentTable.nextSibling);
                console.log('Pagination container created and inserted');
            } else {
                console.log('Student table container not found - trying alternative selectors');
                // Try alternative locations
                const contentContainer = document.querySelector('.content-container');
                if (contentContainer) {
                    contentContainer.appendChild(paginationContainer);
                    console.log('Pagination container added to content container');
                }
            }
        }

        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            console.log('Hiding pagination - only 1 page or less');
            return;
        }

        let paginationHTML = '<div class="pagination">';

        // Previous button
        if (currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${currentPage - 1})">Previous</button>`;
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHTML += `<button class="pagination-btn ${activeClass}" onclick="changePage(${i})">${i}</button>`;
        }

        // Next button
        if (currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="changePage(${currentPage + 1})">Next</button>`;
        }

        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }

    // Make changePage function global so it can be called from onclick
    window.changePage = function(page) {
        currentPage = page;
        renderStudentList(filteredStudents);
    };

    function renderQuestionsView() {
        const levelTabs = document.getElementById('levelTabs');
        const questionsContainer = document.getElementById('questionsContainer');

        if (!levelTabs || !questionsContainer) return;

        // Clear existing content
        levelTabs.innerHTML = '';
        questionsContainer.innerHTML = '';

        // Create header with Add Question button
        const headerHTML = `
            <div class="questions-header">
                <h2>Question Management</h2>
                <button id="addQuestionButton" class="button primary">Add Question</button>
            </div>
            <div id="questionsContent" class="questions-content">
                <p>Select a level to view questions</p>
            </div>
        `;
        questionsContainer.innerHTML = headerHTML;

        // Create organized level tabs container
        const tabsContainerHTML = `
            <div class="level-tabs-container">
                <div class="level-tabs-grid" id="levelTabsGrid">
                    <!-- Level tabs will be inserted here -->
                </div>
            </div>
        `;
        levelTabs.innerHTML = tabsContainerHTML;

        const levelTabsGrid = document.getElementById('levelTabsGrid');

        // Create level tabs for all levels 1-12 in organized grid
        for (let i = 1; i <= 12; i++) {
            const level = `level${i}`;
            const questions = teacherData?.rizal_questions?.[level] || [];
            const questionCount = questions.length;

            const tab = document.createElement('button');
            tab.classList.add('level-tab');
            if (i === 1) tab.classList.add('active');
            tab.textContent = `Level ${i} (${questionCount})`;
            tab.dataset.level = level;

            tab.addEventListener('click', () => {
                document.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                loadQuestionsForLevel(level);
            });

            levelTabsGrid.appendChild(tab);
        }

        // Add event listener for Add Question button with a small delay to ensure DOM is ready
        setTimeout(() => {
            const addQuestionButton = document.getElementById('addQuestionButton');
            if (addQuestionButton) {
                addQuestionButton.addEventListener('click', () => {
                    const activeLevel = document.querySelector('.level-tab.active')?.getAttribute('data-level') || 'level1';
                    showAddQuestionModal(activeLevel);
                });
                console.log("Add Question button event listener attached successfully");
            } else {
                console.error("Add Question button not found!");
            }
        }, 100);

        // Load questions for first level
        loadQuestionsForLevel('level1');
    }

    async function loadQuestionsForLevel(level) {
        const questionsContent = document.getElementById('questionsContent');
        if (!questionsContent) return;

        questionsContent.innerHTML = '<p>Loading questions...</p>';

        try {
            const questions = teacherData?.rizal_questions?.[level] || [];

            if (questions.length === 0) {
                questionsContent.innerHTML = `
                    <div class="no-questions">
                        <p>No questions found for ${level.replace('level', 'Level ')}.</p>
                        <p>Click "Add Question" to create your first question.</p>
                    </div>
                `;
                return;
            }

            questionsContent.innerHTML = questions.map((question, index) => `
                <div class="question-card" data-level="${level}" data-index="${index}">
                    <div class="question-header">
                        <h4>Question ${index + 1}</h4>
                        <div class="question-actions">
                            <button class="button secondary small edit-question" data-level="${level}" data-index="${index}">Edit</button>
                            <button class="button danger small delete-question" data-level="${level}" data-index="${index}">Delete</button>
                        </div>
                    </div>
                    <div class="question-content">
                        <p class="question-text"><strong>Question:</strong> ${question.text || 'No question text'}</p>
                        <div class="choices-list">
                            ${question.choices?.map((choice, choiceIndex) => `
                                <div class="choice-item ${choice.correct ? 'correct' : ''}">
                                    <span class="choice-letter">${String.fromCharCode(65 + choiceIndex)}.</span>
                                    <span class="choice-text">${choice.text || 'No choice text'}</span>
                                    ${choice.correct ? '<span class="correct-indicator">✓</span>' : ''}
                                </div>
                            `).join('') || '<p>No choices available</p>'}
                        </div>
                    </div>
                </div>
            `).join('');

            // Add entrance animations to question cards
            const questionCards = questionsContent.querySelectorAll('.question-card');
            animateElements(questionCards, 150);

            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-question').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const level = e.target.getAttribute('data-level');
                    const index = parseInt(e.target.getAttribute('data-index'));
                    editQuestion(level, index);
                });
            });

            document.querySelectorAll('.delete-question').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const level = e.target.getAttribute('data-level');
                    const index = parseInt(e.target.getAttribute('data-index'));
                    deleteQuestion(level, index);
                });
            });

        } catch (error) {
            console.error("Error loading questions:", error);
            questionsContent.innerHTML = `<p class="error">Error loading questions: ${error.message}</p>`;
        }
    }

    function renderLevelsView() {
        const levelsContainer = document.getElementById('levelsContainer');
        const loadingLevels = document.getElementById('loadingLevels');
        const levelUnlockGrid = document.getElementById('levelUnlockGrid');

        if (!levelsContainer || !levelUnlockGrid) return;

        loadingLevels.style.display = 'none';
        levelUnlockGrid.innerHTML = '';

        // Remove any existing section selector to avoid duplicates
        const existingSectionSelector = levelsContainer.querySelector('.section-selector-container');
        if (existingSectionSelector) {
            existingSectionSelector.remove();
        }

        // Add section selector for level management at the top
        const sectionSelectorContainer = document.createElement('div');
        sectionSelectorContainer.className = 'section-selector-container';
        sectionSelectorContainer.innerHTML = `
            <div class="section-selector-header">
                <h3>Select Section for Level Management</h3>
                <select id="levelManagementSectionSelect" class="section-select">
                    <option value="">Select a section...</option>
                </select>
            </div>
        `;
        // Insert at the very beginning of the container
        levelsContainer.insertBefore(sectionSelectorContainer, levelsContainer.firstChild);

        // Populate section dropdown
        const sectionSelect = sectionSelectorContainer.querySelector('#levelManagementSectionSelect');
        if (sectionsData && sectionsData.length > 0) {
            sectionsData.forEach(section => {
                const option = document.createElement('option');
                option.value = section.name;
                option.textContent = section.name;
                sectionSelect.appendChild(option);
            });
        } else {
            sectionSelect.innerHTML = '<option value="">No sections available</option>';
        }

        // Add event listener for section selection
        sectionSelect.addEventListener('change', function() {
            const selectedSection = this.value;
            if (selectedSection) {
                renderLevelUnlocksForSection(selectedSection);
            } else {
                // Clear level unlocks display
                const existingLevelCards = levelUnlockGrid.querySelectorAll('.level-card');
                existingLevelCards.forEach(card => card.remove());
                const saveButton = document.getElementById('saveLevelChanges');
                if (saveButton) saveButton.style.display = 'none';
            }
        });
    }

    function renderLevelUnlocksForSection(sectionName) {
        const levelUnlockGrid = document.getElementById('levelUnlockGrid');
        if (!levelUnlockGrid) return;

        // Remove existing level cards
        const existingLevelCards = levelUnlockGrid.querySelectorAll('.level-card');
        existingLevelCards.forEach(card => card.remove());

        // Get section-specific level unlocks
        const sectionFieldName = `levelUnlocks${sectionName}`;
        const sectionLevelUnlocks = teacherData?.[sectionFieldName] || {};

        // Ensure we have all levels 1-12, fill gaps if needed
        const completeLevelUnlocks = ensureAllLevels(sectionLevelUnlocks);

        // Update teacherData with complete level unlocks for this section
        if (teacherData) {
            teacherData[sectionFieldName] = completeLevelUnlocks;
        }

        // Create level cards for levels 1-12
        for (let i = 1; i <= 12; i++) {
            const level = `level${i}`;
            const isUnlocked = completeLevelUnlocks[level] || false;

            const levelCard = document.createElement('div');
            levelCard.classList.add('level-card');

            levelCard.innerHTML = `
                <div class="level-card-header">
                    <h3 class="level-card-title">Level ${i}</h3>
                    <div class="level-card-status ${isUnlocked ? 'unlocked' : 'locked'}">
                        ${isUnlocked ? '🔓 Unlocked' : '🔒 Locked'}
                    </div>
                </div>
                <div class="level-card-description">
                    ${isUnlocked ? `Students in section "${sectionName}" can access this level and its questions.` : `Students in section "${sectionName}" cannot access this level yet.`}
                </div>
                <div class="level-card-toggle">
                    <label class="toggle-switch" for="level${i}_${sectionName.replace(/\s+/g, '')}">
                        <input type="checkbox" id="level${i}_${sectionName.replace(/\s+/g, '')}"
                               data-level="${level}"
                               data-section="${sectionName}"
                               ${isUnlocked ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span class="toggle-label">
                        ${isUnlocked ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            `;

            levelUnlockGrid.appendChild(levelCard);
        }

        // Add event listeners to toggle switches for dynamic updates
        const toggleInputs = levelUnlockGrid.querySelectorAll('.toggle-switch input');

        toggleInputs.forEach((input) => {
            // Add change event listener for toggle functionality
            input.addEventListener('change', (e) => {
                updateLevelCardDisplay(e.target);
            });
        });

        // Helper function to update level card display
        function updateLevelCardDisplay(toggleInput) {
            const levelCard = toggleInput.closest('.level-card');
            const statusElement = levelCard.querySelector('.level-card-status');
            const labelElement = levelCard.querySelector('.toggle-label');
            const descriptionElement = levelCard.querySelector('.level-card-description');
            const sectionName = toggleInput.getAttribute('data-section');

            if (toggleInput.checked) {
                statusElement.className = 'level-card-status unlocked';
                statusElement.innerHTML = '🔓 Unlocked';
                labelElement.textContent = 'Enabled';
                descriptionElement.textContent = `Students in section "${sectionName}" can access this level and its questions.`;
            } else {
                statusElement.className = 'level-card-status locked';
                statusElement.innerHTML = '🔒 Locked';
                labelElement.textContent = 'Disabled';
                descriptionElement.textContent = `Students in section "${sectionName}" cannot access this level yet.`;
            }
        }

        // Add entrance animations to level cards (after event listeners are set)
        setTimeout(() => {
            const levelCards = levelUnlockGrid.querySelectorAll('.level-card');
            animateElements(levelCards, 100);
        }, 50);

        // Show and add event listener to save button
        const saveButton = document.getElementById('saveLevelChanges');
        if (saveButton) {
            saveButton.style.display = 'block';
            // Remove existing event listeners to avoid duplicates
            const newSaveButton = saveButton.cloneNode(true);
            saveButton.parentNode.replaceChild(newSaveButton, saveButton);
            newSaveButton.addEventListener('click', () => saveLevelChanges(sectionName));
        }
    }

    // Helper function to ensure all levels 1-12 exist
    function ensureAllLevels(existingLevels) {
        const completeLevels = {};

        // Create levels 1-12, preserving existing values
        for (let i = 1; i <= 12; i++) {
            const levelKey = `level${i}`;
            completeLevels[levelKey] = existingLevels[levelKey] || false;
        }

        return completeLevels;
    }

    // --- EVENT HANDLERS ---
    function viewStudentDetails(studentId, studentData) {
        // Navigate to student details page with student data
        sessionStorage.setItem('selectedStudentData', JSON.stringify(studentData));
        window.location.href = `studentDetails.html?id=${studentId}`;
    }

    async function editStudentDetails(studentId, studentData) {
        // Create and show edit modal
        console.log("Editing student:", studentId);
        await showEditStudentModal(studentData);
    }

    async function showEditStudentModal(studentData) {
        // Remove existing modal if any
        const existingModal = document.getElementById('editStudentModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Ensure sections are loaded before generating options
        if (!sectionsData || sectionsData.length === 0) {
            console.warn("Sections data not loaded, fetching sections...");
            await fetchSectionsForTeacher();
        }

        // Generate section options
        const sectionOptions = generateSectionOptions(studentData.section);

        // Create modal HTML
        const modalHTML = `
            <div id="editStudentModal" class="student-details-modal active">
                <div class="student-modal-content">
                    <div class="student-modal-header">
                        <h3>Edit Student: ${studentData.fullname || 'Unknown'}</h3>
                        <button id="editStudentModalClose" class="student-modal-close">Close</button>
                    </div>
                    <div class="student-modal-body">
                        <form id="editStudentForm" class="edit-form">
                            <div class="form-group">
                                <label for="editFullName">Full Name:</label>
                                <input type="text" id="editFullName" value="${studentData.fullname || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="editUsername">Username:</label>
                                <input type="text" id="editUsername" value="${studentData.username || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="editPassword">Password:</label>
                                <input type="text" id="editPassword" value="${studentData.password || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="editSection">Section:</label>
                                <select id="editSection" required>
                                    ${sectionOptions}
                                </select>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="button primary">Save Changes</button>
                                <button type="button" id="cancelEdit" class="button secondary">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        const modal = document.getElementById('editStudentModal');
        const closeBtn = document.getElementById('editStudentModalClose');
        const cancelBtn = document.getElementById('cancelEdit');
        const form = document.getElementById('editStudentForm');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateStudentData(studentData, modal);
        });
    }

    function generateSectionOptions(currentSection) {
        let options = '<option value="No Section"' + (currentSection === 'No Section' || !currentSection ? ' selected' : '') + '>No Section</option>';

        // Ensure we have sections data
        if (!sectionsData || sectionsData.length === 0) {
            console.warn("No sections data available for edit modal");
            return options;
        }

        // Sort sections alphabetically by name
        const sortedSections = [...sectionsData].sort((a, b) => a.name.localeCompare(b.name));

        sortedSections.forEach(section => {
            const isSelected = currentSection === section.name ? ' selected' : '';
            options += `<option value="${section.name}"${isSelected}>${section.name}</option>`;
        });

        return options;
    }

    async function updateStudentData(originalStudentData, modal) {
        try {
            if (!CONFIG) {
                throw new Error("Configuration not loaded");
            }

            // Get and sanitize form values
            const formData = {
                fullname: document.getElementById('editFullName').value,
                username: document.getElementById('editUsername').value,
                password: document.getElementById('editPassword').value,
                section: document.getElementById('editSection').value
            };

            // Sanitize the input data (with fallback)
            const sanitizeText = (text) => {
                if (typeof text !== 'string') return '';
                return text.trim().replace(/[<>"']/g, '').substring(0, 100);
            };

            const sanitizedData = {
                fullname: sanitizeText(formData.fullname),
                username: sanitizeText(formData.username).toLowerCase(),
                password: formData.password, // Don't sanitize passwords
                section: sanitizeText(formData.section)
            };

            const updatedData = {
                ...sanitizedData,
                // Preserve original fields that shouldn't be changed
                id: originalStudentData.id,
                email: originalStudentData.email,
                teacherID: originalStudentData.teacherID,
                progress: originalStudentData.progress,
                lastActive: originalStudentData.lastActive,
                timestamp: originalStudentData.timestamp
            };

            // Preserve level data
            for (let i = 1; i <= 12; i++) {
                if (originalStudentData[`level${i}Finish`] !== undefined) {
                    updatedData[`level${i}Finish`] = originalStudentData[`level${i}Finish`];
                }
                if (originalStudentData[`level${i}Score`] !== undefined) {
                    updatedData[`level${i}Score`] = originalStudentData[`level${i}Score`];
                }
            }

            // Prepare Firestore document format
            const firestoreDocument = {
                fields: {
                    fullname: { stringValue: updatedData.fullname },
                    username: { stringValue: updatedData.username },
                    password: { stringValue: updatedData.password },
                    section: { stringValue: updatedData.section },
                    id: { stringValue: updatedData.id },
                    email: { stringValue: updatedData.email || '' },
                    teacherID: { stringValue: updatedData.teacherID || '' },
                    timestamp: { timestampValue: updatedData.timestamp || new Date().toISOString() }
                }
            };

            // Add level data to Firestore document
            for (let i = 1; i <= 12; i++) {
                if (updatedData[`level${i}Finish`] !== undefined) {
                    firestoreDocument.fields[`level${i}Finish`] = { booleanValue: updatedData[`level${i}Finish`] };
                }
                if (updatedData[`level${i}Score`] !== undefined) {
                    firestoreDocument.fields[`level${i}Score`] = { integerValue: updatedData[`level${i}Score`] };
                }
            }

            // Update student in Firebase using the correct document ID
            const documentId = originalStudentData.documentId || originalStudentData.id;
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/studentData/${documentId}?key=${CONFIG.apiKey}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(firestoreDocument)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update student: ${response.status} - ${errorText}`);
            }

            console.log('✅ Student updated successfully:', updatedData);
            alert('Student updated successfully!');

            // Close modal
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);

            // Refresh student list first
            await fetchStudentsForTeacher();

            // Reset section filter to "All Sections" after data is refreshed
            // Add a small delay to ensure DOM is fully updated
            setTimeout(() => {
                const sectionFilter = document.getElementById('sectionFilter');
                if (sectionFilter) {
                    sectionFilter.value = '';
                    // Trigger the filter change event to update the student list display
                    const event = new Event('change');
                    sectionFilter.dispatchEvent(event);
                }
            }, 100);

        } catch (error) {
            console.error('Error updating student:', error);
            alert('Error updating student: ' + error.message);
        }
    }

    function showAddQuestionModal(level) {
        console.log("showAddQuestionModal called for level:", level);
        const questions = teacherData?.rizal_questions?.[level] || [];

        // Check if level has reached maximum of 10 questions
        if (questions.length >= 10) {
            alert(`Level ${level.replace('level', '')} already has the maximum of 10 questions.`);
            return;
        }

        console.log("Calling showQuestionModal...");
        showQuestionModal(level, null, 'Add Question');
    }

    function editQuestion(level, index) {
        const questions = teacherData?.rizal_questions?.[level] || [];
        const question = questions[index];

        if (!question) {
            alert('Question not found');
            return;
        }

        showQuestionModal(level, question, 'Edit Question', index);
    }

    async function deleteQuestion(level, index) {
        if (!confirm(`Are you sure you want to delete question ${index + 1} from ${level.replace('level', 'Level ')}?`)) {
            return;
        }

        try {
            // Initialize rizal_questions if it doesn't exist
            if (!teacherData.rizal_questions) {
                teacherData.rizal_questions = {};
            }

            // Initialize level array if it doesn't exist
            if (!teacherData.rizal_questions[level]) {
                teacherData.rizal_questions[level] = [];
            }

            // Remove question from array
            teacherData.rizal_questions[level].splice(index, 1);

            // Save to Firebase
            await saveQuestionsToFirebase();

            // Refresh the questions view
            loadQuestionsForLevel(level);

            // Update tab count
            updateLevelTabCount(level);

            alert('Question deleted successfully!');

        } catch (error) {
            console.error('Error deleting question:', error);
            alert('Error deleting question: ' + error.message);
        }
    }

    function showQuestionModal(level, existingQuestion = null, title = 'Add Question', questionIndex = null) {
        console.log("showQuestionModal called with:", { level, title, questionIndex });

        // Remove existing modal if any
        const existingModal = document.getElementById('questionModal');
        if (existingModal) {
            console.log("Removing existing modal");
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div id="questionModal" class="student-details-modal active">
                <div class="student-modal-content question-modal-content">
                    <div class="student-modal-header">
                        <h3>${title} - ${level.replace('level', 'Level ')}</h3>
                        <button id="questionModalClose" class="student-modal-close">Close</button>
                    </div>
                    <div class="student-modal-body">
                        <form id="questionForm" class="question-form">
                            <div class="form-group">
                                <label for="questionText">Question Text:</label>
                                <textarea id="questionText" rows="3" placeholder="Enter your question here..." required>${existingQuestion?.text || ''}</textarea>
                            </div>

                            <div class="choices-section">
                                <h4>Answer Choices:</h4>
                                ${generateChoiceInputs(existingQuestion?.choices)}
                            </div>

                            <div class="form-actions">
                                <button type="submit" class="button primary">${questionIndex !== null ? 'Update Question' : 'Add Question'}</button>
                                <button type="button" id="cancelQuestion" class="button secondary">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Add event listeners
        const modal = document.getElementById('questionModal');
        const closeBtn = document.getElementById('questionModalClose');
        const cancelBtn = document.getElementById('cancelQuestion');
        const form = document.getElementById('questionForm');

        const closeModal = () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Add choice radio button listeners for auto-toggle
        setupChoiceListeners();

        // Handle form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveQuestion(level, questionIndex, modal);
        });
    }

    function generateChoiceInputs(existingChoices = null) {
        const choices = existingChoices || [
            { text: '', correct: false },
            { text: '', correct: false },
            { text: '', correct: false },
            { text: '', correct: false }
        ];

        return choices.map((choice, index) => `
            <div class="choice-group">
                <div class="choice-header">
                    <label class="choice-label">Choice ${String.fromCharCode(65 + index)}:</label>
                    <label class="correct-choice">
                        <input type="radio" name="correctChoice" value="${index}" ${choice.correct ? 'checked' : ''}>
                        Correct Answer
                    </label>
                </div>
                <input type="text" class="choice-input" data-index="${index}"
                       value="${choice.text || ''}" placeholder="Enter choice text..." required>
            </div>
        `).join('');
    }

    function setupChoiceListeners() {
        const radioButtons = document.querySelectorAll('input[name="correctChoice"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => {
                // Auto-toggle: when one is selected, others become false
                radioButtons.forEach(r => {
                    if (r !== radio) {
                        r.checked = false;
                    }
                });
            });
        });
    }

    async function saveQuestion(level, questionIndex, modal) {
        try {
            // Get form data
            const questionText = document.getElementById('questionText').value.trim();
            const choiceInputs = document.querySelectorAll('.choice-input');
            const correctChoiceRadio = document.querySelector('input[name="correctChoice"]:checked');

            // Validation
            if (!questionText) {
                alert('Please enter a question text.');
                return;
            }

            if (!correctChoiceRadio) {
                alert('Please select the correct answer.');
                return;
            }

            // Check if all choices have text
            const choices = [];
            let hasEmptyChoice = false;

            choiceInputs.forEach((input, index) => {
                const text = input.value.trim();
                if (!text) {
                    hasEmptyChoice = true;
                    return;
                }

                choices.push({
                    text: text,
                    correct: index === parseInt(correctChoiceRadio.value)
                });
            });

            if (hasEmptyChoice) {
                alert('Please fill in all choice texts.');
                return;
            }

            // Create question object
            const questionData = {
                text: questionText,
                choices: choices
            };

            // Initialize rizal_questions if it doesn't exist
            if (!teacherData.rizal_questions) {
                teacherData.rizal_questions = {};
            }

            // Initialize level array if it doesn't exist
            if (!teacherData.rizal_questions[level]) {
                teacherData.rizal_questions[level] = [];
            }

            // Add or update question
            if (questionIndex !== null) {
                // Update existing question
                teacherData.rizal_questions[level][questionIndex] = questionData;
            } else {
                // Add new question
                teacherData.rizal_questions[level].push(questionData);
            }

            // Save to Firebase
            await saveQuestionsToFirebase();

            // Close modal
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);

            // Refresh the questions view
            loadQuestionsForLevel(level);

            // Update tab count
            updateLevelTabCount(level);

            alert(questionIndex !== null ? 'Question updated successfully!' : 'Question added successfully!');

        } catch (error) {
            console.error('Error saving question:', error);
            alert('Error saving question: ' + error.message);
        }
    }

    async function saveQuestionsToFirebase() {
        try {
            if (!CONFIG) {
                throw new Error("Configuration not loaded");
            }

            if (!currentTeacherId) {
                throw new Error("Teacher ID not found");
            }

            // First, get the current teacher document to preserve other fields
            const queryUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents:runQuery?key=${CONFIG.apiKey}`;
            const queryBody = {
                structuredQuery: {
                    from: [{ collectionId: 'teacherData' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'id' },
                            op: "EQUAL",
                            value: { stringValue: currentTeacherId }
                        }
                    },
                    limit: 1
                }
            };

            const queryResponse = await fetch(queryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryBody)
            });

            if (!queryResponse.ok) {
                throw new Error(`Failed to fetch teacher data: ${queryResponse.statusText}`);
            }

            const queryResults = await queryResponse.json();
            if (!queryResults || queryResults.length === 0) {
                throw new Error("Teacher document not found");
            }

            const teacherDoc = queryResults[0].document;
            const documentPath = teacherDoc.name; // Full document path

            // Prepare the update data - preserve all existing fields and update rizal_questions
            const updateData = {
                fields: {
                    ...teacherDoc.fields, // Preserve all existing fields
                    rizal_questions: toFirestoreValue(teacherData.rizal_questions) // Update with new questions
                }
            };

            // Update the teacher document
            const updateUrl = `https://firestore.googleapis.com/v1/${documentPath}?key=${CONFIG.apiKey}`;
            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Failed to update questions: ${updateResponse.status} - ${errorText}`);
            }

            console.log("Questions saved to Firebase successfully");

        } catch (error) {
            console.error("Error saving questions to Firebase:", error);
            throw error;
        }
    }

    function updateLevelTabCount(level) {
        const tab = document.querySelector(`.level-tab[data-level="${level}"]`);
        if (tab) {
            const questions = teacherData?.rizal_questions?.[level] || [];
            const levelNumber = level.replace('level', '');
            tab.textContent = `Level ${levelNumber} (${questions.length})`;
        }
    }

    async function saveLevelChanges(sectionName) {
        try {
            if (!CONFIG) {
                throw new Error("Configuration not loaded");
            }

            if (!currentTeacherId) {
                throw new Error("Teacher ID not found");
            }

            if (!sectionName) {
                throw new Error("Section name not provided");
            }

            const levelToggles = document.querySelectorAll('.toggle-switch input');
            const updatedLevelUnlocks = {};

            levelToggles.forEach(toggle => {
                const level = toggle.getAttribute('data-level');
                const toggleSection = toggle.getAttribute('data-section');
                // Only process toggles for the current section
                if (toggleSection === sectionName) {
                    updatedLevelUnlocks[level] = toggle.checked;
                }
            });

            // Ensure we have all levels 1-12 with current toggle states
            const completeLevelUnlocks = ensureAllLevels(updatedLevelUnlocks);

            // Create section-specific field name
            const sectionFieldName = `levelUnlocks${sectionName}`;

            console.log(`Saving level unlocks for section "${sectionName}" (field: ${sectionFieldName}):`, completeLevelUnlocks);

            // First, get the current teacher document to preserve other fields
            const queryUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents:runQuery?key=${CONFIG.apiKey}`;
            const queryBody = {
                structuredQuery: {
                    from: [{ collectionId: 'teacherData' }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: 'id' },
                            op: "EQUAL",
                            value: { stringValue: currentTeacherId }
                        }
                    },
                    limit: 1
                }
            };

            const queryResponse = await fetch(queryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(queryBody)
            });

            if (!queryResponse.ok) {
                throw new Error(`Failed to fetch teacher data: ${queryResponse.statusText}`);
            }

            const queryResults = await queryResponse.json();
            if (!queryResults || queryResults.length === 0) {
                throw new Error("Teacher document not found");
            }

            const teacherDoc = queryResults[0].document;
            const documentPath = teacherDoc.name; // Full document path

            // Prepare the update data - preserve all existing fields and update section-specific levelUnlocks
            const updateData = {
                fields: {
                    ...teacherDoc.fields, // Preserve all existing fields
                    [sectionFieldName]: toFirestoreValue(completeLevelUnlocks) // Update with section-specific levelUnlocks (1-12)
                }
            };

            // Update the teacher document
            const updateUrl = `https://firestore.googleapis.com/v1/${documentPath}?key=${CONFIG.apiKey}`;
            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Failed to update level unlocks: ${updateResponse.status} - ${errorText}`);
            }

            // Update local teacher data with section-specific level set
            teacherData[sectionFieldName] = completeLevelUnlocks;

            alert(`Level changes saved successfully for section "${sectionName}"! All levels 1-12 are now configured.`);
            console.log(`Section-specific level unlocks updated successfully for "${sectionName}":`, completeLevelUnlocks);

        } catch (error) {
            console.error("Error saving level changes:", error);
            alert("Error saving changes: " + error.message);
        }
    }

    // --- UTILITY FUNCTIONS ---
    function showView(targetView) {
        console.log("showView called with:", targetView);
        // Hide all views
        const allViews = document.querySelectorAll('.content-view');
        console.log("Found content views:", allViews.length);
        allViews.forEach(view => view.classList.remove('active'));

        // Show target view
        if (targetView) {
            targetView.classList.add('active');
            console.log("Activated view:", targetView.id);
        } else {
            console.warn("No target view provided to showView");
        }
    }

    function setActiveNavLink(targetLink) {
        console.log("setActiveNavLink called with:", targetLink);
        // Remove active class from all nav links
        const allNavLinks = document.querySelectorAll('.sidebar-nav-link');
        console.log("Found nav links:", allNavLinks.length);
        allNavLinks.forEach(link => link.classList.remove('active'));

        // Add active class to target link
        if (targetLink) {
            targetLink.classList.add('active');
            console.log("Activated nav link:", targetLink.id);
        } else {
            console.warn("No target link provided to setActiveNavLink");
        }
    }

    // --- UI INITIALIZATION ---
    function initializeUI() {
        console.log("=== initializeUI called ===");

        // Re-get all DOM elements to ensure they're available
        const studentsLink = document.getElementById('studentsLink');
        const questionsLink = document.getElementById('questionsLink');
        const levelsLink = document.getElementById('levelsLink');
        const sectionsLink = document.getElementById('sectionsLink');
        const createStudentLink = document.getElementById('createStudentLink');
        const settingsLink = document.getElementById('settingsLink');

        // Re-get view containers
        const studentListView = document.getElementById('studentListView');
        const questionsView = document.getElementById('questionsView');
        const levelsView = document.getElementById('levelsView');
        const sectionsView = document.getElementById('sectionsView');

        console.log("DOM elements check:", {
            studentsLink: studentsLink ? studentsLink.id : 'NOT FOUND',
            questionsLink: questionsLink ? questionsLink.id : 'NOT FOUND',
            levelsLink: levelsLink ? levelsLink.id : 'NOT FOUND',
            sectionsLink: sectionsLink ? sectionsLink.id : 'NOT FOUND',
            createStudentLink: createStudentLink ? createStudentLink.id : 'NOT FOUND',
            settingsLink: settingsLink ? settingsLink.id : 'NOT FOUND',
            studentListView: studentListView ? studentListView.id : 'NOT FOUND',
            questionsView: questionsView ? questionsView.id : 'NOT FOUND',
            levelsView: levelsView ? levelsView.id : 'NOT FOUND',
            sectionsView: sectionsView ? sectionsView.id : 'NOT FOUND'
        });

        // Initialize mobile sidebar functionality
        if (mobileSidebarToggle) {
            mobileSidebarToggle.addEventListener('click', () => {
                sidebar?.classList.add('active');
                sidebarOverlay?.classList.add('active');
            });
        }

        if (mobileSidebarClose) {
            mobileSidebarClose.addEventListener('click', () => {
                sidebar?.classList.remove('active');
                sidebarOverlay?.classList.remove('active');
            });
        }

        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', () => {
                sidebar?.classList.remove('active');
                sidebarOverlay?.classList.remove('active');
            });
        }


        // Unified search functionality
        if (searchStudentInput) {
            searchStudentInput.addEventListener('input', () => {
                const searchTerm = searchStudentInput.value.trim().toLowerCase();
                let searchResults = allStudentsData.filter(student => {
                    return (
                        (student.fullname || '').toLowerCase().includes(searchTerm) ||
                        (student.username || '').toLowerCase().includes(searchTerm) ||
                        (student.section || '').toLowerCase().includes(searchTerm) ||
                        (student.id || '').toLowerCase().includes(searchTerm)
                    );
                });
                // Apply current sorting if any
                if (currentSortField) {
                    searchResults = sortStudents(searchResults, currentSortField, currentSortDirection);
                }
                filteredStudents = searchResults;
                currentPage = 1;
                renderStudentList(filteredStudents);
            });
        }

        // Event delegation for student name and action buttons
        document.getElementById('studentTableBody').addEventListener('click', async function(e) {
            // Student name click
            if (e.target.matches('td:nth-child(1), td:nth-child(1) *')) {
                const row = e.target.closest('tr');
                if (row) {
                    const nameLink = row.querySelector('.student-name-link');
                    if (nameLink) {
                        const studentId = nameLink.getAttribute('data-id');
                        const studentData = nameLink.getAttribute('data-student');
                        if (studentId && studentData) {
                            let parsedData;
                            try {
                                const unescaped = studentData
                                    .replace(/&quot;/g, '"')
                                    .replace(/&#039;/g, "'")
                                    .replace(/&lt;/g, '<')
                                    .replace(/&gt;/g, '>')
                                    .replace(/&amp;/g, '&');
                                parsedData = JSON.parse(unescaped);
                            } catch (err) {
                                parsedData = JSON.parse(studentData);
                            }
                            viewStudentDetails(studentId, parsedData);
                        }
                    }
                }
            }
            // Edit button click
            if (e.target.classList.contains('edit-student')) {
                const btn = e.target;
                const studentId = btn.getAttribute('data-id');
                const studentData = btn.getAttribute('data-student');
                if (studentId && studentData) {
                    let parsedData;
                    try {
                        const unescaped = studentData
                            .replace(/&quot;/g, '"')
                            .replace(/&#039;/g, "'")
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&amp;/g, '&');
                        parsedData = JSON.parse(unescaped);
                    } catch (err) {
                        parsedData = JSON.parse(studentData);
                    }
                    await editStudentDetails(studentId, parsedData);
                }
            }
        });

        // Initialize navigation
        console.log("Setting up navigation event listeners...");

        if (studentsLink) {
            console.log("Setting up studentsLink event listener");
            studentsLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Students link clicked");
                showView(studentListView);
                setActiveNavLink(studentsLink);
            });
        } else {
            console.warn("studentsLink not found");
        }

        if (questionsLink) {
            console.log("Setting up questionsLink event listener");
            questionsLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Questions link clicked");
                showView(questionsView);
                setActiveNavLink(questionsLink);
                renderQuestionsView();
            });
        } else {
            console.warn("questionsLink not found");
        }

        if (levelsLink) {
            console.log("Setting up levelsLink event listener");
            levelsLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Levels link clicked");
                showView(levelsView);
                setActiveNavLink(levelsLink);
                renderLevelsView();
            });
        } else {
            console.warn("levelsLink not found");
        }

        if (sectionsLink) {
            console.log("Setting up sectionsLink event listener");
            sectionsLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Sections link clicked");
                showView(sectionsView);
                setActiveNavLink(sectionsLink);
                renderSectionsView();
            });
        } else {
            console.warn("sectionsLink not found");
        }

        if (createStudentLink) {
            console.log("Setting up createStudentLink event listener");
            createStudentLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Create student link clicked");
                showAddStudentModal();
            });
        } else {
            console.warn("createStudentLink not found");
        }

        // Initialize settings functionality
        if (settingsLink) {
            console.log("Setting up settingsLink event listener");
            settingsLink.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Settings link clicked");
                openSettingsModal();
            });
        } else {
            console.warn("settingsLink not found");
        }

        if (closeSettingsButton) {
            closeSettingsButton.addEventListener('click', closeSettingsModal);
        }

        if (settingsModal) {
            settingsModal.addEventListener('click', (event) => {
                if (event.target === settingsModal) closeSettingsModal();
            });
        }

        if (settingsLogoutButton) {
            settingsLogoutButton.addEventListener('click', () => {
                sessionStorage.removeItem('isAdminLoggedIn');
                sessionStorage.removeItem('isTeacherLoggedIn');
                sessionStorage.removeItem('teacherId');
                alert('Logged out.');
                window.location.href = 'index.html';
            });
        }

        // Initialize Add Student functionality
        if (closeAddStudentButton) {
            closeAddStudentButton.addEventListener('click', closeAddStudentModal);
        }

        if (createAccountsButton) {
            createAccountsButton.addEventListener('click', startAccountCreation);
        }

        if (cancelCreationButton) {
            cancelCreationButton.addEventListener('click', cancelAccountCreation);
        }

        // Initialize Section Management functionality
        if (addSectionButton) {
            addSectionButton.addEventListener('click', showAddSectionModal);
        }

        if (closeAddSectionButton) {
            closeAddSectionButton.addEventListener('click', closeAddSectionModal);
        }

        if (closeEditSectionButton) {
            closeEditSectionButton.addEventListener('click', closeEditSectionModal);
        }

        if (createSectionButton) {
            createSectionButton.addEventListener('click', createSection);
        }

        if (updateSectionButton) {
            updateSectionButton.addEventListener('click', updateSection);
        }

        if (addSectionModal) {
            addSectionModal.addEventListener('click', (event) => {
                if (event.target === addSectionModal) closeAddSectionModal();
            });
        }

        if (editSectionModal) {
            editSectionModal.addEventListener('click', (event) => {
                if (event.target === editSectionModal) closeEditSectionModal();
            });
        }

        // Initialize section filter functionality
        if (sectionFilter) {
            sectionFilter.addEventListener('change', (e) => {
                const selectedSection = e.target.value;
                filterStudentsBySection(selectedSection);
            });
        }

        // Initialize logout functionality
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                sessionStorage.removeItem('isAdminLoggedIn');
                sessionStorage.removeItem('isTeacherLoggedIn');
                sessionStorage.removeItem('teacherId');
                alert('Logged out.');
                window.location.href = 'index.html';
            });
        }

        // Initialize Excel export functionality
        if (exportExcelButton) {
            exportExcelButton.addEventListener('click', () => {
                exportStudentDataToExcel();
            });
        }

        // Initialize table sorting functionality
        initializeTableSorting();

        // Initialize export account functionality
        if (exportAccountButton) {
            exportAccountButton.addEventListener('click', () => {
                if (!allStudentsData || allStudentsData.length === 0) {
                    alert('No student data available to export. Please load students first.');
                    return;
                }
                try {
                    exportAccountButton.disabled = true;
                    exportAccountButton.textContent = '🔑 Generating...';
                    // Group students by section
                    const studentsBySection = {};
                    allStudentsData.forEach(student => {
                        const section = student.section || 'No Section';
                        if (!studentsBySection[section]) studentsBySection[section] = [];
                        studentsBySection[section].push(student);
                    });
                    // Create workbook
                    const workbook = XLSX.utils.book_new();
                    Object.keys(studentsBySection).forEach(sectionName => {
                        const accountData = [
                            ['Username', 'Password', 'Section', 'Full Name']
                        ];
                        studentsBySection[sectionName].forEach(student => {
                            accountData.push([
                                student.username || 'N/A',

                                student.password || 'N/A',
                                student.section || 'N/A',
                                student.fullname || 'N/A'
                            ]);
                        });
                        const worksheet = XLSX.utils.aoa_to_sheet(accountData);
                        worksheet['!cols'] = [
                            { width: 20 }, // Username
                            { width: 20 }, // Password
                            { width: 18 }, // Section
                            { width: 25 }  // Full Name
                        ];
                        // Sanitize sheet name (Excel limit: 31 chars, no special chars)
                        const sanitizedSection = sectionName.replace(/[\\/:?*\[\]]/g, '_').substring(0, 31);
                        XLSX.utils.book_append_sheet(workbook, worksheet, sanitizedSection);
                    });
                    // Generate filename
                    const dateStr = new Date().toISOString().split('T')[0];
                    const filename = `Accounts_${dateStr}.xlsx`;
                    // Save the file
                    XLSX.writeFile(workbook, filename);
                    alert(`Account list exported successfully!\nFile: ${filename}\nTotal accounts: ${allStudentsData.length}\nSheets: ${Object.keys(studentsBySection).length}`);
                } catch (error) {
                    console.error('Error exporting account list:', error);
                    alert('Error exporting account list. Please try again.');
                } finally {
                    exportAccountButton.disabled = false;
                    exportAccountButton.textContent = '🔑 Export Account';
                }
            });
        }
    }

    function initializeTableSorting() {
        // Add click event listeners to sortable headers
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => {
                const sortField = header.getAttribute('data-sort');
                if (sortField) {
                    handleColumnSort(sortField);
                }
            });
        });
    }

    // --- SETTINGS MODAL FUNCTIONS ---
    function openSettingsModal() {
        if (settingsModal) {
            // Show modal immediately
            settingsModal.style.display = 'flex';

            // Use requestAnimationFrame for smooth animation
            requestAnimationFrame(() => {
                settingsModal.classList.add('active');
            });
        } else {
            console.error("teacherPortal.js: settingsModal element not found.");
        }
    }

    function closeSettingsModal() {
        if (settingsModal) {

            settingsModal.classList.remove('active');
            setTimeout(() => settingsModal.style.display = 'none', 300);
        }
    }

    // Add keyboard support for closing modals
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (settingsModal && settingsModal.style.display === 'flex') {
                closeSettingsModal();
            }
            if (addStudentModal && addStudentModal.classList.contains('active')) {
                closeAddStudentModal();
            }
            if (addSectionModal && addSectionModal.classList.contains('active')) {
                closeAddSectionModal();
            }
            if (editSectionModal && editSectionModal.classList.contains('active')) {
                closeEditSectionModal();
            }
        }
    });

    // Section filtering function
    function filterStudentsBySection(sectionName) {
        let studentsToShow = allStudentsData;

        if (sectionName && sectionName.trim() !== '') {
            studentsToShow = allStudentsData.filter(student => student.section === sectionName);
        }

        // Apply current sorting if any
        if (currentSortField) {
            studentsToShow = sortStudents(studentsToShow, currentSortField, currentSortDirection);
        }

        filteredStudents = studentsToShow;
        // Reset to first page when filtering
        currentPage = 1;
        renderStudentList(studentsToShow);
    }

    // --- ADD STUDENT FUNCTIONS ---
    let accountCreationState = {
        studentNumber: 0,
        targetNumber: 0,
        createdCount: 0,
        isCreating: false,
        isCancelled: false
    };

    function showAddStudentModal() {
        if (addStudentModal) {
            // Reset form
            studentCountInput.value = '';
            sectionSelectInput.value = '';
            addStudentError.style.display = 'none';

            // Update section dropdown
            updateSectionDropdowns();

            // Debug: Log sections data
            console.log("Available sections for student creation:", sectionsData);
            console.log("Section dropdown options:", sectionSelectInput ? sectionSelectInput.innerHTML : "sectionSelectInput not found");

            // Show modal with smooth animation
            addStudentModal.style.display = 'flex';
            requestAnimationFrame(() => {
                addStudentModal.classList.add('active');
            });
        }
    }

    function closeAddStudentModal() {
        if (addStudentModal) {
            addStudentModal.classList.remove('active');
            setTimeout(() => {
                addStudentModal.style.display = 'none';
            }, 300);
        }
    }

    function startAccountCreation() {
        const inputValue = studentCountInput.value.trim();
        const selectedSection = sectionSelectInput.value.trim();

        if (!inputValue || isNaN(inputValue)) {
            showAddStudentError('Error: Please enter a valid number.');
            return;
        }

        if (!selectedSection) {
            showAddStudentError('Error: Please select a section.');
            return;
        }

        const accountCount = parseInt(inputValue);

        if (accountCount < 1 || accountCount > 50) {
            showAddStudentError('Number must be between 1 and 50!');
            return;
        }

        // Initialize creation state - start from next available number
        const nextAvailableNumber = findNextAvailableStudentNumber();
        accountCreationState = {
            studentNumber: nextAvailableNumber,
            targetNumber: accountCount,
            createdCount: 0,
            isCreating: true,
            isCancelled: false,
            selectedSection: selectedSection
        };

        // Close add student modal and show progress modal
        closeAddStudentModal();
        showCreatingAccountsModal();

        // Start the account creation process
        setTimeout(() => {
            checkNextStudentAccount();
        }, 500);
    }

    function showAddStudentError(message) {
        addStudentError.textContent = message;
        addStudentError.style.display = 'block';
    }

    function findNextAvailableStudentNumber() {
        // Get existing student numbers from the loaded student data
        const teacherId = currentTeacherId || 'admin';
        const existingNumbers = new Set();

        // Extract numbers from existing student usernames
        if (allStudentsData && Array.isArray(allStudentsData)) {
            allStudentsData.forEach(student => {
                if (student.id === teacherId && student.username) {
                    // Username format: admin{studentNumber}{3-digit-random}
                    // Example: admin785123 = admin + 785 + 123
                    if (student.username.startsWith(teacherId)) {
                        const numberPart = student.username.substring(teacherId.length);
                        // Remove the last 3 digits (random part) to get student number
                        if (numberPart.length > 3) {
                            const studentNumber = parseInt(numberPart.substring(0, numberPart.length - 3));
                            if (!isNaN(studentNumber)) {
                                existingNumbers.add(studentNumber);
                            }
                        }
                    }
                }
            });
        }

        // Find the next available batch starting number
        // Students are created in batches of 10: 1-10, 11-20, 21-30, etc.
        let batchStart = 1;
        while (true) {
            let batchEnd = batchStart + 9; // 10 students per batch
            let batchHasSpace = false;

            // Check if this batch has any available slots
            for (let i = batchStart; i <= batchEnd; i++) {
                if (!existingNumbers.has(i)) {
                    batchHasSpace = true;
                    break;
                }
            }

            if (batchHasSpace) {
                // Find the first available number in this batch
                for (let i = batchStart; i <= batchEnd; i++) {
                    if (!existingNumbers.has(i)) {
                        console.log(`Next available student number: ${i} in batch ${batchStart}-${batchEnd} (existing: ${Array.from(existingNumbers).sort((a,b) => a-b)})`);
                        return i;
                    }
                }
            }

            // Move to next batch
            batchStart += 10;

            // Safety check to prevent infinite loop
            if (batchStart > 1000) {
                console.log(`Fallback: Using number ${batchStart}`);
                return batchStart;
            }
        }
    }

    function showCreatingAccountsModal() {
        if (creatingAccountsModal) {
            // Show modal with smooth animation
            creatingAccountsModal.style.display = 'flex';
            updateProgressDisplay();
            requestAnimationFrame(() => {
                creatingAccountsModal.classList.add('active');
            });
        }
    }

    function closeCreatingAccountsModal() {
        if (creatingAccountsModal) {
            creatingAccountsModal.classList.remove('active');
            setTimeout(() => {
                creatingAccountsModal.style.display = 'none';
            }, 300);
        }
    }

    function updateProgressDisplay() {
        if (progressText) {
            let status = "Preparing...";
            if (accountCreationState.isCreating) {
                if (accountCreationState.createdCount < accountCreationState.targetNumber) {
                    status = `Creating student ${accountCreationState.studentNumber}...`;
                } else {
                    status = "Finishing...";
                }
            }
            progressText.textContent = `Created: ${accountCreationState.createdCount} / ${accountCreationState.targetNumber} (${status})`;
        }

        if (progressFill) {
            const percentage = accountCreationState.targetNumber > 0 ?
                (accountCreationState.createdCount / accountCreationState.targetNumber) * 100 : 0;
            progressFill.style.width = `${percentage}%`;
        }
    }

    async function checkNextStudentAccount() {
        if (accountCreationState.isCancelled || !accountCreationState.isCreating) {
            return;
        }

        if (accountCreationState.createdCount >= accountCreationState.targetNumber) {
            finishAccountCreation();
            return;
        }

        const teacherId = currentTeacherId || 'admin';
        const studentDocId = `${teacherId}${accountCreationState.studentNumber}`;

        updateProgressDisplay();

        try {
            // Check if student account already exists
            const exists = await checkStudentExists(studentDocId);

            if (exists) {
                console.log(`Student ${studentDocId} already exists, skipping...`);
                accountCreationState.studentNumber++;
                setTimeout(() => checkNextStudentAccount(), 100);
            } else {
                console.log(`Creating student ${studentDocId}...`);
                await createStudentAccount(studentDocId);
                accountCreationState.createdCount++;
                accountCreationState.studentNumber++;
                updateProgressDisplay();
                setTimeout(() => checkNextStudentAccount(), 200);
            }
        } catch (error) {
            console.error('Error in account creation process:', error);
            accountCreationState.studentNumber++;
            setTimeout(() => checkNextStudentAccount(), 500);
        }
    }

    async function checkStudentExists(studentId) {
        try {
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/studentData/${studentId}?key=${CONFIG.apiKey}`;
            const response = await fetch(url);

            if (response.status === 404) {
                return false; // Document doesn't exist
            }

            if (response.ok) {
                return true; // Document exists
            }

            throw new Error(`Unexpected response: ${response.status}`);
        } catch (error) {
            console.error('Error checking student existence:', error);
            return false;
        }
    }

    async function createStudentAccount(studentId) {
        const teacherId = currentTeacherId || 'admin';
        const randomPassword = Math.floor(Math.random() * 900) + 100;
        const randomUsername = Math.floor(Math.random() * 900) + 100;
        const timestamp = new Date().toISOString();

        // Firestore document format
        const firestoreDocument = {
            fields: {
                fullname: { stringValue: "" },
                id: { stringValue: teacherId },
                password: { stringValue: `${teacherId}${accountCreationState.studentNumber}${randomPassword}` },
                username: { stringValue: `${teacherId}${accountCreationState.studentNumber}${randomUsername}` },
                section: { stringValue: accountCreationState.selectedSection || "No Section" },
                timestamp: { timestampValue: timestamp },
                level1Score: { integerValue: 0 },
                level2Score: { integerValue: 0 },
                level3Score: { integerValue: 0 },
                level4Score: { integerValue: 0 },
                level5Score: { integerValue: 0 },
                level6Score: { integerValue: 0 },
                level7Score: { integerValue: 0 },
                level8Score: { integerValue: 0 },
                level9Score: { integerValue: 0 },
                level10Score: { integerValue: 0 },
                level11Score: { integerValue: 0 },
                level12Score: { integerValue: 0 },
                level1Finish: { booleanValue: false },
                level2Finish: { booleanValue: false },
                level3Finish: { booleanValue: false },
                level4Finish: { booleanValue: false },
                level5Finish: { booleanValue: false },
                level6Finish: { booleanValue: false },
                level7Finish: { booleanValue: false },
                level8Finish: { booleanValue: false },
                level9Finish: { booleanValue: false },
                level10Finish: { booleanValue: false },
                level11Finish: { booleanValue: false },
                level12Finish: { booleanValue: false }
            }
        };

        try {
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/studentData/${studentId}?key=${CONFIG.apiKey}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(firestoreDocument)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create student account: ${response.status} - ${errorText}`);
            }

            console.log(`✅ Student account created: ${studentId}`);
            return true;
        } catch (error) {
            console.error('Error creating student account:', error);
            throw error;
        }
    }

    function cancelAccountCreation() {
        accountCreationState.isCancelled = true;
        accountCreationState.isCreating = false;

        setTimeout(() => {
            closeCreatingAccountsModal();
            alert(`Account creation cancelled. Created ${accountCreationState.createdCount} out of ${accountCreationState.targetNumber} accounts.`);
            // Refresh the student list to show newly created accounts
            if (currentView === 'students') {
                renderStudentList();
            }
        }, 500);
    }

    function finishAccountCreation() {
        accountCreationState.isCreating = false;

        setTimeout(() => {
            closeCreatingAccountsModal();
            alert(`✅ Successfully created ${accountCreationState.createdCount} student accounts!`);
            // Refresh the student list to show newly created accounts
            if (currentView === 'students') {
                renderStudentList();
            }
        }, 1000);
    }

    // Animation utility functions - Fixed to prevent glitching
    function animateElements(elements, stagger = 80) {
        if (!elements || elements.length === 0) return;

        elements.forEach((element, index) => {
            // Clear any existing animations and transitions
            element.style.transition = 'none';
            element.classList.remove('animate-fade-in-up', 'animate-fade-in', 'animate-slide-in-up');

            // Force reflow to ensure styles are applied
            element.offsetHeight;

            // Ensure initial hidden state (in case not already set)
            if (element.style.opacity !== '0') {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
            }

            // Apply animation with delay
            setTimeout(() => {
                element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * stagger + 50); // Small base delay to ensure DOM is ready
        });
    }

    // --- SECTION MANAGEMENT FUNCTIONS ---
    async function fetchSectionsForTeacher() {
        try {
            if (!CONFIG) {
                throw new Error("Configuration not loaded");
            }

            console.log("Fetching sections for teacher ID:", currentTeacherId);

            // Get sections from the teacher's subcollection
            const sectionsUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/teacherData/${currentTeacherId}/sections?key=${CONFIG.apiKey}`;

            const response = await fetch(sectionsUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch sections: ${response.statusText}`);
            }

            const results = await response.json();
            sectionsData = [];

            if (results && results.documents) {
                results.documents.forEach(sectionDoc => {
                    if (sectionDoc.fields) {
                        const sectionId = sectionDoc.name.split('/').pop();
                        const sectionData = {
                            id: sectionId,
                            name: sectionDoc.fields.name?.stringValue || 'Unnamed Section',
                            description: sectionDoc.fields.description?.stringValue || '',
                            teacherId: currentTeacherId,
                            createdAt: sectionDoc.fields.createdAt?.timestampValue || new Date().toISOString(),
                            studentCount: 0 // Will be calculated when rendering
                        };
                        sectionsData.push(sectionData);
                    }
                });
            }

            console.log("Sections loaded:", sectionsData.length);
            updateSectionDropdowns();

        } catch (error) {
            console.error("Error fetching sections:", error);
        }
    }

    function updateSectionDropdowns() {
        // Sort sections alphabetically by name
        const sortedSections = [...sectionsData].sort((a, b) => a.name.localeCompare(b.name));

        // Update section filter dropdown
        if (sectionFilter) {
            const currentValue = sectionFilter.value;
            sectionFilter.innerHTML = '<option value="">All Sections</option>';

            sortedSections.forEach(section => {
                const option = document.createElement('option');
                option.value = section.name;
                option.textContent = section.name;
                sectionFilter.appendChild(option);
            });

            // Restore previous selection if it still exists
            if (currentValue && sectionFilter.querySelector(`option[value="${currentValue}"]`)) {
                sectionFilter.value = currentValue;
            }
        }

        // Update section select in add student modal
        if (sectionSelectInput) {
            const currentValue = sectionSelectInput.value;
            sectionSelectInput.innerHTML = '<option value="">Select a section</option>';

            sortedSections.forEach(section => {
                const option = document.createElement('option');
                option.value = section.name;
                option.textContent = section.name;
                sectionSelectInput.appendChild(option);
            });

            // Restore previous selection if it still exists
            if (currentValue && sectionSelectInput.querySelector(`option[value="${currentValue}"]`)) {
                sectionSelectInput.value = currentValue;
            }
        }
    }

    function renderSectionsView() {
        const sectionsContainer = document.getElementById('sectionsContainer');
        const loadingSections = document.getElementById('loadingSections');
        const sectionsGrid = document.getElementById('sectionsGrid');

        if (!sectionsContainer || !sectionsGrid) return;

        loadingSections.style.display = 'none';

        if (sectionsData.length === 0) {
            sectionsGrid.innerHTML = `
                <div class="sections-empty-state">
                    <h3>No Sections Yet</h3>
                    <p>Create your first section to organize your students.</p>
                    <button class="button primary" onclick="showAddSectionModal()">Add Section</button>
                </div>
            `;
            return;
        }

        // Calculate student counts for each section
        sectionsData.forEach(section => {
            section.studentCount = allStudentsData.filter(student => student.section === section.name).length;
        });

        sectionsGrid.innerHTML = '';

        sectionsData.forEach(section => {
            const sectionCard = document.createElement('div');
            sectionCard.classList.add('section-card');
            sectionCard.style.cursor = 'pointer';

            const createdDate = new Date(section.createdAt).toLocaleDateString();

            sectionCard.innerHTML = `
                <div class="section-card-header">
                    <h3 class="section-card-title">${section.name}</h3>
                    <div class="section-card-actions">
                        <button class="button small secondary" onclick="event.stopPropagation(); editSection('${section.id}')">Edit</button>
                        <button class="button small danger" onclick="event.stopPropagation(); deleteSection('${section.id}')">Delete</button>
                    </div>
                </div>
                <div class="section-card-description">${section.description || 'No description provided.'}</div>
                <div class="section-card-stats">
                    <span class="section-student-count">${section.studentCount} students</span>
                    <span class="section-created-date">Created: ${createdDate}</span>
                </div>
            `;

            // Add click handler to view students in this section
            sectionCard.addEventListener('click', () => {
                viewStudentsInSection(section.name);
            });

            sectionsGrid.appendChild(sectionCard);
        });
    }

    // Section modal functions
    function showAddSectionModal() {
        console.log("showAddSectionModal called");

        if (addSectionModal) {
            console.log("Modal found, showing...");
            // Reset form
            if (sectionNameInput) sectionNameInput.value = '';
            if (sectionDescriptionInput) sectionDescriptionInput.value = '';
            if (addSectionError) addSectionError.style.display = 'none';

            // Show modal with proper CSS classes
            addSectionModal.style.display = 'flex';
            // Force reflow
            addSectionModal.offsetHeight;
            // Add active class for CSS transitions
            addSectionModal.classList.add('active');
            console.log("Modal should be visible now");
        } else {
            console.error("addSectionModal element not found!");
            alert("Modal element not found. Check console for details.");
        }
    }

    function closeAddSectionModal() {
        if (addSectionModal) {
            addSectionModal.classList.remove('active');
            setTimeout(() => {
                addSectionModal.style.display = 'none';
            }, 300);
        }
    }

    function showEditSectionModal(sectionId) {
        const section = sectionsData.find(s => s.id === sectionId);
        if (!section || !editSectionModal) return;

        currentEditingSectionId = sectionId;

        // Populate form with section data
        editSectionNameInput.value = section.name;
        editSectionNameInput.readOnly = true; // Make section name read-only again
        editSectionDescriptionInput.value = section.description;
        editSectionError.style.display = 'none';

        // Show modal with smooth animation
        editSectionModal.style.display = 'flex';
        requestAnimationFrame(() => {
            editSectionModal.classList.add('active');
        });
    }

    function closeEditSectionModal() {
        if (editSectionModal) {
            editSectionModal.classList.remove('active');
            setTimeout(() => {
                editSectionModal.style.display = 'none';
                currentEditingSectionId = null;
            }, 300);
        }
    }

    async function createSection() {
        console.log("createSection called");
        console.log("CONFIG:", CONFIG);
        console.log("currentTeacherId:", currentTeacherId);

        const name = sectionNameInput ? sectionNameInput.value.trim() : '';
        const description = sectionDescriptionInput ? sectionDescriptionInput.value.trim() : '';

        // New validation: Only allow alphanumeric section names (no spaces or symbols)
        const validSectionName = /^[A-Za-z0-9]+$/.test(name);
        if (!validSectionName) {
            showAddSectionError('Section name can only contain letters and numbers (no spaces or symbols).');
            return;
        }

        console.log("Section name:", name);
        console.log("Section description:", description);

        if (!name) {
            showAddSectionError('Section name is required');
            return;
        }

        // Check if section name already exists
        if (sectionsData.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            showAddSectionError('A section with this name already exists');
            return;
        }

        try {
            const timestamp = new Date().toISOString();
            const sectionId = `${currentTeacherId}_${Date.now()}`;

            const firestoreDocument = {
                fields: {
                    name: { stringValue: name },
                    description: { stringValue: description },
                    createdAt: { timestampValue: timestamp }
                }
            };

            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/teacherData/${currentTeacherId}/sections/${sectionId}?key=${CONFIG.apiKey}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(firestoreDocument)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to create section: ${response.status} - ${errorText}`);
            }

            console.log(`✅ Section created: ${name}`);

            // Refresh sections data
            await fetchSectionsForTeacher();
            renderSectionsView();
            closeAddSectionModal();

        } catch (error) {
            console.error('Error creating section:', error);
            showAddSectionError('Failed to create section: ' + error.message);
        }
    }

    async function updateSection() {
        if (!currentEditingSectionId) return;

        const name = editSectionNameInput.value.trim();
        const description = editSectionDescriptionInput.value.trim();

        // New validation: Only allow alphanumeric section names (no spaces or symbols)
        const validSectionName = /^[A-Za-z0-9]+$/.test(name);
        if (!validSectionName) {
            showEditSectionError('Section name can only contain letters and numbers (no spaces or symbols).');
            return;
        }

        if (!name) {
            showEditSectionError('Section name is required');
            return;
        }

        // Check if section name already exists (excluding current section)
        if (sectionsData.some(s => s.id !== currentEditingSectionId && s.name.toLowerCase() === name.toLowerCase())) {
            showEditSectionError('A section with this name already exists');
            return;
        }

        try {
            const firestoreDocument = {
                fields: {
                    name: { stringValue: name },
                    description: { stringValue: description },
                    createdAt: { timestampValue: sectionsData.find(s => s.id === currentEditingSectionId)?.createdAt || new Date().toISOString() }
                }
            };

            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/teacherData/${currentTeacherId}/sections/${currentEditingSectionId}?key=${CONFIG.apiKey}`;
            const response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(firestoreDocument)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update section: ${response.status} - ${errorText}`);
            }

            // --- Update all students with the old section name ---
            const oldSection = sectionsData.find(s => s.id === currentEditingSectionId)?.name;
            if (oldSection && oldSection !== name) {
                // Find all students with the old section name
                const studentsToUpdate = allStudentsData.filter(student => student.section === oldSection);
                for (const student of studentsToUpdate) {
                    // Prepare update payload
                    const studentUpdate = {
                        fields: {
                            ...Object.keys(student).reduce((acc, key) => {
                                if (key === 'section') {
                                    acc.section = { stringValue: name };
                                } else if (typeof student[key] === 'string') {
                                    acc[key] = { stringValue: student[key] };
                                } else if (typeof student[key] === 'number') {
                                    acc[key] = { integerValue: student[key] };
                                } else if (typeof student[key] === 'boolean') {
                                    acc[key] = { booleanValue: student[key] };
                                }
                                return acc;
                            }, {})
                        }
                    };
                    // Patch student document
                    const studentUrl = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/studentData/${student.documentId}?key=${CONFIG.apiKey}`;
                    await fetch(studentUrl, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(studentUpdate)
                    });
                }
            }
            // --- End update students ---

            console.log(`✅ Section updated: ${name}`);

            // Refresh sections data
            await fetchSectionsForTeacher();
            renderSectionsView();
            closeEditSectionModal();

        } catch (error) {
            console.error('Error updating section:', error);
            showEditSectionError('Failed to update section: ' + error.message);
        }
    }

    function showAddSectionError(message) {
        addSectionError.textContent = message;
        addSectionError.style.display = 'block';
    }

    function showEditSectionError(message) {
        editSectionError.textContent = message;
        editSectionError.style.display = 'block';
    }

    // Function to view students in a specific section
    function viewStudentsInSection(sectionName) {
        console.log(`Switching to students view for section: ${sectionName}`);

        // Get DOM elements dynamically
        const studentListView = document.getElementById('studentListView');
        const studentsLink = document.getElementById('studentsLink');
        const sectionFilter = document.getElementById('sectionFilter');

        // Switch to students view
        showView(studentListView);
        setActiveNavLink(studentsLink);

        // Set the section filter to the selected section
        if (sectionFilter) {
            console.log(`Setting section filter to: ${sectionName}`);
            sectionFilter.value = sectionName;

            // Trigger the filter change event to update the student list
            const event = new Event('change');
            sectionFilter.dispatchEvent(event);
        } else {
            console.error('Section filter element not found!');
        }

        // Keep the original title
        const studentsTitle = document.querySelector('.header-title');
        if (studentsTitle) {
            studentsTitle.textContent = 'My Students';
        }
    }

    // Function to reset back to all students view
    function resetToAllStudents() {
        // Get DOM elements dynamically
        const studentListView = document.getElementById('studentListView');
        const studentsLink = document.getElementById('studentsLink');
        const sectionFilter = document.getElementById('sectionFilter');

        // Ensure we're on the students view
        showView(studentListView);
        setActiveNavLink(studentsLink);

        // Reset the section filter
        if (sectionFilter) {
            sectionFilter.value = '';

            // Trigger the filter change event to update the student list
            const event = new Event('change');
            sectionFilter.dispatchEvent(event);
        }

        // Reset the page title
        const studentsTitle = document.querySelector('.header-title');
        if (studentsTitle) {
            studentsTitle.textContent = 'My Students';
        }
    }

    // Global functions for onclick handlers
    window.showAddSectionModal = showAddSectionModal;
    window.editSection = showEditSectionModal;
    window.viewStudentsInSection = viewStudentsInSection;
    window.resetToAllStudents = resetToAllStudents;
    window.deleteSection = async function(sectionId) {
        const section = sectionsData.find(s => s.id === sectionId);
        if (!section) return;

        if (!confirm(`Are you sure you want to delete the section "${section.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/teacherData/${currentTeacherId}/sections/${sectionId}?key=${CONFIG.apiKey}`;
            const response = await fetch(url, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Failed to delete section: ${response.statusText}`);
            }

            console.log(`✅ Section deleted: ${section.name}`);

            // Refresh sections data
            await fetchSectionsForTeacher();
            renderSectionsView();

        } catch (error) {
            console.error('Error deleting section:', error);
            alert('Failed to delete section: ' + error.message);
        }
    };

    function addHoverAnimations() {
        // Remove existing hover listeners to prevent duplicates
        const existingHoverElements = document.querySelectorAll('[data-hover-animated]');
        existingHoverElements.forEach(el => {
            el.removeAttribute('data-hover-animated');
            // Clone and replace to remove all event listeners
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
        });

        // Add hover animations to student table rows
        const studentRows = document.querySelectorAll('#studentTableBody tr');
        studentRows.forEach(row => {
            if (row.getAttribute('data-hover-animated')) return; // Skip if already animated

            row.setAttribute('data-hover-animated', 'true');
            row.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease-out';

            row.addEventListener('mouseenter', () => {
                if (!row.style.transform.includes('translateY')) {
                    row.style.transform = 'translateY(-2px)';
                    row.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }
            });

            row.addEventListener('mouseleave', () => {
                row.style.transform = 'translateY(0)';
                row.style.boxShadow = '';
            });
        });

        // Add hover animations to buttons (simplified)
        const buttons = document.querySelectorAll('.button, .btn-primary, .btn-secondary, .btn-danger');
        buttons.forEach(button => {
            if (button.getAttribute('data-hover-animated')) return; // Skip if already animated

            button.setAttribute('data-hover-animated', 'true');
            button.style.transition = 'transform 0.15s ease-out';

            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-1px)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0)';
            });
        });
    }

    // --- EXCEL EXPORT FUNCTIONALITY ---
    function exportStudentDataToExcel() {
        if (!allStudentsData || allStudentsData.length === 0) {
            alert('No student data available to export. Please load students first.');
            return;
        }

        try {
            // Show loading message
            exportExcelButton.disabled = true;
            exportExcelButton.textContent = '📊 Generating Report...';

            // Get current teacher info
            const teacherName = currentTeacherId || 'Teacher';

            // Create workbook
            const workbook = XLSX.utils.book_new();

            // Group students by section
            const studentsBySection = {};
            allStudentsData.forEach(student => {
                const section = student.section || 'No Section';
                if (!studentsBySection[section]) {
                    studentsBySection[section] = [];
                }
                studentsBySection[section].push(student);
            });

            // Create detailed sheets for each section
            Object.keys(studentsBySection).forEach(sectionName => {
                createSectionSheet(workbook, sectionName, studentsBySection[sectionName]);
            });

            // Generate filename
            const sanitizedTeacherName = teacherName.replace(/[^a-zA-Z0-9]/g, '_');
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `${sanitizedTeacherName}_Student_Report_${dateStr}.xlsx`;

            // Save the file
            XLSX.writeFile(workbook, filename);

            // Show success message
            alert(`Excel report generated successfully!\nFile: ${filename}\nTotal students: ${allStudentsData.length}\nSections: ${Object.keys(studentsBySection).length}`);

        } catch (error) {
            console.error('Error generating Excel report:', error);
            alert('Error generating Excel report. Please try again.');
        } finally {
            // Reset button
            exportExcelButton.disabled = false;
            exportExcelButton.textContent = '📊 Export Excel Report';
        }
    }



    function createSectionSheet(workbook, sectionName, students) {
        const sectionData = [
            [`SECTION: ${sectionName.toUpperCase()}`],
            [''],
            ['Student Name', 'Username', 'Overall Progress', 'Levels Completed', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12']
        ];

        // Add student data
        students.forEach(student => {
            const row = [
                student.fullname || 'Unknown',
                student.username || 'N/A',
                `${student.progress?.percentage || 0}%`,
                `${student.progress?.completed || 0}/12`
            ];

            // Add individual level scores (only scores, no status)
            for (let i = 1; i <= 10; i++) {
                const score = student[`level${i}Score`];
                const finished = student[`level${i}Finish`];

                if (finished && score !== undefined && score !== null) {
                    row.push(score);
                } else if (score !== undefined && score !== null && score > 0) {
                    row.push(score);
                } else {
                    row.push(0);
                }
            }

            sectionData.push(row);
        });

        // Add section statistics
        sectionData.push(['']);
        sectionData.push(['SECTION STATISTICS']);

        const totalProgress = students.reduce((sum, student) => {
            return sum + (student.progress?.percentage || 0);
        }, 0);
        const avgProgress = students.length > 0 ? Math.round(totalProgress / students.length) : 0;

        sectionData.push(['Total Students:', students.length]);
        sectionData.push(['Average Progress:', `${avgProgress}%`]);
        sectionData.push(['Students with 100% Progress:', students.filter(s => (s.progress?.percentage || 0) === 100).length]);

        const sectionSheet = XLSX.utils.aoa_to_sheet(sectionData);

        // Set column widths
        sectionSheet['!cols'] = [
            { width: 20 }, // Student Name
            { width: 15 }, // Username
            { width: 15 }, // Overall Progress
            { width: 15 }, // Levels Completed
            ...Array(12).fill({ width: 6 }) // Level columns (L1-L12) - made narrower
        ];

        // Sanitize sheet name (Excel has restrictions)
        const sanitizedSectionName = sectionName.replace(/[\\\/\?\*\[\]]/g, '_').substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, sectionSheet, sanitizedSectionName);
    }

    // --- HASH NAVIGATION HANDLER ---
    function handleHashNavigation() {
        const hash = window.location.hash.substring(1); // Remove the # symbol
        console.log("Handling hash navigation:", hash);

        if (!hash) return; // No hash, stay on default view

        // Get DOM elements for navigation
        const studentsLink = document.getElementById('studentsLink');
        const questionsLink = document.getElementById('questionsLink');
        const levelsLink = document.getElementById('levelsLink');
        const sectionsLink = document.getElementById('sectionsLink');
        const createStudentLink = document.getElementById('createStudentLink');
        const settingsLink = document.getElementById('settingsLink');

        const studentListView = document.getElementById('studentListView');
        const questionsView = document.getElementById('questionsView');
        const levelsView = document.getElementById('levelsView');
        const sectionsView = document.getElementById('sectionsView');

        // Navigate based on hash
        switch (hash.toLowerCase()) {
            case 'students':
                if (studentsLink && studentListView) {
                    showView(studentListView);
                    setActiveNavLink(studentsLink);
                }
                break;
            case 'questions':
                if (questionsLink && questionsView) {
                    showView(questionsView);
                    setActiveNavLink(questionsLink);
                    renderQuestionsView();
                }
                break;
            case 'levels':
                if (levelsLink && levelsView) {
                    showView(levelsView);
                    setActiveNavLink(levelsLink);
                    renderLevelsView();
                }
                break;
            case 'sections':
                if (sectionsLink && sectionsView) {
                    showView(sectionsView);
                    setActiveNavLink(sectionsLink);
                    renderSectionsView();
                }
                break;
            case 'addstudent':
                if (createStudentLink) {
                    // Stay on students view but open add student modal
                    if (studentsLink && studentListView) {
                        showView(studentListView);
                        setActiveNavLink(studentsLink);
                    }
                    // Small delay to ensure the page is loaded before opening modal
                    setTimeout(() => {
                        const addStudentModal = document.getElementById('addStudentModal');
                        if (addStudentModal) {
                            showAddStudentModal();
                        }
                    }, 500);
                }
                break;
            case 'settings':
                if (settingsLink) {
                    // Stay on students view but open settings modal
                    if (studentsLink && studentListView) {
                        showView(studentListView);
                        setActiveNavLink(studentsLink);
                    }
                    // Small delay to ensure the page is loaded before opening modal
                    setTimeout(() => {
                        const settingsModal = document.getElementById('settingsModal');
                        if (settingsModal) {
                            openSettingsModal();
                        }
                    }, 500);
                }
                break;
            default:
                console.log("Unknown hash:", hash);
                break;
        }

        // Clear the hash from URL after navigation
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, null, window.location.pathname);
        }
    }

        // --- INITIALIZATION ---
        console.log("Starting app initialization...");
        await initializeApp();
        console.log("Teacher portal initialized successfully");

        // Handle hash-based navigation from external links (like studentDetails.html)
        handleHashNavigation();

    } catch (error) {
        console.error("Failed to initialize teacher portal:", error);

        // Show user-friendly error message
        const errorMessage = error.message || "Unknown error occurred";
        alert(`Failed to load teacher portal: ${errorMessage}\n\nPlease check the browser console for details and try again.`);

        // Don't redirect immediately, let user see the error
        setTimeout(() => {
            if (confirm("Would you like to return to the login page?")) {
                window.location.href = 'index.html';
            }
        }, 1000);
    }
}

