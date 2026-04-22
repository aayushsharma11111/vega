const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onAlertCreated = onDocumentCreated("alerts/{id}", async (event) => {

  const data = event.data.data();
  const aiSummary = data.aiSummary;

  await admin.messaging().send({
    notification: {
      title: "🚨 SOS Alert",
      body: aiSummary,
    },
    topic: "hotel-staff",
  });

});