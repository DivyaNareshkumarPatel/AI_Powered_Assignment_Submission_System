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

module.exports = {
    generateFaceEmbedding
};