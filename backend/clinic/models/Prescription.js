import mongoose from 'mongoose';

// ── Medicine sub-document ─────────────────────────────────────────────────────
const MedicineSchema = new mongoose.Schema({
  name:        { type: String, required: true },   // e.g. "Paracetamol 500mg"
  dosage:      { type: String, default: '' },       // e.g. "1 tablet"
  frequency:   { type: String, default: '' },       // e.g. "Twice daily"
  duration:    { type: String, default: '' },       // e.g. "5 days"
  instructions:{ type: String, default: '' },       // e.g. "After meals"
}, { _id: true });

// ── Test sub-document ─────────────────────────────────────────────────────────
const TestSchema = new mongoose.Schema({
  name:        { type: String, required: true },   // e.g. "CBC", "Urine R/E"
  instructions:{ type: String, default: '' },       // e.g. "Fasting"
}, { _id: true });

// ── Main Prescription schema ──────────────────────────────────────────────────
const PrescriptionSchema = new mongoose.Schema({
  // Links
  clinicId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic',  required: true },
  doctorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  patientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

  // Denormalized for fast reads (no populates needed)
  doctorName:    { type: String, required: true },
  doctorSpecialist: { type: String, default: '' },
  patientName:   { type: String, required: true },
  patientAge:    { type: String, default: '' },
  patientGender: { type: String, default: '' },
  patientPhone:  { type: String, default: '' },
  clinicName:    { type: String, default: '' },

  date:          { type: String, required: true },  // "YYYY-MM-DD"
  tokenNumber:   { type: Number, default: 0 },

  // Prescription content
  diagnosis:     { type: String, default: '' },
  medicines:     { type: [MedicineSchema], default: [] },
  tests:         { type: [TestSchema],    default: [] },
  notes:         { type: String, default: '' },      // General notes / advice
  followUpDate:  { type: String, default: '' },

  // Status flags
  isViewed:      { type: Boolean, default: false },  // Pharmacist viewed
  isDispensed:   { type: Boolean, default: false },  // Pharmacist dispensed meds
  dispensedAt:   { type: Date,    default: null },

}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
PrescriptionSchema.index({ clinicId: 1, date: 1 });
PrescriptionSchema.index({ doctorId: 1, date: 1 });
PrescriptionSchema.index({ patientId: 1 });

const Prescription = mongoose.model('Prescription', PrescriptionSchema);
export default Prescription;