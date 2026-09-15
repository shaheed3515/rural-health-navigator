import mongoose from 'mongoose';

const medicineStockSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'Essential Therapeutic' },
  status: { type: String, enum: ['In Stock', 'Low Stock', 'Out of Stock'], default: 'In Stock' },
  quantity: { type: Number, default: 500 },
}, { _id: false });

const doctorOnDutySchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  timing: { type: String, default: '08:00 AM - 02:00 PM' },
}, { _id: false });

const clinicSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['PHC', 'CHC'],
    default: 'PHC',
  },
  district: {
    type: String,
    required: true,
    index: true,
  },
  block: {
    type: String,
    default: 'Rural Sector',
  },
  address: {
    type: String,
    default: '',
  },
  coordinates: {
    lat: { type: Number, default: 25.3176 },
    lng: { type: Number, default: 82.9739 },
  },
  contact: {
    phone: { type: String, default: '+91 108' },
    emergencyHelpline: { type: String, default: '108' },
    ambulance: { type: String, default: '+91 108' },
  },
  operatingHours: {
    type: String,
    default: '24x7 Emergency / OPD: 08:00 AM - 02:00 PM',
  },
  emergencyBeds: {
    type: Number,
    default: 4,
  },
  doctorSpecializations: [{
    type: String,
  }],
  doctorsOnDuty: [doctorOnDutySchema],
  medicineStock: [medicineStockSchema],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Clinic = mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);
export default Clinic;
