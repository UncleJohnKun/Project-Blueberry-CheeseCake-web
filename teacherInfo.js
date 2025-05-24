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
            const fieldsToShow = ["fullname", "email", "id", "username", "password", "timestamp"];
            fieldsToShow.forEach(fName => {
                if (mainDocFields[fName]) {
                    const p = document.createElement('p');
                    const strong = document.createElement('strong');
                    strong.textContent = `${fName.charAt(0).toUpperCase() + fName.slice(1)}:`;
                    p.appendChild(strong);

                    if (fName === 'password') {
                        // Create password field with toggle visibility
                        const passwordContainer = document.createElement('span');
                        passwordContainer.style.display = 'inline-flex';
                        passwordContainer.style.alignItems = 'center';
                        passwordContainer.style.marginLeft = '8px';
                        passwordContainer.style.gap = '8px';
                        passwordContainer.style.whiteSpace = 'nowrap';

                        const passwordSpan = document.createElement('span');
                        passwordSpan.textContent = '••••••••';
                        passwordSpan.id = 'passwordDisplay';
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
                        const actualPassword = formatFirestoreValue(mainDocFields[fName]);

                        toggleButton.addEventListener('click', () => {
                            isPasswordVisible = !isPasswordVisible;
                            passwordSpan.textContent = isPasswordVisible ? actualPassword : '••••••••';
                            toggleButton.textContent = isPasswordVisible ? 'Hide' : 'Show';
                        });

                        passwordContainer.appendChild(passwordSpan);
                        passwordContainer.appendChild(toggleButton);
                        p.appendChild(passwordContainer);
                    } else {
                        p.innerHTML += ` ${formatFirestoreValue(mainDocFields[fName])}`;
                    }

                    mainTeacherInfoContent.appendChild(p);
                }
            });

            if (studentListNameHeading) studentListNameHeading.textContent = "Students";
            if (studentListContent) studentListContent.innerHTML = "<p class='loading-text'>Loading student data...</p>";

            if (teacherIdToQueryStudents) {
                const studentResults = await fetchStudentsForTeacher(teacherIdToQueryStudents);
                const fetchedStudents = studentResults.map(result => result.document).filter(doc => doc);

                if (studentListContent) studentListContent.innerHTML = "";
                if (studentListNameHeading) studentListNameHeading.textContent = `Students (${fetchedStudents.length})`;

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
                            const levelInfoContainer = document.createElement('div');
                            levelInfoContainer.classList.add('level-info-container');
                            levelInfoContainer.innerHTML = '<h4>Level Progress:</h4>';
                            studentDetailsDiv.appendChild(levelInfoContainer);

                            const otherDetailsDiv = document.createElement('div');
                            otherDetailsDiv.classList.add('other-details');
                            studentDetailsDiv.appendChild(otherDetailsDiv);

                            const levelData = {};
                            for (const fieldName in sDoc.fields) {
                                if (fieldName.startsWith('level') && (fieldName.endsWith('Finish') || fieldName.endsWith('Score'))) {
                                    const levelNumMatch = fieldName.match(/level(\d+)/);
                                    if (levelNumMatch) {
                                        const levelNum = parseInt(levelNumMatch[1]);
                                        if (!levelData[levelNum]) {
                                            levelData[levelNum] = {};
                                        }
                                        if (fieldName.endsWith('Finish')) {
                                            levelData[levelNum].finish = sDoc.fields[fieldName].booleanValue;
                                        } else if (fieldName.endsWith('Score')) {
                                            levelData[levelNum].score = formatFirestoreValue(sDoc.fields[fieldName]);
                                        }
                                    }
                                } else {
                                    const p = document.createElement('p');
                                    const strong = document.createElement('strong');
                                    strong.textContent = (fieldName === FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER) ?
                                        "Teacher's ID (in record):" :
                                        `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}:`;
                                    p.appendChild(strong);
                                    p.innerHTML += ` ${formatFirestoreValue(sDoc.fields[fieldName])}`;
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
