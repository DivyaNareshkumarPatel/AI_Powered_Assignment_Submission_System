// backend/services/aiService.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

// --- ADD THIS NEW FUNCTION ---
const generateFaceEmbedding = async (imageFilePath) => {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(imageFilePath));

        const response = await axios.post(`${PYTHON_API_URL}/generate_embedding`, form, {
            headers: { ...form.getHeaders() }
        });
        
        return response.data.embedding; // Returns the math array [0.012, -0.045, ...]
    } catch (error) {
        // Grab the specific error from Python (e.g., "No face detected")
        const errMsg = error.response?.data?.detail || "Failed to process face on AI server";
        console.error("AI Server Error (Face Embed):", errMsg);
        throw new Error(errMsg);
    }
};

const parseAssignmentPDF = async (pdfFilePath) => {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(pdfFilePath));

        const response = await axios.post(`${PYTHON_API_URL}/process-pdf`, form, {
            headers: { ...form.getHeaders() }
        });
        
        // Returns the array of objects: [{ question: "...", answer: "..." }]
        return response.data; 
    } catch (error) {
        console.error("AI Server Error (PDF Parse):", error.message);
        // We return an empty array so if parsing fails, the assignment still uploads successfully
        return []; 
    }
};

const verifyStudentFace = async (storedEmbedding, imageBuffer) => {
    try {
        const form = new FormData();
        form.append('stored_embedding', JSON.stringify(storedEmbedding));
        // Pass the raw buffer directly with a fake filename so Python treats it as an UploadFile
        form.append('image', imageBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });

        const response = await axios.post(`${PYTHON_API_URL}/verify_face`, form, {
            headers: { ...form.getHeaders() }
        });
        
        return response.data; // Returns { status: "OK" | "NO_FACE" | "WRONG_PERSON" }
    } catch (error) {
        console.error("AI Server Error (Face Verify):", error.message);
        throw error;
    }
};

module.exports = {
    generateFaceEmbedding,
    parseAssignmentPDF,
    verifyStudentFace
};