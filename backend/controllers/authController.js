const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const lookupUser = async (req, res) => {
    const { enrollment_number } = req.body;

    try {
        const result = await pool.query(
            'SELECT user_id, name, email, role, password_hash FROM users WHERE enrollment_number = $1',
            [enrollment_number]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Enrollment number not found. Contact Admin." });
        }

        const user = result.rows[0];

        if (user.password_hash) {
            return res.status(400).json({ error: "Account already registered. Please Login." });
        }

        res.json({ 
            message: "User found", 
            name: user.name, 
            email: user.email,
            role: user.role 
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const registerUser = async (req, res) => {
    const { enrollment_number, password } = req.body;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE enrollment_number = $2 RETURNING user_id, name, role',
            [hashedPassword, enrollment_number]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ message: "Registration successful! You can now login." });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const loginUser = async (req, res) => {
    const { enrollment_number, password } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE enrollment_number = $1',
            [enrollment_number]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid Credentials" });
        }

        const user = result.rows[0];

        if (!user.password_hash) {
            return res.status(400).json({ error: "Account not activated. Please Register first." });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid Credentials" });
        }

        const payload = {
            user: {
                id: user.user_id,
                role: user.role,
                name: user.name
            }
        };

        jwt.sign(
            payload, 
            process.env.JWT_SECRET || 'secret123', // Store this in .env later
            { expiresIn: '10h' }, 
            (err, token) => {
                if (err) throw err;
                res.json({ token, role: user.role, name: user.name });
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

const uploadFace = async (req, res) => {
    const { enrollment_number } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ error: "No image captured." });
    }

    try {
        // Construct file URL (adjust domain as needed)
        const fileUrl = `http://localhost:5000/uploads/${file.filename}`;

        const result = await pool.query(
            'UPDATE users SET face_image_url = $1 WHERE enrollment_number = $2 RETURNING name, face_image_url',
            [fileUrl, enrollment_number]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ message: "Face registered successfully!", data: result.rows[0] });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
};

module.exports = { lookupUser, registerUser, loginUser, uploadFace };