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
        // --- M3: GEMINI API CALL ---

const genAI = new GoogleGenerativeAI("AIzaSyDriQ0LoWT90BlzKhCvGF4kgW4cb24QhKU");

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

const prompt = `
Analyze this emergency audio and return STRICT JSON only:

{
  "type": "fire | medical | security | other",
  "severity": "low | medium | high | critical",
  "confidence": 0,
  "summary": "short summary",
  "suggestedAction": "what to do"
}
`;

const result = await model.generateContent([
  prompt,
  {
    inlineData: {
      mimeType: "audio/webm",
      data: base64Audio
    }
  }
]);

const text = result.response.text();


// --- PARSE JSON ---
const jsonMatch = text.match(/\{[\s\S]*\}/);
let parsed = {};

if (jsonMatch) {
  parsed = JSON.parse(jsonMatch[0]);
} else {
  throw new Error("No JSON returned");
}


// --- FALLBACK ---
const finalType = parsed.type || data.category || "unknown";

const finalSeverity =
  parsed.confidence < 70 ? "critical" : parsed.severity || "high";

const finalSummary =
  parsed.summary ||
  `Emergency reported in room ${data.room} - treat as critical`;

const finalConfidence = parsed.confidence || 0;


// --- UPDATE FIRESTORE ---
await docRef.update({
  aiSummary: finalSummary,
  severity: finalSeverity,
  type: finalType,
  confidence: finalConfidence,
  suggestedAction:
    parsed.suggestedAction || "Take immediate action",
  status: "completed"
});
    } catch (error) {
        console.error("M2 Fetch Error:", error);
        await docRef.update({ status: "failed_ai_fetch", severity: "critical" });
    }
});