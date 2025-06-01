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

    if (!isLoggedIn) {
        alert("Please log in first.");
        window.location.href = 'index.html';
        return;
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
    const createStudentLink = document.getElementById('createStudentLink');
    
    // View containers
    const studentListView = document.getElementById('studentListView');
    const questionsView = document.getElementById('questionsView');
    const levelsView = document.getElementById('levelsView');

    // Mobile sidebar elements
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    const mobileSidebarClose = document.getElementById('mobileSidebarClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // --- TEACHER DATA ---
    let currentTeacherId = null;
    let teacherData = null;
    let allStudentsData = [];

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

    // --- RENDER FUNCTIONS ---
    function renderStudentList(students) {
        if (!studentTableBody) {
            console.error("Student table body element not found");
            return;
        }
        
        if (!students || students.length === 0) {
            loadingMessage.textContent = "No students found.";
            studentTableBody.innerHTML = '';
            return;
        }
        
        loadingMessage.style.display = 'none';
        studentTableBody.innerHTML = '';
        
        students.forEach(student => {
            try {
                const row = document.createElement('tr');
                
                // Calculate progress percentage (handle missing data gracefully)
                const progress = student.progress || 0;
                const progressPercent = Math.round(progress * 100);

                row.innerHTML = `
                    <td><a href="#" class="student-name-link" data-id="${student.id || ''}" data-student='${JSON.stringify(student).replace(/'/g, "&apos;")}'>${student.fullname || 'Unknown'}</a></td>
                    <td>${student.username || 'N/A'}</td>
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

        // Add entrance animations to student rows
        const studentRows = studentTableBody.querySelectorAll('tr');
        studentRows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            setTimeout(() => {
                row.style.transition = 'all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 100);
        });

        // Add hover animations after rendering
        addHoverAnimations();
    }

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
                const filteredStudents = allStudentsData.filter(student => {
                    return (student.fullname || '').toLowerCase().includes(searchTerm) ||
                           (student.id || '').toLowerCase().includes(searchTerm);
                });
                renderStudentList(filteredStudents);
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

        if (createStudentLink) {
            createStudentLink.addEventListener('click', (e) => {
                e.preventDefault();
                alert("Create student functionality");
                // In a real implementation, you would navigate to a create student page
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

    // Animation utility functions
    function animateElements(elements, stagger = 100) {
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(20px)';
            setTimeout(() => {
                element.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * stagger);
        });
    }

    function addHoverAnimations() {
        // Add hover animations to student cards
        const studentCards = document.querySelectorAll('.student-item');
        studentCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-3px)';
                card.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.1)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });
        });

        // Add hover animations to buttons
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-danger');
        buttons.forEach(button => {
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'translateY(-2px) scale(1.02)';
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    // --- INITIALIZATION ---
    initializeApp();
});


