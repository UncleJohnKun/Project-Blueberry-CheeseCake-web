document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');

    // Get DOM elements
    const loadingMessage = document.getElementById('loadingMessage');
    const studentDetailsContent = document.getElementById('studentDetailsContent');
    const errorMessage = document.getElementById('errorMessage');

    // Sidebar elements
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
    const mobileSidebarClose = document.getElementById('mobileSidebarClose');
    const logoutButton = document.getElementById('logoutButton');

    // Header elements
    const studentName = document.getElementById('studentName');
    const studentIdHeader = document.getElementById('studentId');

    // Detail elements
    const detailFullName = document.getElementById('detailFullName');
    const detailUsername = document.getElementById('detailUsername');
    const detailPassword = document.getElementById('detailPassword');
    const detailStudentId = document.getElementById('detailStudentId');
    const detailTeacherId = document.getElementById('detailTeacherId');
    const detailSection = document.getElementById('detailSection');
    const detailProgress = document.getElementById('detailProgress');
    const detailLevelsCompleted = document.getElementById('detailLevelsCompleted');
    const progressLevels = document.getElementById('progressLevels');

    // Initialize the page
    initializeUI();
    initializeStudentDetails();
    
    async function initializeStudentDetails() {
        try {
            // Check if we have student data in session storage
            const storedStudentData = sessionStorage.getItem('selectedStudentData');
            
            if (storedStudentData) {
                const studentData = JSON.parse(storedStudentData);
                displayStudentDetails(studentData);
            } else if (studentId) {
                // If no stored data but we have an ID, try to fetch from API
                await fetchStudentDetails(studentId);
            } else {
                throw new Error('No student ID provided');
            }
            
        } catch (error) {
            console.error('Error initializing student details:', error);
            showError('Failed to load student details: ' + error.message);
        }
    }
    
    async function fetchStudentDetails(studentId) {
        // In a real implementation, you would fetch from your API
        // For now, we'll show an error since we don't have the API endpoint
        throw new Error('Student data not available. Please navigate from the teacher portal.');
    }
    
    function displayStudentDetails(studentData) {
        try {
            // Debug: Log the student data to see what we're working with
            console.log('Student data received:', studentData);

            // Hide loading message
            loadingMessage.style.display = 'none';

            // Show content
            studentDetailsContent.style.display = 'block';

            // Populate header
            studentName.textContent = studentData.fullname || 'Unknown Student';
            studentIdHeader.textContent = `Student ID: ${studentData.id || 'N/A'}`;

            // Populate basic information
            detailFullName.textContent = studentData.fullname || 'N/A';
            detailUsername.textContent = studentData.username || 'N/A';
            detailPassword.textContent = studentData.password || 'N/A';
            detailStudentId.textContent = studentData.id || 'N/A';
            detailTeacherId.textContent = studentData.teacherID || 'N/A';
            detailSection.textContent = studentData.section || 'No Section';

            // Calculate and display progress
            const progressData = calculateProgress(studentData);
            detailProgress.textContent = `${progressData.percentage}%`;
            detailLevelsCompleted.textContent = `${progressData.completed} / ${progressData.total}`;

            // Display level progress
            displayLevelProgress(studentData, progressData);

        } catch (error) {
            console.error('Error displaying student details:', error);
            showError('Error displaying student details: ' + error.message);
        }
    }
    
    function calculateProgress(studentData) {
        const totalLevels = 12;
        let completedLevels = 0;

        for (let i = 1; i <= totalLevels; i++) {
            if (studentData[`level${i}Finish`]) {
                completedLevels++;
            }
        }

        const percentage = totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0;

        return {
            completed: completedLevels,
            total: totalLevels,
            percentage: percentage
        };
    }
    
    function displayLevelProgress(studentData, progressData) {
        progressLevels.innerHTML = '';

        for (let i = 1; i <= progressData.total; i++) {
            const levelCard = document.createElement('div');
            levelCard.classList.add('level-card');

            // Get data from Firebase structure
            const isCompleted = studentData[`level${i}Finish`] === true;
            const score = studentData[`level${i}Score`];
            const dateFinished = studentData[`level${i}DateFinished`];

            // Determine card styling based on completion status
            if (isCompleted) {
                levelCard.classList.add('completed');
            } else {
                levelCard.classList.add('not-finished');
            }

            // Format the completion status and score
            let statusText = '';
            let scoreText = '';
            let dateText = '';

            if (isCompleted) {
                statusText = 'FINISHED';
                // Show actual score if it's greater than 0, otherwise show N/A
                if (score !== undefined && score !== null && score > 0) {
                    scoreText = `Score: ${score}`;
                } else {
                    scoreText = 'Score: N/A';
                }

                // Format date if available
                if (dateFinished) {
                    const date = new Date(dateFinished);
                    dateText = `<div class="level-date">Finished: ${date.toLocaleDateString()}</div>`;
                } else {
                    // If no date is stored, show a generic completion message
                    dateText = `<div class="level-date">Completed</div>`;
                }
            } else {
                statusText = 'NOT FINISHED';
                // For unfinished levels, show current score if any attempts were made
                if (score !== undefined && score !== null && score > 0) {
                    scoreText = `Best Score: ${score}`;
                } else {
                    scoreText = 'No Score Yet';
                }
            }

            levelCard.innerHTML = `
                <div class="level-number">Level ${i}</div>
                <div class="level-status">${statusText}</div>
                <div class="level-score">${scoreText}</div>
                ${dateText}
            `;

            progressLevels.appendChild(levelCard);
        }
    }

    function showError(message) {
        loadingMessage.style.display = 'none';
        studentDetailsContent.style.display = 'none';
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

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

        // Initialize logout functionality
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                sessionStorage.removeItem('isAdminLoggedIn');
                sessionStorage.removeItem('isTeacherLoggedIn');
                sessionStorage.removeItem('teacherId');
                sessionStorage.removeItem('selectedStudentData');
                alert('Logged out.');
                window.location.href = 'index.html';
            });
        }
    }

    // Clear stored student data when leaving the page
    window.addEventListener('beforeunload', function() {
        sessionStorage.removeItem('selectedStudentData');
    });
});
