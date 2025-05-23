document.addEventListener('DOMContentLoaded', () => {
    // ... (All existing code from the previous correct version up to loadTeacherInformation) ...
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') { /* ... */ }
    const PROJECT_ID = "capstoneproject-2b428"; /* ... */
    const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0"; /* ... */
    const STUDENT_COLLECTION = "studentData"; /* ... */
    const FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER = "id"; /* ... */
    const teacherNameHeading = document.getElementById('teacherNameHeading'); /* ... */
    const mainTeacherInfoContent = document.getElementById('mainTeacherInfoContent'); /* ... */
    const studentListNameHeading = document.getElementById('studentListNameHeading'); /* ... */
    const studentListContent = document.getElementById('studentListContent'); /* ... */
    const backToHomeButton = document.getElementById('backToHomeButton'); /* ... */
    function formatFirestoreValue(fieldValue) { /* ... (keep as is) ... */ }


    async function loadTeacherInformation() {
        const params = new URLSearchParams(window.location.search);
        let teacherDocPath = params.get('path');
        // ... (teacherDocPath construction as before)

        let mainDocFields = null;
        let teacherIdToQueryStudents = "";

        try {
            mainTeacherInfoContent.innerHTML = "<p>Loading teacher data...</p>";
            // ... (fetch main teacher document and set mainDocFields, teacherIdToQueryStudents as before) ...
            const mainDocUrl = `https://firestore.googleapis.com/v1/${teacherDocPath}?key=${API_KEY}`;
            const mainDocResponse = await fetch(mainDocUrl);
            if (!mainDocResponse.ok) { const ed=await mainDocResponse.json().catch(()=>({})); throw new Error(`Failed to fetch teacher (${mainDocResponse.status}): ${ed.error?.message||mainDocResponse.statusText}`);}
            const mainDocData = await mainDocResponse.json();
            mainDocFields = mainDocData.fields;
            if (!mainDocFields) throw new Error("Teacher data malformed.");

            teacherNameHeading.textContent = formatFirestoreValue(mainDocFields.fullname) || "Teacher Information";
            teacherIdToQueryStudents = (mainDocFields.id?.stringValue || "").trim();

            mainTeacherInfoContent.innerHTML = ""; // Clear loading
            const fieldsToShow = ["fullname", "email", "id", "username", "password", "totalStudents", "timestamp"];
            fieldsToShow.forEach(fName => { /* ... render main teacher fields ... */ });
            for (const fName in mainDocFields) { if (!fieldsToShow.includes(fName)) { /* ... render other main fields ... */ } }


            // Associated Students with Expand/Collapse
            if (studentListNameHeading) studentListNameHeading.textContent = "Associated Students";
            if (studentListContent) studentListContent.innerHTML = "<p class='loading-text'>Loading student data...</p>";

            if (teacherIdToQueryStudents && STUDENT_COLLECTION && FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER) {
                const studentQueryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
                const studentQueryBody = {
                    structuredQuery: { /* ... as before ... */ }
                };
                const studentResponse = await fetch(studentQueryUrl, { /* ... as before ... */});
                
                if (studentListContent) studentListContent.innerHTML = ""; // Clear loading message

                if (studentResponse.ok) {
                    const studentResults = await studentResponse.json();
                    const fetchedStudents = studentResults.map(result => result.document).filter(doc => doc);
                    
                    if (studentListNameHeading) studentListNameHeading.textContent = `Associated Students (${fetchedStudents.length})`;

                    if (fetchedStudents.length > 0) {
                        fetchedStudents.forEach(sDoc => {
                            const studentItemContainer = document.createElement('div');
                            studentItemContainer.classList.add('student-item'); // Use same class as modal

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
                            } else {
                                const p = document.createElement('p');
                                p.textContent = '(No fields in this student document)';
                                studentDetailsDiv.appendChild(p);
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
                    } else {
                        if (studentListContent) studentListContent.innerHTML = `<p>No students found for teacher ID: ${teacherIdToQueryStudents}.</p>`;
                    }
                } else {
                    // ... (error handling for student fetch as before) ...
                }
            } else {
                // ... (handling if teacherIdToQueryStudents is missing as before) ...
            }

        } catch (error) {
            // ... (general error handling as before) ...
        }
    }

    loadTeacherInformation();
    if(backToHomeButton) { backToHomeButton.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'home.html'; }); }
});