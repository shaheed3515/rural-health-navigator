import React, { useState } from 'react';

export default function DentalTriageCard({
  t,
  onBookDental,
  onAskAI,
  onOpenSOS,
  isOffline = false
}) {
  const [selectedSymptomId, setSelectedSymptomId] = useState(null);
  const [showFirstAid, setShowFirstAid] = useState(false);

  const dentalSymptoms = [
    {
      id: 'toothache',
      key: 'dentalToothache',
      defaultName: 'Toothache',
      level: 'CONSULTATION',
      levelKey: 'dentalTriageConsult',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      advice: 'Rinse with warm salt water. Avoid extreme hot/cold food. Do NOT put aspirin on gums. Schedule a dentist consultation.',
      urgencyTag: 'Moderate'
    },
    {
      id: 'sensitivity',
      key: 'dentalSensitivity',
      defaultName: 'Tooth sensitivity',
      level: 'ROUTINE',
      levelKey: 'dentalTriageRoutine',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      advice: 'Use soft-bristled brush and fluoride desensitizing toothpaste. Avoid highly acidic foods. Routine dental checkup advised.',
      urgencyTag: 'Routine'
    },
    {
      id: 'cavity',
      key: 'dentalCavity',
      defaultName: 'Tooth decay / cavity',
      level: 'CONSULTATION',
      levelKey: 'dentalTriageConsult',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      advice: 'Consult a dentist for dental restoration/filling before decay advances to the pulp or root canal.',
      urgencyTag: 'Moderate'
    },
    {
      id: 'swollen-gums',
      key: 'dentalSwollenGums',
      defaultName: 'Swollen gums',
      level: 'CONSULTATION',
      levelKey: 'dentalTriageConsult',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      advice: 'Salt water mouth rinses 3 times a day. Gentle brushing. Consult dentist to check for gingivitis or localized infection.',
      urgencyTag: 'Moderate'
    },
    {
      id: 'bleeding-gums',
      key: 'dentalBleedingGums',
      defaultName: 'Bleeding gums',
      level: 'CONSULTATION',
      levelKey: 'dentalTriageConsult',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      advice: 'Common in early gum disease or plaque accumulation. Avoid vigorous brushing; seek professional scaling and dental consultation.',
      urgencyTag: 'Moderate'
    },
    {
      id: 'gum-pain',
      key: 'dentalGumPain',
      defaultName: 'Gum pain',
      level: 'CONSULTATION',
      levelKey: 'dentalTriageConsult',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      advice: 'Keep mouth clean with saline rinse. Avoid chewing on the painful side. Consult a dentist promptly.',
      urgencyTag: 'Moderate'
    },
    {
      id: 'abscess',
      key: 'dentalAbscess',
      defaultName: 'Dental abscess',
      level: 'URGENT',
      levelKey: 'dentalTriageUrgent',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      advice: 'Bacterial infection with pus. High risk of spreading. Do NOT attempt to drain. Visit a dentist or CHC Dental OPD urgently for antibiotics and drainage.',
      urgencyTag: 'Urgent'
    },
    {
      id: 'broken-tooth',
      key: 'dentalBrokenTooth',
      defaultName: 'Broken / chipped tooth',
      level: 'URGENT',
      levelKey: 'dentalTriageUrgent',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      advice: 'Save any broken fragments in cold milk or saline. Rinse mouth gently with water. Visit dentist within 24 hours to prevent nerve death.',
      urgencyTag: 'Urgent'
    },
    {
      id: 'loose-tooth',
      key: 'dentalLooseTooth',
      defaultName: 'Loose tooth',
      level: 'URGENT',
      levelKey: 'dentalTriageUrgent',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      advice: 'Avoid touching, wiggling, or biting with the loose tooth. Immediate dental consultation required for splinting or treatment.',
      urgencyTag: 'Urgent'
    },
    {
      id: 'mouth-ulcers',
      key: 'dentalMouthUlcers',
      defaultName: 'Mouth ulcers',
      level: 'ROUTINE',
      levelKey: 'dentalTriageRoutine',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      advice: 'Apply topical soothing gel. Avoid spicy or hot foods. If ulcer does not heal within 10-14 days, get it evaluated by a doctor or dentist.',
      urgencyTag: 'Routine'
    },
    {
      id: 'jaw-pain',
      key: 'dentalJawPain',
      defaultName: 'Jaw pain',
      level: 'URGENT',
      levelKey: 'dentalTriageUrgent',
      badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
      advice: 'Apply warm compress. Eat soft food. Note: if accompanied by sudden chest tightness, shortness of breath, or sweating, call 108 immediately!',
      urgencyTag: 'Urgent'
    },
    {
      id: 'dental-trauma',
      key: 'dentalTrauma',
      defaultName: 'Dental trauma / Severe injury',
      level: 'EMERGENCY',
      levelKey: 'dentalTriageEmergency',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      advice: 'Emergency! Uncontrolled oral bleeding, severe facial swelling, jaw fracture, or difficulty breathing require immediate emergency dispatch (Dial 108).',
      urgencyTag: 'Emergency'
    }
  ];

  const selectedSymptom = dentalSymptoms.find((s) => s.id === selectedSymptomId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.5 2 7 4.5 7 7c0 3 1.5 5 1.5 8 0 2.5-.5 5-1.5 7h10c-1-2-1.5-4.5-1.5-7 0-3 1.5-5 1.5-8 0-2.5-1.5-5-5-5z" />
              <path d="M9 10c1 .5 2 .5 3 0" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-base">
                {t('dentalCareTitle') || 'Dental Healthcare & Oral Triage'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800">
                {t('deptDentalCare') || 'Dental Care'}
              </span>
              {isOffline && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {t('offlineModeIndicator') || 'Offline Triage'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {t('dentalCareSubtitle') || 'Accessible rural dental triage, toothache evaluation, and local dentist booking'}
            </p>
          </div>
        </div>

        {/* Action quick buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBookDental}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{t('bookDentalToken') || 'Book Dental Token'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFirstAid(!showFirstAid)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            {showFirstAid ? 'Close Tips' : (t('dentalFirstAidTips') || 'First-Aid Tips')}
          </button>
        </div>
      </div>

      {/* Non-diagnostic notice */}
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
        <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <strong>{t('dentalNonDiagNotice') || 'Safe non-diagnostic guidance:'}</strong>{' '}
          This portal provides triage routing and first-aid recommendations only. It does not diagnose dental disease. A licensed dental surgeon must evaluate your condition in person.
        </div>
      </div>

      {/* First-Aid Drawer (expandable) */}
      {showFirstAid && (
        <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 text-xs text-slate-700">
          <div className="font-bold text-teal-900 flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M2 12h20" />
            </svg>
            Rural Dental First-Aid Protocol (Pre-Hospital)
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
            <li><strong>Warm Saline Rinse:</strong> Mix 1/2 teaspoon of salt in a glass of warm water. Gently rinse 3 times daily to reduce bacterial load.</li>
            <li><strong>Cold Compress:</strong> For facial or jaw swelling, hold an ice pack wrapped in a clean cloth against the cheek for 15 minutes.</li>
            <li><strong>Do NOT place Aspirin on gums:</strong> Placing aspirin tablets directly against the tooth/gum causes severe chemical burns.</li>
            <li><strong>Knocked-Out Tooth:</strong> Handle tooth only by crown (not the root). Place in fresh cold milk or clean saliva. Visit a dentist within 60 minutes for highest re-implantation success.</li>
            <li><strong>Temporary Pain Soothing:</strong> Dab a tiny drop of clove oil (Laung ka tel) on sterile cotton onto the cavity.</li>
          </ul>
        </div>
      )}

      {/* Symptom Selection Cloud */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          {t('dentalSymptomsTitle') || 'Select a Dental Symptom to Check Safe Triage Level:'}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {dentalSymptoms.map((sym) => {
            const isSelected = selectedSymptomId === sym.id;
            return (
              <button
                key={sym.id}
                type="button"
                onClick={() => setSelectedSymptomId(isSelected ? null : sym.id)}
                className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50/80 shadow-sm ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold text-slate-800">
                  {t(sym.key) || sym.defaultName}
                </span>
                <span className={`self-start px-2 py-0.5 rounded-md text-[10px] font-bold border ${sym.badgeColor}`}>
                  {sym.urgencyTag}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Symptom Triage Result */}
      {selectedSymptom && (
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold">Selected Complaint:</span>
              <h4 className="text-sm font-bold text-slate-900">{t(selectedSymptom.key) || selectedSymptom.defaultName}</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Triage Routing:</span>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${selectedSymptom.badgeColor}`}>
                {t(selectedSymptom.levelKey) || selectedSymptom.level}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">
            {selectedSymptom.advice}
          </p>

          {/* Emergency trigger for trauma or abscess */}
          {selectedSymptom.level === 'EMERGENCY' ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3">
              <div className="text-xs text-rose-900 font-medium">
                <strong>Emergency Protocol Active:</strong> Severe trauma or facial airway risk requires urgent medical transport.
              </div>
              <button
                type="button"
                onClick={onOpenSOS}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer shadow-sm"
              >
                🚨 Dial 108 / SOS Beacon
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onBookDental}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-sm"
              >
                📅 {t('bookDentalToken') || 'Book Dental OPD Appointment'}
              </button>
              <button
                type="button"
                onClick={() => onAskAI && onAskAI(selectedSymptom.defaultName)}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold cursor-pointer transition"
              >
                🤖 Ask AI Assistant About This
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
