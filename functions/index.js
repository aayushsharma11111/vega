const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // <-- Add this!

admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

exports.processEmergencyAlert = onDocumentCreated("alerts/{alertId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) return null;

    const data = snapshot.data();
    const docRef = snapshot.ref;

    try {
        // --- M2: FETCH AUDIO STEP ---
        if (data.audioUrl) {
            const filePath = decodeURIComponent(data.audioUrl.split('/o/')[1].split('?')[0]);
            const bucket = admin.storage().bucket();
            const [fileBuffer] = await bucket.file(filePath).download();
            
            
            // This is what M3 will use for the Gemini call:
            const base64Audio = fileBuffer.toString('base64');
            
            console.log(`✅ Success: Audio for room ${data.room} is ready.`);

            // Update status so the dashboard knows we are starting AI analysis
            await docRef.update({ status: "processing_ai" });
        }

        // --- M3's Gemini API Call will go here next ---

    } catch (error) {
        console.error("M2 Fetch Error:", error);
        await docRef.update({ status: "failed_ai_fetch", severity: "critical" });
    }
});