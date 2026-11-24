const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeApplicantPrograms,
  normalizeOfferPrograms,
  programCatalog,
} = require('./programCatalog');

const firstProgram = programCatalog[0].programs[0];

test('normalizes selected study programs to their catalog category and duration', () => {
  const result = normalizeOfferPrograms('Study Visa', JSON.stringify([firstProgram.name]));

  assert.equal(result.error, null);
  assert.deepEqual(result.programs, [{
    ...firstProgram,
    category: programCatalog[0].category,
  }]);
});

test('requires a program for study offers', () => {
  const result = normalizeOfferPrograms('Study Visa', []);

  assert.equal(result.programs.length, 0);
  assert.match(result.error, /Select at least one program/);
});

test('rejects unknown and duplicate program selections', () => {
  assert.match(normalizeOfferPrograms('Study Visa', ['Not in the catalog']).error, /valid, unique/);
  assert.match(normalizeOfferPrograms('Study Visa', [firstProgram.name, firstProgram.name]).error, /valid, unique/);
});

test('does not allow study programs on other offer types', () => {
  const result = normalizeOfferPrograms('Work Visa', [firstProgram.name]);

  assert.deepEqual(result.programs, []);
  assert.match(result.error, /only be added to study offers/);
});

test('includes the additional course categories and their listed durations', () => {
  const expectedPrograms = [
    ['Hospitality, Tourism & Culinary', 'Culinary Arts / Cook', '4–6 months'],
    ['Hospitality, Tourism & Culinary', 'Baking & Pastry Arts', '3–6 months'],
    ['Hospitality, Tourism & Culinary', 'Hotel & Restaurant Management', '6 months'],
    ['Hospitality, Tourism & Culinary', 'Tourism & Travel Services', '4 months'],
    ['Hospitality, Tourism & Culinary', 'Food Safety & Catering', '3 months'],
    ['Business, Admin & IT', 'Office Administration', '4–6 months'],
    ['Business, Admin & IT', 'Accounting & Bookkeeping', '6 months'],
    ['Business, Admin & IT', 'Digital Marketing', '3–6 months'],
    ['Business, Admin & IT', 'Cybersecurity Fundamentals', '4 months'],
    ['Business, Admin & IT', 'Web Development Bootcamp', '3–6 months'],
    ['Business, Admin & IT', 'Project Management Basics', '3 months'],
    ['Beauty, Fashion & Creative', 'Hairstyling / Barbering', '6 months'],
    ['Beauty, Fashion & Creative', 'Esthetics / Skincare', '4 months'],
    ['Beauty, Fashion & Creative', 'Nail Technician', '3 months'],
    ['Beauty, Fashion & Creative', 'Fashion Design Basics', '6 months'],
    ['Beauty, Fashion & Creative', 'Graphic Design', '4–6 months'],
    ['Transport & Logistics', 'Truck Driving / AZ License Training', '4–8 weeks'],
    ['Transport & Logistics', 'Logistics & Supply Chain', '6 months'],
    ['Transport & Logistics', 'Forklift & Warehouse Operations', '3 weeks'],
  ];

  const actualPrograms = programCatalog.flatMap(({ category, programs }) =>
    programs.map(({ name, duration }) => [category, name, duration]),
  );
  assert.equal(programCatalog.length, 6);
  assert.equal(actualPrograms.length, 29);
  for (const program of expectedPrograms) assert.ok(actualPrograms.some((item) => item.every((value, index) => value === program[index])));
});

test('accepts one or two programs selected from the programs on an offer', () => {
  const offeredPrograms = [
    { ...programCatalog[0].programs[0], category: programCatalog[0].category },
    { ...programCatalog[1].programs[0], category: programCatalog[1].category },
  ];
  const result = normalizeApplicantPrograms(
    offeredPrograms,
    JSON.stringify(offeredPrograms.map((program) => program.name)),
  );

  assert.equal(result.error, null);
  assert.deepEqual(result.programs, offeredPrograms);
});

test('requires a study applicant to choose at least one program', () => {
  const result = normalizeApplicantPrograms([firstProgram], '[]');

  assert.deepEqual(result.programs, []);
  assert.match(result.error, /Choose at least one program/);
});

test('rejects more than two, duplicate, or unlisted applicant programs', () => {
  const offeredPrograms = programCatalog.slice(0, 3).map(({ category, programs }) => ({
    ...programs[0],
    category,
  }));
  const names = offeredPrograms.map((program) => program.name);

  assert.match(normalizeApplicantPrograms(offeredPrograms, names).error, /no more than 2/);
  assert.match(normalizeApplicantPrograms(offeredPrograms, [names[0], names[0]]).error, /only once/);
  assert.match(normalizeApplicantPrograms(offeredPrograms, ['Not offered']).error, /listed for this study offer/);
});
