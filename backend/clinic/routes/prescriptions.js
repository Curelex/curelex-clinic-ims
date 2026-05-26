import express from 'express';
import auth from '../middleware/auth.js';
import Prescription from '../models/Prescription.js';
import DoctorMedicineList from '../models/DoctorMedicineList.js';
import Patient from '../models/Patient.js';
import Clinic from '../models/Clinic.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: update doctor's medicine/test dictionary
// ─────────────────────────────────────────────────────────────────────────────
async function updateDoctorDictionary(doctorId, clinicId, medicines = [], tests = []) {
  const medicineNames = medicines
    .map((m) => (m.name || '').trim())
    .filter(Boolean);
  const testNames = tests
    .map((t) => (t.name || '').trim())
    .filter(Boolean);

  if (medicineNames.length === 0 && testNames.length === 0) return;

  await DoctorMedicineList.findOneAndUpdate(
    { doctorId },
    {
      $set:  { clinicId },
      $addToSet: {
        medicines: { $each: medicineNames },
        tests:     { $each: testNames },
      },
    },
    { upsert: true, new: true }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/prescriptions
// Doctor creates a new prescription for a patient
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { clinicId, _id: doctorId } = req.user;

    const {
      patientId,
      diagnosis,
      medicines,
      tests,
      notes,
      followUpDate,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: 'patientId is required' });
    }

    // Fetch patient + clinic for denormalized fields
    const [patient, clinic] = await Promise.all([
      Patient.findOne({ _id: patientId, clinicId }).lean(),
      Clinic.findById(clinicId).lean(),
    ]);

    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const prescription = await Prescription.create({
      clinicId,
      doctorId,
      patientId,
      doctorName:       req.user.name       || '',
      doctorSpecialist: req.user.specialist  || '',
      patientName:      patient.name         || '',
      patientAge:       patient.age          || '',
      patientGender:    patient.gender       || '',
      patientPhone:     patient.phone        || '',
      clinicName:       clinic?.name         || '',
      date:             patient.date,
      tokenNumber:      patient.token        || 0,
      diagnosis:        diagnosis            || '',
      medicines:        Array.isArray(medicines) ? medicines : [],
      tests:            Array.isArray(tests)     ? tests     : [],
      notes:            notes                    || '',
      followUpDate:     followUpDate             || '',
    });

    // Auto-save medicine & test names to doctor's dictionary
    await updateDoctorDictionary(
      doctorId,
      clinicId,
      prescription.medicines,
      prescription.tests
    );

    return res.status(201).json({ success: true, prescription });
  } catch (err) {
    console.error('Create prescription error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/patient/:patientId
// Get prescription(s) for a specific patient visit
// ─────────────────────────────────────────────────────────────────────────────
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const prescriptions = await Prescription.find({
      clinicId,
      patientId: req.params.patientId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/today
// Get ALL prescriptions for the clinic today — used by receptionist & pharmacist
// ─────────────────────────────────────────────────────────────────────────────
router.get('/today', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;

    // IST today
    const now     = new Date();
    const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const today   = istDate.toISOString().split('T')[0];

    const prescriptions = await Prescription.find({ clinicId, date: today })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/date/:date
// Get all prescriptions for a specific date (YYYY-MM-DD)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/date/:date', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const prescriptions = await Prescription.find({
      clinicId,
      date: req.params.date,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, prescriptions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/prescriptions/:id
// Doctor updates a prescription
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const { clinicId, _id: doctorId } = req.user;
    const { diagnosis, medicines, tests, notes, followUpDate } = req.body;

    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, clinicId, doctorId },
      {
        $set: {
          diagnosis:   diagnosis   || '',
          medicines:   Array.isArray(medicines) ? medicines : [],
          tests:       Array.isArray(tests)     ? tests     : [],
          notes:       notes                    || '',
          followUpDate: followUpDate            || '',
        },
      },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Update dictionary with any new names
    await updateDoctorDictionary(
      doctorId,
      clinicId,
      prescription.medicines,
      prescription.tests
    );

    return res.json({ success: true, prescription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/prescriptions/:id/dispense
// Pharmacist marks prescription as dispensed
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/dispense', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { $set: { isDispensed: true, isViewed: true, dispensedAt: new Date() } },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    return res.json({ success: true, prescription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/prescriptions/:id/viewed
// Pharmacist marks prescription as viewed
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/viewed', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const prescription = await Prescription.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { $set: { isViewed: true } },
      { new: true }
    );
    if (!prescription) return res.status(404).json({ message: 'Not found' });
    return res.json({ success: true, prescription });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescriptions/autocomplete
// Returns doctor's saved medicine & test names
// ─────────────────────────────────────────────────────────────────────────────
router.get('/autocomplete', auth, async (req, res) => {
  try {
    const { _id: doctorId } = req.user;
    const list = await DoctorMedicineList.findOne({ doctorId }).lean();
    return res.json({
      success:   true,
      medicines: list?.medicines || [],
      tests:     list?.tests     || [],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;