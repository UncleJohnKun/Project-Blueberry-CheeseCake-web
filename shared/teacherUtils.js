// Shared constants
export const PROJECT_ID = "capstoneproject-2b428";
export const API_KEY = "AIzaSyAjCVBgzAoJTjfzj_1DbnrKmIBcfVTWop0";
export const STUDENT_COLLECTION = "studentData";
export const FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER = "id";

// Shared utility functions
export function formatFirestoreValue(fieldValue) {
    if (!fieldValue) return '';
    if (fieldValue.stringValue) return fieldValue.stringValue;
    if (fieldValue.integerValue) return fieldValue.integerValue;
    if (fieldValue.doubleValue) return fieldValue.doubleValue;
    if (fieldValue.booleanValue) return fieldValue.booleanValue ? 'Yes' : 'No';
    if (fieldValue.timestampValue) return new Date(fieldValue.timestampValue).toLocaleString();
    if (fieldValue.arrayValue) return fieldValue.arrayValue.values?.map(v => formatFirestoreValue(v)).join(', ') || '';
    if (fieldValue.mapValue) return JSON.stringify(fieldValue.mapValue.fields || {});
    return '';
}

export async function fetchTeacherData(teacherDocPath) {
    const url = `https://firestore.googleapis.com/v1/${teacherDocPath}?key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch teacher (${response.status}): ${errorData.error?.message || response.statusText}`);
    }
    return response.json();
}

export async function fetchStudentsForTeacher(teacherId) {
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${API_KEY}`;
    const body = {
        structuredQuery: {
            from: [{ collectionId: STUDENT_COLLECTION }],
            where: {
                fieldFilter: {
                    field: { fieldPath: FIELD_IN_STUDENT_DOC_LINKING_TO_TEACHER },
                    op: "EQUAL",
                    value: { stringValue: teacherId }
                }
            }
        }
    };
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`Failed to fetch students: ${response.statusText}`);
    return response.json();
}