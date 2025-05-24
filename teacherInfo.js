import { 
    PROJECT_ID, 
    API_KEY, 
    STUDENT_COLLECTION, 
    FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER,
    formatFirestoreValue,
    fetchTeacherData,
    fetchStudentsForTeacher
} from './shared/teacherUtils.js';

document.addEventListener('DOMContentLoaded', async () => {
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        window.location.href = 'home.html';
        return;
    }

    const teacherNameHeading = document.getElementById('teacherNameHeading');
    const mainTeacherInfoContent = document.getElementById('mainTeacherInfoContent');
    const studentListNameHeading = document.getElementById('studentListNameHeading');
    const studentListContent = document.getElementById('studentListContent');
    const backToHomeButton = document.getElementById('backToHomeButton');

    async function loadTeacherInformation() {
        const params = new URLSearchParams(window.location.search);
        let teacherDocPath = params.get('path');
        
        try {
            mainTeacherInfoContent.innerHTML = "<p>Loading teacher data...</p>";
            
            const mainDocData = await fetchTeacherData(teacherDocPath);
            const mainDocFields = mainDocData.fields;
            if (!mainDocFields) throw new Error("Teacher data malformed.");

            teacherNameHeading.textContent = formatFirestoreValue(mainDocFields.fullname) || "Teacher Information";
            const teacherIdToQueryStudents = (mainDocFields.id?.stringValue || "").trim();

            mainTeacherInfoContent.innerHTML = "";
            const fieldsToShow = ["fullname", "email", "id", "username", "password", "totalStudents", "timestamp"];
            fieldsToShow.forEach(fName => {
                if (mainDocFields[fName]) {
                    const p = document.createElement('p');
                    const strong = document.createElement('strong');
                    strong.textContent = `${fName.charAt(0).toUpperCase() + fName.slice(1)}:`;
                    p.appendChild(strong);
                    p.innerHTML += ` ${formatFirestoreValue(mainDocFields[fName])}`;
                    mainTeacherInfoContent.appendChild(p);
                }
            });

            if (studentListNameHeading) studentListNameHeading.textContent = "Associated Students";
            if (studentListContent) studentListContent.innerHTML = "<p class='loading-text'>Loading student data...</p>";

            if (teacherIdToQueryStudents) {
                const studentResults = await fetchStudentsForTeacher(teacherIdToQueryStudents);
                const fetchedStudents = studentResults.map(result => result.document).filter(doc => doc);
                
                if (studentListContent) studentListContent.innerHTML = "";
                if (studentListNameHeading) studentListNameHeading.textContent = `Associated Students (${fetchedStudents.length})`;

                if (fetchedStudents.length > 0) {
                    fetchedStudents.forEach(sDoc => {
                        const studentItemContainer = document.createElement('div');
                        studentItemContainer.classList.add('student-item');

                        const studentSummaryDiv = document.createElement('div');
                        studentSummaryDiv.classList.add('student-summary');

                        const sFullName = sDoc.fields?.fullname?.stringValue || 'Unknown Student';
                        const sDocName = sDoc.name.split('/').pop();
                        
                        const summaryHeading = document.createElement('h4');
                        summaryHeading.textContent = `${sFullName} (Student Doc ID: ${sDocName})`;

                        const toggleButton = document.createElement('button');
                        toggleButton.classList.add('student-toggle-button');
                        toggleButton.textContent = 'See More';

                        studentSummaryDiv.appendChild(summaryHeading);
                        studentSummaryDiv.appendChild(toggleButton);

                        const studentDetailsDiv = document.createElement('div');
                        studentDetailsDiv.classList.add('student-details');
                        studentDetailsDiv.style.display = 'none';

                        if (sDoc.fields) {
                            for (const fn in sDoc.fields) {
                                const p = document.createElement('p');
                                const strong = document.createElement('strong');
                                strong.textContent = (fn === FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER) ?
                                    "Teacher's ID (in record):" :
                                    `${fn.charAt(0).toUpperCase() + fn.slice(1)}:`;
                                p.appendChild(strong);
                                p.innerHTML += ` ${formatFirestoreValue(sDoc.fields[fn])}`;
                                studentDetailsDiv.appendChild(p);
                            }
                        }

                        studentItemContainer.appendChild(studentSummaryDiv);
                        studentItemContainer.appendChild(studentDetailsDiv);
                        if (studentListContent) studentListContent.appendChild(studentItemContainer);

                        toggleButton.addEventListener('click', () => {
                            const isHidden = studentDetailsDiv.style.display === 'none';
                            studentDetailsDiv.style.display = isHidden ? 'block' : 'none';
                            toggleButton.textContent = isHidden ? 'See Less' : 'See More';
                        });
                    });
                }
            }
        } catch (error) {
            mainTeacherInfoContent.innerHTML = `<p class="error">Error loading teacher data: ${error.message}</p>`;
            console.error("Teacher info load error:", error);
        }
    }

    loadTeacherInformation();
    if (backToHomeButton) {
        backToHomeButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'home.html';
        });
    }
});