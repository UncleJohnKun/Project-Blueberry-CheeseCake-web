document.addEventListener('DOMContentLoaded', () => {
    console.log("home.js: DOMContentLoaded");

    // --- ADMIN LOGIN CHECK ---
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        alert("Admin access required. Please log in as admin first.");
        window.location.href = '../index.html';
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
        logoutButton.addEventListener('click', handleLogout);
        console.log('Initial logout button event listener attached');
    } else {
        console.error('Logout button not found in DOM initially');
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
            console.log('Settings link clicked');
            openSettingsModal();
        });
        console.log('Settings link event listener attached');
    } else {
        console.error('Settings elements not found:', { settingsLink: !!settingsLink, settingsModal: !!settingsModal });
    }

    if (closeSettingsButton) {
        closeSettingsButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Close settings button clicked');
            closeSettingsModal();
        });
        console.log('Close settings button event listener attached');
    } else {
        console.error('Close settings button not found');
    }

    if (settingsModal) {
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                console.log('Settings modal overlay clicked');
                closeSettingsModal();
            }
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

    // CSV Export button
    const exportCsvButton = document.getElementById('exportCsvButton');
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', () => {
            exportStudentDataToCSV();
        });
    }

    // Excel Export button (for teacher list)
    const exportExcelButton = document.getElementById('exportExcelButton');
    if (exportExcelButton) {
        exportExcelButton.addEventListener('click', () => {
            exportTeachersToExcel();
        });
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

    // Animation utility functions - Fixed to prevent glitching
    function animateElements(elements, animationClass = 'animate-fade-in-up', stagger = 100) {
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

    function addHoverAnimations() {
        // Remove existing hover listeners to prevent duplicates
        const existingHoverElements = document.querySelectorAll('[data-hover-animated]');
        existingHoverElements.forEach(el => {
            el.removeAttribute('data-hover-animated');
            // Clone and replace to remove all event listeners
            const newEl = el.cloneNode(true);
            el.parentNode.replaceChild(newEl, el);
        });

        // Add hover animations to teacher cards
        const teacherCards = document.querySelectorAll('.teacher-item-box');
        teacherCards.forEach(card => {
            if (card.getAttribute('data-hover-animated')) return; // Skip if already animated

            card.setAttribute('data-hover-animated', 'true');
            card.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease-out';

            card.addEventListener('mouseenter', () => {
                if (!card.style.transform.includes('translateY')) {
                    card.style.transform = 'translateY(-3px)';
                    card.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.12)';
                }
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '';
            });
        });

        // Add hover animations to teacher table rows
        const teacherRows = document.querySelectorAll('#teacherTableBody tr');
        teacherRows.forEach(row => {
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
        console.log('openSettingsModal called');
        if (settingsModal) {
            console.log('Opening settings modal');
            settingsModal.style.display = 'flex';
            setTimeout(() => {
                settingsModal.classList.add('active');
                console.log('Settings modal opened successfully');

                // Ensure logout button event listener is attached
                attachLogoutButtonListener();
            }, 10);
        } else {
            console.error("home.js: settingsModal element not found.");
        }
    }

    // Function to attach logout button listener (can be called multiple times safely)
    function attachLogoutButtonListener() {
        const modalLogoutButton = document.getElementById('logoutButton');
        if (modalLogoutButton) {
            // Remove existing listener to prevent duplicates
            modalLogoutButton.removeEventListener('click', handleLogout);
            // Add the listener
            modalLogoutButton.addEventListener('click', handleLogout);
            console.log('Logout button event listener attached to modal button');
        } else {
            console.error('Logout button not found in settings modal');
        }
    }

    // Logout handler function
    function handleLogout(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log('Logout button clicked');

        if (confirm('Are you sure you want to logout?')) {
            console.log('Logout confirmed, clearing session data');

            // Clear all session data
            sessionStorage.clear();
            localStorage.clear();

            console.log('Session data cleared, redirecting to login');
            alert('Admin logged out successfully.');
            window.location.href = '../index.html';
        } else {
            console.log('Logout cancelled');
        }
    }

    function closeSettingsModal() {
        console.log('closeSettingsModal called');
        if (settingsModal) {
            console.log('Closing settings modal');
            settingsModal.classList.remove('active');
            setTimeout(() => {
                settingsModal.style.display = 'none';
                console.log('Settings modal closed successfully');
            }, 300);
        } else {
            console.error("home.js: settingsModal element not found for closing.");
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

        // Teacher Portal button removed as requested

        // Update student list title with count
        if (studentListTitle) {
            studentListTitle.textContent = `Students (${studentDocs.length})`;
        }

        // Display students using the comprehensive render function
        renderStudentList(studentDocs);
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
                const totalLevels = 12; // Always show out of 12 levels

                sortedLevels.forEach(levelNum => {
                    const score = levelData[levelNum].score !== undefined ? levelData[levelNum].score : 0;
                    const finished = levelData[levelNum].finish !== undefined ? levelData[levelNum].finish : false;
                    totalScore += parseInt(score) || 0;
                    if (finished) levelsFinished++;
                });

                const completionPercentage = Math.round((levelsFinished / totalLevels) * 100);
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

        // Add entrance animations to student items (fixed)
        const studentItems = targetList.querySelectorAll('.student-item');
        animateElements(studentItems, 'animate-fade-in-up', 80);
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

        // Hide loading message
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
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

        // Add entrance animations to teacher rows (fixed)
        const teacherRows = teacherTableBody.querySelectorAll('tr');
        animateElements(teacherRows, 'animate-fade-in-up', 60);

        // Add hover animations after rendering (with delay to avoid conflicts)
        setTimeout(() => {
            addHoverAnimations();
        }, teacherRows.length * 60 + 100);
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
        
        console.log("Fetching teachers from:", TEACHER_COLLECTION);
        loadingMessage.textContent = `Fetching teachers from "${TEACHER_COLLECTION}"...`;
        loadingMessage.style.display = 'block';

        // Show loading in table
        teacherTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <span>Loading teachers...</span>
                </td>
            </tr>
        `;

        try {
            if (!CONFIG) {
                throw new Error("Configuration not loaded. Please refresh the page.");
            }
            
            console.log("CONFIG loaded:", { projectId: CONFIG.projectId });
            
            const url = `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}/databases/(default)/documents/${TEACHER_COLLECTION}?key=${CONFIG.apiKey}&pageSize=300`;
            console.log("Fetching from URL:", url.replace(CONFIG.apiKey, 'API_KEY_HIDDEN'));
            
            const response = await fetch(url);
            console.log("Response status:", response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(()=>({ error: { message: "Failed to parse error JSON."} }));
                throw new Error(`Failed to fetch teachers (${response.status}): ${errorData.error?.message || response.statusText}`);
            }
            
            const data = await response.json();
            console.log("Data received:", data);
            
            if (data.documents && data.documents.length > 0) {
                allTeachersData = data.documents.filter(doc => doc && doc.fields && doc.name);
                console.log(`Loaded ${allTeachersData.length} teachers`);
                filterAndDisplayTeachers(); // This will hide loading and show teachers
            } else {
                allTeachersData = [];
                console.log("No teachers found in collection");
                loadingMessage.textContent = `No teachers found in the "${TEACHER_COLLECTION}" collection.`;
                renderTeacherList([]); // This will hide the loading message
            }
        } catch (error) {
            console.error("home.js: Exception in fetchAllTeachers:", error);
            allTeachersData = [];
            
            // Clear table loading row
            teacherTableBody.innerHTML = '';
            
            if (loadingMessage) {
                loadingMessage.textContent = `Error loading teachers: ${error.message}`;
                loadingMessage.style.color = 'red';
                loadingMessage.style.display = 'block';
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

        // Add edit button to modal header
        const existingEditBtn = modal.querySelector('.student-edit-btn');
        if (existingEditBtn) {
            existingEditBtn.remove();
        }

        const editButton = document.createElement('button');
        editButton.className = 'student-edit-btn';
        editButton.textContent = 'Edit';
        editButton.onclick = () => showEditStudentModal(studentDoc);
        modal.querySelector('.student-modal-content').appendChild(editButton);

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
                { key: 'teacherID', label: 'Teacher ID' },
                { key: 'section', label: 'Section' } // <-- Added section
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
            const totalLevels = 12; // Always show out of 12 levels

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
                            <span class="stat-label">Progress:</span>
                            <span class="stat-value">${Math.round((levelsFinished / totalLevels) * 100)}%</span>
                        </div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(levelsFinished / totalLevels) * 100}%"></div>
                        </div>
                    </div>
                `;
                modalBody.appendChild(progressSection);

                // Detailed level breakdown
                const levelDetails = document.createElement('div');
                levelDetails.className = 'level-details';
                levelDetails.innerHTML = '<h4>Level Details</h4>';

                const levelGrid = document.createElement('div');
                levelGrid.className = 'level-grid';

                // Show all levels 1-12, regardless of whether they have data
                for (let levelNum = 1; levelNum <= 12; levelNum++) {
                    const score = levelData[levelNum]?.score !== undefined ? levelData[levelNum].score : 0;
                    const finished = levelData[levelNum]?.finish !== undefined ? levelData[levelNum].finish : false;

                    const levelCard = document.createElement('div');
                    levelCard.className = `level-card ${finished ? 'completed' : 'incomplete'}`;
                    levelCard.innerHTML = `
                        <div class="level-number">Level ${levelNum}</div>
                        <div class="level-score">Score: ${score}</div>
                        <div class="level-status">${finished ? '✅ Completed' : '⏳ In Progress'}</div>
                    `;
                    levelGrid.appendChild(levelCard);
                }

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

    function showEditStudentModal(studentDoc) {
        const studentName = studentDoc.fields?.fullname?.stringValue || 'Unknown Student';
        const studentId = studentDoc.fields?.id?.stringValue || '';
        const studentUsername = studentDoc.fields?.username?.stringValue || '';
        const studentPassword = studentDoc.fields?.password?.stringValue || '';

        // Create edit form modal
        const editModal = document.createElement('div');
        editModal.className = 'modal-overlay student-edit-modal';
        editModal.style.display = 'flex';
        editModal.innerHTML = `
            <div class="modal-content settings-modal">
                <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <h2>Edit Student: ${studentName}</h2>
                <div class="settings-content">
                    <form id="editStudentForm" class="create-account-form">
                        <div class="form-group">
                            <label for="editStudentFullName">Full Name</label>
                            <input type="text" id="editStudentFullName" value="${studentName}" required>
                        </div>
                        <div class="form-group">
                            <label for="editStudentUsername">Username</label>
                            <input type="text" id="editStudentUsername" value="${studentUsername}" required>
                        </div>
                        <div class="form-group">
                            <label for="editStudentId">Student ID</label>
                            <input type="text" id="editStudentId" value="${studentId}" required>
                        </div>
                        <div class="form-group">
                            <label for="editStudentPassword">Password</label>
                            <input type="text" id="editStudentPassword" value="${studentPassword}" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(editModal);

        // Add animation effect similar to student details modal
        setTimeout(() => {
            editModal.classList.add('active');
        }, 10);

        // Handle form submission
        const form = editModal.querySelector('#editStudentForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateStudentData(studentDoc, editModal);
        });
    }

    async function updateStudentData(studentDoc, editModal) {
        try {
            // Get the student document path
            const studentPath = studentDoc.name;

            // Get form values
            const updatedData = {
                fields: {
                    fullname: { stringValue: document.getElementById('editStudentFullName').value },
                    username: { stringValue: document.getElementById('editStudentUsername').value },
                    id: { stringValue: document.getElementById('editStudentId').value },
                    password: { stringValue: document.getElementById('editStudentPassword').value },
                    // Preserve existing fields that shouldn't be edited
                    email: studentDoc.fields.email || { stringValue: '' },
                    teacherID: studentDoc.fields.teacherID || { stringValue: '' },
                    timestamp: studentDoc.fields.timestamp || { timestampValue: new Date().toISOString() }
                }
            };

            // Preserve all level data
            for (const fieldName in studentDoc.fields) {
                if (fieldName.startsWith('level') && (fieldName.endsWith('Finish') || fieldName.endsWith('Score'))) {
                    updatedData.fields[fieldName] = studentDoc.fields[fieldName];
                }
            }

            if (!CONFIG) {
                throw new Error("Configuration not loaded");
            }

            const updateUrl = `https://firestore.googleapis.com/v1/${studentPath}?key=${CONFIG.apiKey}`;
            const response = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: { message: "Failed to parse error" } }));
                throw new Error(`Failed to update student: ${errorData.error?.message || response.statusText}`);
            }

            alert('Student updated successfully!');
            editModal.remove();

            // Refresh the current view by re-fetching the teacher data
            if (currentTeacherDoc) {
                const teacherPath = currentTeacherDoc.name;
                await handleTeacherItemClick(teacherPath);
            }

            // Close the student details modal and reopen it with updated data
            hideStudentDetailsModal();
            const updatedStudentDoc = await response.json();
            setTimeout(() => showStudentDetailsModal(updatedStudentDoc), 300);

        } catch (error) {
            console.error('Error updating student:', error);
            alert(`Error updating student: ${error.message}`);
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

    // === EXPORT TEACHERS TO EXCEL ===
    function exportTeachersToExcel() {
        if (!allTeachersData || allTeachersData.length === 0) {
            alert('No teacher data available to export.');
            return;
        }

        try {
            // Check if XLSX library is loaded
            if (typeof XLSX === 'undefined') {
                alert('Excel export library not loaded. Please refresh the page and try again.');
                console.error('XLSX library is not loaded');
                return;
            }

            // Prepare data for Excel
            const exportData = allTeachersData.map(teacherDoc => {
                const fields = teacherDoc.fields || {};
                
                return {
                    'Full Name': fields.fullname?.stringValue || 'N/A',
                    'Username': fields.username?.stringValue || 'N/A',
                    'Email': fields.email?.stringValue || 'N/A',
                    'Teacher ID': fields.id?.stringValue || 'N/A',
                    'Registration Date': fields.timestamp?.timestampValue 
                        ? new Date(fields.timestamp.timestampValue).toLocaleDateString() 
                        : 'N/A'
                };
            });

            // Create workbook and worksheet
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(exportData);

            // Set column widths
            ws['!cols'] = [
                { wch: 25 }, // Full Name
                { wch: 20 }, // Username
                { wch: 30 }, // Email
                { wch: 15 }, // Teacher ID
                { wch: 18 }  // Registration Date
            ];

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, "Teachers");

            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `Teachers_Export_${timestamp}.xlsx`;

            // Save file
            XLSX.writeFile(wb, filename);

            // Show success message
            console.log(`Teachers exported successfully: ${filename}`);
            alert(`Teachers exported successfully!\nFile: ${filename}\nTotal teachers: ${allTeachersData.length}`);

        } catch (error) {
            console.error('Error exporting teachers to Excel:', error);
            alert('Error exporting teacher data. Please try again.');
        }
    }

    // === CSV EXPORT FUNCTIONALITY ===
    function exportStudentDataToCSV() {
        if (!allStudentsData || allStudentsData.length === 0) {
            alert('No student data available to export. Please select a teacher first.');
            return;
        }

        try {
            // Get current teacher name for filename
            const teacherName = teacherDetailTitle?.textContent || 'Teacher';
            const sanitizedTeacherName = teacherName.replace(/[^a-zA-Z0-9]/g, '_');

            // Prepare CSV data with comprehensive headers
            const csvHeaders = [
                'Student Name',
                'Username',
                'Student ID',
                'Email',
                'Password',
                'Teacher ID',
                'Registration Date',
                'Total Levels Completed',
                'Total Score',
                'Average Score',
                'Progress Percentage',
                'Level 1 Score',
                'Level 1 Completed',
                'Level 2 Score',
                'Level 2 Completed',
                'Level 3 Score',
                'Level 3 Completed',
                'Level 4 Score',
                'Level 4 Completed',
                'Level 5 Score',
                'Level 5 Completed',
                'Level 6 Score',
                'Level 6 Completed',
                'Level 7 Score',
                'Level 7 Completed',
                'Level 8 Score',
                'Level 8 Completed',
                'Level 9 Score',
                'Level 9 Completed',
                'Level 10 Score',
                'Level 10 Completed',
                'Level 11 Score',
                'Level 11 Completed',
                'Level 12 Score',
                'Level 12 Completed',
                'Highest Level Reached',
                'Last Activity Date',
                'Account Status'
            ];

            // Process each student's data
            const csvRows = allStudentsData.map(studentDoc => {
                const fields = studentDoc.fields || {};

                // Basic student information
                const studentName = fields.fullname?.stringValue || 'N/A';
                const username = fields.username?.stringValue || 'N/A';
                const studentId = fields.id?.stringValue || 'N/A';
                const email = fields.email?.stringValue || 'N/A';
                const password = fields.password?.stringValue || 'N/A';
                const teacherId = fields.teacherID?.stringValue || 'N/A';

                // Registration date
                const timestamp = fields.timestamp?.timestampValue || fields.timestamp?.stringValue || 'N/A';
                const registrationDate = timestamp !== 'N/A' ? new Date(timestamp).toLocaleDateString() : 'N/A';

                // Calculate level progress and scores
                let totalLevelsCompleted = 0;
                let totalScore = 0;
                let levelScores = [];
                let levelCompletions = [];
                let highestLevel = 0;

                // Process levels 1-12
                for (let i = 1; i <= 12; i++) {
                    const scoreField = fields[`level${i}Score`]?.integerValue || fields[`level${i}Score`]?.stringValue || '0';
                    const finishField = fields[`level${i}Finish`]?.booleanValue || fields[`level${i}Finish`]?.stringValue || false;

                    const score = parseInt(scoreField) || 0;
                    const isCompleted = finishField === true || finishField === 'true';

                    levelScores.push(score);
                    levelCompletions.push(isCompleted ? 'Yes' : 'No');

                    if (isCompleted) {
                        totalLevelsCompleted++;
                        highestLevel = i;
                    }

                    totalScore += score;
                }

                // Calculate statistics
                const averageScore = totalLevelsCompleted > 0 ? (totalScore / totalLevelsCompleted).toFixed(2) : '0.00';
                const progressPercentage = ((totalLevelsCompleted / 12) * 100).toFixed(1) + '%';

                // Determine account status
                const accountStatus = totalLevelsCompleted === 0 ? 'Inactive' :
                                   totalLevelsCompleted === 12 ? 'Completed' : 'Active';

                // Last activity (use the highest completed level's timestamp if available)
                const lastActivity = registrationDate; // Could be enhanced with actual last activity tracking

                // Build the row data
                const rowData = [
                    studentName,
                    username,
                    studentId,
                    email,
                    password,
                    teacherId,
                    registrationDate,
                    totalLevelsCompleted,
                    totalScore,
                    averageScore,
                    progressPercentage,
                    ...levelScores, // Level 1-12 scores
                    ...levelCompletions, // Level 1-12 completion status
                    highestLevel || 'None',
                    lastActivity,
                    accountStatus
                ];

                return rowData;
            });

            // Convert to CSV format
            const csvContent = [
                csvHeaders.join(','),
                ...csvRows.map(row =>
                    row.map(cell => {
                        // Escape commas and quotes in cell content
                        const cellStr = String(cell);
                        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                            return `"${cellStr.replace(/"/g, '""')}"`;
                        }
                        return cellStr;
                    }).join(',')
                )
            ].join('\n');

            // Create and download the file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');

            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `${sanitizedTeacherName}_Students_Export_${new Date().toISOString().split('T')[0]}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // Show success message
                alert(`Student data exported successfully!\nFile: ${sanitizedTeacherName}_Students_Export_${new Date().toISOString().split('T')[0]}.csv\nTotal students: ${allStudentsData.length}`);
            } else {
                // Fallback for older browsers
                alert('CSV export is not supported in this browser. Please use a modern browser.');
            }

        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Error exporting student data. Please try again.');
        }
    }

    // --- LOGOUT HANDLER ---
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault();
            
            // Clear all session data
            sessionStorage.clear();
            
            // Redirect to login page
            window.location.href = '../index.html';
        });
    }

    // --- INITIALIZATION ---
    initializeApp();
});

// Global function for logout (accessible from inline onclick)
window.performLogout = function() {
    console.log('Global performLogout called');
    
    // Prevent any default behavior
    event.preventDefault();
    event.stopPropagation();
    
    const confirmLogout = confirm('Are you sure you want to logout?');
    console.log('Logout confirmation result:', confirmLogout);
    
    if (confirmLogout) {
        console.log('Logout confirmed, clearing session data');
        
        try {
            // Clear all session data
            sessionStorage.clear();
            localStorage.clear();
            
            console.log('Session data cleared successfully');
            
            // Show success message
            alert('You have been logged out successfully.');
            
            console.log('Redirecting to login page');
            // Use absolute path for redirect
            window.location.replace('/index.html');
        } catch (error) {
            console.error('Error during logout:', error);
            alert('Logout completed. Redirecting to login page.');
            window.location.replace('/index.html');
        }
    } else {
        console.log('Logout cancelled by user');
    }
    
    return false;
};
