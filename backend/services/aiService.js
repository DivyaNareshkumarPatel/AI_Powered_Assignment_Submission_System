const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

const generateFaceEmbedding = async (imageFilePath) => {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(imageFilePath));
        const response = await axios.post(`${PYTHON_API_URL}/generate_embedding`, form, { headers: form.getHeaders() });
        return response.data.embedding; 
    } catch (error) {
        throw new Error(error.response?.data?.detail || "Failed to process face");
    }
};

const parseAssignmentPDF = async (pdfFilePath) => {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(pdfFilePath));
        const response = await axios.post(`${PYTHON_API_URL}/process-pdf`, form, { headers: form.getHeaders() });
        return response.data; 
    } catch (error) {
        return []; 
    }
};

const verifyStudentFace = async (storedEmbedding, imageBuffer) => {
    try {
        const form = new FormData();
        form.append('stored_embedding', JSON.stringify(storedEmbedding));
        form.append('image', imageBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });
        const response = await axios.post(`${PYTHON_API_URL}/verify_face`, form, { headers: form.getHeaders() });
        return response.data; 
    } catch (error) {
        throw new Error("Cannot connect to Python Server.");
    }
};

const evaluateVivaAnswer = async (question, userText, correctAnswer, storedEmbedding, imageBuffer, maxMarks = 10) => {
    try {
        const form = new FormData();
        form.append('question', question);
        form.append('user_text', userText || "No answer provided");
        form.append('correct_answer', correctAnswer);
        form.append('max_marks', maxMarks);
        form.append('stored_embedding', JSON.stringify(storedEmbedding));
        form.append('image', imageBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });

        const response = await axios.post(`${PYTHON_API_URL}/grade`, form, {
            headers: { ...form.getHeaders() }
        });
        
        return response.data; 
    } catch (error) {
        throw new Error("Failed to evaluate answer.");
    }
};

const evaluateTextOnly = async (question, userText, correctAnswer, maxMarks = 10) => {
    try {
        const form = new FormData();
        form.append('question', question);
        form.append('user_text', userText || "No answer provided");
        form.append('correct_answer', correctAnswer);
        form.append('max_marks', maxMarks);

        // Note: You will need to ensure your Python API has a /grade_text endpoint
        // that skips face verification and only grades text using the LLM.
        const response = await axios.post(`${PYTHON_API_URL}/grade_text`, form, {
            headers: { ...form.getHeaders() }
        });
        
        return response.data; 
    } catch (error) {
        throw new Error("Failed to evaluate text answer in background.");
    }
};

module.exports = { generateFaceEmbedding, parseAssignmentPDF, verifyStudentFace, evaluateVivaAnswer, evaluateTextOnly };