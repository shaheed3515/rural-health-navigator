import React, { useState, useEffect, useRef } from 'react';
import FacilityMap from './components/FacilityMap';
import FloatingAIAssistant from './components/FloatingAIAssistant';
import { getTranslation } from './translations';
import {
  API_BASE_URL,
  apiFetch,
  registerPatient,
  loginAdmin,
  verifyCurrentUser,
  fetchMyAppointments,
  clearStoredAuth,
  getStoredUser
} from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('find-care');
  const [language, setLanguage] = useState('English'); // 'English' | 'Hindi' | 'Telugu'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'

  // Translation helper
  const t = (key) => getTranslation(key, language);

  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = getStoredUser();
    return stored || {
      role: 'patient',
      name: 'Guest Citizen',
      title: 'Rural Beneficiary / Patient'
    };
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRoleTab, setAuthRoleTab] = useState('patient'); // 'patient' | 'admin'
  const [loginUsername, setLoginUsername] = useState('cmo_admin');
  const [loginPassword, setLoginPassword] = useState('admin123');
  const [patientFormName, setPatientFormName] = useState('');
  const [patientFormPhone, setPatientFormPhone] = useState('');
  const [patientFormDistrict, setPatientFormDistrict] = useState('Varanasi');
  const [loginError, setLoginError] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [myAppointments, setMyAppointments] = useState([]);

  // 3-Dots Menu & Emergency Guide
  const [showMenu, setShowMenu] = useState(false);
  const [showEmergencyGuide, setShowEmergencyGuide] = useState(false);

  // Facilities data
  const [facilities, setFacilities] = useState([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [facilitiesError, setFacilitiesError] = useState(null);

  // Tab 1 Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [bedsOnly, setBedsOnly] = useState(false);
  const [asvOnly, setAsvOnly] = useState(false);

  // Tab 2 Booking State
  const [patientName, setPatientName] = useState(() => {
    const stored = getStoredUser();
    return stored?.fullName || '';
  });
  const [phone, setPhone] = useState(() => {
    const stored = getStoredUser();
    return stored?.phone || '';
  });
  const [facilityId, setFacilityId] = useState('');
  const [department, setDepartment] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [patientCategory, setPatientCategory] = useState('General');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccessToken, setBookingSuccessToken] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [bookedAppointments, setBookedAppointments] = useState([]);

  // Tab 3 Full-Page Multimodal Chat State
  const [tab3Messages, setTab3Messages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: "Hello! I am your Health AI Assistant. You can ask clinical guidance questions, ask about local emergency beds, or upload a photo of your prescription or medication box in Hindi, Telugu, or English.",
      time: 'Just now',
      source: 'gemini-grounded'
    }
  ]);
  const [tab3Input, setTab3Input] = useState('');
  const [tab3Image, setTab3Image] = useState(null); // base64 string
  const [tab3ImageName, setTab3ImageName] = useState('');
  const [tab3Loading, setTab3Loading] = useState(false);
  const tab3EndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Tab 4 Admin Suite Modals & Inline Stock
  const [showAddFacilityModal, setShowAddFacilityModal] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);
  const [facilityForm, setFacilityForm] = useState({
    name: '',
    type: 'PHC',
    district: 'Varanasi',
    block: '',
    address: '',
    phone: '+91 94500 11111',
    emergencyBeds: 4,
    doctorSpecializations: 'General Medicine, Pediatrics',
    lat: 25.3176,
    lng: 82.9739
  });
  const [adminActionLoading, setAdminActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Tab 4 Stock Filter
  const [stockSearch, setStockSearch] = useState('');
  const [stockFacilityFilter, setStockFacilityFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');

  // Floating AI Assistant State (available when on Tabs 1, 2, or 4)
  const [floatingAIOpen, setFloatingAIOpen] = useState(false);
  const [aiExternalPrompt, setAiExternalPrompt] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch facilities
  const fetchFacilities = async () => {
    try {
      setFacilitiesLoading(true);
      const res = await apiFetch('/api/facilities');
      const data = await res.json();
      if (data.success && Array.isArray(data.facilities)) {
        setFacilities(data.facilities);
        if (!facilityId && data.facilities.length > 0) {
          setFacilityId(data.facilities[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
      setFacilitiesError('Could not connect to backend health server.');
    } finally {
      setFacilitiesLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await apiFetch('/api/appointments');
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setBookedAppointments(data.appointments);
      }
    } catch (err) {
      console.warn('Could not fetch appointments:', err);
    }
  };

  const loadMyAppointments = async (userPhone) => {
    if (!userPhone) return;
    try {
      const list = await fetchMyAppointments(userPhone);
      setMyAppointments(list);
    } catch (err) {
      console.warn('Could not fetch personal appointments:', err);
    }
  };

  useEffect(() => {
    fetchFacilities();
    fetchAppointments();

    // Verify stored JWT with backend
    verifyCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
        if (user.role === 'patient') {
          if (user.fullName) setPatientName(user.fullName);
          if (user.phone) {
            setPhone(user.phone);
            loadMyAppointments(user.phone);
          }
        }
      }
    });
  }, []);

  // Department sync
  const selectedFacilityObj = facilities.find(f => f.id === facilityId);
  const availableDepartments = selectedFacilityObj ? selectedFacilityObj.doctorSpecializations : [];

  useEffect(() => {
    if (availableDepartments.length > 0 && (!department || !availableDepartments.includes(department))) {
      setDepartment(availableDepartments[0]);
    }
  }, [facilityId, facilities]);

  // Scroll to bottom for Tab 3 chat
  useEffect(() => {
    if (activeTab === 'ai-assistant') {
      tab3EndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tab3Messages, activeTab]);

  // Auth: Patient Register/Login
  const handlePatientAuth = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    if (!patientFormName.trim() || !patientFormPhone.trim()) {
      setLoginError('Please enter your full name and 10-digit mobile number.');
      setLoginLoading(false);
      return;
    }

    const cleanPhone = patientFormPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setLoginError('Please enter a valid 10-digit mobile number.');
      setLoginLoading(false);
      return;
    }

    try {
      const data = await registerPatient({
        fullName: patientFormName.trim(),
        phone: cleanPhone,
        district: patientFormDistrict,
        preferredLanguage: language
      });

      if (data.success && data.user) {
        setCurrentUser(data.user);
        setPatientName(data.user.fullName);
        setPhone(data.user.phone);
        loadMyAppointments(data.user.phone);
        setShowAuthModal(false);
        showToast(`Welcome, ${data.user.fullName}!`);
      }
    } catch (err) {
      console.error('Patient login error:', err);
      setLoginError(err.message || 'Authentication failed. Please retry.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Auth: Admin Login
  const handleAdminAuth = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const data = await loginAdmin({
        username: loginUsername,
        password: loginPassword
      });

      if (data.success && data.user) {
        setCurrentUser(data.user);
        setShowAuthModal(false);
        showToast(`Logged in as ${data.user.fullName || data.user.name || 'CMO Officer'}`);
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setLoginError(err.message || 'Invalid CMO Administrator credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGuestEnter = () => {
    clearStoredAuth();
    setCurrentUser({
      role: 'patient',
      name: 'Guest Citizen',
      title: 'Rural Beneficiary / Patient'
    });
    setShowAuthModal(false);
    showToast('Browsing as Guest Patient.');
  };

  const handleLogout = () => {
    clearStoredAuth();
    setCurrentUser({
      role: 'patient',
      name: 'Guest Citizen',
      title: 'Rural Beneficiary / Patient'
    });
    setMyAppointments([]);
    setShowMenu(false);
    showToast('Logged out. Switched to Guest Patient view.');
  };

  // Book OPD Token
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccessToken(null);

    if (!patientName || !phone || !facilityId || !department || !appointmentDate) {
      setBookingError('Please fill out all required fields.');
      return;
    }

    try {
      setBookingLoading(true);
      const res = await apiFetch('/api/appointments', {
        method: 'POST',
        body: {
          patientName,
          phone,
          facilityId,
          department,
          appointmentDate,
          patientCategory
        }
      });

      const data = await res.json();
      if (data.success && data.token) {
        setBookingSuccessToken(data.token);
        setBookedAppointments(prev => [data.token, ...prev]);
        setMyAppointments(prev => [data.token, ...prev]);
        showToast('OPD Token Confirmed successfully!');
      } else {
        setBookingError(data.error || 'Failed to generate OPD token.');
      }
    } catch (err) {
      console.error('Booking error:', err);
      setBookingError('Network error while booking token.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Tab 3: Multimodal Image Upload Handler
  const handleImageSelect = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPEG, WebP).');
      return;
    }

    setTab3ImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setTab3Image(reader.result); // base64 data URL
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setTab3Image(null);
    setTab3ImageName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Tab 3: Send Message with optional Image
  const handleSendTab3Chat = async (promptText = tab3Input) => {
    const textToSend = promptText.trim();
    if (!textToSend && !tab3Image) return;
    if (tab3Loading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend || 'Uploaded medical photo for analysis.',
      image: tab3Image,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTab3Messages(prev => [...prev, userMsg]);
    const imagePayload = tab3Image;
    setTab3Input('');
    removeSelectedImage();
    setTab3Loading(true);

    try {
      const res = await apiFetch('/api/chat', {
        method: 'POST',
        body: {
          message: textToSend,
          language,
          image: imagePayload
        }
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const botMsg = {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.reply,
          source: data.source,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setTab3Messages(prev => [...prev, botMsg]);
      } else {
        throw new Error(data.error || 'No response from assistant');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setTab3Messages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: '⚠️ Unable to process health query. Please check connection and try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setTab3Loading(false);
    }
  };

  // Facility CRUD: Save (Add or Edit)
  const handleSaveFacility = async (e) => {
    e.preventDefault();
    setAdminActionLoading(true);

    const specsArray = facilityForm.doctorSpecializations
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const payload = {
      name: facilityForm.name,
      type: facilityForm.type,
      district: facilityForm.district,
      block: facilityForm.block || 'Rural Sector',
      address: facilityForm.address || `Village ${facilityForm.name}, ${facilityForm.district}, UP`,
      emergencyBeds: Number(facilityForm.emergencyBeds),
      doctorSpecializations: specsArray.length > 0 ? specsArray : ['General Medicine'],
      coordinates: {
        lat: Number(facilityForm.lat),
        lng: Number(facilityForm.lng)
      },
      contact: {
        phone: facilityForm.phone,
        emergencyHelpline: '108',
        ambulance: '+91 94500 00099'
      }
    };

    try {
      const url = editingFacility
        ? `/api/facilities/${editingFacility.id}`
        : `/api/facilities`;
      const method = editingFacility ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: payload
      });

      const data = await res.json();
      if (data.success) {
        await fetchFacilities();
        setShowAddFacilityModal(false);
        setEditingFacility(null);
        showToast(editingFacility ? 'Facility updated & persisted.' : 'New facility created & persisted.');
      } else {
        alert(data.error || 'Failed to save facility.');
      }
    } catch (err) {
      console.error('Save facility error:', err);
      alert('Network error saving facility.');
    } finally {
      setAdminActionLoading(false);
    }
  };

  const handleDeleteFacility = async (clinic) => {
    if (!window.confirm(`Are you sure you want to remove "${clinic.name}" from the district registry?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/facilities/${clinic.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchFacilities();
        showToast(`Facility '${clinic.name}' deleted.`);
      } else {
        alert(data.error || 'Failed to delete facility.');
      }
    } catch (err) {
      console.error('Delete facility error:', err);
      alert('Network error deleting facility.');
    }
  };

  const openEditModal = (clinic) => {
    setEditingFacility(clinic);
    setFacilityForm({
      name: clinic.name,
      type: clinic.type,
      district: clinic.district,
      block: clinic.block || '',
      address: clinic.address || '',
      phone: clinic.contact?.phone || '',
      emergencyBeds: clinic.emergencyBeds,
      doctorSpecializations: (clinic.doctorSpecializations || []).join(', '),
      lat: clinic.coordinates?.lat || 25.3176,
      lng: clinic.coordinates?.lng || 82.9739
    });
    setShowAddFacilityModal(true);
  };

  // Stock CRUD
  const handleUpdateStock = async (facilityId, medicineName, newStatus, newQuantity) => {
    try {
      const res = await apiFetch('/api/stock', {
        method: 'PUT',
        body: {
          facilityId,
          medicineName,
          status: newStatus,
          quantity: newQuantity
        }
      });

      const data = await res.json();
      if (data.success) {
        setFacilities(prev => prev.map(f => {
          if (f.id !== facilityId) return f;
          return {
            ...f,
            medicineStock: (f.medicineStock || []).map(m => {
              if (m.name.toLowerCase() === medicineName.toLowerCase()) {
                return { ...m, status: newStatus || m.status, quantity: newQuantity !== undefined ? newQuantity : m.quantity };
              }
              return m;
            })
          };
        }));
        showToast(`Updated '${medicineName}' stock live.`);
      }
    } catch (err) {
      console.error('Update stock error:', err);
      showToast('Error updating stock level');
    }
  };

  // Direct Booking prefill from Clinic Card or Map Popup
  const initiateBookingForClinic = (clinic) => {
    setFacilityId(clinic.id);
    if (clinic.doctorSpecializations && clinic.doctorSpecializations.length > 0) {
      setDepartment(clinic.doctorSpecializations[0]);
    }
    setActiveTab('book-token');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Pre-selected ${clinic.name}`);
  };

  // Ask AI about clinic
  const askAIAboutClinic = (clinic) => {
    const prompt = `Give me a quick rural health summary of ${clinic.name} in ${clinic.district}: available emergency beds, doctor roster, and critical medicine stock.`;
    if (activeTab === 'ai-assistant') {
      handleSendTab3Chat(prompt);
    } else {
      setAiExternalPrompt(prompt);
      setFloatingAIOpen(true);
    }
  };

  // Filter facilities
  const filteredFacilities = facilities.filter(f => {
    const matchesSearch = searchQuery === '' || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.block && f.block.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.doctorSpecializations || []).some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (f.medicineStock || []).some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDistrict = selectedDistrict === '' || f.district.toLowerCase() === selectedDistrict.toLowerCase();
    const matchesSpec = selectedSpecialization === '' || (f.doctorSpecializations || []).some(s => s.toLowerCase() === selectedSpecialization.toLowerCase());
    const matchesBeds = !bedsOnly || f.emergencyBeds > 0;
    const matchesASV = !asvOnly || (f.medicineStock || []).some(m => m.name.toLowerCase().includes('snake venom') && m.status === 'In Stock');

    return matchesSearch && matchesDistrict && matchesSpec && matchesBeds && matchesASV;
  });

  const allInventoryItems = facilities.flatMap(facility => 
    (facility.medicineStock || []).map(med => ({
      facilityId: facility.id,
      facilityName: facility.name,
      district: facility.district,
      type: facility.type,
      ...med,
      key: `${facility.id}-${med.name}`
    }))
  );

  const filteredInventory = allInventoryItems.filter(item => {
    const matchesSearch = stockSearch === '' || 
      item.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(stockSearch.toLowerCase()) ||
      item.facilityName.toLowerCase().includes(stockSearch.toLowerCase());

    const matchesFacility = stockFacilityFilter === '' || item.facilityId === stockFacilityFilter;
    const matchesStatus = stockStatusFilter === '' || item.status === stockStatusFilter;

    return matchesSearch && matchesFacility && matchesStatus;
  });

  const totalBeds = facilities.reduce((sum, f) => sum + (Number(f.emergencyBeds) || 0), 0);
  const totalClinics = facilities.length;
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200">
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Emergency Top Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white px-4 py-2 text-xs font-semibold shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between flex-wrap">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>{t('emergencyBanner')}</span>
          </div>

          <button
            onClick={() => setShowEmergencyGuide(true)}
            className="text-[11px] underline font-bold hover:text-red-100 cursor-pointer"
          >
            {t('openGuide')}
          </button>
        </div>
      </div>

      {/* 2. Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
          {/* Platform Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-black text-xl shadow-md shadow-emerald-600/20">
              🏥
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 leading-tight">
                {t('platformTitle')}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {t('platformSubtitle')}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* Live Role Badge */}
            <div
              onClick={() => setShowAuthModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition shadow-2xs ${
                isAdmin
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/20'
                  : currentUser.phone
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-400/20'
                  : 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100'
              }`}
              title="Click to Switch Role or View Profile"
            >
              <span className={`w-2 h-2 rounded-full ${isAdmin ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></span>
              <span className="truncate max-w-[150px]">
                {isAdmin
                  ? (currentUser.fullName || t('roleAdmin'))
                  : currentUser.phone
                  ? `👤 ${currentUser.fullName || currentUser.name}`
                  : t('rolePatient')}
              </span>
              <span className="text-[10px] opacity-70">▾</span>
            </div>

            {/* Language Toggle Switcher (Synchronized with All UI Strings) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {[
                { key: 'English', label: 'EN' },
                { key: 'Hindi', label: 'हिन्दी' },
                { key: 'Telugu', label: 'తెలుగు' }
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setLanguage(item.key)}
                  className={`px-2.5 py-1 rounded-md transition font-bold cursor-pointer ${
                    language === item.key
                      ? 'bg-white text-emerald-800 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 3-Dots Dropdown Menu (⋮) */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-lg cursor-pointer transition"
                title="Platform options"
              >
                ⋮
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40 text-xs text-slate-700 animate-in fade-in duration-150">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('platformSettings')}
                  </div>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <span>🔑</span>
                    <span>{t('switchRole')}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowEmergencyGuide(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2 font-medium text-red-600 cursor-pointer"
                  >
                    <span>🚨</span>
                    <span>{t('emergencyGuide')}</span>
                  </button>

                  <div className="px-3.5 pt-2 pb-1 border-t border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {t('changeLanguage')}
                  </div>
                  <div className="grid grid-cols-3 gap-1 px-3 py-1">
                    {['English', 'Hindi', 'Telugu'].map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setLanguage(l);
                          setShowMenu(false);
                        }}
                        className={`py-1 rounded text-center font-medium cursor-pointer ${
                          language === l ? 'bg-emerald-100 text-emerald-800 font-bold' : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        {l === 'Hindi' ? 'हिन्दी' : l === 'Telugu' ? 'తెలుగు' : 'EN'}
                      </button>
                    ))}
                  </div>

                  {(isAdmin || currentUser.phone) && (
                    <div className="pt-2 border-t border-slate-100 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <span>🚪</span>
                        <span>Sign Out ({currentUser.fullName || currentUser.name || 'User'})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4 Dashboard Tabs Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
          <nav className="flex space-x-2 md:space-x-8 overflow-x-auto py-2">
            {[
              { id: 'find-care', label: t('tab1'), sub: t('tab1Sub'), icon: '🔍' },
              { id: 'book-token', label: t('tab2'), sub: t('tab2Sub'), icon: '🎫' },
              { id: 'ai-assistant', label: t('tab3'), sub: t('tab3Sub'), icon: '🤖' },
              { id: 'admin-stock', label: t('tab4'), sub: t('tab4Sub'), icon: isAdmin ? '🛡️' : '🔒' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-3 md:px-4 rounded-xl text-xs md:text-sm font-semibold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-700/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span>{tab.label}</span>
                      {tab.id === 'admin-stock' && !isAdmin && (
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-normal">Lock</span>
                      )}
                    </div>
                    <div className={`text-[10px] hidden sm:block ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>{tab.sub}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* 3. Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ========================================================= */}
        {/* TAB 1: FIND CARE & MAP VIEW */}
        {/* ========================================================= */}
        {activeTab === 'find-care' && (
          <div className="space-y-5">
            {/* Top Stat Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-xl font-bold">
                  🏥
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">{t('statFacilities')}</div>
                  <div className="text-lg font-bold text-slate-900">{totalClinics}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold">
                  🛏️
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">{t('statBeds')}</div>
                  <div className="text-lg font-bold text-emerald-700">{totalBeds} Ready</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xl font-bold">
                  👨‍⚕️
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">{t('statDoctors')}</div>
                  <div className="text-lg font-bold text-slate-900">
                    {facilities.reduce((acc, f) => acc + (f.doctorsOnDuty ? f.doctorsOnDuty.length : 3), 0)} On Duty
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold">
                  🐍
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">{t('statASV')}</div>
                  <div className="text-lg font-bold text-slate-900">
                    {facilities.filter(f => (f.medicineStock || []).some(m => m.name.toLowerCase().includes('snake venom') && m.status === 'In Stock')).length} {t('statASVReady')}
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Bar with View Mode Toggle */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-lg">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm bg-slate-50/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* District Filter */}
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-slate-700"
                >
                  <option value="">{t('allDistricts')}</option>
                  <option value="Varanasi">Varanasi</option>
                  <option value="Sonbhadra">Sonbhadra</option>
                  <option value="Mirzapur">Mirzapur</option>
                  <option value="Chandauli">Chandauli</option>
                  <option value="Prayagraj">Prayagraj</option>
                </select>

                {/* Specialization Filter */}
                <select
                  value={selectedSpecialization}
                  onChange={(e) => setSelectedSpecialization(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium text-slate-700"
                >
                  <option value="">{t('allSpecialties')}</option>
                  <option value="General Medicine">General Medicine</option>
                  <option value="Pediatrics">Pediatrics</option>
                  <option value="Gynecology & Obstetrics">Gynecology</option>
                  <option value="Emergency & Trauma">Emergency & Trauma</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Dentistry">Dentistry</option>
                  <option value="Ayush">Ayush & Community Health</option>
                </select>

                {/* Card Grid vs Interactive Map View Switcher */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🗂️</span> {t('cardGrid')}
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      viewMode === 'map'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🗺️</span> {t('interactiveMap')}
                  </button>
                </div>
              </div>

              {/* Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-slate-500 font-semibold mr-1">{t('quickFilters')}</span>
                <button
                  onClick={() => setBedsOnly(!bedsOnly)}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    bedsOnly
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span>🛏️</span> {t('bedsOnly')}
                </button>

                <button
                  onClick={() => setAsvOnly(!asvOnly)}
                  className={`px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    asvOnly
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span>🐍</span> {t('asvOnly')}
                </button>

                {(searchQuery || selectedDistrict || selectedSpecialization || bedsOnly || asvOnly) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedDistrict('');
                      setSelectedSpecialization('');
                      setBedsOnly(false);
                      setAsvOnly(false);
                    }}
                    className="text-rose-600 font-semibold hover:underline ml-auto cursor-pointer"
                  >
                    {t('resetFilters')}
                  </button>
                )}
              </div>
            </div>

            {/* VIEW MODE 1: INTERACTIVE MAP VIEW */}
            {viewMode === 'map' && (
              <FacilityMap
                facilities={filteredFacilities}
                onBookToken={initiateBookingForClinic}
                onAskAI={askAIAboutClinic}
                language={language}
              />
            )}

            {/* VIEW MODE 2: CARD GRID VIEW */}
            {viewMode === 'grid' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">
                    {t('availableCentres')} ({filteredFacilities.length})
                  </h2>
                </div>

                {facilitiesLoading ? (
                  <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500">
                    <div className="animate-spin text-3xl mb-2">🔄</div>
                    <div>{t('loading')}</div>
                  </div>
                ) : filteredFacilities.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500">
                    <div className="text-4xl mb-2">🔍</div>
                    <div className="text-base font-bold text-slate-800">{t('noResults')}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {filteredFacilities.map((clinic) => (
                      <div
                        key={clinic.id}
                        className="bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden"
                      >
                        <div className="p-5 space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                                  clinic.type === 'CHC'
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : 'bg-teal-100 text-teal-800 border border-teal-200'
                                }`}>
                                  {clinic.type} • {t('communityNetwork')}
                                </span>
                                <span className="text-xs text-slate-500 font-semibold">
                                  📍 <strong>{clinic.district}</strong> ({clinic.block || 'Rural Sector'})
                                </span>
                              </div>
                              <h3 className="text-base font-bold text-slate-900 leading-snug">{clinic.name}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{clinic.address}</p>
                            </div>

                            {/* Emergency Bed Badge */}
                            <div className={`px-3 py-2 rounded-2xl text-center border shrink-0 ${
                              clinic.emergencyBeds > 5
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : clinic.emergencyBeds > 0
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              <div className="text-lg font-black leading-none">{clinic.emergencyBeds}</div>
                              <div className="text-[10px] font-semibold uppercase mt-0.5">{t('bedsReady')}</div>
                            </div>
                          </div>

                          {/* Contact & Hours */}
                          <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <div>🕒 {clinic.operatingHours}</div>
                            <div>📞 <a href={`tel:${clinic.contact?.phone}`} className="text-emerald-700 font-bold hover:underline">{clinic.contact?.phone}</a></div>
                          </div>

                          {/* Doctors */}
                          <div>
                            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <span>👨‍⚕️ {t('dutyRoster')}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(clinic.doctorSpecializations || []).map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 text-[11px] font-medium px-2.5 py-1 rounded-lg border border-slate-200 transition"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Medicine Stock Preview */}
                          <div>
                            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>💊 {t('keyMedicineStock')}</span>
                              <span className="text-[10px] text-slate-400">{t('liveDepot')}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {(clinic.medicineStock || []).slice(0, 6).map((med, mIdx) => {
                                const isInStock = med.status === 'In Stock';
                                const isLowStock = med.status === 'Low Stock';
                                return (
                                  <div
                                    key={mIdx}
                                    className={`p-1.5 rounded-lg border text-[11px] flex flex-col justify-between ${
                                      isInStock
                                        ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900'
                                        : isLowStock
                                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                        : 'bg-rose-50/80 border-rose-200 text-rose-900'
                                    }`}
                                  >
                                    <span className="font-semibold truncate" title={med.name}>{med.name}</span>
                                    <div className="flex items-center justify-between mt-1 text-[10px]">
                                      <span className="opacity-75">{med.quantity ? `${med.quantity}u` : '—'}</span>
                                      <span className={`font-bold ${
                                        isInStock ? 'text-emerald-700' : isLowStock ? 'text-amber-700' : 'text-rose-700'
                                      }`}>
                                        {med.status === 'In Stock' ? t('inStock') : med.status === 'Low Stock' ? t('lowStock') : t('outOfStock')}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Card Action Footer */}
                        <div className="bg-slate-50/90 px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <button
                            onClick={() => askAIAboutClinic(clinic)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-800 hover:bg-slate-200/70 rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>🤖</span> {t('askAIInfo')}
                          </button>

                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <button
                                onClick={() => openEditModal(clinic)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
                              >
                                {t('edit')}
                              </button>
                            )}

                            <button
                              onClick={() => initiateBookingForClinic(clinic)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>🎫</span> {t('bookOPDToken')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BOOK OPD TOKEN */}
        {/* ========================================================= */}
        {activeTab === 'book-token' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
              <div className="border-b border-slate-100 pb-5 mb-6">
                <h2 className="text-2xl font-black text-slate-900">{t('bookTitle')}</h2>
                <p className="text-sm text-slate-500 mt-1">{t('bookSubtitle')}</p>
              </div>

              {bookingError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
                  <span>❌</span>
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Logged in patient status alert / Prompt */}
              {currentUser.phone ? (
                <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">👤</span>
                    <div>
                      <span className="font-bold text-emerald-900">{currentUser.fullName}</span>
                      <span className="text-emerald-700 ml-1 font-medium">({currentUser.phone} • {currentUser.district || 'Rural UP'})</span>
                      <span className="text-emerald-600 block text-[11px]">Booking details pre-filled from your registered patient profile.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAuthRoleTab('patient');
                      setShowAuthModal(true);
                    }}
                    className="px-2.5 py-1 bg-white text-emerald-800 font-bold rounded-lg border border-emerald-300 hover:bg-emerald-100 text-[11px] cursor-pointer shrink-0"
                  >
                    Switch Account
                  </button>
                </div>
              ) : (
                <div className="mb-5 p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💡</span>
                    <span className="text-teal-900">
                      <strong>Sign in with your mobile number</strong> to securely save and access all your OPD queue passes.
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setAuthRoleTab('patient');
                      setShowAuthModal(true);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs cursor-pointer shadow-2xs shrink-0"
                  >
                    Sign In / Register
                  </button>
                </div>
              )}

              {/* Confirmation Slip */}
              {bookingSuccessToken ? (
                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 p-6 rounded-3xl border-2 border-emerald-400 space-y-5 shadow-md">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xl font-bold">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-bold uppercase text-emerald-800 tracking-wider">{t('confirmedPass')}</div>
                        <div className="text-lg font-black text-slate-900">{bookingSuccessToken.tokenId}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-semibold">{t('queueSlot')}</div>
                      <div className="text-3xl font-black text-emerald-700">#{bookingSuccessToken.tokenNumber}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200">
                      <div className="text-slate-400 font-medium">{t('patientNameLabel')}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{bookingSuccessToken.patientName}</div>
                      <div className="text-[11px] text-slate-500 font-medium">Mob: {bookingSuccessToken.phone}</div>
                    </div>

                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200">
                      <div className="text-slate-400 font-medium">{t('facilityLabel')}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{bookingSuccessToken.facilityName}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">{bookingSuccessToken.facilityDistrict}</div>
                    </div>

                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200">
                      <div className="text-slate-400 font-medium">{t('specialtyRoom')}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{bookingSuccessToken.department}</div>
                      <div className="text-[11px] text-indigo-700 font-bold">{bookingSuccessToken.roomNumber}</div>
                    </div>

                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200">
                      <div className="text-slate-400 font-medium">{t('appointmentDateLabel')}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{bookingSuccessToken.appointmentDate}</div>
                      <div className="text-[11px] text-slate-500">Slot: {bookingSuccessToken.estimatedTime}</div>
                    </div>

                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200">
                      <div className="text-slate-400 font-medium">{t('categoryLabel')}</div>
                      <div className="text-sm font-bold text-slate-900 mt-0.5">{bookingSuccessToken.patientCategory}</div>
                    </div>

                    <div className="bg-white/90 p-3 rounded-xl border border-emerald-200 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-[10px] text-slate-400 font-semibold">{t('verificationQR')}</div>
                        <div className="text-xs font-mono font-bold tracking-widest text-slate-700 bg-slate-100 px-3 py-1 rounded-md mt-1 border">
                          [VERIFIED-OPD-TOKEN]
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center gap-2 cursor-pointer"
                    >
                      {t('printSlip')}
                    </button>
                    <button
                      onClick={() => {
                        setBookingSuccessToken(null);
                        if (!currentUser.phone) {
                          setPatientName('');
                          setPhone('');
                        }
                      }}
                      className="px-4 py-2 bg-white text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-50 transition cursor-pointer"
                    >
                      {t('bookAnother')}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookAppointment} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        {t('patientName')}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t('patientNamePlaceholder')}
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        {t('mobileNumber')}
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength="10"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">{t('mobileHelp')}</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        {t('selectFacility')}
                      </label>
                      <select
                        value={facilityId}
                        onChange={(e) => setFacilityId(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      >
                        {facilities.map((clinic) => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.name} ({clinic.district}) - {clinic.emergencyBeds} Beds
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        {t('department')}
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      >
                        {availableDepartments.map((dept, idx) => (
                          <option key={idx} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        {t('appointmentDate')}
                      </label>
                      <input
                        type="date"
                        required
                        value={appointmentDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        {t('priorityCategory')}
                      </label>
                      <select
                        value={patientCategory}
                        onChange={(e) => setPatientCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      >
                        <option value="General">{t('catGeneral')}</option>
                        <option value="Pregnant Woman (Priority)">{t('catPregnant')}</option>
                        <option value="Senior Citizen 60+">{t('catSenior')}</option>
                        <option value="Infant / Child Under 5">{t('catChild')}</option>
                        <option value="Acute Emergency">{t('catEmergency')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={bookingLoading}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {bookingLoading ? t('generatingToken') : t('confirmTokenBtn')}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* My Booked Appointments (Authenticated Patient View) */}
            {currentUser.phone && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📋</span>
                    <h3 className="text-base font-bold text-slate-900">
                      My OPD Bookings ({myAppointments.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => loadMyAppointments(currentUser.phone)}
                    className="text-xs text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    🔄 Refresh
                  </button>
                </div>

                {myAppointments.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No OPD tokens booked yet under mobile number {currentUser.phone}. Fill out the form above to get your first token!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {myAppointments.map((apt, aIdx) => (
                      <div
                        key={aIdx}
                        className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-white border border-slate-200 hover:border-emerald-300 transition space-y-2.5 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-emerald-700 text-sm">{apt.tokenId}</span>
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              Slot #{apt.tokenNumber}
                            </span>
                          </div>
                          <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-bold text-[10px]">
                            {apt.status || 'Confirmed'}
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-600">
                          <div className="font-bold text-slate-900">{apt.facilityName}</div>
                          <div className="text-[11px] text-slate-500">
                            🏥 {apt.department} • {apt.roomNumber || 'Room #1'}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                            <span>📅 {apt.appointmentDate} ({apt.estimatedTime})</span>
                            <span className="font-medium text-slate-500">{apt.patientCategory}</span>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400">Helpline: {apt.facilityContact || '108'}</span>
                          <button
                            onClick={() => {
                              setBookingSuccessToken(apt);
                              window.scrollTo({ top: 100, behavior: 'smooth' });
                            }}
                            className="text-emerald-700 font-bold hover:underline cursor-pointer"
                          >
                            View Slip ➔
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Session Tokens History (For guests who haven't logged in) */}
            {!currentUser.phone && bookedAppointments.length > 0 && (
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  {t('recentTokens')} ({bookedAppointments.length})
                </h3>
                <div className="space-y-2">
                  {bookedAppointments.slice(0, 4).map((apt, aIdx) => (
                    <div key={aIdx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-emerald-700 font-black">{apt.tokenId}</span> • {apt.patientName} (Token #{apt.tokenNumber})
                        <div className="text-slate-500 text-[11px] mt-0.5">{apt.facilityName} ({apt.department}) • Slot: {apt.estimatedTime}</div>
                      </div>
                      <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-bold text-[11px]">
                        {apt.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: FULL-PAGE MULTIMODAL HEALTH AI ASSISTANT */}
        {/* ========================================================= */}
        {activeTab === 'ai-assistant' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col h-[720px] overflow-hidden">
              {/* Header */}
              <div className="p-4 sm:px-6 bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">
                    🤖
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold">{t('aiTitle')}</h2>
                      <span className="bg-emerald-400/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300/30">
                        {t('aiBadge')}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-100/80">{t('aiSubtitle')}</p>
                  </div>
                </div>

                {/* In-chat language switcher */}
                <div className="flex items-center bg-black/20 p-1 rounded-xl text-xs font-semibold">
                  {['English', 'Hindi', 'Telugu'].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        language === l ? 'bg-white text-emerald-900 font-bold' : 'text-emerald-100 hover:text-white'
                      }`}
                    >
                      {l === 'Hindi' ? 'हिन्दी' : l === 'Telugu' ? 'తెలుగు' : 'EN'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestion Chips */}
              <div className="p-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto flex items-center gap-2 text-xs shrink-0">
                <span className="text-slate-400 font-bold whitespace-nowrap pl-1">Suggested:</span>
                {(t('suggestedChips') || []).map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendTab3Chat(chip.text)}
                    className="bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 whitespace-nowrap font-medium transition cursor-pointer text-xs shadow-2xs shrink-0"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Message Stream */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/40 text-sm">
                {tab3Messages.map((msg) => {
                  const isBot = msg.sender === 'bot';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-[88%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                        isBot ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
                      }`}>
                        {isBot ? '🤖' : '👤'}
                      </div>

                      <div className="space-y-1">
                        {/* Attached Image inside user bubble */}
                        {msg.image && (
                          <div className="mb-2 overflow-hidden rounded-xl border border-emerald-300 max-w-xs shadow-xs">
                            <img
                              src={msg.image}
                              alt="Uploaded prescription"
                              className="w-full max-h-48 object-cover"
                            />
                          </div>
                        )}

                        <div className={`p-4 rounded-2xl leading-relaxed text-sm ${
                          isBot
                            ? 'bg-white text-slate-800 border border-slate-200 shadow-2xs'
                            : 'bg-emerald-700 text-white'
                        }`}>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>

                        <div className={`flex items-center gap-2 text-[10px] text-slate-400 px-1 ${
                          isBot ? 'justify-start' : 'justify-end'
                        }`}>
                          <span>{msg.time}</span>
                          {msg.source && (
                            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                              {msg.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {tab3Loading && (
                  <div className="flex gap-3 mr-auto items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm">
                      🤖
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2 text-xs text-slate-500 font-semibold">
                      <span className="animate-bounce">●</span>
                      <span className="animate-bounce [animation-delay:0.2s]">●</span>
                      <span className="animate-bounce [animation-delay:0.4s]">●</span>
                      <span>Health AI Assistant is consulting clinic database & analyzing image...</span>
                    </div>
                  </div>
                )}
                <div ref={tab3EndRef} />
              </div>

              {/* Input Bar with Image Upload */}
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 space-y-2">
                {/* Image Preview Chip if attached */}
                {tab3Image && (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs max-w-md animate-in fade-in">
                    <img src={tab3Image} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-emerald-300" />
                    <div className="flex-1 truncate font-medium text-emerald-900">
                      <span>📷 {tab3ImageName || 'Prescription Image attached'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      {t('removePhoto')} ✕
                    </button>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendTab3Chat();
                  }}
                  className="flex items-center gap-2"
                >
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {/* Camera / Image Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2.5 rounded-xl border transition flex items-center justify-center text-lg cursor-pointer ${
                      tab3Image
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                    title={t('attachPhoto')}
                  >
                    📷
                  </button>

                  <input
                    type="text"
                    placeholder={t('typeQuestion')}
                    value={tab3Input}
                    onChange={(e) => setTab3Input(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50/50"
                  />

                  <button
                    type="submit"
                    disabled={(!tab3Input.trim() && !tab3Image) || tab3Loading}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl font-bold text-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{t('send')}</span>
                    <span>➤</span>
                  </button>
                </form>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>💡 {t('groundedInCentres')}</span>
                  <span>{t('emergencyWarning')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: ADMIN MANAGEMENT SUITE (Gated for Admin) */}
        {/* ========================================================= */}
        {activeTab === 'admin-stock' && (
          <div className="space-y-6">
            {!isAdmin ? (
              /* GATED ACCESS CARD */
              <div className="max-w-2xl mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-amber-200 shadow-sm text-center space-y-5">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 flex items-center justify-center text-3xl mx-auto">
                  🔒
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">{t('restrictedTitle')}</h2>
                  <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">{t('restrictedDesc')}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 max-w-sm mx-auto text-left">
                  <div className="font-bold text-slate-800 mb-1">{t('demoCreds')}</div>
                </div>

                <button
                  onClick={() => {
                    setAuthRoleTab('admin');
                    setShowAuthModal(true);
                  }}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer"
                >
                  {t('loginAsAdmin')}
                </button>
              </div>
            ) : (
              /* FULL ADMIN SUITE */
              <div className="space-y-6">
                {/* Admin Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                        CMO Suite
                      </span>
                      <span className="text-xs text-emerald-300 font-semibold">Dr. S. K. Verma</span>
                    </div>
                    <h2 className="text-xl font-black mt-1">{t('cmoSuiteTitle')}</h2>
                    <p className="text-xs text-slate-300 mt-0.5">{t('cmoSuiteSubtitle')}</p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingFacility(null);
                      setFacilityForm({
                        name: '',
                        type: 'PHC',
                        district: 'Varanasi',
                        block: '',
                        address: '',
                        phone: '+91 94500 11111',
                        emergencyBeds: 4,
                        doctorSpecializations: 'General Medicine, Pediatrics',
                        lat: 25.3176,
                        lng: 82.9739
                      });
                      setShowAddFacilityModal(true);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <span>➕</span> {t('addNewFacility')}
                  </button>
                </div>

                {/* Facilities List */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    {t('registeredCentres')} ({facilities.length})
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {facilities.map((clinic) => (
                      <div key={clinic.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              {clinic.type}
                            </span>
                            <span className="font-bold text-slate-600">{clinic.district}</span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm">{clinic.name}</div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            Beds: <strong>{clinic.emergencyBeds}</strong> • GPS: {clinic.coordinates?.lat?.toFixed(3)}, {clinic.coordinates?.lng?.toFixed(3)}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 text-xs">
                          <button
                            onClick={() => openEditModal(clinic)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-300 transition cursor-pointer"
                          >
                            {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteFacility(clinic)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition cursor-pointer"
                          >
                            {t('delete')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Stock Management Ledger */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{t('interactiveLedger')}</h3>
                      <p className="text-xs text-slate-500">{t('ledgerSubtitle')}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={t('filterMeds')}
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50"
                      />
                      <select
                        value={stockStatusFilter}
                        onChange={(e) => setStockStatusFilter(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium"
                      >
                        <option value="">{t('allStatuses')}</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                          <th className="py-3 px-4">{t('colFacility')}</th>
                          <th className="py-3 px-4">{t('colMedicine')}</th>
                          <th className="py-3 px-4">{t('colCurrentUnits')}</th>
                          <th className="py-3 px-4">{t('colAdjustUnits')}</th>
                          <th className="py-3 px-4">{t('colStatusPill')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredInventory.map((item) => (
                          <tr key={item.key} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              <div>{item.facilityName}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{item.district} District</div>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              {item.name}
                              <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-800">
                              {item.quantity ? item.quantity.toLocaleString() : 0} units
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleUpdateStock(item.facilityId, item.name, item.status, Math.max(0, (item.quantity || 0) - 50))}
                                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer"
                                  title="Decrease 50 units"
                                >
                                  -
                                </button>
                                <button
                                  onClick={() => handleUpdateStock(item.facilityId, item.name, item.status, (item.quantity || 0) + 100)}
                                  className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center cursor-pointer"
                                  title="Add 100 units"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => handleUpdateStock(item.facilityId, item.name, item.status, (item.quantity || 0) + 500)}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] cursor-pointer"
                                  title="Bulk Restock 500 units"
                                >
                                  +500
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                {['In Stock', 'Low Stock', 'Out of Stock'].map((st) => (
                                  <button
                                    key={st}
                                    onClick={() => handleUpdateStock(item.facilityId, item.name, st, item.quantity)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                                      item.status === st
                                        ? st === 'In Stock'
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                          : st === 'Low Stock'
                                          ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                                          : 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {st === 'In Stock' ? t('inStock') : st === 'Low Stock' ? t('lowStock') : t('outOfStock')}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* ========================================================= */}
      {/* AUTHENTICATION MODAL */}
      {/* ========================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔑</span>
                <h3 className="text-base font-bold text-slate-900">Role & Access Authentication</h3>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => {
                  setAuthRoleTab('patient');
                  setLoginError(null);
                }}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  authRoleTab === 'patient' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                👤 {t('rolePatient')}
              </button>
              <button
                onClick={() => {
                  setAuthRoleTab('admin');
                  setLoginError(null);
                }}
                className={`py-2 rounded-lg transition cursor-pointer ${
                  authRoleTab === 'admin' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                🛡️ {t('roleAdmin')}
              </button>
            </div>

            {authRoleTab === 'patient' ? (
              currentUser.phone ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✅</span>
                      <div>
                        <div className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Signed In Patient Profile</div>
                        <div className="text-sm font-black text-slate-900">{currentUser.fullName}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 pt-1 space-y-0.5">
                      <div>📱 <strong>Mobile:</strong> {currentUser.phone}</div>
                      <div>📍 <strong>District:</strong> {currentUser.district || 'Rural UP'}</div>
                      <div>🎫 <strong>Active Bookings:</strong> {myAppointments.length} Tokens</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
                    >
                      🚪 Sign Out
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(false)}
                      className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      Continue ➔
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePatientAuth} className="space-y-3.5 py-1">
                  <p className="text-xs text-slate-500">
                    Enter your mobile number to view personal OPD tokens, clinic wait times, and emergency bed alerts.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Patient Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patel"
                      value={patientFormName}
                      onChange={(e) => setPatientFormName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        10-Digit Mobile *
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength="10"
                        placeholder="9876543210"
                        value={patientFormPhone}
                        onChange={(e) => setPatientFormPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Home District
                      </label>
                      <select
                        value={patientFormDistrict}
                        onChange={(e) => setPatientFormDistrict(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                      >
                        <option value="Varanasi">Varanasi</option>
                        <option value="Sonbhadra">Sonbhadra</option>
                        <option value="Mirzapur">Mirzapur</option>
                        <option value="Chandauli">Chandauli</option>
                        <option value="Prayagraj">Prayagraj</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {loginLoading ? 'Authenticating...' : 'Sign In & Access OPD Passes'}
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-semibold uppercase">Or Anonymous Access</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGuestEnter}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Enter as Guest Patient (No Sign-In)
                  </button>
                </form>
              )
            ) : (
              isAdmin ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛡️</span>
                      <div>
                        <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">CMO Administrator</div>
                        <div className="text-sm font-black text-slate-900">{currentUser.fullName || currentUser.name || 'Dr. S. K. Verma'}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 pt-1 space-y-0.5">
                      <div>🏛️ <strong>Office:</strong> Chief Medical Officer (CMO)</div>
                      <div>📍 <strong>Territory:</strong> Varanasi Division & Rural Clusters</div>
                      <div>⚡ <strong>Full Permissions:</strong> Facilities CRUD & Live Drug Depot Ledger</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer"
                    >
                      🚪 Logout Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAuthModal(false)}
                      className="py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
                    >
                      Manage Dashboard ➔
                    </button>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleAdminAuth}
                  className="space-y-4"
                >
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[11px] text-amber-800 font-medium">
                    💡 {t('demoCreds')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">CMO Officer Username</label>
                    <input
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {loginLoading ? 'Authenticating...' : t('loginAsAdmin')}
                  </button>
                </form>
              )
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EMERGENCY PROTOCOL GUIDE MODAL (108 vs 102) */}
      {/* ========================================================= */}
      {showEmergencyGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🚨</span>
                <h3 className="text-base font-black text-slate-900">Rural Emergency Triage Guide</h3>
              </div>
              <button
                onClick={() => setShowEmergencyGuide(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                <div className="flex items-center justify-between font-black text-rose-900 text-sm">
                  <span>🚨 Dial 108: Emergency Ambulance</span>
                  <a href="tel:108" className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs hover:bg-rose-700">
                    Call 108
                  </a>
                </div>
                <p className="text-slate-600">
                  Use for life-threatening acute emergencies: snakebites, road accidents, acute trauma, chest pain, poisoning, and sudden severe bleeding.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between font-black text-amber-900 text-sm">
                  <span>🤰 Dial 102: National Ambulance Service</span>
                  <a href="tel:102" className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs hover:bg-amber-700">
                    Call 102
                  </a>
                </div>
                <p className="text-slate-600">
                  Dedicated for pregnant women in active labor, delivery transport to nearest CHC/PHC, and infant emergencies under 1 year.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowEmergencyGuide(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT FACILITY MODAL */}
      {/* ========================================================= */}
      {showAddFacilityModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingFacility ? `Edit: ${editingFacility.name}` : t('addNewFacility')}
              </h3>
              <button
                onClick={() => setShowAddFacilityModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFacility} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Facility Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chunar Primary Health Centre"
                  value={facilityForm.name}
                  onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type *</label>
                  <select
                    value={facilityForm.type}
                    onChange={(e) => setFacilityForm({ ...facilityForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  >
                    <option value="PHC">PHC (Primary Health Centre)</option>
                    <option value="CHC">CHC (Community Health Centre)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">District *</label>
                  <select
                    value={facilityForm.district}
                    onChange={(e) => setFacilityForm({ ...facilityForm, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  >
                    <option value="Varanasi">Varanasi</option>
                    <option value="Sonbhadra">Sonbhadra</option>
                    <option value="Mirzapur">Mirzapur</option>
                    <option value="Chandauli">Chandauli</option>
                    <option value="Prayagraj">Prayagraj</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Emergency Beds *</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    required
                    value={facilityForm.emergencyBeds}
                    onChange={(e) => setFacilityForm({ ...facilityForm, emergencyBeds: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={facilityForm.phone}
                    onChange={(e) => setFacilityForm({ ...facilityForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Doctor Specializations (comma separated)
                </label>
                <input
                  type="text"
                  value={facilityForm.doctorSpecializations}
                  onChange={(e) => setFacilityForm({ ...facilityForm, doctorSpecializations: e.target.value })}
                  placeholder="General Medicine, Pediatrics, Gynecology"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GPS Latitude (e.g. 25.267)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={facilityForm.lat}
                    onChange={(e) => setFacilityForm({ ...facilityForm, lat: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">GPS Longitude (e.g. 82.991)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={facilityForm.lng}
                    onChange={(e) => setFacilityForm({ ...facilityForm, lng: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddFacilityModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adminActionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-md"
                >
                  {adminActionLoading ? 'Saving...' : editingFacility ? 'Update Facility' : 'Save Facility'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* FLOATING AI ASSISTANT (Shown only when on Tabs 1, 2, or 4) */}
      {/* ========================================================= */}
      {activeTab !== 'ai-assistant' && (
        <FloatingAIAssistant
          language={language}
          onLanguageChange={setLanguage}
          externalPrompt={aiExternalPrompt}
          onClearExternalPrompt={() => setAiExternalPrompt(null)}
          isOpen={floatingAIOpen}
          onToggle={(openState) => setFloatingAIOpen(openState)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-800">{t('platformTitle')}</span> • {t('footerText')}
          </div>
          <div className="flex items-center gap-4">
            <span>Emergency 108</span>
            <span>•</span>
            <span>Maternal 102</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Gemini 2.5 Flash Grounded</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
