import express from 'express';
import cors from 'cors';
import connectClinicDB from './config/db.js';

const app = express();

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// Database connection (will be initialized when mounted)
let clinicDbConnection = null;

const initClinicDB = async () => {
  if (!clinicDbConnection) {
    clinicDbConnection = await connectClinicDB();
  }
  return clinicDbConnection;
};

// Make db available to routes
app.set('clinicDb', clinicDbConnection);

// Routes (without /api prefix - we'll add in main app)
import authRoutes from './routes/auth.js';
import clinicRoutes from './routes/clinics.js';
import userRoutes from './routes/users.js';
import patientRoutes from './routes/patients.js';
import superadminRoutes from './routes/superadmin.js';
import queueRoutes from './routes/queue.js';
import fileRoutes from './routes/files.js';

app.use('/auth', authRoutes);
app.use('/clinics', clinicRoutes);
app.use('/users', userRoutes);
app.use('/patients', patientRoutes);
app.use('/patients', fileRoutes);  // File routes mounted on patients path
app.use('/superadmin', superadminRoutes);
app.use('/queue', queueRoutes);

// Health check for clinic system
app.get('/health', (req, res) => {
  res.json({ status: 'Clinic system OK' });
});

export default { app, initClinicDB };