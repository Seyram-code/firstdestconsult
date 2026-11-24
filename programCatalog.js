const programCatalog = [
  {
    category: 'Skilled Trade & Construction',
    programs: [
      { name: 'Welding Certificate', duration: '3–6 months' },
      { name: 'Carpentry / Construction Basics', duration: '4–6 months' },
      { name: 'HVAC Technician', duration: '6 months' },
      { name: 'Electrician Pre-apprenticeship', duration: '4–6 months' },
      { name: 'Heavy Equipment Operator', duration: '3 months' },
    ],
  },
  {
    category: 'Healthcare & Caregiving',
    programs: [
      { name: 'Personal Support Worker (PSW)', duration: '4–6 months' },
      { name: 'Home Care Aide / Caregiver Training', duration: '3–6 months' },
      { name: 'Pharmacy Assistant', duration: '6 months' },
      { name: 'Medical Office Assistant', duration: '4 months' },
      { name: 'Dental Office Assistant', duration: '6 months' },
    ],
  },
  {
    category: 'Hospitality, Tourism & Culinary',
    programs: [
      { name: 'Culinary Arts / Cook', duration: '4–6 months' },
      { name: 'Baking & Pastry Arts', duration: '3–6 months' },
      { name: 'Hotel & Restaurant Management', duration: '6 months' },
      { name: 'Tourism & Travel Services', duration: '4 months' },
      { name: 'Food Safety & Catering', duration: '3 months' },
    ],
  },
  {
    category: 'Business, Admin & IT',
    programs: [
      { name: 'Office Administration', duration: '4–6 months' },
      { name: 'Accounting & Bookkeeping', duration: '6 months' },
      { name: 'Digital Marketing', duration: '3–6 months' },
      { name: 'Cybersecurity Fundamentals', duration: '4 months' },
      { name: 'Web Development Bootcamp', duration: '3–6 months' },
      { name: 'Project Management Basics', duration: '3 months' },
    ],
  },
  {
    category: 'Beauty, Fashion & Creative',
    programs: [
      { name: 'Hairstyling / Barbering', duration: '6 months' },
      { name: 'Esthetics / Skincare', duration: '4 months' },
      { name: 'Nail Technician', duration: '3 months' },
      { name: 'Fashion Design Basics', duration: '6 months' },
      { name: 'Graphic Design', duration: '4–6 months' },
    ],
  },
  {
    category: 'Transport & Logistics',
    programs: [
      { name: 'Truck Driving / AZ License Training', duration: '4–8 weeks' },
      { name: 'Logistics & Supply Chain', duration: '6 months' },
      { name: 'Forklift & Warehouse Operations', duration: '3 weeks' },
    ],
  },
];

function normalizeOfferPrograms(type, rawPrograms) {
  let selectedPrograms = rawPrograms;
  if (typeof selectedPrograms === 'string') {
    try {
      selectedPrograms = JSON.parse(selectedPrograms);
    } catch {
      return { programs: [], error: 'Programs must be a valid list.' };
    }
  }
  if (selectedPrograms === undefined || selectedPrograms === null) selectedPrograms = [];
  if (!Array.isArray(selectedPrograms)) {
    return { programs: [], error: 'Programs must be a valid list.' };
  }
  if (type !== 'Study Visa') {
    return selectedPrograms.length
      ? { programs: [], error: 'Programs can only be added to study offers.' }
      : { programs: [], error: null };
  }

  const availablePrograms = new Map(
    programCatalog.flatMap(({ category, programs }) =>
      programs.map((program) => [program.name, { ...program, category }]),
    ),
  );
  const seen = new Set();
  const programs = [];
  for (const selection of selectedPrograms) {
    const name = typeof selection === 'string' ? selection : selection?.name;
    const program = availablePrograms.get(name);
    if (!program || seen.has(program.name)) {
      return { programs: [], error: 'Select valid, unique programs from the catalog.' };
    }
    seen.add(program.name);
    programs.push(program);
  }
  if (!programs.length) {
    return { programs: [], error: 'Select at least one program for a study offer.' };
  }

  return { programs, error: null };
}

function normalizeApplicantPrograms(availablePrograms, rawSelections, requiresSelection = true) {
  let selections = rawSelections;
  if (typeof selections === 'string') {
    try {
      selections = JSON.parse(selections);
    } catch {
      return { programs: [], error: 'Program selections must be a valid list.' };
    }
  }
  if (selections === undefined || selections === null || selections === '') selections = [];
  if (!Array.isArray(selections) || selections.some((selection) => typeof selection !== 'string')) {
    return { programs: [], error: 'Program selections must be a valid list.' };
  }
  if (selections.length > 2) {
    return { programs: [], error: 'Choose no more than 2 programs.' };
  }

  const uniqueSelections = new Set(selections);
  if (uniqueSelections.size !== selections.length) {
    return { programs: [], error: 'Choose each program only once.' };
  }
  const programs = selections.map((name) =>
    availablePrograms.find((program) => program.name === name),
  );
  if (programs.some((program) => !program)) {
    return { programs: [], error: 'Choose only programs listed for this study offer.' };
  }
  if (requiresSelection && programs.length === 0) {
    return { programs: [], error: 'Choose at least one program.' };
  }

  return { programs, error: null };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeApplicantPrograms, normalizeOfferPrograms, programCatalog };
}
if (typeof window !== 'undefined') {
  window.FDT_PROGRAM_CATALOG = programCatalog;
  window.FDT_NORMALIZE_APPLICANT_PROGRAMS = normalizeApplicantPrograms;
}
