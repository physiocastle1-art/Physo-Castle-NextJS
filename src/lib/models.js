import mongoose from "mongoose";

const { Schema, Types } = mongoose;

/* Re-using an already-compiled model matters in dev: Next hot-reloads this
   module and mongoose throws on a duplicate model name. */
const model = (name, schema, collection) =>
  mongoose.models[name] || mongoose.model(name, schema, collection);

import {
  ROLES,
  ROLE_RANK,
  SESSION_STATUSES,
  PATIENT_STATUSES,
  PAYMENT_METHODS,
  GENDERS,
  VISIT_TYPES,
  EXPENSE_CATEGORIES,
  PACKAGE_KINDS,
} from "./enums.js";

/* Re-exported so the many `from "@/lib/models"` imports keep working. */
export {
  ROLES,
  ROLE_RANK,
  SESSION_STATUSES,
  PATIENT_STATUSES,
  PAYMENT_METHODS,
  GENDERS,
  VISIT_TYPES,
  EXPENSE_CATEGORIES,
  PACKAGE_KINDS,
};

/* ------------------------------------------------------------------ auth */

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "staff", index: true },
    // Null until the account holder proves they own the mailbox (invite link
    // or verification link). Guarded server-side on every write.
    emailVerifiedAt: { type: Date, default: null },
    disabledAt: { type: Date, default: null },
    // Bumping this invalidates every session created before the change.
    passwordChangedAt: { type: Date, default: () => new Date() },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const User = model("User", userSchema, "admin_users");

const authSessionSchema = new Schema({
  user: { type: Types.ObjectId, ref: "User", required: true, index: true },
  // Only the SHA-256 of the cookie value is stored, so a database dump cannot
  // be replayed as a live session.
  tokenHash: { type: String, required: true, unique: true },
  userAgent: { type: String, default: "" },
  ip: { type: String, default: "" },
  createdAt: { type: Date, default: () => new Date() },
  // Mongo removes the row itself once this passes.
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const AuthSession = model("AuthSession", authSessionSchema, "admin_auth_sessions");

const authTokenSchema = new Schema({
  kind: { type: String, enum: ["invite", "reset"], required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  // Set for reset; for an invite the user row is created up-front too.
  user: { type: Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  createdBy: { type: Types.ObjectId, ref: "User", default: null },
  usedAt: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const AuthToken = model("AuthToken", authTokenSchema, "admin_auth_tokens");

const loginAttemptSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  windowStart: { type: Date, default: () => new Date() },
  lockedUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const LoginAttempt = model("LoginAttempt", loginAttemptSchema, "admin_login_attempts");

/* -------------------------------------------------------------- patients */

const patientSchema = new Schema(
  {
    // Human-readable URL key, e.g. "meera-patel-k3f9x". Generated once at
    // creation and never regenerated on rename, so existing links keep working.
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    // Stored as bare 10 digits; see normalizePhone() in lib/validation.js.
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    email: { type: String, default: "", lowercase: true, trim: true, maxlength: 200 },
    age: { type: Number, min: 0, max: 120, default: null },
    gender: { type: String, enum: GENDERS, default: "undisclosed" },
    address: { type: String, default: "", trim: true, maxlength: 400 },
    city: { type: String, default: "Surat", trim: true, maxlength: 80 },

    // Clinical
    complaintAreas: { type: [String], default: [] },
    diagnosis: { type: String, default: "", trim: true, maxlength: 600 },
    referredBy: { type: String, default: "", trim: true, maxlength: 160 },
    notes: { type: String, default: "", maxlength: 4000 },

    status: { type: String, enum: PATIENT_STATUSES, default: "active", index: true },

    // Treatment package + instalment terms. Amounts are whole/2dp rupees.
    plan: {
      packageName: { type: String, default: "", trim: true, maxlength: 160 },
      totalSessions: { type: Number, min: 0, max: 500, default: 0 },
      feeTotal: { type: Number, min: 0, default: 0 },
      installmentAmount: { type: Number, min: 0, default: 0 },
      startedAt: { type: Date, default: null },
    },

    createdBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

patientSchema.index({ createdAt: -1 });
patientSchema.index({ name: 1 });

export const Patient = model("Patient", patientSchema, "patients");

const treatmentSessionSchema = new Schema(
  {
    patient: { type: Types.ObjectId, ref: "Patient", required: true, index: true },
    // 1-based visit number, assigned on create.
    number: { type: Number, required: true, min: 1 },
    scheduledAt: { type: Date, required: true },
    durationMin: { type: Number, min: 5, max: 480, default: 45 },
    status: { type: String, enum: SESSION_STATUSES, default: "scheduled", index: true },
    therapist: { type: String, default: "Dr. Riddhi Shah (PT)", trim: true, maxlength: 160 },
    treatment: { type: String, default: "", trim: true, maxlength: 600 },
    painScore: { type: Number, min: 0, max: 10, default: null },
    notes: { type: String, default: "", maxlength: 4000 },
    completedAt: { type: Date, default: null },

    // Home visits: where to go, and what the travel was charged at. The travel
    // charge is recorded here rather than folded into the patient's package
    // balance — the package fee is what was agreed up front.
    visitType: { type: String, enum: VISIT_TYPES, default: "clinic", index: true },
    visitAddress: { type: String, default: "", trim: true, maxlength: 400 },
    travelFee: { type: Number, min: 0, default: 0 },

    createdBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

treatmentSessionSchema.index({ patient: 1, scheduledAt: 1 });
treatmentSessionSchema.index({ scheduledAt: 1, status: 1 });
// Drives the overlap check: everything booked around a candidate slot, for the
// one therapist, without scanning the whole collection.
treatmentSessionSchema.index({ therapist: 1, scheduledAt: 1 });

export const TreatmentSession = model(
  "TreatmentSession",
  treatmentSessionSchema,
  "patient_sessions"
);

const paymentSchema = new Schema(
  {
    patient: { type: Types.ObjectId, ref: "Patient", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: PAYMENT_METHODS, default: "cash" },
    paidAt: { type: Date, default: () => new Date() },
    note: { type: String, default: "", trim: true, maxlength: 400 },
    // Gapless per financial year, e.g. "PC/2026-27/0007". Assigned by the
    // counter below at creation; "" only on rows that predate receipts.
    receiptNo: { type: String, default: "", trim: true, maxlength: 40 },
    recordedBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ patient: 1, paidAt: -1 });
paymentSchema.index({ paidAt: -1 });
// Unique among rows that actually have a number, so the pre-receipt rows (which
// carry "") don't all collide with each other.
paymentSchema.index(
  { receiptNo: 1 },
  { unique: true, partialFilterExpression: { receiptNo: { $gt: "" } } }
);

export const Payment = model("Payment", paymentSchema, "payments");

/* Atomic sequence source for receipt numbers. One row per financial year;
   $inc on it is the only thing that hands out a number, so two payments
   recorded at the same instant cannot receive the same receipt. */
const counterSchema = new Schema({
  _id: { type: String },
  seq: { type: Number, default: 0 },
});

export const Counter = model("Counter", counterSchema, "counters");

/* -------------------------------------------------------- SOAP assessments */

const assessmentSchema = new Schema(
  {
    patient: { type: Types.ObjectId, ref: "Patient", required: true, index: true },
    session: { type: Types.ObjectId, ref: "TreatmentSession", default: null },
    date: { type: Date, default: () => new Date() },
    chiefComplaint: { type: String, default: "", trim: true, maxlength: 600 },
    subjective: { type: String, default: "", maxlength: 4000 },
    objective: {
      painVAS: { type: Number, min: 0, max: 10, default: 0 },
      rom: [
        {
          joint: { type: String, default: "" },
          movement: { type: String, default: "" },
          degrees: { type: Number, default: 0 },
          normalDegrees: { type: Number, default: 0 },
          notes: { type: String, default: "" },
        },
      ],
      mmt: [
        {
          muscleGroup: { type: String, default: "" },
          grade: { type: String, default: "5/5" },
        },
      ],
      specialTests: [
        {
          name: { type: String, default: "" },
          result: { type: String, default: "Negative" },
        },
      ],
      postureGaitNotes: { type: String, default: "", maxlength: 2000 },
    },
    assessment: { type: String, default: "", maxlength: 4000 },
    plan: { type: String, default: "", maxlength: 4000 },
    assessedBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

assessmentSchema.index({ patient: 1, date: -1 });

export const Assessment = model("Assessment", assessmentSchema, "patient_assessments");

/* ------------------------------------------------------------- expenses */

const expenseSchema = new Schema(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, default: "other", index: true },
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, default: () => new Date(), index: true },
    description: { type: String, default: "", trim: true, maxlength: 600 },
    recordedBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });

export const Expense = model("Expense", expenseSchema, "practice_expenses");

/* ---------------------------------------------- clinic hours & identity */

/* A single row (key: "clinic"). Working hours drive the calendar grid and the
   off-hours warning; the identity fields print on receipts. */
const clinicSettingsSchema = new Schema(
  {
    key: { type: String, default: "clinic", unique: true },

    clinicName: { type: String, default: "Physio Castle", trim: true, maxlength: 120 },
    therapistName: { type: String, default: "Dr. Riddhi Shah (PT)", trim: true, maxlength: 120 },
    clinicAddress: { type: String, default: "Surat, Gujarat", trim: true, maxlength: 400 },
    clinicPhone: { type: String, default: "", trim: true, maxlength: 32 },
    clinicEmail: { type: String, default: "", trim: true, maxlength: 200 },
    receiptPrefix: { type: String, default: "PC", trim: true, maxlength: 10 },
    receiptFooter: {
      type: String,
      default: "Thank you for choosing Physio Castle for your recovery journey.",
      trim: true,
      maxlength: 400,
    },

    // One entry per weekday, index 0 = Sunday. "HH:mm" in clinic time.
    workingHours: {
      type: [
        {
          _id: false,
          day: { type: Number, min: 0, max: 6 },
          open: { type: String, default: "09:00" },
          close: { type: String, default: "19:00" },
          closed: { type: Boolean, default: false },
        },
      ],
      default: [],
    },

    // The calendar grid's row height, and the default length of a new booking.
    slotMinutes: { type: Number, min: 10, max: 120, default: 30 },
    defaultDurationMin: { type: Number, min: 5, max: 480, default: 45 },

    // Full-day closures: { date: "YYYY-MM-DD", label }.
    holidays: {
      type: [
        {
          _id: false,
          date: { type: String, required: true },
          label: { type: String, default: "", trim: true, maxlength: 120 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export const ClinicSettings = model("ClinicSettings", clinicSettingsSchema, "clinic_settings");

/* ------------------------------------------------------ package catalogue */

/* The priced packages the clinic actually sells. Selecting one on a patient
   copies its numbers into that patient's plan — the patient keeps its own copy,
   so re-pricing the catalogue later never rewrites an agreed fee. */
const packageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    kind: { type: String, enum: PACKAGE_KINDS, default: "clinic", index: true },
    sessions: { type: Number, min: 0, max: 500, default: 0 },
    fee: { type: Number, min: 0, default: 0 },
    installmentAmount: { type: Number, min: 0, default: 0 },
    description: { type: String, default: "", trim: true, maxlength: 600 },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

packageSchema.index({ active: 1, name: 1 });

export const TreatmentPackage = model("TreatmentPackage", packageSchema, "treatment_packages");

/* ------------------------------------------------------- instagram feed */

/* A curated list of post shortcodes for the homepage wall. Only the reference
   is stored — the image, caption and like count stay on Instagram and are
   fetched by their embed script, so a caption edited on the phone is edited on
   the website too, and nothing here goes stale or has to be re-uploaded. */
const instagramPostSchema = new Schema(
  {
    shortcode: { type: String, required: true, unique: true, trim: true, maxlength: 24 },
    // Free-text reminder of which post this is, for whoever curates the list.
    label: { type: String, default: "", trim: true, maxlength: 160 },
    order: { type: Number, default: 0, index: true },
    active: { type: Boolean, default: true, index: true },
    addedBy: { type: Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

instagramPostSchema.index({ active: 1, order: 1 });

export const InstagramPost = model("InstagramPost", instagramPostSchema, "instagram_posts");

/* --------------------------------------------------- reviews & testimonials */

const reviewSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    role: { type: String, default: "Patient", trim: true, maxlength: 120 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = model("Review", reviewSchema, "patient_reviews");

/* --------------------------------------------------- service CMS content */

const serviceContentSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    heading: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    pricePerSession: { type: Number, default: 0 },
    packagePrice: { type: Number, default: 0 },
    conds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const ServiceContent = model("ServiceContent", serviceContentSchema, "service_contents");


