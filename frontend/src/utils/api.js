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
// ADMIN API (New Additions)
// ==========================================

// 1. Academic Years
export const createYear = async (data) => {
    const response = await api.post('/admin/years', data);
    return response.data;
};

export const getYears = async () => {
    const response = await api.get('/admin/years');
    return response.data;
};

// 2. Semesters
export const createSemester = async (data) => {
    const response = await api.post('/admin/semesters', data);
    return response.data;
};

export const getSemesters = async (yearId) => {
    const url = yearId ? `/admin/semesters?yearId=${yearId}` : '/admin/semesters';
    const response = await api.get(url);
    return response.data;
};

// 3. Subjects
export const createSubject = async (data) => {
    const response = await api.post('/admin/subjects', data);
    return response.data;
};

export const getSubjects = async () => {
    const response = await api.get('/admin/subjects');
    return response.data;
};

// 4. Classes
export const createClass = async (data) => {
    const response = await api.post('/admin/classes', data);
    return response.data;
};

export const getClasses = async () => {
    const response = await api.get('/admin/classes');
    return response.data;
};

// 5. Allocations & Teachers
export const getTeachers = async () => {
    const response = await api.get('/admin/teachers');
    return response.data;
};

export const allocateSubject = async (data) => {
    const response = await api.post('/admin/allocations', data);
    return response.data;
};

// 6. Bulk Upload
export const bulkUploadUsers = async (file, additionalData) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data (role, default class, etc.)
    if (additionalData.default_role) {
        formData.append('default_role', additionalData.default_role);
    }
    // We don't send class_id if it's null (e.g., for Admins)
    if (additionalData.class_id) {
        formData.append('class_id', additionalData.class_id);
    }

    const response = await api.post('/admin/upload/users', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export default api;