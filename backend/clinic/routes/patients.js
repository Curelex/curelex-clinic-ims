// import express from 'express';
// import Patient from '../models/Patient.js';
// import User from '../models/User.js';
// import auth from '../middleware/auth.js';

// const router = express.Router();

// // ── Helper: emit live queue update to all patients tracking this doctor ───────
// async function broadcastQueueUpdate(io, clinicId, doctorId, date) {
//   if (!io) return;
//   try {
//     const patients = await Patient.find({ clinicId, doctorId, date })
//       .select('token name status')
//       .sort({ token: 1 })
//       .lean();

//     const currentlyServing = patients.find((p) => p.status === 'called');

//     const payload = {
//       currentToken:   currentlyServing ? currentlyServing.token : null,
//       currentPatient: currentlyServing ? currentlyServing.name  : null,
//       waitingCount:   patients.filter((p) => p.status === 'waiting').length,
//       doneCount:      patients.filter((p) => p.status === 'done').length,
//       totalCount:     patients.length,
//       patients:       patients.map((p) => ({ token: p.token, name: p.name, status: p.status })),
//     };

//     const room = `queue_${clinicId}_${doctorId}_${date}`;
//     io.to(room).emit('queue_update', payload);
//     console.log(`📡 Broadcasted queue_update to room: ${room}`);
//   } catch (err) {
//     console.error('broadcastQueueUpdate error:', err.message);
//   }
// }

// // ── GET /api/patients  — list with optional filters ──────────────────────────
// router.get('/', auth, async (req, res) => {
//   try {
//     const { role, clinicId } = req.user;
//     const { date, doctorId, status } = req.query;

//     const filter = { clinicId };
//     if (date)     filter.date     = date;
//     if (doctorId) filter.doctorId = doctorId;
//     if (status)   filter.status   = status;

//     // Receptionist & admin see all; doctor sees only their own
//     if (role === 'doctor') filter.doctorId = req.user.id;

//     const patients = await Patient.find(filter).sort({ token: 1 });
//     res.json(patients);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // ── GET /api/patients/history/:phone  — all visits + file metadata for a phone
// // ⚠️  MUST be defined BEFORE /:id routes so Express doesn't treat "history" as an id
// router.get('/history/:phone', auth, async (req, res) => {
//   try {
//     const { clinicId } = req.user;
//     const { phone } = req.params;

//     if (!phone) {
//       return res.status(400).json({ success: false, message: 'Phone number is required.' });
//     }

//     // Find all visits for this phone number in this clinic, newest first
//     const visits = await Patient.find({ clinicId, phone })
//       .sort({ date: -1, token: -1 })
//       .lean();

//     // Return visit info + file metadata only (no binary data)
//     const visitsWithFiles = visits.map((v) => ({
//       _id:        v._id,
//       date:       v.date,
//       time:       v.time,
//       token:      v.token,
//       symptoms:   v.symptoms,
//       notes:      v.notes,
//       doctorName: v.doctorName,
//       doctorId:   v.doctorId,
//       status:     v.status,
//       files: (v.files || []).map((f) => ({
//         _id:        f._id,
//         filename:   f.filename,
//         mimeType:   f.mimeType,
//         size:       f.size,
//         uploadedBy: f.uploadedBy,
//         uploadedAt: f.uploadedAt,
//       })),
//     }));

//     res.json({ success: true, visits: visitsWithFiles });
//   } catch (err) {
//     console.error('History fetch error:', err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// });

// // ── POST /api/patients  — add new patient + assign token ─────────────────────
// router.post('/', auth, async (req, res) => {
//   try {
//     const { role, clinicId } = req.user;
//     if (!['admin', 'receptionist'].includes(role))
//       return res.status(403).json({ message: 'Not authorized.' });

//     const {
//       doctorId, doctorName,
//       name, age, phone, whatsapp, gender, symptoms, notes,
//       totalFee, paid, dues, paymentMethod,
//       date, time,
//     } = req.body;

//     if (!doctorId || !name || !symptoms || !date || !time)
//       return res.status(400).json({ message: 'Missing required fields.' });

//     // Check doctor daily token limit
//     const doctor = await User.findById(doctorId);
//     if (doctor && doctor.dailyTokenLimit > 0) {
//       const todayCount = await Patient.countDocuments({ clinicId, doctorId, date });
//       if (todayCount >= doctor.dailyTokenLimit) {
//         return res.status(400).json({
//           message: `Token limit reached for Dr. ${doctorName}. Max ${doctor.dailyTokenLimit} patients per day.`,
//         });
//       }
//     }

//     // Next token number for this doctor today
//     const lastPatient = await Patient.findOne({ clinicId, doctorId, date }).sort({ token: -1 });
//     const token = lastPatient ? lastPatient.token + 1 : 1;

//     const patient = await Patient.create({
//       clinicId, doctorId, doctorName,
//       token, name, age, phone, whatsapp, gender, symptoms, notes,
//       totalFee, paid, dues, paymentMethod,
//       date, time, status: 'waiting',
//     });

//     // Broadcast updated queue to all live-tracking patients
//     const io = req.app.get('io');
//     await broadcastQueueUpdate(io, clinicId, doctorId, date);

//     res.status(201).json(patient);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // ── PATCH /api/patients/:id/status  — update status (called/done/waiting) ────
// router.patch('/:id/status', auth, async (req, res) => {
//   try {
//     const { role, clinicId } = req.user;
//     if (!['admin', 'receptionist', 'doctor'].includes(role))
//       return res.status(403).json({ message: 'Not authorized.' });

//     const { status } = req.body;
//     if (!['waiting', 'called', 'done'].includes(status))
//       return res.status(400).json({ message: 'Invalid status.' });

//     const patient = await Patient.findOneAndUpdate(
//       { _id: req.params.id, clinicId },
//       { status },
//       { new: true }
//     );

//     if (!patient) return res.status(404).json({ message: 'Patient not found.' });

//     // Broadcast live queue update to all patients tracking this doctor
//     const io = req.app.get('io');
//     await broadcastQueueUpdate(io, clinicId, patient.doctorId, patient.date);

//     res.json(patient);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // ── PATCH /api/patients/:id/followup  — update follow-up ─────────────────────
// router.patch('/:id/followup', auth, async (req, res) => {
//   try {
//     const { clinicId } = req.user;
//     const { followUpDate, followUpNote } = req.body;

//     const patient = await Patient.findOneAndUpdate(
//       { _id: req.params.id, clinicId },
//       { followUpDate, followUpNote },
//       { new: true }
//     );

//     if (!patient) return res.status(404).json({ message: 'Patient not found.' });
//     res.json(patient);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // ── PATCH /api/patients/:id/payment  — update payment ────────────────────────
// router.patch('/:id/payment', auth, async (req, res) => {
//   try {
//     const { clinicId } = req.user;
//     const { totalFee, paid, dues, paymentMethod } = req.body;

//     const patient = await Patient.findOneAndUpdate(
//       { _id: req.params.id, clinicId },
//       { totalFee, paid, dues, paymentMethod },
//       { new: true }
//     );

//     if (!patient) return res.status(404).json({ message: 'Patient not found.' });
//     res.json(patient);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// // ── DELETE /api/patients/:id ──────────────────────────────────────────────────
// router.delete('/:id', auth, async (req, res) => {
//   try {
//     const { role, clinicId } = req.user;
//     if (!['admin', 'receptionist'].includes(role))
//       return res.status(403).json({ message: 'Not authorized.' });

//     const patient = await Patient.findOneAndDelete({ _id: req.params.id, clinicId });
//     if (!patient) return res.status(404).json({ message: 'Patient not found.' });

//     // Broadcast updated queue
//     const io = req.app.get('io');
//     await broadcastQueueUpdate(io, clinicId, patient.doctorId, patient.date);

//     res.json({ message: 'Patient deleted.' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// export default router;

import express from 'express';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// ── Helper: emit live queue update to all patients tracking this doctor ───────
async function broadcastQueueUpdate(io, clinicId, doctorId, date) {
  if (!io) return;
  try {
    const patients = await Patient.find({ clinicId, doctorId, date })
      .select('token name status')
      .sort({ token: 1 })
      .lean();

    const currentlyServing = patients.find((p) => p.status === 'called');

    const payload = {
      currentToken:   currentlyServing ? currentlyServing.token : null,
      currentPatient: currentlyServing ? currentlyServing.name  : null,
      waitingCount:   patients.filter((p) => p.status === 'waiting').length,
      doneCount:      patients.filter((p) => p.status === 'done').length,
      totalCount:     patients.length,
      patients:       patients.map((p) => ({ token: p.token, name: p.name, status: p.status })),
    };

    const room = `queue_${clinicId}_${doctorId}_${date}`;
    io.to(room).emit('queue_update', payload);
    console.log(`📡 Broadcasted queue_update to room: ${room}`);
  } catch (err) {
    console.error('broadcastQueueUpdate error:', err.message);
  }
}

// ── GET /api/patients  — list with optional filters ──────────────────────────
// FIX: Added 'owner', 'manager' roles so IMS users can access this endpoint.
// FIX: Excludes binary file data and adds fileCount for the 📎 badge.
router.get('/', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    const { date, doctorId, status } = req.query;

    const filter = { clinicId };
    if (date)     filter.date     = date;
    if (doctorId) filter.doctorId = doctorId;
    if (status)   filter.status   = status;

    // Doctor sees only their own patients
    if (role === 'doctor') {
      filter.doctorId = req.user.id;
    } else if (!['admin', 'receptionist', 'pharmacist', 'owner', 'manager'].includes(role)) {
      // FIX: Added 'owner' and 'manager' to allowed roles
      return res.status(403).json({ message: 'Not allowed.' });
    }

    // FIX: Exclude binary file data (-files.data) to keep response fast.
    // Use .lean() so we can add fileCount manually.
    const patients = await Patient.find(filter)
      .select('-files.data')
      .sort({ token: 1 })
      .lean();

    // FIX: Add fileCount so the frontend 📎 badge works without loading all files.
    // Strip the files array itself — files are loaded lazily per patient row.
    const withCount = patients.map((p) => {
      const fileCount = (p.files || []).length;
      const { files, ...rest } = p;
      return { ...rest, fileCount };
    });

    res.json(withCount);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/patients/history/:phone  — all visits + file metadata for a phone
// ⚠️  MUST be defined BEFORE /:id routes so Express doesn't treat "history" as an id
router.get('/history/:phone', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { phone } = req.params;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    // Find all visits for this phone number in this clinic, newest first
    const visits = await Patient.find({ clinicId, phone })
      .sort({ date: -1, token: -1 })
      .lean();

    // Return visit info + file metadata only (no binary data)
    const visitsWithFiles = visits.map((v) => ({
      _id:        v._id,
      date:       v.date,
      time:       v.time,
      token:      v.token,
      symptoms:   v.symptoms,
      notes:      v.notes,
      doctorName: v.doctorName,
      doctorId:   v.doctorId,
      status:     v.status,
      files: (v.files || []).map((f) => ({
        _id:        f._id,
        filename:   f.filename,
        mimeType:   f.mimeType,
        size:       f.size,
        uploadedBy: f.uploadedBy,
        uploadedAt: f.uploadedAt,
      })),
    }));

    res.json({ success: true, visits: visitsWithFiles });
  } catch (err) {
    console.error('History fetch error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/patients/:id/files  — list file metadata for a patient ──────────
router.get('/:id/files', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const patient = await Patient.findOne({ _id: req.params.id, clinicId })
      .select('files._id files.filename files.mimeType files.size files.uploadedBy files.uploadedAt');

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json(patient.files);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/patients/:id/files/:fileId  — download a single file ────────────
router.get('/:id/files/:fileId', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const patient = await Patient.findOne({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const file = patient.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found.' });

    res.set('Content-Type', file.mimeType);
    res.set('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/patients/:id/files  — upload a file ────────────────────────────
router.post('/:id/files', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist', 'doctor'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const patient = await Patient.findOne({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    const { filename, mimeType, data } = req.body; // data = base64 string from frontend
    if (!filename || !mimeType || !data)
      return res.status(400).json({ message: 'filename, mimeType, and data are required.' });

    const buffer = Buffer.from(data, 'base64');

    patient.files.push({
      filename,
      mimeType,
      size:       buffer.length,
      uploadedBy: role,
      data:       buffer,
    });

    await patient.save();

    // Return only the new file's metadata (never return binary data)
    const newFile = patient.files[patient.files.length - 1];
    res.status(201).json({
      _id:        newFile._id,
      filename:   newFile.filename,
      mimeType:   newFile.mimeType,
      size:       newFile.size,
      uploadedBy: newFile.uploadedBy,
      uploadedAt: newFile.uploadedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/patients/:id/files/:fileId  — delete a file ──────────────────
router.delete('/:id/files/:fileId', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist', 'doctor'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const patient = await Patient.findOne({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    patient.files.pull({ _id: req.params.fileId });
    await patient.save();

    res.json({ message: 'File deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/patients  — add new patient + assign token ─────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const {
      doctorId, doctorName,
      name, age, phone, whatsapp, gender, symptoms, notes,
      totalFee, paid, dues, paymentMethod,
      date, time,
    } = req.body;

    if (!doctorId || !name || !symptoms || !date || !time)
      return res.status(400).json({ message: 'Missing required fields.' });

    // Check doctor daily token limit
    const doctor = await User.findById(doctorId);
    if (doctor && doctor.dailyTokenLimit > 0) {
      const todayCount = await Patient.countDocuments({ clinicId, doctorId, date });
      if (todayCount >= doctor.dailyTokenLimit) {
        return res.status(400).json({
          message: `Token limit reached for Dr. ${doctorName}. Max ${doctor.dailyTokenLimit} patients per day.`,
        });
      }
    }

    // Next token number for this doctor today
    const lastPatient = await Patient.findOne({ clinicId, doctorId, date }).sort({ token: -1 });
    const token = lastPatient ? lastPatient.token + 1 : 1;

    const patient = await Patient.create({
      clinicId, doctorId, doctorName,
      token, name, age, phone, whatsapp, gender, symptoms, notes,
      totalFee, paid, dues, paymentMethod,
      date, time, status: 'waiting',
    });

    // Broadcast updated queue to all live-tracking patients
    const io = req.app.get('io');
    await broadcastQueueUpdate(io, clinicId, doctorId, date);

    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/patients/:id/status  — update status (called/done/waiting) ────
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist', 'doctor'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const { status } = req.body;
    if (!['waiting', 'called', 'done'].includes(status))
      return res.status(400).json({ message: 'Invalid status.' });

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { status },
      { new: true }
    );

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    // Broadcast live queue update to all patients tracking this doctor
    const io = req.app.get('io');
    await broadcastQueueUpdate(io, clinicId, patient.doctorId, patient.date);

    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/patients/:id/followup  — update follow-up ─────────────────────
router.patch('/:id/followup', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { followUpDate, followUpNote } = req.body;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { followUpDate, followUpNote },
      { new: true }
    );

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/patients/:id/payment  — update payment ────────────────────────
router.patch('/:id/payment', auth, async (req, res) => {
  try {
    const { clinicId } = req.user;
    const { totalFee, paid, dues, paymentMethod } = req.body;

    const patient = await Patient.findOneAndUpdate(
      { _id: req.params.id, clinicId },
      { totalFee, paid, dues, paymentMethod },
      { new: true }
    );

    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/patients/:id ──────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const { role, clinicId } = req.user;
    if (!['admin', 'receptionist'].includes(role))
      return res.status(403).json({ message: 'Not authorized.' });

    const patient = await Patient.findOneAndDelete({ _id: req.params.id, clinicId });
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });

    // Broadcast updated queue
    const io = req.app.get('io');
    await broadcastQueueUpdate(io, clinicId, patient.doctorId, patient.date);

    res.json({ message: 'Patient deleted.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;