const cron = require('node-cron');
const pool = require('../config/db');
const { evaluateTextOnly } = require('./aiService');
const notificationService = require('./notificationService');

// Run every day at 9:00 AM to check for upcoming deadlines
cron.schedule('0 9 * * *', async () => {
    try {
        console.log('[CRON] Checking for upcoming assignment deadlines...');
        
        // Find assignments due between 24 and 48 hours from now
        const upcomingAssignments = await pool.query(`
            SELECT a.*, u.name as teacher_name 
            FROM assignments a
            JOIN users u ON a.teacher_id = u.user_id
            WHERE a.deadline > CURRENT_TIMESTAMP + INTERVAL '24 hours'
              AND a.deadline <= CURRENT_TIMESTAMP + INTERVAL '48 hours'
              AND a.is_accepting_submissions = true
        `);

        if (upcomingAssignments.rows.length > 0) {
            console.log(`[CRON] Found ${upcomingAssignments.rows.length} assignments due tomorrow.`);

            for (const assignment of upcomingAssignments.rows) {
                // Get students in the class who have NOT submitted yet
                const studentsRes = await pool.query(
                    `SELECT user_id FROM users 
                     WHERE class_id = $1 AND role = 'STUDENT' AND account_status = 'ACTIVE'
                     AND user_id NOT IN (SELECT student_id FROM submissions WHERE assignment_id = $2)`,
                    [assignment.class_id, assignment.assignment_id]
                );

                const studentIds = studentsRes.rows.map(row => row.user_id);
                if (studentIds.length > 0) {
                    await notificationService.notifyAssignmentDeadline(
                        studentIds,
                        assignment,
                        assignment.teacher_name || 'Your Teacher'
                    );
                    console.log(`[CRON] Sent deadline reminders to ${studentIds.length} students for assignment ${assignment.assignment_id}`);
                }
            }
        }
    } catch (err) {
        console.error('[CRON] Deadline Job Error:', err);
    }
});


// Run every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
    try {
        // 1. Fetch up to 10 pending answers to avoid overloading Python
        const pendingLogs = await pool.query(
            `SELECT * FROM viva_logs WHERE status = 'PENDING' LIMIT 10`
        );

        if (pendingLogs.rows.length === 0) return;

        console.log(`[CRON] Found ${pendingLogs.rows.length} pending answers. Evaluating...`);

        // 2. Mark them as 'PROCESSING' so next cron cycle doesn't pick them up
        const logIds = pendingLogs.rows.map(log => log.log_id);
        await pool.query(`UPDATE viva_logs SET status = 'PROCESSING' WHERE log_id = ANY($1)`, [logIds]);

        for (const log of pendingLogs.rows) {
            try {
                // Call Python text-only evaluation
                const aiResult = await evaluateTextOnly(
                    log.question_text, 
                    log.student_answer_transcript, 
                    log.correct_answer, 
                    log.max_marks
                );

                // Merge old face_status with new AI feedback
                let existingEval = {};
                try { existingEval = typeof log.ai_evaluation === 'string' ? JSON.parse(log.ai_evaluation) : log.ai_evaluation; } catch(e){}
                
                const finalEval = {
                    ...existingEval,
                    score: aiResult.score,
                    feedback: aiResult.feedback,
                    breakdown: aiResult.breakdown
                };

                // Update the log to COMPLETED
                await pool.query(
                    `UPDATE viva_logs SET status = 'COMPLETED', ai_evaluation = $1 WHERE log_id = $2`,
                    [JSON.stringify(finalEval), log.log_id]
                );

            } catch (evalError) {
                console.error(`[CRON] Failed to evaluate log ${log.log_id}:`, evalError.message);
                // Revert to pending so it tries again later
                await pool.query(`UPDATE viva_logs SET status = 'PENDING' WHERE log_id = $1`, [log.log_id]);
            }
        }

        // 3. Check if any submissions are fully evaluated and calculate final scores
        await checkAndFinalizeSubmissions();

    } catch (err) {
        console.error("[CRON] Job Error:", err);
    }
});

async function checkAndFinalizeSubmissions() {
    // 1. Find BOTH 'EVALUATING' submissions AND 'PENDING' submissions that have a viva session attached
    // This catches tests that were abandoned/aborted when face verification failed.
    const readySubmissions = await pool.query(`
        SELECT s.submission_id, s.student_id, vs.session_id, a.* 
        FROM submissions s
        JOIN viva_sessions vs ON s.submission_id = vs.submission_id
        JOIN assignments a ON s.assignment_id = a.assignment_id
        WHERE s.status IN ('EVALUATING', 'PENDING')
        AND NOT EXISTS (
            SELECT 1 FROM viva_logs vl WHERE vl.session_id = vs.session_id AND vl.status != 'COMPLETED'
        )
    `);

    for (const sub of readySubmissions.rows) {
        // Fetch the completed logs
        const logs = await pool.query(`SELECT ai_evaluation FROM viva_logs WHERE session_id = $1`, [sub.session_id]);
        
        // If there are literally 0 logs, skip it (they just opened it and closed it instantly)
        if (logs.rows.length === 0) continue;

        let totalScore = 0;
        logs.rows.forEach(log => {
            let evalData = log.ai_evaluation;
            if (typeof evalData === 'string') {
                try { evalData = JSON.parse(evalData); } catch(e) {}
            }
            totalScore += (evalData?.score || 0);
        });

        // 2. THE MATH FIX: Convert the score to a percentage out of 100
        const expectedQuestionCount = sub.parsed_qa ? sub.parsed_qa.length : logs.rows.length;
        
        let finalPercentage = 0;
        if (expectedQuestionCount > 0) {
            // totalScore is the sum of points. Max points possible = expectedQuestionCount * 10
            finalPercentage = (totalScore / (expectedQuestionCount * 10)) * 100;
        }

        // Round cleanly to 2 decimal places (e.g., 85.00)
        const averageScore = parseFloat(finalPercentage).toFixed(2);

        const overallFeedback = { 
            summary: `Evaluated ${logs.rows.length} out of ${expectedQuestionCount} questions. Unanswered questions received 0.` 
        };

        // Save the grading report
        await pool.query(
            `INSERT INTO grading_reports (submission_id, initial_score, feedback_json) VALUES ($1, $2, $3)`,
            [sub.submission_id, averageScore, JSON.stringify(overallFeedback)]
        );

        // Mark the submission as fully graded
        await pool.query(
            `UPDATE submissions SET status = 'AI_GRADED', final_score = $1 WHERE submission_id = $2`, 
            [averageScore, sub.submission_id]
        );
        
        console.log(`[CRON] Finalized submission ${sub.submission_id} with score ${averageScore}% (Answered ${logs.rows.length}/${expectedQuestionCount})`);

        // Send Notification in Background
        try {
            await notificationService.notifyAIVerification(
                sub.student_id,
                sub, // Passes assignment details
                'AI_GRADED',
                `${averageScore}%`,
                overallFeedback.summary
            );
        } catch (notifyErr) {
            console.error('[CRON] Error sending AI verification notification:', notifyErr);
        }
    }
}