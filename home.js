document.addEventListener('DOMContentLoaded', () => {
    // --- ADMIN LOGIN CHECK ---
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        alert("Admin access required. Please log in as admin first.");
        window.location.href = 'index.html';
        return;
    }

    // --- CONFIGURATION ---
    const PROJECT_ID = "capstoneproject-2b428";
    const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0"; 
    const TEACHER_COLLECTION = "teacherData";

    // --- DOM ELEMENTS ---
    const logoutButton = document.getElementById('logoutButton');
    const teacherListContainer = document.getElementById('teacherListContainer');
    const loadingMessage = document.getElementById('loadingMessage');
    const searchTeacherInput = document.getElementById('searchTeacherInput'); // New

    let allTeachersData = []; // To store fetched teachers for client-side filtering

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

    // --- FUNCTIONS ---

// Inside home.js

// ... (other code remains the same) ...

    function renderTeacherList(teachersToDisplay) {
        teacherListContainer.innerHTML = ''; // Clear previous items or loading message

        if (teachersToDisplay.length === 0) {
            const noResultsMessage = document.createElement('p');
            noResultsMessage.textContent = "No teachers found matching your search or criteria.";
            noResultsMessage.id = "loadingMessage"; // Reuse styling
            teacherListContainer.appendChild(noResultsMessage);
            return;
        }

        teachersToDisplay.forEach(teacherDoc => {
            const teacherData = teacherDoc.fields;
            const teacherId = teacherData.id?.stringValue || teacherDoc.name.split('/').pop();

            const teacherItem = document.createElement('div');
            teacherItem.classList.add('teacher-item-box'); // Renamed class for clarity
            teacherItem.setAttribute('data-teacher-id', teacherId);

            // Simpler HTML structure for minimalism
            teacherItem.innerHTML = `
                <span class="teacher-name">${teacherData.fullname?.stringValue || 'N/A'}</span>
                <span class="teacher-detail">Email: ${teacherData.email?.stringValue || 'N/A'}</span>
                <span class="teacher-detail">ID: ${teacherId}</span>
                ${teacherData.username ? `<span class="teacher-detail">Username: ${teacherData.username?.stringValue || 'N/A'}</span>` : ''}
            `;
            // Consider adding an icon or "View Details >" for click affordance if needed

            teacherItem.addEventListener('click', () => {
                console.log(`Clicked teacher with ID: ${teacherId}. Full path: ${teacherDoc.name}`);
                window.location.href = `teacherInfo.html?id=${encodeURIComponent(teacherId)}`;
            });
            teacherListContainer.appendChild(teacherItem);
        });
    }

// ... (rest of home.js remains the same) ...

    function filterAndDisplayTeachers(searchTerm = "") {
        if (allTeachersData.length === 0) {
            renderTeacherList([]); // Show no results if no data fetched
            return;
        }

        const filteredTeachers = allTeachersData.filter(doc => {
            if (!doc.fields) return false;
            const teacher = doc.fields;
            const id = teacher.id?.stringValue || doc.name.split('/').pop();

            return (
                (teacher.fullname?.stringValue || '').toLowerCase().includes(searchTerm) ||
                (teacher.email?.stringValue || '').toLowerCase().includes(searchTerm) ||
                (id || '').toLowerCase().includes(searchTerm) ||
                (teacher.username?.stringValue || '').toLowerCase().includes(searchTerm)

            );
        });
        renderTeacherList(filteredTeachers);
    }


    async function fetchAllTeachers() {
        if (!teacherListContainer || !loadingMessage) return;

        loadingMessage.textContent = `Fetching teachers from "${TEACHER_COLLECTION}" collection...`;
        loadingMessage.style.display = 'block'; // Ensure it's visible
        teacherListContainer.innerHTML = ''; // Clear old content
        teacherListContainer.appendChild(loadingMessage); // Put loading message inside

        try {
            // Remove orderBy if you don't have the index or don't need default sorting from Firestore
            // const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${TEACHER_COLLECTION}?key=${API_KEY}&orderBy=fields.fullname.stringValue`;
            const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${TEACHER_COLLECTION}?key=${API_KEY}&pageSize=300`; // Fetch more if needed, default is small

            const response = await fetch(url);

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error fetching teachers:", errorData);
                let detailedError = errorData.error?.message || response.statusText;
                if (errorData.error?.details && errorData.error.details[0]?.description) {
                    detailedError += ` Details: ${errorData.error.details[0].description}`;
                }
                if (url.includes("orderBy=") && detailedError.includes("requires an index")) {
                    detailedError += " Please check your Firestore indexes. The error message might contain a link to create it.";
                }
                loadingMessage.textContent = `Error fetching teachers: ${detailedError}`;
                loadingMessage.style.color = 'red';
                return;
            }

            const data = await response.json();

            if (data.documents && data.documents.length > 0) {
                allTeachersData = data.documents.filter(doc => doc && doc.fields); // Store valid documents
                filterAndDisplayTeachers(); // Initial display with no filter
            } else {
                allTeachersData = [];
                loadingMessage.textContent = `No teachers found in the "${TEACHER_COLLECTION}" collection.`;
            }
        } catch (error) {
            console.error("Exception while fetching teachers:", error);
            allTeachersData = [];
            loadingMessage.textContent = "An error occurred while loading teachers.";
            loadingMessage.style.color = 'red';
        }
    }

    // --- INITIALIZATION ---
    fetchAllTeachers();
});