document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        alert("Admin access required. Please log in as admin first.");
        window.location.href = 'index.html';
        return;
    }

    const PROJECT_ID = "capstoneproject-2b428";
    const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0";
    const STUDENT_COLLECTION = "studentData";
    const FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER = "id";

    const teacherNameHeading = document.getElementById('teacherNameHeading');
    const mainTeacherInfoContent = document.getElementById('mainTeacherInfoContent');
    // REMOVED: subcollectionNameHeading and subcollectionInfoContent
    const studentListNameHeading = document.getElementById('studentListNameHeading');
    const studentListContent = document.getElementById('studentListContent');
    const backToHomeButton = document.getElementById('backToHomeButton');

    function formatFirestoreValue(fieldValue) { /* ... (Keep this function as is) ... */ }

    async function loadTeacherInformation() {
        const params = new URLSearchParams(window.location.search);
        let teacherDocPath = params.get('path');
        const teacherIdFromParam = params.get('id');
        if (!teacherDocPath && teacherIdFromParam) {
            teacherDocPath = `projects/${PROJECT_ID}/databases/(default)/documents/teacherData/${teacherIdFromParam}`;
        }
        if (!teacherDocPath) {
            teacherNameHeading.textContent = "Error"; mainTeacherInfoContent.innerHTML = "<p class='error-message'>No teacher path/ID.</p>"; return;
        }

        let mainDocFields = null;
        let teacherIdToQueryStudents = "";

        try {
            mainTeacherInfoContent.innerHTML = "<p>Loading teacher data...</p>";
            const mainDocUrl = `https://firestore.googleapis.com/v1/${teacherDocPath}?key=${API_KEY}`;
            const mainDocResponse = await fetch(mainDocUrl);
            if (!mainDocResponse.ok) { const ed=await mainDocResponse.json().catch(()=>({})); throw new Error(`Failed to fetch teacher (${mainDocResponse.status}): ${ed.error?.message||mainDocResponse.statusText}`);}
            const mainDocData = await mainDocResponse.json();
            mainDocFields = mainDocData.fields;
            if (!mainDocFields) throw new Error("Teacher data malformed.");

            teacherNameHeading.textContent = formatFirestoreValue(mainDocFields.fullname) || "Teacher Information";
            teacherIdToQueryStudents = (mainDocFields.id?.stringValue || "").trim();

            mainTeacherInfoContent.innerHTML = "";
            const fieldsToShow = ["fullname", "email", "id", "username", "password", "totalStudents", "timestamp"];
            fieldsToShow.forEach(fName => {
                if (mainDocFields[fName]) {
                    const p = document.createElement('p'); const s = document.createElement('strong');
                    s.textContent = `${fName.charAt(0).toUpperCase() + fName.slice(1)}: `;
                    p.appendChild(s); p.innerHTML += formatFirestoreValue(mainDocFields[fName]); mainTeacherInfoContent.appendChild(p);
                }
            });
            for (const fName in mainDocFields) { if (!fieldsToShow.includes(fName)) { const p=document.createElement('p'); const s=document.createElement('strong'); s.textContent=`${fName.charAt(0).toUpperCase() + fName.slice(1)}: `; p.appendChild(s); p.innerHTML+=formatFirestoreValue(mainDocFields[fName]); mainTeacherInfoContent.appendChild(p);}}

            // REMOVED: Logic to fetch and display teacher's own subcollection

            // Associated Students
            if (studentListNameHeading) studentListNameHeading.textContent = "Associated Students";
            if (studentListContent) studentListContent.innerHTML = "<p>Loading student data...</p>";

            if (teacherIdToQueryStudents && STUDENT_COLLECTION && FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER) {
                studentListContent.innerHTML = `<p>Loading students for teacher ID: ${teacherIdToQueryStudents}...</p>`;
                const studentQueryUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
                const studentQueryBody = {
                    structuredQuery: {
                        from: [{ collectionId: STUDENT_COLLECTION }],
                        where: { fieldFilter: { field: { fieldPath: FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER }, op: "EQUAL", value: { stringValue: teacherIdToQueryStudents }}},
                        limit: 200
                    }
                };
                const studentResponse = await fetch(studentQueryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(studentQueryBody) });
                if (studentListContent) studentListContent.innerHTML = "";

                if (studentResponse.ok) {
                    const studentResults = await studentResponse.json();
                    const fetchedStudents = studentResults.map(result => result.document).filter(doc => doc);
                    if (studentListNameHeading) studentListNameHeading.textContent = `Associated Students (${fetchedStudents.length})`;
                    if (fetchedStudents.length > 0) {
                        fetchedStudents.forEach(sDoc => {
                            const itemDiv = document.createElement('div'); itemDiv.classList.add('student-item');
                            const sFullName = sDoc.fields?.fullname?.stringValue || 'Unknown Student';
                            const sDocName = sDoc.name.split('/').pop();
                            let html = `<h4>${sFullName} (Student Doc ID: ${sDocName})</h4>`;
                            if(sDoc.fields){ for(const fn in sDoc.fields){
                                if(fn === FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER) html+=`<p><strong>Teacher's ID (in record):</strong> ${formatFirestoreValue(sDoc.fields[fn])}</p>`;
                                else html+=`<p><strong>${fn.charAt(0).toUpperCase()+fn.slice(1)}:</strong> ${formatFirestoreValue(sDoc.fields[fn])}</p>`;
                            }} else html+='<p>(No fields)</p>';
                            itemDiv.innerHTML = html; studentListContent.appendChild(itemDiv);
                        });
                    } else studentListContent.innerHTML = `<p>No students found for teacher ID: ${teacherIdToQueryStudents}.</p>`;
                } else { const ed=await studentResponse.json().catch(()=>({})); studentListContent.innerHTML = `<p class='error-message'>Error fetching students (${studentResponse.status}): ${ed.error?.message||studentResponse.statusText}</p>`;}
            } else if (!teacherIdToQueryStudents) studentListContent.innerHTML = "<p>Teacher ID missing.</p>";
            else studentListContent.innerHTML = "<p>Student data config error.</p>";

        } catch (error) {
            console.error("Error loading teacher information:", error);
            teacherNameHeading.textContent = "Error Loading Data";
            if(mainTeacherInfoContent) mainTeacherInfoContent.innerHTML = `<p class='error-message'>${error.message}</p>`;
            // REMOVED: if(subcollectionNameHeading) ...
            // REMOVED: if(subcollectionInfoContent) ...
            if(studentListNameHeading) studentListNameHeading.textContent = "Students (Error)";
            if(studentListContent) studentListContent.innerHTML = `<p class='error-message'>Could not load: ${error.message}</p>`;
        }
    }

    loadTeacherInformation();
    if(backToHomeButton) { backToHomeButton.addEventListener('click', (e) => { e.preventDefault(); window.location.href = 'home.html'; }); }

    function formatFirestoreValue(fieldValue) {
        if (fieldValue === null || fieldValue === undefined) return "<span class='value-na'>N/A</span>";
        if (typeof fieldValue !== 'object') return String(fieldValue);
        if (fieldValue.stringValue !== undefined) return fieldValue.stringValue;
        if (fieldValue.integerValue !== undefined) return String(fieldValue.integerValue);
        if (fieldValue.doubleValue !== undefined) return String(fieldValue.doubleValue);
        if (fieldValue.booleanValue !== undefined) return fieldValue.booleanValue.toString();
        if (fieldValue.timestampValue !== undefined) { try { return new Date(fieldValue.timestampValue).toLocaleString(); } catch (e) { return fieldValue.timestampValue + " (Invalid Date)"; } }
        if (fieldValue.mapValue !== undefined) { let m = "<div class='value-map'>"; const f = fieldValue.mapValue.fields; if (f && Object.keys(f).length > 0) { for (const k in f) m += `<div><strong>${k}:</strong> ${formatFirestoreValue(f[k])}</div>`; } else m += "{ Empty Map }"; m += "</div>"; return m; }
        if (fieldValue.arrayValue !== undefined && fieldValue.arrayValue.values) { if (fieldValue.arrayValue.values.length === 0) return "[ Empty Array ]"; let a = "<ul class='value-array'>"; fieldValue.arrayValue.values.forEach(v => { a += `<li>${formatFirestoreValue(v)}</li>`; }); a += "</ul>"; return a; }
        if (fieldValue.nullValue !== undefined) return "<span class='value-null'>null</span>";
        return "<span class='value-unknown'>[Unknown Type]</span>";
    }
});