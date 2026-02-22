import axios from "axios";

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add Token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// ==========================================
// AUTHENTICATION API
// ==========================================

export const lookupUser = async (enrollmentNumber) => {
    const response = await api.post('/auth/lookup', { enrollment_number: enrollmentNumber });
    return response.data;
};

export const registerUser = async (enrollmentNumber, password) => {
    const response = await api.post('/auth/signup', { 
        enrollment_number: enrollmentNumber, 
        password 
    });
    return response.data;
};

export const loginUser = async (enrollmentNumber, password) => {
    const response = await api.post('/auth/login', { 
        enrollment_number: enrollmentNumber, 
        password 
    });
    return response.data;
};

export const uploadFace = async (enrollmentNumber, imageBlob) => {
    const formData = new FormData();
    formData.append('enrollment_number', enrollmentNumber);
    formData.append('face_image', imageBlob, 'face_capture.jpg');

    const response = await api.post('/auth/upload-face', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// ==========================================
// TEACHER API
// ==========================================

export const fetchTeacherAllocations = async () => {
    const response = await api.get('/teacher/allocations');
    return response.data;
};

export const fetchStudentsByClass = async (classId) => {
    const response = await api.get(`/teacher/classes/${classId}/students`);
    return response.data;
};

export const createAssignment = async (formData) => {
    const response = await api.post('/teacher/assignments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const updateYear = async (id, data) => {
    const response = await api.put(`/admin/years/${id}`, data);
    return response.data;
};

export const deleteYear = async (id) => {
    const response = await api.delete(`/admin/years/${id}`);
    return response.data;
};

export const fetchTeacherAssignments = async () => {
    const response = await api.get('/teacher/assignments');
    return response.data;
};

export const fetchSubmissions = async (assignmentId) => {
    const response = await api.get(`/teacher/assignments/${assignmentId}/submissions`);
    return response.data;
};

export const updateSubmissionGrade = async (submissionId, grade, remarks) => {
    const response = await api.put(`/teacher/submissions/${submissionId}/grade`, { 
        final_score: grade,
        teacher_remarks: remarks 
    });
    return response.data;
};

export const fetchSubmissionDetails = async (submissionId) => {
    const response = await api.get(`/teacher/submissions/${submissionId}/details`);
    return response.data;
};

// ==========================================
// STUDENT API
// ==========================================

export const fetchPendingAssignments = async () => {
    const response = await api.get('/student/pending');
    return response.data;
};

export const fetchStudentHistory = async () => {
    const response = await api.get('/student/history');
    return response.data;
};

export const submitAssignment = async (formData) => {
    const response = await api.post('/student/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const fetchStudentSubmissionDetails = async (submissionId) => {
    const response = await api.get(`/student/submissions/${submissionId}/details`);
    return response.data;
};

// ==========================================
// ADMIN API (Updated for Hierarchy)
// ==========================================

// --- INSTITUTES ---
export const createInstitute = async (data) => {
    const response = await api.post('/admin/institutes', data);
    return response.data;
};

export const getInstitutes = async () => {
    const response = await api.get('/admin/institutes');
    return response.data;
};

export const updateInstitute = async (id, data) => {
    const response = await api.put(`/admin/institutes/${id}`, data);
    return response.data;
};

export const deleteInstitute = async (id) => {
    const response = await api.delete(`/admin/institutes/${id}`);
    return response.data;
};

// --- DEPARTMENTS ---
export const createDepartment = async (data) => {
    const response = await api.post('/admin/departments', data);
    return response.data;
};

export const getDepartments = async () => {
    const response = await api.get('/admin/departments');
    return response.data;
};

export const updateDepartment = async (id, data) => {
    const response = await api.put(`/admin/departments/${id}`, data);
    return response.data;
};

export const deleteDepartment = async (id) => {
    const response = await api.delete(`/admin/departments/${id}`);
    return response.data;
};

// --- ACADEMIC YEARS ---
export const createYear = async (data) => {
    const response = await api.post('/admin/years', data);
    return response.data;
};

export const getYears = async (departmentId = null) => {
    const url = departmentId ? `/admin/years?department_id=${departmentId}` : '/admin/years';
    const response = await api.get(url);
    return response.data;
};

export const updateYearStatus = async (id, status) => {
    const response = await api.put(`/admin/years/${id}/status`, { is_active: status });
    return response.data;
};

// --- SEMESTERS ---
export const createSemester = async (data) => {
    const response = await api.post('/admin/semesters', data);
    return response.data;
};

export const getSemesters = async (yearId = null, departmentId = null) => {
    let url = '/admin/semesters?';
    if (yearId) url += `yearId=${yearId}&`;
    if (departmentId) url += `department_id=${departmentId}&`;
    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;
    const response = await api.get(url);
    return response.data;
};

export const updateSemester = async (id, data) => {
    const response = await api.put(`/admin/semesters/${id}`, data);
    return response.data;
};

export const deleteSemester = async (id) => {
    const response = await api.delete(`/admin/semesters/${id}`);
    return response.data;
};

export const updateSemesterStatus = async (id, status) => {
    const response = await api.put(`/admin/semesters/${id}/status`, { is_active: status });
    return response.data;
};

// --- SUBJECTS ---
export const createSubject = async (data) => {
    const response = await api.post('/admin/subjects', data);
    return response.data;
};

export const getSubjects = async () => {
    const response = await api.get('/admin/subjects');
    return response.data;
};

export const updateSubject = async (id, data) => {
    const response = await api.put(`/admin/subjects/${id}`, data);
    return response.data;
};

export const deleteSubject = async (id) => {
    const response = await api.delete(`/admin/subjects/${id}`);
    return response.data;
};

// --- CLASSES ---
export const createClass = async (data) => {
    const response = await api.post('/admin/classes', data);
    return response.data;
};

export const getClasses = async (departmentId = null) => {
    const url = departmentId ? `/admin/classes?department_id=${departmentId}` : '/admin/classes';
    const response = await api.get(url);
    return response.data;
};

export const updateClass = async (id, data) => {
    const response = await api.put(`/admin/classes/${id}`, data);
    return response.data;
};

export const deleteClass = async (id) => {
    const response = await api.delete(`/admin/classes/${id}`);
    return response.data;
};

// --- TEACHERS & ALLOCATIONS ---
export const getTeachers = async (instituteId = null) => {
    const url = instituteId ? `/admin/teachers?institute_id=${instituteId}` : '/admin/teachers';
    const response = await api.get(url);
    return response.data;
};

export const updateTeacher = async (id, data) => {
    const response = await api.put(`/admin/teachers/${id}`, data);
    return response.data;
};

export const deleteTeacher = async (id) => {
    const response = await api.delete(`/admin/teachers/${id}`);
    return response.data;
};

/**
 * SUBJECT ALLOCATION API CALLS
 */

// Fetch all allocations with teacher and subject details
export const getAllocations = async () => {
    const response = await api.get('/admin/allocations');
    return response.data;
};

// Allocate a teacher to a subject/class
export const allocateSubject = async (allocationData) => {
    const response = await api.post('/admin/allocations', allocationData);
    return response.data;
};

// Update an existing allocation by ID
export const updateAllocation = async (id, updatedData) => {
    const response = await api.put(`/admin/allocations/${id}`, updatedData);
    return response.data;
};

// Delete an allocation by ID
export const deleteAllocation = async (id) => {
    const response = await api.delete(`/admin/allocations/${id}`);
    return response.data;
};

// --- STUDENTS ---
export const getStudents = async (instituteId = '', classId = '') => {
    let url = '/admin/students?';
    if (instituteId) url += `institute_id=${instituteId}&`;
    if (classId) url += `class_id=${classId}`;
    
    // Clean trailing '&' or '?'
    url = url.endsWith('&') || url.endsWith('?') ? url.slice(0, -1) : url;

    const response = await api.get(url);
    return response.data;
};

export const updateStudent = async (id, data) => {
    const response = await api.put(`/admin/students/${id}`, data);
    return response.data;
};

export const deleteStudent = async (id) => {
    const response = await api.delete(`/admin/students/${id}`);
    return response.data;
};

// --- BULK UPLOAD ---
// Ensure your bulkUploadUsers looks like this:
export const bulkUploadUsers = async (file, uploadData) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('role', uploadData.role);
    formData.append('institute_id', uploadData.institute_id);
    if (uploadData.class_id) formData.append('class_id', uploadData.class_id);

    const response = await api.post('/admin/upload/users', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
};

export default api;