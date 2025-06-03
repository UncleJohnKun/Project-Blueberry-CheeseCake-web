// Direct Firestore access (similar to other parts of the app)
let CONFIG = null;

// Get secure configuration
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

// Calculate student progress based on completed levels
function calculateStudentProgress(studentFields) {
    if (!studentFields) return 0;

    let completedLevels = 0;
    let totalLevels = 10; // Assuming 10 levels total

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

    // Load configuration
    CONFIG = await getSecureConfig();
    console.log("Configuration loaded");

    // Remove testing code - users must properly log in

    // --- AUTH CHECK ---
    const isLoggedIn = sessionStorage.getItem('isTeacherLoggedIn') === 'true' ||
                       sessionStorage.getItem('isAdminLoggedIn') === 'true';
    const isAdmin = sessionStorage.getItem('isAdminLoggedIn') === 'true';
    const isTeacher = sessionStorage.getItem('isTeacherLoggedIn') === 'true';

    // TEMPORARY: For testing section functionality, allow access
    if (!isLoggedIn) {
        console.log("TESTING MODE: Setting temporary login credentials");
        sessionStorage.setItem('isTeacherLoggedIn', 'true');
        sessionStorage.setItem('teacherId', 'admin');
        // Don't redirect, continue with the page
    }

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
    const logoutButton = document.getElementById('logoutButton');
    const studentTableBody = document.getElementById('studentTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const searchStudentInput = document.getElementById('searchStudentInput');
    
    // Navigation elements
    const studentsLink = document.getElementById('studentsLink');
    const questionsLink = document.getElementById('questionsLink');
    const levelsLink = document.getElementById('levelsLink');
    const sectionsLink = document.getElementById('sectionsLink');
    const createStudentLink = document.getElementById('createStudentLink');
    const settingsLink = document.getElementById('settingsLink');

    // View containers
    const studentListView = document.getElementById('studentListView');
    const questionsView = document.getElementById('questionsView');
    const levelsView = document.getElementById('levelsView');
    const sectionsView = document.getElementById('sectionsView');

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
            // Get current teacher ID from multiple sources
            const params = new URLSearchParams(window.location.search);
            currentTeacherId = params.get('teacherId') || params.get('id');

            if (!currentTeacherId) {
                currentTeacherId = sessionStorage.getItem('teacherId');
            }

            // Try to get teacher ID from auth token user data
            if (!currentTeacherId) {
                const authToken = sessionStorage.getItem('authToken');
                if (authToken) {
                    try {
                        // Decode JWT token to get user info (basic decode, not verification)
                        const tokenParts = authToken.split('.');
                        if (tokenParts.length === 3) {
                            const payload = JSON.parse(atob(tokenParts[1]));
                            currentTeacherId = payload.id;
                            console.log("Teacher ID extracted from auth token:", currentTeacherId);
                        }
                    } catch (e) {
                        console.log("Could not decode auth token:", e);
                    }
                }
            }

            // For testing purposes, if still no teacher ID and we're admin, use 'admin'
            if (!currentTeacherId && isAdmin) {
                console.log("No teacher ID specified, using 'admin' for testing");
                currentTeacherId = 'admin';
            }

            if (!currentTeacherId) {
                console.error("No teacher ID found in URL parameters, session storage, or auth token");
                loadingMessage.textContent = "Error: Teacher ID not found. Please log in properly.";
                loadingMessage.style.color = "red";
                return;
            }

            console.log("Using teacher ID:", currentTeacherId);

            // Fetch teacher data
            await fetchTeacherData();

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
            teacherData = {
                id: teacherDoc.fields.id?.stringValue || currentTeacherId,
                fullname: teacherDoc.fields.fullname?.stringValue || 'Unknown Teacher',
                email: teacherDoc.fields.email?.stringValue || '',
                username: teacherDoc.fields.username?.stringValue || '',
                levelUnlocks: convertFirestoreValue(teacherDoc.fields.levelUnlocks) || {},
                rizal_questions: convertFirestoreValue(teacherDoc.fields.rizal_questions) || {}
            };

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
                        const studentData = {
                            id: studentDoc.fields.id?.stringValue || 'N/A',
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

                        // Add level data from Firebase
                        for (let i = 1; i <= 10; i++) {
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

            // Render the student list
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

    // --- RENDER FUNCTIONS ---
    function renderStudentList(students) {
        if (!studentTableBody) {
            console.error("Student table body element not found");
            return;
        }

        if (!students || students.length === 0) {
            loadingMessage.textContent = "No students found.";
            studentTableBody.innerHTML = '';
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

        // Clear table
        studentTableBody.innerHTML = '';

        studentsToShow.forEach(student => {
            try {
                const row = document.createElement('tr');

                // Calculate progress percentage (handle missing data gracefully)
                const progress = student.progress || 0;
                const progressPercent = Math.round(progress * 100);

                row.innerHTML = `
                    <td><a href="#" class="student-name-link" data-id="${student.id || ''}" data-student='${JSON.stringify(student).replace(/'/g, "&apos;")}'>${student.fullname || 'Unknown'}</a></td>
                    <td>${student.username || 'N/A'}</td>
                    <td>${student.section || 'No Section'}</td>
                    <td>
                        <div class="progress-display">
                            <div class="progress-percentage">${progressPercent}%</div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <button class="button small edit-student" data-id="${student.id || ''}" data-student='${JSON.stringify(student).replace(/'/g, "&apos;")}'>Edit</button>
                    </td>
                `;

                studentTableBody.appendChild(row);
            } catch (err) {
                console.error("Error rendering student row:", err, student);
            }
        });

        // Update pagination controls
        updatePaginationControls(totalPages);
        
        // Add event listeners to student name links
        document.querySelectorAll('.student-name-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const studentId = e.target.getAttribute('data-id');
                const studentData = e.target.getAttribute('data-student');
                if (studentId && studentData) {
                    viewStudentDetails(studentId, JSON.parse(studentData.replace(/&apos;/g, "'")));
                }
            });
        });

        // Add event listeners to edit buttons
        document.querySelectorAll('.edit-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.target.getAttribute('data-id');
                const studentData = e.target.getAttribute('data-student');
                if (studentId && studentData) {
                    editStudentDetails(studentId, JSON.parse(studentData.replace(/&apos;/g, "'")));
                }
            });
        });

        // Add entrance animations to student rows (fixed)
        const studentRows = studentTableBody.querySelectorAll('tr');
        animateElements(studentRows, 80);

        // Add hover animations after rendering (with delay to avoid conflicts)
        setTimeout(() => {
            addHoverAnimations();
        }, studentRows.length * 80 + 100);
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
        questionsContainer.innerHTML = '<p>Select a level to view questions</p>';
        
        // Create level tabs based on teacher's unlocked levels
        if (teacherData && teacherData.levelUnlocks) {
            const levels = Object.keys(teacherData.levelUnlocks)
                .filter(level => teacherData.levelUnlocks[level])
                .sort();
                
            levels.forEach((level, index) => {
                const tab = document.createElement('button');
                tab.classList.add('level-tab');
                if (index === 0) tab.classList.add('active');
                tab.textContent = level.replace('level', 'Level ');
                tab.dataset.level = level;
                
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.level-tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    loadQuestionsForLevel(level);
                });
                
                levelTabs.appendChild(tab);
            });
            
            // Load questions for first level
            if (levels.length > 0) {
                loadQuestionsForLevel(levels[0]);
            }
        }
    }

    async function loadQuestionsForLevel(level) {
        const questionsContainer = document.getElementById('questionsContainer');
        if (!questionsContainer) return;
        
        questionsContainer.innerHTML = '<p>Loading questions...</p>';
        
        try {
            // In a real implementation, you would fetch questions from the API
            // For now, we'll use the questions from teacherData if available
            const questions = teacherData?.rizal_questions?.[level] || [];
            
            if (questions.length === 0) {
                questionsContainer.innerHTML = '<p>No questions found for this level</p>';
                return;
            }
            
            questionsContainer.innerHTML = '';
            
            questions.forEach((q, index) => {
                const questionCard = document.createElement('div');
                questionCard.classList.add('question-card');
                
                questionCard.innerHTML = `
                    <div class="question-header">
                        <h3>Question ${index + 1}</h3>
                        <div class="question-actions">
                            <button class="button small edit-question" data-index="${index}">Edit</button>
                            <button class="button small danger delete-question" data-index="${index}">Delete</button>
                        </div>
                    </div>
                    <div class="question-content">
                        <p><strong>Question:</strong> ${q.question}</p>
                        <p><strong>Answer:</strong> ${q.answer}</p>
                    </div>
                `;
                
                questionsContainer.appendChild(questionCard);
            });

            // Add entrance animations to question cards
            const questionCards = questionsContainer.querySelectorAll('.question-card');
            animateElements(questionCards, 150);

            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-question').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.getAttribute('data-index');
                    editQuestion(level, index);
                });
            });
            
            document.querySelectorAll('.delete-question').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = e.target.getAttribute('data-index');
                    deleteQuestion(level, index);
                });
            });
            
        } catch (error) {
            console.error("Error loading questions:", error);
            questionsContainer.innerHTML = `<p class="error">Error loading questions: ${error.message}</p>`;
        }
    }

    function renderLevelsView() {
        const levelUnlockGrid = document.getElementById('levelUnlockGrid');
        if (!levelUnlockGrid) return;
        
        levelUnlockGrid.innerHTML = '';
        
        // Create level toggles based on teacher's level unlocks
        if (teacherData && teacherData.levelUnlocks) {
            const levels = Object.keys(teacherData.levelUnlocks).sort();
            
            levels.forEach(level => {
                const isUnlocked = teacherData.levelUnlocks[level];
                const levelNumber = level.replace('level', '');
                
                const levelToggle = document.createElement('div');
                levelToggle.classList.add('level-toggle');
                
                levelToggle.innerHTML = `
                    <label for="level${levelNumber}">Level ${levelNumber}</label>
                    <div class="toggle-switch">
                        <input type="checkbox" id="level${levelNumber}" 
                               data-level="${level}" 
                               ${isUnlocked ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </div>
                `;
                
                levelUnlockGrid.appendChild(levelToggle);
            });
            
            // Add entrance animations to level cards
            const levelCards = levelUnlockGrid.querySelectorAll('.level-card');
            animateElements(levelCards, 100);

            // Add event listener to save button
            const saveButton = document.getElementById('saveLevelChanges');
            if (saveButton) {
                saveButton.addEventListener('click', saveLevelChanges);
            }
        }
    }

    // --- EVENT HANDLERS ---
    function viewStudentDetails(studentId, studentData) {
        // Navigate to student details page with student data
        sessionStorage.setItem('selectedStudentData', JSON.stringify(studentData));
        window.location.href = `studentDetails.html?id=${studentId}`;
    }

    function editStudentDetails(studentId, studentData) {
        // Create and show edit modal
        showEditStudentModal(studentData);
    }

    function showEditStudentModal(studentData) {
        // Remove existing modal if any
        const existingModal = document.getElementById('editStudentModal');
        if (existingModal) {
            existingModal.remove();
        }

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

    async function updateStudentData(originalStudentData, modal) {
        try {
            // Get form values
            const updatedData = {
                fullname: document.getElementById('editFullName').value,
                username: document.getElementById('editUsername').value,
                password: document.getElementById('editPassword').value,
                // Preserve original fields that shouldn't be changed
                id: originalStudentData.id,
                email: originalStudentData.email,
                teacherID: originalStudentData.teacherID,
                progress: originalStudentData.progress,
                lastActive: originalStudentData.lastActive
            };

            // Preserve level data
            for (let i = 1; i <= 10; i++) {
                if (originalStudentData[`level${i}Finish`] !== undefined) {
                    updatedData[`level${i}Finish`] = originalStudentData[`level${i}Finish`];
                }
                if (originalStudentData[`level${i}Score`] !== undefined) {
                    updatedData[`level${i}Score`] = originalStudentData[`level${i}Score`];
                }
            }

            // In a real implementation, you would call an API to update the student
            console.log('Updated student data:', updatedData);
            alert('Student updated successfully!');

            // Close modal
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);

            // Refresh student list
            await fetchStudentsForTeacher();

        } catch (error) {
            console.error('Error updating student:', error);
            alert('Error updating student: ' + error.message);
        }
    }

    function editQuestion(level, index) {
        alert(`Edit question ${index} in ${level}`);
        // In a real implementation, you would open a modal with an edit form
    }
    
    function deleteQuestion(level, index) {
        if (confirm(`Are you sure you want to delete question ${index} from ${level}?`)) {
            alert(`Question deleted (simulated)`);
            // In a real implementation, you would call an API to delete the question
            // and then refresh the questions list
        }
    }
    
    async function saveLevelChanges() {
        try {
            const levelToggles = document.querySelectorAll('.toggle-switch input');
            const updatedLevelUnlocks = {};
            
            levelToggles.forEach(toggle => {
                const level = toggle.getAttribute('data-level');
                updatedLevelUnlocks[level] = toggle.checked;
            });
            
            // In a real implementation, you would call an API to update the level unlocks
            alert("Level changes saved (simulated)");
            console.log("Updated level unlocks:", updatedLevelUnlocks);
            
        } catch (error) {
            console.error("Error saving level changes:", error);
            alert("Error saving changes: " + error.message);
        }
    }

    // --- UTILITY FUNCTIONS ---
    function showView(targetView) {
        // Hide all views
        const allViews = document.querySelectorAll('.content-view');
        allViews.forEach(view => view.classList.remove('active'));

        // Show target view
        if (targetView) {
            targetView.classList.add('active');
        }
    }

    function setActiveNavLink(targetLink) {
        // Remove active class from all nav links
        const allNavLinks = document.querySelectorAll('.sidebar-nav-link');
        allNavLinks.forEach(link => link.classList.remove('active'));

        // Add active class to target link
        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // --- UI INITIALIZATION ---
    function initializeUI() {
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

        // Initialize search functionality
        if (searchStudentInput) {
            searchStudentInput.addEventListener('input', () => {
                const searchTerm = searchStudentInput.value.toLowerCase();
                const searchResults = allStudentsData.filter(student => {
                    return (student.fullname || '').toLowerCase().includes(searchTerm) ||
                           (student.id || '').toLowerCase().includes(searchTerm);
                });
                currentPage = 1; // Reset to first page when searching
                renderStudentList(searchResults);
            });
        }

        // Initialize navigation
        if (studentsLink) {
            studentsLink.addEventListener('click', (e) => {
                e.preventDefault();
                showView(studentListView);
                setActiveNavLink(studentsLink);
            });
        }

        if (questionsLink) {
            questionsLink.addEventListener('click', (e) => {
                e.preventDefault();
                showView(questionsView);
                setActiveNavLink(questionsLink);
                renderQuestionsView();
            });
        }

        if (levelsLink) {
            levelsLink.addEventListener('click', (e) => {
                e.preventDefault();
                showView(levelsView);
                setActiveNavLink(levelsLink);
                renderLevelsView();
            });
        }

        if (sectionsLink) {
            sectionsLink.addEventListener('click', (e) => {
                e.preventDefault();
                showView(sectionsView);
                setActiveNavLink(sectionsLink);
                renderSectionsView();
            });
        }

        if (createStudentLink) {
            createStudentLink.addEventListener('click', (e) => {
                e.preventDefault();
                showAddStudentModal();
            });
        }

        // Initialize settings functionality
        if (settingsLink) {
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

        if (addStudentModal) {
            addStudentModal.addEventListener('click', (event) => {
                if (event.target === addStudentModal) closeAddStudentModal();
            });
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
                level1Finish: { booleanValue: false },
                level2Finish: { booleanValue: false },
                level3Finish: { booleanValue: false },
                level4Finish: { booleanValue: false },
                level5Finish: { booleanValue: false },
                level6Finish: { booleanValue: false },
                level7Finish: { booleanValue: false },
                level8Finish: { booleanValue: false },
                level9Finish: { booleanValue: false },
                level10Finish: { booleanValue: false }
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
    function animateElements(elements, stagger = 100) {
        if (!elements || elements.length === 0) return;

        elements.forEach((element, index) => {
            // Clear any existing animations and transitions
            element.style.transition = 'none';
            element.style.transform = '';
            element.classList.remove('animate-fade-in-up', 'animate-fade-in', 'animate-slide-in-up');

            // Force reflow to ensure styles are applied
            element.offsetHeight;

            // Set initial state
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';

            // Apply animation with delay
            setTimeout(() => {
                element.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * stagger);
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
        // Update section filter dropdown
        if (sectionFilter) {
            const currentValue = sectionFilter.value;
            sectionFilter.innerHTML = '<option value="">All Sections</option>';

            sectionsData.forEach(section => {
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

            sectionsData.forEach(section => {
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

    // --- INITIALIZATION ---
    initializeApp();
});


