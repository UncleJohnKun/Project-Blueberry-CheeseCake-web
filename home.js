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
    const teacherTableBody = document.getElementById('teacherTableBody');
    const loadingMessage = document.getElementById('loadingMessage');
    const searchTeacherInput = document.getElementById('searchTeacherInput');

    // Mobile sidebar elements
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    const mobileSidebarClose = document.getElementById('mobileSidebarClose');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    // Settings modal elements
    const settingsLink = document.getElementById('settingsLink');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsButton = document.getElementById('closeSettingsButton');

    // --- DETAIL VIEW DOM ELEMENTS ---
    const teacherListView = document.getElementById('teacherListView');
    const teacherDetailView = document.getElementById('teacherDetailView');
    const backToTeachersButton = document.getElementById('backToTeachersButton');
    const teacherDetailTitle = document.getElementById('teacherDetailTitle');
    const teacherDetailInfo = document.getElementById('teacherDetailInfo');
    const studentListTitle = document.getElementById('studentListTitle');
    const studentList = document.getElementById('studentList');
    const searchStudentInput = document.getElementById('searchStudentInput');
    const teacherInfoToggle = document.getElementById('teacherInfoToggle');

    // --- LEGACY MODAL DOM ELEMENTS (for compatibility) ---
    const teacherInfoModal = document.getElementById('teacherInfoModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const modalTeacherName = document.getElementById('modalTeacherName');
    const modalTeacherInfo = document.getElementById('modalTeacherInfo');
    const modalStudentListTitle = document.getElementById('modalStudentListTitle');
    const modalStudentList = document.getElementById('modalStudentList');

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

    // Mobile sidebar toggle functionality
    if (mobileSidebarToggle && sidebar && sidebarOverlay) {
        console.log("Mobile sidebar elements found, adding event listeners");
        mobileSidebarToggle.addEventListener('click', () => {
            console.log("Mobile sidebar toggle clicked");
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('active');
            console.log("Classes added - sidebar:", sidebar.classList.contains('mobile-open'), "overlay:", sidebarOverlay.classList.contains('active'));
        });

        sidebarOverlay.addEventListener('click', () => {
            console.log("Sidebar overlay clicked");
            sidebar.classList.remove('mobile-open');
            sidebarOverlay.classList.remove('active');
        });

        // Mobile sidebar close button
        if (mobileSidebarClose) {
            mobileSidebarClose.addEventListener('click', () => {
                console.log("Mobile sidebar close button clicked");
                sidebar.classList.remove('mobile-open');
                sidebarOverlay.classList.remove('active');
            });
        }
    } else {
        console.log("Mobile sidebar elements not found:", {
            mobileSidebarToggle: !!mobileSidebarToggle,
            sidebar: !!sidebar,
            sidebarOverlay: !!sidebarOverlay
        });
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

    // Detail view event listeners
    if (backToTeachersButton) {
        backToTeachersButton.addEventListener('click', showTeacherList);
    }

    // Teacher info toggle functionality
    if (teacherInfoToggle) {
        teacherInfoToggle.addEventListener('click', () => {
            const content = teacherDetailInfo;
            const isCollapsed = content.classList.contains('collapsed');

            if (isCollapsed) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
                teacherInfoToggle.textContent = 'Collapse';
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
                teacherInfoToggle.textContent = 'Expand';
            }
        });
    }

    // Sidebar Teachers link event listener
    const teachersNavLink = document.querySelector('.sidebar-nav-link.active');
    if (teachersNavLink) {
        teachersNavLink.addEventListener('click', (e) => {
            e.preventDefault();
            showTeacherList();
        });
    }

    // Legacy modal event listeners
    if (closeModalButton) closeModalButton.addEventListener('click', closeTeacherModal);
    if (teacherInfoModal) {
        teacherInfoModal.addEventListener('click', (event) => {
            if (event.target === teacherInfoModal) closeTeacherModal();
        });
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (settingsModal && settingsModal.classList.contains('active')) {
                closeSettingsModal();
            } else if (teacherInfoModal && teacherInfoModal.classList.contains('active')) {
                closeTeacherModal();
            }
        }
    });

    // --- MOBILE TAB SWITCHING ---
    function initializeMobileTabs() {
        // Handle legacy modal mobile tabs only
        const mobileNavButtons = document.querySelectorAll('.mobile-modal-nav .mobile-nav-btn');
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

    // --- DETAIL VIEW FUNCTIONS ---
    function showTeacherDetail() {
        if (teacherListView && teacherDetailView) {
            teacherListView.classList.remove('active');
            teacherDetailView.classList.add('active');
        }
    }

    function showTeacherList() {
        if (teacherListView && teacherDetailView) {
            teacherDetailView.classList.remove('active');
            teacherListView.classList.add('active');
        }
    }

    // --- LEGACY MODAL FUNCTIONS ---
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

    // --- SETTINGS MODAL FUNCTIONS ---
    function openSettingsModal() {
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            setTimeout(() => settingsModal.classList.add('active'), 10);
        } else {
            console.error("home.js: settingsModal element not found.");
        }
    }

    function closeSettingsModal() {
        if (settingsModal) {
            settingsModal.classList.remove('active');
            setTimeout(() => settingsModal.style.display = 'none', 300);
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

    function displayTeacherDataInDetailView(mainDocFields, studentDocs = []) {
        if (!teacherDetailTitle || !teacherDetailInfo || !studentListTitle || !studentList) {
            console.error("home.js: Essential detail view DOM elements not found for display.");
            return;
        }

        // Store students data for filtering
        allStudentsData = studentDocs;

        // Clear search input
        if (searchStudentInput) {
            searchStudentInput.value = '';
        }

        teacherDetailTitle.textContent = formatFirestoreValue(mainDocFields.fullname) || 'Teacher Details';

        // Clear previous content
        teacherDetailInfo.innerHTML = '';

        // Create teacher info fields
        const fields = [
            { label: 'Full Name', value: formatFirestoreValue(mainDocFields.fullname) },
            { label: 'Email', value: formatFirestoreValue(mainDocFields.email) },
            { label: 'Teacher ID', value: formatFirestoreValue(mainDocFields.id) },
            { label: 'Username', value: formatFirestoreValue(mainDocFields.username) },
            { label: 'Password', value: formatFirestoreValue(mainDocFields.password), isPassword: true }
        ];

        // Populate teacher info
        fields.forEach(field => {
            const p = document.createElement('p');

            if (field.isPassword) {
                p.innerHTML = `
                    <strong>${field.label}:</strong>
                    <span class="password-container">
                        <span class="password-value" data-password="${field.value || 'N/A'}" style="display: none;">${field.value || 'N/A'}</span>
                        <span class="password-dots">••••••••</span>
                        <button class="password-toggle-btn" style="margin-left: 10px; padding: 4px 8px; font-size: 0.75rem; border: 1px solid var(--border-light); background: var(--btn-secondary); border-radius: var(--radius-sm); cursor: pointer;">Show</button>
                    </span>
                `;

                // Add toggle functionality
                const toggleBtn = p.querySelector('.password-toggle-btn');
                const passwordValue = p.querySelector('.password-value');
                const passwordDots = p.querySelector('.password-dots');

                toggleBtn.addEventListener('click', () => {
                    const isHidden = passwordValue.style.display === 'none';
                    passwordValue.style.display = isHidden ? 'inline' : 'none';
                    passwordDots.style.display = isHidden ? 'none' : 'inline';
                    toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
                });
            } else {
                p.innerHTML = `<strong>${field.label}:</strong> <span>${field.value || 'N/A'}</span>`;
            }

            teacherDetailInfo.appendChild(p);
        });

        // Update student list title with count
        if (studentListTitle) {
            studentListTitle.textContent = `Students (${studentDocs.length})`;
        }

        // Display students
        displayStudentsInDetailView(studentDocs);
    }

    function displayStudentsInDetailView(studentsToDisplay) {
        if (!studentList) return;

        studentList.innerHTML = ''; // Clear previous students

        if (studentsToDisplay.length > 0) {
            studentsToDisplay.forEach(studentDoc => {
                const studentItemDiv = document.createElement('div');
                studentItemDiv.classList.add('student-item');

                const studentSummaryDiv = document.createElement('div');
                studentSummaryDiv.classList.add('student-summary');

                const studentFullName = studentDoc.fields?.fullname?.stringValue || 'Unknown Student';

                const summaryHeading = document.createElement('h4');
                summaryHeading.textContent = studentFullName;

                const toggleButton = document.createElement('button');
                toggleButton.classList.add('student-toggle-button');
                toggleButton.textContent = 'See More';

                studentSummaryDiv.appendChild(summaryHeading);
                studentSummaryDiv.appendChild(toggleButton);

                studentItemDiv.appendChild(studentSummaryDiv);
                studentList.appendChild(studentItemDiv);

                // Add event listener for the toggle button
                toggleButton.addEventListener('click', () => {
                    showStudentDetailsModal(studentDoc);
                });
            });
        } else {
            studentList.innerHTML = `<p>No students found associated with this teacher.</p>`;
        }
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
        // Use detail view if available, otherwise fall back to modal
        const targetList = studentList || modalStudentList;
        if (!targetList) return;

        targetList.innerHTML = ''; // Clear previous students

        if (studentsToDisplay.length > 0) {
            studentsToDisplay.forEach(studentDoc => {
                const studentItemDiv = document.createElement('div');
                studentItemDiv.classList.add('student-item');

                const studentSummaryDiv = document.createElement('div');
                studentSummaryDiv.classList.add('student-summary');

                const studentFullName = studentDoc.fields?.fullname?.stringValue || 'Unknown Student';

                // Calculate student progress for circular indicator
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
                    }
                }

                // Calculate completion percentage and stats
                const sortedLevels = Object.keys(levelData).map(Number).sort((a, b) => a - b);
                let totalScore = 0;
                let levelsFinished = 0;
                let totalLevels = sortedLevels.length;

                sortedLevels.forEach(levelNum => {
                    const score = levelData[levelNum].score !== undefined ? levelData[levelNum].score : 0;
                    const finished = levelData[levelNum].finish !== undefined ? levelData[levelNum].finish : false;
                    totalScore += parseInt(score) || 0;
                    if (finished) levelsFinished++;
                });

                const completionPercentage = totalLevels > 0 ? Math.round((levelsFinished / totalLevels) * 100) : 0;
                const circumference = 2 * Math.PI * 26;
                const strokeDashoffset = circumference * (1 - completionPercentage / 100);

                // Create student info section
                const studentInfoDiv = document.createElement('div');
                studentInfoDiv.classList.add('student-info');

                const summaryHeading = document.createElement('h4');
                summaryHeading.textContent = studentFullName;

                const studentStats = document.createElement('div');
                studentStats.classList.add('student-stats');
                studentStats.innerHTML = `
                    <span class="total-score">Total Score: ${totalScore}</span>
                    <span class="levels-completed">${levelsFinished}/${totalLevels} Levels</span>
                `;

                studentInfoDiv.appendChild(summaryHeading);
                studentInfoDiv.appendChild(studentStats);

                // Create circular progress indicator
                const progressDiv = document.createElement('div');
                progressDiv.classList.add('student-progress');
                progressDiv.innerHTML = `
                    <div class="circular-progress" data-percentage="${completionPercentage}">
                        <svg class="progress-ring" width="60" height="60">
                            <circle class="progress-ring-circle" stroke="#e0e0e0" stroke-width="4" fill="transparent" r="26" cx="30" cy="30"/>
                            <circle class="progress-ring-progress" stroke="#f39c12" stroke-width="4" fill="transparent" r="26" cx="30" cy="30"
                                    stroke-dasharray="${circumference}"
                                    stroke-dashoffset="${strokeDashoffset}"
                                    transform="rotate(-90 30 30)"/>
                        </svg>
                        <div class="progress-text">
                            <span class="percentage">${completionPercentage}%</span>
                            <span class="label">Complete</span>
                        </div>
                    </div>
                `;

                const toggleButton = document.createElement('button');
                toggleButton.classList.add('student-toggle-button');
                toggleButton.textContent = 'See More';

                studentSummaryDiv.appendChild(studentInfoDiv);
                studentSummaryDiv.appendChild(progressDiv);
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
                targetList.appendChild(studentItemDiv);

                // Add event listener for the toggle button
                toggleButton.addEventListener('click', () => {
                    showStudentDetailsModal(studentDoc);
                });
            });
        } else {
            targetList.innerHTML = `<p>No students found associated with this teacher.</p>`;
        }
    }

    async function handleTeacherItemClick(teacherDocPath) {
        console.log("home.js: handleTeacherItemClick - Fetching details for teacher path:", teacherDocPath);

        // Use detail view instead of modal
        if (!teacherDetailTitle || !teacherDetailInfo || !studentList || !studentListTitle) {
            console.error("home.js: One or more essential detail view elements are missing.");
            return;
        }

        teacherDetailTitle.textContent = "Loading Teacher...";
        teacherDetailInfo.innerHTML = "<p class='loading-text'>Loading main teacher data...</p>";
        studentList.innerHTML = "<p class='loading-text'>Waiting for teacher ID...</p>";
        showTeacherDetail();

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
                studentList.innerHTML = `<p class='loading-text'>Loading students for teacher ID: ${teacherIdToQueryStudents}...</p>`;
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
                    studentList.innerHTML = `<p class="error-message">Error fetching students: ${errorTextStudent}</p>`;
                }
            } else if (!teacherIdToQueryStudents) {
                 studentList.innerHTML = `<p>Cannot fetch students: Teacher ID is missing from teacher data.</p>`;
            } else {
                 studentList.innerHTML = `<p>Student data configuration error (collection or field name missing).</p>`;
            }

            displayTeacherDataInDetailView(mainDocFields, studentDocsAssociated);

        } catch (error) {
            console.error("home.js: Error in handleTeacherItemClick:", error);
            if (teacherDetailTitle) teacherDetailTitle.textContent = 'Error Loading Details';
            if (teacherDetailInfo) teacherDetailInfo.innerHTML = `<p class='error-message'>${error.message}</p>`;
            if (studentList) studentList.innerHTML = `<p class="error-message">Could not load student data due to an error: ${error.message}</p>`;
        }
    }

    // --- MAIN LIST FUNCTIONS ---
    function renderTeacherList(teachersToDisplay) {
        if (!teacherTableBody) {
            console.error("home.js: teacherTableBody not found");
            return;
        }

        // Clear existing rows
        teacherTableBody.innerHTML = '';

        if (teachersToDisplay.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    No teachers found.
                </td>
            `;
            teacherTableBody.appendChild(row);
            return;
        }

        teachersToDisplay.forEach(teacherDoc => {
            if (!teacherDoc || !teacherDoc.fields || !teacherDoc.name) return;

            const d = teacherDoc.fields;
            const name = formatFirestoreValue(d.fullname) || 'N/A';
            const email = formatFirestoreValue(d.email) || 'N/A';
            const username = formatFirestoreValue(d.username) || 'N/A';
            const path = teacherDoc.name;

            const row = document.createElement('tr');
            row.setAttribute('data-teacher-doc-path', path);
            row.style.cursor = 'pointer';

            row.innerHTML = `
                <td>
                    <div class="table-cell-primary">${name}</div>
                </td>
                <td>
                    <div class="table-cell-secondary">${username}</div>
                </td>
                <td>
                    <div class="table-cell-secondary">${email}</div>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn edit" title="Edit Teacher" data-action="edit" data-teacher-path="${path}">
                            ✏️
                        </button>
                        <button class="table-action-btn delete" title="Delete Teacher" data-action="delete" data-teacher-path="${path}">
                            🗑️
                        </button>
                    </div>
                </td>
            `;

            // Add click event to the row
            row.addEventListener('click', (e) => {
                // Handle action button clicks
                if (e.target.closest('.table-action-btn')) {
                    const button = e.target.closest('.table-action-btn');
                    const action = button.getAttribute('data-action');
                    const teacherPath = button.getAttribute('data-teacher-path');

                    if (action === 'edit') {
                        handleEditTeacher(teacherPath, teacherDoc);
                    } else if (action === 'delete') {
                        handleDeleteTeacher(teacherPath, name);
                    }
                    return;
                }

                // Row click to view details
                const docPath = row.getAttribute('data-teacher-doc-path');
                if (docPath) {
                    handleTeacherItemClick(docPath);
                } else {
                    alert("Error: No path.");
                }
            });

            teacherTableBody.appendChild(row);
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
        if (!teacherTableBody || !loadingMessage) {
            console.error("home.js: Teacher table body or loading message not found for fetchAllTeachers.");
            return;
        }
        loadingMessage.textContent = `Fetching teachers from "${TEACHER_COLLECTION}"...`;
        loadingMessage.style.display = 'block';

        // Show loading in table
        teacherTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <span id="loadingMessage">Loading teachers...</span>
                </td>
            </tr>
        `;

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

    // --- FIREBASE EDIT/DELETE FUNCTIONS ---
    async function handleEditTeacher(teacherPath, teacherDoc) {
        if (!teacherDoc || !teacherDoc.fields) {
            alert('Error: Teacher data not available');
            return;
        }

        const fields = teacherDoc.fields;
        const currentName = formatFirestoreValue(fields.fullname) || '';
        const currentEmail = formatFirestoreValue(fields.email) || '';
        const currentUsername = formatFirestoreValue(fields.username) || '';
        const currentId = formatFirestoreValue(fields.id) || '';
        const currentPassword = formatFirestoreValue(fields.password) || '';

        // Create edit form modal
        const editModal = document.createElement('div');
        editModal.className = 'modal-overlay active';
        editModal.style.display = 'flex';
        editModal.innerHTML = `
            <div class="modal-content settings-modal">
                <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <h2>Edit Teacher</h2>
                <div class="settings-content">
                    <form id="editTeacherForm" class="create-account-form">
                        <div class="form-group">
                            <label for="editFullName">Full Name</label>
                            <input type="text" id="editFullName" value="${currentName}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEmail">Email</label>
                            <input type="email" id="editEmail" value="${currentEmail}" required>
                        </div>
                        <div class="form-group">
                            <label for="editUsername">Username</label>
                            <input type="text" id="editUsername" value="${currentUsername}" required>
                        </div>
                        <div class="form-group">
                            <label for="editId">Teacher ID</label>
                            <input type="text" id="editId" value="${currentId}" required>
                        </div>
                        <div class="form-group">
                            <label for="editPassword">Password</label>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <input type="password" id="editPassword" value="${currentPassword}" required style="flex: 1;">
                                <button type="button" id="editPasswordToggle" style="padding: 8px 12px; background: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 12px; min-width: 50px;">Show</button>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn-primary">Update Teacher</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(editModal);

        // Add password toggle functionality
        const passwordInput = document.getElementById('editPassword');
        const passwordToggle = document.getElementById('editPasswordToggle');

        passwordToggle.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            passwordToggle.textContent = isPassword ? 'Hide' : 'Show';
        });

        // Handle form submission
        const editForm = document.getElementById('editTeacherForm');
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const updatedData = {
                fields: {
                    fullname: { stringValue: document.getElementById('editFullName').value },
                    email: { stringValue: document.getElementById('editEmail').value },
                    username: { stringValue: document.getElementById('editUsername').value },
                    id: { stringValue: document.getElementById('editId').value },
                    password: { stringValue: document.getElementById('editPassword').value },
                    // Preserve existing fields
                    timestamp: fields.timestamp || { timestampValue: new Date().toISOString() },
                    totalStudents: fields.totalStudents || { integerValue: "0" },
                    rizal_questions: fields.rizal_questions || { mapValue: { fields: {} } },
                    levelUnlocks: fields.levelUnlocks || { mapValue: { fields: {} } }
                }
            };

            try {
                if (!CONFIG) {
                    throw new Error("Configuration not loaded");
                }

                const updateUrl = `https://firestore.googleapis.com/v1/${teacherPath}?key=${CONFIG.apiKey}`;
                const response = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: "Failed to parse error" } }));
                    throw new Error(`Failed to update teacher: ${errorData.error?.message || response.statusText}`);
                }

                alert('Teacher updated successfully!');
                editModal.remove();

                // Refresh the teacher list
                await fetchAllTeachers();

            } catch (error) {
                console.error('Error updating teacher:', error);
                alert(`Error updating teacher: ${error.message}`);
            }
        });
    }

    async function handleDeleteTeacher(teacherPath, teacherName) {
        if (!confirm(`Are you sure you want to delete teacher "${teacherName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            if (!CONFIG) {
                throw new Error("Configuration not loaded");
            }

            const deleteUrl = `https://firestore.googleapis.com/v1/${teacherPath}?key=${CONFIG.apiKey}`;
            const response = await fetch(deleteUrl, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: "Failed to parse error" } }));
                throw new Error(`Failed to delete teacher: ${errorData.error?.message || response.statusText}`);
            }

            alert('Teacher deleted successfully!');

            // Refresh the teacher list
            await fetchAllTeachers();

        } catch (error) {
            console.error('Error deleting teacher:', error);
            alert(`Error deleting teacher: ${error.message}`);
        }
    }

    // --- STUDENT DETAILS MODAL FUNCTIONS ---
    function showStudentDetailsModal(studentDoc) {
        const modal = document.getElementById('studentDetailsModal');
        const modalTitle = document.getElementById('studentModalTitle');
        const modalBody = document.getElementById('studentModalBody');

        if (!modal || !modalTitle || !modalBody) {
            console.error('Student modal elements not found');
            return;
        }

        // Set modal title
        const studentName = studentDoc.fields?.fullname?.stringValue || 'Unknown Student';
        modalTitle.textContent = studentName;

        // Clear previous content
        modalBody.innerHTML = '';

        if (studentDoc.fields) {
            // Basic student information
            const basicInfo = [
                { key: 'email', label: 'Email' },
                { key: 'username', label: 'Username' },
                { key: 'password', label: 'Password', isPassword: true },
                { key: 'id', label: 'Student ID' },
                { key: 'timestamp', label: 'Registration Date' },
                { key: 'teacherID', label: 'Teacher ID' }
            ];

            // Create student info grid container
            const studentInfoGrid = document.createElement('div');
            studentInfoGrid.className = 'student-info-grid';

            basicInfo.forEach(field => {
                if (studentDoc.fields[field.key]) {
                    const infoItem = document.createElement('div');
                    infoItem.className = 'info-item';
                    const value = formatFirestoreValue(studentDoc.fields[field.key]);

                    if (field.isPassword) {
                        // Create password field with toggle
                        infoItem.innerHTML = `
                            <div class="info-label">${field.label}:</div>
                            <div class="info-value">
                                <span class="password-container">
                                    <span class="password-dots">••••••••</span>
                                    <span class="password-value" style="display: none;">${value}</span>
                                    <button class="password-toggle-btn">Show</button>
                                </span>
                            </div>
                        `;

                        // Add toggle functionality
                        const toggleBtn = infoItem.querySelector('.password-toggle-btn');
                        const passwordValue = infoItem.querySelector('.password-value');
                        const passwordDots = infoItem.querySelector('.password-dots');

                        toggleBtn.addEventListener('click', () => {
                            const isHidden = passwordValue.style.display === 'none';
                            passwordValue.style.display = isHidden ? 'inline' : 'none';
                            passwordDots.style.display = isHidden ? 'none' : 'inline';
                            toggleBtn.textContent = isHidden ? 'Hide' : 'Show';
                        });
                    } else {
                        infoItem.innerHTML = `
                            <div class="info-label">${field.label}:</div>
                            <div class="info-value">${value}</div>
                        `;
                    }

                    studentInfoGrid.appendChild(infoItem);
                }
            });

            modalBody.appendChild(studentInfoGrid);

            // Level progress section
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
                }
            }

            // Calculate progress statistics
            const sortedLevels = Object.keys(levelData).map(Number).sort((a, b) => a - b);
            let totalScore = 0;
            let levelsFinished = 0;
            let totalLevels = sortedLevels.length;

            sortedLevels.forEach(levelNum => {
                const score = levelData[levelNum].score !== undefined ? levelData[levelNum].score : 0;
                const finished = levelData[levelNum].finish !== undefined ? levelData[levelNum].finish : false;
                totalScore += parseInt(score) || 0;
                if (finished) levelsFinished++;
            });

            if (sortedLevels.length > 0) {
                // Progress summary section
                const progressSection = document.createElement('div');
                progressSection.className = 'progress-section';
                progressSection.innerHTML = `
                    <div class="progress-header">
                        <h4>Learning Progress</h4>
                    </div>
                    <div class="progress-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total Score:</span>
                            <span class="stat-value">${totalScore}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Levels Completed:</span>
                            <span class="stat-value">${levelsFinished}/${totalLevels}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Progress:</span>
                            <span class="stat-value">${Math.round((levelsFinished / totalLevels) * 100)}%</span>
                        </div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(levelsFinished / totalLevels) * 100}%"></div>
                        </div>
                        <span class="progress-text">${levelsFinished} of ${totalLevels} levels completed</span>
                    </div>
                `;
                modalBody.appendChild(progressSection);

                // Detailed level breakdown
                const levelDetails = document.createElement('div');
                levelDetails.className = 'level-details';
                levelDetails.innerHTML = '<h4>Level Details</h4>';

                const levelGrid = document.createElement('div');
                levelGrid.className = 'level-grid';

                sortedLevels.forEach(levelNum => {
                    const score = levelData[levelNum].score !== undefined ? levelData[levelNum].score : 0;
                    const finished = levelData[levelNum].finish !== undefined ? levelData[levelNum].finish : false;

                    const levelCard = document.createElement('div');
                    levelCard.className = `level-card ${finished ? 'completed' : 'incomplete'}`;
                    levelCard.innerHTML = `
                        <div class="level-number">Level ${levelNum}</div>
                        <div class="level-score">Score: ${score}</div>
                        <div class="level-status">${finished ? '✅ Completed' : '⏳ In Progress'}</div>
                    `;
                    levelGrid.appendChild(levelCard);
                });

                levelDetails.appendChild(levelGrid);
                modalBody.appendChild(levelDetails);
            }
        } else {
            const p = document.createElement('p');
            p.textContent = 'No student data available.';
            modalBody.appendChild(p);
        }

        // Show modal
        modal.classList.add('active');
    }

    function hideStudentDetailsModal() {
        const modal = document.getElementById('studentDetailsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Modal event listeners
    const studentModal = document.getElementById('studentDetailsModal');
    const studentModalClose = document.getElementById('studentModalClose');

    if (studentModalClose) {
        studentModalClose.addEventListener('click', hideStudentDetailsModal);
    }

    if (studentModal) {
        studentModal.addEventListener('click', (e) => {
            if (e.target === studentModal) {
                hideStudentDetailsModal();
            }
        });
    }

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

    // --- INITIALIZATION ---
    initializeApp();
});
