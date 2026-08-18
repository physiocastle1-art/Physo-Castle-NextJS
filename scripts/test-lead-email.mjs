import fs from "fs";
import path from "path";

// Read .env.local natively
try {
  const envFile = fs.readFileSync(".env.local", "utf8");
  envFile.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
} catch (e) {
  // ignore
}

import { sendLeadEmail } from "../src/lib/email.js";

async function run() {
  console.log("Sending test lead via Resend API...");
  console.log("RESEND_API_KEY present:", Boolean(process.env.RESEND_API_KEY));
  console.log("Key:", process.env.RESEND_API_KEY?.substring(0, 10) + "...");

  const result = await sendLeadEmail({
    name: "Aarti Patel",
    age: "34",
    gender: "Female",
    phone: "+91 98765 43210",
    address: "B-402, Royal Residency, Adajan, Surat",
    complaint: "Severe lower back pain & stiffness following morning workout.",
    parts: ["Lower Back", "Hip"],
    notes: "Patient requests a home visit session around 4:00 PM if possible.",
    slots: ["Afternoon · 1–4 pm", "Evening · 4–7 pm"],
    type: "Test Appointment Booking",
  });

  console.log("Result:", result);
}

run().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
