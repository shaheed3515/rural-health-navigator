import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  tokenId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  tokenNumber: {
    type: Number,
    required: true,
  },
  patientName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    index: true,
  },
  facilityId: {
    type: String,
    required: true,
    index: true,
  },
  facilityName: {
    type: String,
    required: true,
  },
  facilityDistrict: {
    type: String,
    default: 'Rural Health Circle',
  },
  department: {
    type: String,
    required: true,
  },
  appointmentDate: {
    type: String,
    required: true,
  },
  patientCategory: {
    type: String,
    default: 'General',
  },
  notes: {
    type: String,
    default: '',
  },
  estimatedTime: {
    type: String,
    default: '09:30 AM',
  },
  roomNumber: {
    type: String,
    default: 'Room #1',
  },
  status: {
    type: String,
    enum: ['Confirmed', 'Completed', 'Cancelled', 'Pending Sync', 'Expired', 'Referral Order Active'],
    default: 'Confirmed',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
export default Appointment;
