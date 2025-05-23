document.addEventListener('DOMContentLoaded', () => {
    console.log("home.js: DOMContentLoaded");

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
    const STUDENT_COLLECTION = "studentData"; // Collection for student data
    const FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER = "id"; // Field in studentData docs that holds the teacher's ID

    console.log("home.js: Config - PROJECT_ID:", PROJECT_ID, "API_KEY:", API_KEY ? "Loaded" : "MISSING!");

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
    const modalSubcollectionTitle = document.getElementById('modalSubcollectionTitle');
    const modalTeacherSubcollectionData = document.getElementById('modalTeacherSubcollectionData');
    const modalStudentListTitle = document.getElementById('modalStudentListTitle');
    const modalStudentList = document.getElementById('modalStudentList');

    let allTeachersData = [];

    if (!PROJECT_ID || !API_KEY) {
        console.error("home.js: Firebase PROJECT_ID or API_KEY is not defined!");
        if(loadingMessage) {
            loadingMessage.textContent = "Configuration Error: Firebase settings missing.";
            loadingMessage.style.color = "red";
        }
        return;
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

    function displayTeacherDataInModal(mainDocFields, subcollectionDocs = [], dynamicSubcollectionName = "Details", studentDocs = []) {
        if (!modalTeacherName || !modalTeacherInfo || !modalTeacherSubcollectionData || !modalSubcollectionTitle || !modalStudentListTitle || !modalStudentList) {
            console.error("home.js: Modal DOM elements not found for display.");
            return;
        }

        modalTeacherName.textContent = formatFirestoreValue(mainDocFields.fullname) || 'Teacher Details';
        modalTeacherInfo.innerHTML = `
            <p><strong>Email:</strong> ${formatFirestoreValue(mainDocFields.email)}</p>
            <p><strong>ID (Teacher's):</strong> ${formatFirestoreValue(mainDocFields.id)}</p>
            <p><strong>Username:</strong> ${formatFirestoreValue(mainDocFields.username)}</p>
            <p><strong>Full Name:</strong> ${formatFirestoreValue(mainDocFields.fullname)}</p>
            <p><strong>Password:</strong> ${formatFirestoreValue(mainDocFields.password)}</p>
            <p><strong>Total Students:</strong> ${formatFirestoreValue(mainDocFields.totalStudents)}</p>
            <p><strong>Timestamp:</strong> ${formatFirestoreValue(mainDocFields.timestamp)}</p>
        `;

        modalSubcollectionTitle.textContent = `Data from "${dynamicSubcollectionName}" Subcollection:`;
        modalTeacherSubcollectionData.innerHTML = '';
        if (subcollectionDocs.length > 0) {
            subcollectionDocs.forEach(subDoc => {
                const subItemDiv = document.createElement('div');
                subItemDiv.classList.add('sub-document-item');
                let itemHTML = `<h4>Document: ${subDoc.name.split('/').pop()}</h4>`;
                if (subDoc.fields) {
                    for (const fieldName in subDoc.fields) {
                        itemHTML += `<p><strong>${fieldName}:</strong> ${formatFirestoreValue(subDoc.fields[fieldName])}</p>`;
                    }
                } else { itemHTML += '<p>(No fields in this subdocument)</p>'; }
                subItemDiv.innerHTML = itemHTML;
                modalTeacherSubcollectionData.appendChild(subItemDiv);
            });
        } else {
            modalTeacherSubcollectionData.innerHTML = `<p>No data found in the "${dynamicSubcollectionName}" subcollection for this teacher, or the subcollection doesn't exist.</p>`;
        }

        // --- Display Students ---
        modalStudentListTitle.textContent = `Associated Students (${studentDocs.length})`;
        modalStudentList.innerHTML = '';
        if (studentDocs.length > 0) {
            studentDocs.forEach(studentDoc => { // studentDoc is now a full document from studentData
                const studentItemDiv = document.createElement('div');
                studentItemDiv.classList.add('student-item');
                
                // Get student's own name/ID for display
                const studentFullName = studentDoc.fields?.fullname?.stringValue || 'Unknown Student';
                const studentOwnId = studentDoc.fields?.id?.stringValue; // This is the teacher's ID stored in student doc
                const studentDocName = studentDoc.name.split('/').pop(); // This is the student's actual document ID

                let studentHTML = `<h4>${studentFullName} (Student Doc ID: ${studentDocName})</h4>`;
                if (studentDoc.fields) {
                    for (const fieldName in studentDoc.fields) {
                        // Don't repeat the linking teacher ID if it's the same as FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER
                        if (fieldName === FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER) {
                            studentHTML += `<p><strong>Teacher's ID (in student record):</strong> ${formatFirestoreValue(studentDoc.fields[fieldName])}</p>`;
                        } else {
                            studentHTML += `<p><strong>${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}:</strong> ${formatFirestoreValue(studentDoc.fields[fieldName])}</p>`;
                        }
                    }
                } else {
                    studentHTML += '<p>(No fields in this student document)</p>';
                }
                studentItemDiv.innerHTML = studentHTML;
                modalStudentList.appendChild(studentItemDiv);
            });
        } else {
            modalStudentList.innerHTML = `<p>No students found associated with this teacher.</p>`;
        }
    }

    async function handleTeacherItemClick(teacherDocPath) {
        console.log("home.js: handleTeacherItemClick - Fetching details for teacher path:", teacherDocPath);
        if (!modalTeacherInfo || !modalTeacherSubcollectionData || !modalTeacherName || !modalStudentList) {
            openTeacherModal(); return;
        }
        modalTeacherName.textContent = "Loading Teacher...";
        modalTeacherInfo.innerHTML = "<p class='loading-text'>Loading main teacher data...</p>";
        modalTeacherSubcollectionData.innerHTML = "<p class='loading-text'>Waiting for main data...</p>";
        modalStudentList.innerHTML = "<p class='loading-text'>Waiting for teacher ID...</p>";
        openTeacherModal();

        let mainDocFields = null;
        let subcollectionDocs = [];
        let studentDocs = [];
        let subcollectionNameToFetch = "";
        let teacherIdToQueryStudents = "";

        try {
            const mainDocUrl = `https://firestore.googleapis.com/v1/${teacherDocPath}?key=${API_KEY}`;
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
                
                const studentQueryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
                const studentQueryBody = {
                    structuredQuery: {
                        from: [{ collectionId: STUDENT_COLLECTION }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER }, // e.g., "id" field in studentData
                                op: "EQUAL",
                                value: { stringValue: teacherIdToQueryStudents }
                            }
                        },
                        limit: 200
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
                        // Each result in runQuery is an object { document: {...} } or { readTime: ... }
                        // We only care about the ones that have a 'document'
                        studentDocs = studentResults.map(result => result.document).filter(doc => doc);
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
                 modalStudentList.innerHTML = `<p>Student data configuration error.</p>`;
            }

            displayTeacherDataInModal(mainDocFields, subcollectionDocs, subcollectionNameToFetch || "N/A", studentDocs);

        } catch (error) {
            console.error("home.js: Error in handleTeacherItemClick:", error);
            if (modalTeacherName) modalTeacherName.textContent = 'Error Loading Details';
            if (modalTeacherInfo) modalTeacherInfo.innerHTML = `<p class='error-message'>${error.message}</p>`;
            if (modalTeacherSubcollectionData) modalTeacherSubcollectionData.innerHTML = '<p class="error-message">Could not load subcollection data.</p>';
            if (modalStudentList) modalStudentList.innerHTML = `<p class="error-message">Could not load student data: ${error.message}</p>`;
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
            item.innerHTML = `<span class="teacher-name">${name}</span><span class="teacher-detail">Email: ${formatFirestoreValue(d.email)}</span><span class="teacher-detail">ID: ${id}</span>${d.username ? `<span class="teacher-detail">Username: ${formatFirestoreValue(d.username)}</span>` : ''}`;
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
        if (!teacherListContainer || !loadingMessage) { return; }
        loadingMessage.textContent = `Fetching teachers from "${TEACHER_COLLECTION}"...`;
        loadingMessage.style.display = 'block'; teacherListContainer.innerHTML = ''; teacherListContainer.appendChild(loadingMessage);
        try {
            if (!PROJECT_ID || !API_KEY) throw new Error("PROJECT_ID or API_KEY undefined.");
            const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${TEACHER_COLLECTION}?key=${API_KEY}&pageSize=300`;
            const response = await fetch(url);
            if (!response.ok) { const ed = await response.json().catch(()=>({})); throw new Error(`Failed (${response.status}): ${ed.error?.message || response.statusText}`);}
            const data = await response.json();
            if (data.documents && data.documents.length > 0) {
                allTeachersData = data.documents.filter(doc => doc && doc.fields && doc.name);
                filterAndDisplayTeachers(); 
            } else {
                allTeachersData = []; loadingMessage.textContent = `No teachers found in "${TEACHER_COLLECTION}".`;
            }
        } catch (error) {
            allTeachersData = []; if (loadingMessage) { loadingMessage.textContent = `Error: ${error.message}`; loadingMessage.style.color = 'red'; }
        }
    }

    // --- INITIALIZATION ---
    fetchAllTeachers();
});