import axios from "axios";

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

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

export const updateSubmissionGrade = async (submissionId, grade, remarks) => {
    // This sends the teacher's manual grade to the server
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

export const fetchStudentSubmissionDetails = async (submissionId) => {
    const response = await api.get(`/student/submissions/${submissionId}/details`);
    return response.data;
};

export default api;