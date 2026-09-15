import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    sparse: true,
    trim: true,
    index: true,
  },
  username: {
    type: String,
    sparse: true,
    trim: true,
    unique: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: ['patient', 'admin'],
    default: 'patient',
  },
  district: {
    type: String,
    default: 'Varanasi',
  },
  preferredLanguage: {
    type: String,
    enum: ['English', 'Hindi', 'Telugu'],
    default: 'English',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
