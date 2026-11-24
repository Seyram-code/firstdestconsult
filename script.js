const adminEmail = 'info@globalvisatravel.org';

const yearNode = document.getElementById('year');
if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

function initializeModernSelects() {
  const selects = Array.from(document.querySelectorAll('.form-field select'));
  if (!selects.length) return;

  let openSelect = null;
  const closeSelect = (select, returnFocus = false) => {
    if (!select) return;
    const wrapper = select.closest('.modern-select');
    const trigger = wrapper?.querySelector('.modern-select-trigger');
    const menu = wrapper?.querySelector('.modern-select-menu');
    if (!wrapper || !trigger || !menu) return;
    wrapper.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (openSelect === select) openSelect = null;
    if (returnFocus) trigger.focus();
  };

  const syncSelect = (select) => {
    const wrapper = select.closest('.modern-select');
    if (!wrapper) return;
    const trigger = wrapper.querySelector('.modern-select-trigger');
    const valueNode = wrapper.querySelector('.modern-select-value');
    const menu = wrapper.querySelector('.modern-select-menu');
    const selectedOption = select.options[select.selectedIndex];

    valueNode.textContent = selectedOption?.textContent.trim() || 'Choose an option';
    trigger.disabled = select.disabled;
    trigger.setAttribute('aria-required', String(select.required));
    trigger.setAttribute('aria-invalid', String(select.getAttribute('aria-invalid') === 'true'));
    menu.replaceChildren();

    Array.from(select.options).forEach((option, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'modern-select-option';
      item.id = `${select.id}-option-${index}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option === selectedOption));
      item.disabled = option.disabled || select.disabled;
      item.textContent = option.textContent.trim();
      item.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncSelect(select);
        closeSelect(select, true);
      });
      menu.append(item);
    });
  };

  const focusOption = (select, direction = 0) => {
    const wrapper = select.closest('.modern-select');
    const menu = wrapper?.querySelector('.modern-select-menu');
    if (!menu) return;
    const options = Array.from(menu.querySelectorAll('.modern-select-option:not(:disabled)'));
    if (!options.length) return;
    const selectedIndex = options.findIndex((option) => option.getAttribute('aria-selected') === 'true');
    const targetIndex = direction === 0
      ? selectedIndex < 0 ? 0 : selectedIndex
      : selectedIndex < 0
        ? direction < 0 ? options.length - 1 : 0
        : Math.max(0, Math.min(options.length - 1, selectedIndex + direction));
    options[targetIndex].focus();
    options[targetIndex].scrollIntoView({ block: 'nearest' });
  };

  selects.forEach((select, selectIndex) => {
    if (select.dataset.modernSelect === 'true') return;
    select.dataset.modernSelect = 'true';
    if (!select.id) select.id = `modern-select-${selectIndex + 1}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'modern-select';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select);
    select.classList.add('modern-select-native');
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'modern-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', `${select.id}-menu`);
    const label = document.querySelector(`label[for="${CSS.escape(select.id)}"]`);
    if (label) {
      if (!label.id) label.id = `${select.id}-label`;
      trigger.setAttribute('aria-labelledby', label.id);
      label.addEventListener('click', (event) => {
        event.preventDefault();
        trigger.focus();
        trigger.click();
      });
    } else {
      trigger.setAttribute('aria-label', select.getAttribute('aria-label') || 'Choose an option');
    }

    const value = document.createElement('span');
    value.className = 'modern-select-value';
    const icon = document.createElement('span');
    icon.className = 'modern-select-chevron';
    icon.setAttribute('aria-hidden', 'true');
    trigger.append(value, icon);

    const menu = document.createElement('div');
    menu.id = `${select.id}-menu`;
    menu.className = 'modern-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    wrapper.append(trigger, menu);

    trigger.addEventListener('click', () => {
      if (trigger.disabled) return;
      if (openSelect && openSelect !== select) closeSelect(openSelect);
      const isOpening = trigger.getAttribute('aria-expanded') !== 'true';
      if (!isOpening) {
        closeSelect(select);
        return;
      }
      openSelect = select;
      wrapper.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
      focusOption(select);
    });

    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (trigger.getAttribute('aria-expanded') !== 'true') trigger.click();
      }
    });

    menu.addEventListener('keydown', (event) => {
      const options = Array.from(menu.querySelectorAll('.modern-select-option:not(:disabled)'));
      const currentIndex = options.indexOf(document.activeElement);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowDown') nextIndex = Math.min(options.length - 1, currentIndex + 1);
      else if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = options.length - 1;
      else if (event.key === 'Escape') {
        event.preventDefault();
        closeSelect(select, true);
        return;
      } else if (event.key === 'Tab') {
        closeSelect(select);
        return;
      } else {
        return;
      }

      event.preventDefault();
      options[nextIndex]?.focus();
      options[nextIndex]?.scrollIntoView({ block: 'nearest' });
    });

    select.addEventListener('change', () => {
      select.removeAttribute('aria-invalid');
      syncSelect(select);
    });
    select.addEventListener('invalid', (event) => {
      event.preventDefault();
      select.setAttribute('aria-invalid', 'true');
      syncSelect(select);
      trigger.focus();
    });
    select.form?.addEventListener('reset', () => {
      window.setTimeout(() => {
        select.removeAttribute('aria-invalid');
        syncSelect(select);
      });
    });

    new MutationObserver(() => syncSelect(select)).observe(select, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'selected', 'value'],
    });
    syncSelect(select);
  });

  document.addEventListener('pointerdown', (event) => {
    if (openSelect && !openSelect.closest('.modern-select')?.contains(event.target)) {
      closeSelect(openSelect);
    }
  });
}

initializeModernSelects();

const navToggle = document.querySelector('.nav-toggle');
const navbar = document.querySelector('.navbar');

function closeMobileMenu() {
  if (!navbar || !navToggle) {
    return;
  }

  navbar.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
}

if (navToggle && navbar) {
  navToggle.addEventListener('click', () => {
    const isOpen = navbar.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });
}

function normalizeCountrySearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const countrySearchInputs = document.querySelectorAll('input[list="country-list"]');
const countrySuggestionsList = document.getElementById('country-list');

if (countrySuggestionsList && countrySearchInputs.length) {
  const allCountryOptions = Array.from(countrySuggestionsList.querySelectorAll('option'))
    .map((option) => option.value.trim())
    .filter(Boolean);
  const popularCountries = [
    'Ghana',
    'United Kingdom',
    'United States',
    'Canada',
    'United Arab Emirates',
    'Germany',
    'France',
    'Australia',
  ].filter((country) => allCountryOptions.includes(country));

  countrySearchInputs.forEach((input, inputIndex) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'country-combobox';
    input.before(wrapper);
    wrapper.append(input);

    const suggestionPanel = document.createElement('div');
    suggestionPanel.className = 'country-suggestions';
    suggestionPanel.hidden = true;

    const listbox = document.createElement('div');
    const listboxId = `country-options-${inputIndex + 1}`;
    listbox.id = listboxId;
    listbox.setAttribute('role', 'listbox');
    suggestionPanel.append(listbox);
    wrapper.append(suggestionPanel);

    const toggle = document.createElement('button');
    toggle.className = 'country-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Show country options');
    toggle.setAttribute('aria-controls', listboxId);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>';
    wrapper.append(toggle);

    input.removeAttribute('list');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-controls', listboxId);
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('autocomplete', 'off');

    let activeIndex = -1;
    let visibleCountries = [];

    const closeListbox = () => {
      suggestionPanel.hidden = true;
      wrapper.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
    };

    const setActiveOption = (index) => {
      const options = Array.from(listbox.querySelectorAll('[role="option"]'));
      if (!options.length) return;

      activeIndex = (index + options.length) % options.length;
      options.forEach((option, optionIndex) => {
        const isActive = optionIndex === activeIndex;
        option.setAttribute('aria-selected', String(isActive));
        option.classList.toggle('is-active', isActive);
      });
      input.setAttribute('aria-activedescendant', options[activeIndex].id);
      options[activeIndex].scrollIntoView({ block: 'nearest' });
    };

    const renderOptions = () => {
      const query = normalizeCountrySearch(input.value);
      visibleCountries = query
        ? allCountryOptions
          .filter((country) => normalizeCountrySearch(country).includes(query))
          .sort((a, b) => {
            const aStartsWithQuery = normalizeCountrySearch(a).startsWith(query);
            const bStartsWithQuery = normalizeCountrySearch(b).startsWith(query);
            return Number(bStartsWithQuery) - Number(aStartsWithQuery) || a.localeCompare(b);
          })
          .slice(0, 8)
        : popularCountries;

      suggestionPanel.replaceChildren();
      listbox.replaceChildren();
      activeIndex = -1;

      const heading = document.createElement('div');
      heading.className = 'country-suggestions-heading';
      heading.textContent = query ? 'Matching countries' : 'Popular destinations';
      suggestionPanel.append(heading, listbox);

      if (visibleCountries.length) {
        visibleCountries.forEach((country, optionIndex) => {
          const option = document.createElement('button');
          option.className = 'country-suggestion';
          option.type = 'button';
          option.id = `${listboxId}-option-${optionIndex + 1}`;
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', 'false');
          option.textContent = country;
          option.addEventListener('pointerdown', (event) => event.preventDefault());
          option.addEventListener('click', () => {
            input.value = country;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            closeListbox();
            input.focus();
          });
          listbox.append(option);
        });
      } else {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'country-suggestions-empty';
        emptyMessage.setAttribute('role', 'status');
        emptyMessage.textContent = 'No countries found. Try another spelling.';
        suggestionPanel.append(emptyMessage);
      }

      const hint = document.createElement('div');
      hint.className = 'country-suggestions-hint';
      hint.textContent = query ? 'Keep typing to refine your search' : 'Type to search all countries';
      suggestionPanel.append(hint);

      suggestionPanel.hidden = false;
      wrapper.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-expanded', 'true');
    };

    input.addEventListener('focus', renderOptions);
    input.addEventListener('input', renderOptions);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (suggestionPanel.hidden) renderOptions();
        setActiveOption(activeIndex + 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (suggestionPanel.hidden) renderOptions();
        setActiveOption(activeIndex < 0 ? visibleCountries.length - 1 : activeIndex - 1);
      } else if (event.key === 'Enter' && !suggestionPanel.hidden && activeIndex >= 0) {
        event.preventDefault();
        input.value = visibleCountries[activeIndex];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        closeListbox();
      } else if (event.key === 'Escape') {
        closeListbox();
      }
    });

    toggle.addEventListener('click', () => {
      if (suggestionPanel.hidden) {
        input.focus();
        renderOptions();
      } else {
        closeListbox();
      }
    });

    document.addEventListener('pointerdown', (event) => {
      if (!wrapper.contains(event.target)) closeListbox();
    });
  });
}

const consultationForm = document.getElementById('consultation-form');
const formStatus = document.querySelector('.form-status');

if (consultationForm) {
  consultationForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!name || !email || !phone || !message) {
      formStatus.textContent = 'Please fill in all fields before sending.';
      formStatus.style.color = '#c03333';
      return;
    }

    try {
      const response = await fetch('/api/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Consultation Request',
          name,
          email,
          phone,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Request failed');
      }

      const mailtoLink = `mailto:${adminEmail}?subject=${encodeURIComponent('New Consultation Request')}&body=${encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`
      )}`;
      window.location.href = mailtoLink;

      formStatus.textContent = `Thank you, ${name}! Your consultation request has been received.`;
      formStatus.style.color = '#0a8659';
      consultationForm.reset();
    } catch (error) {
      formStatus.textContent = 'There was a problem sending your request. Please try again.';
      formStatus.style.color = '#c03333';
    }
  });
}

const applicationForm = document.getElementById('travel-application-form');
const applicationStatus = document.getElementById('application-status');

const updateApplicationSummary = () => {
  const summaryName = document.getElementById('summary-name');
  const summaryCountry = document.getElementById('summary-country');
  const summaryDestination = document.getElementById('summary-destination');
  const summaryPurpose = document.getElementById('summary-purpose');
  const summaryDates = document.getElementById('summary-dates');

  if (!summaryName || !summaryCountry || !summaryDestination || !summaryPurpose || !summaryDates) {
    return;
  }

  const firstName = document.getElementById('firstName')?.value.trim();
  const lastName = document.getElementById('lastName')?.value.trim();
  const countryResidence = document.getElementById('countryResidence')?.value.trim();
  const countryTravelingTo = document.getElementById('countryTravelingTo')?.value.trim();
  const purpose = document.getElementById('purpose')?.value.trim();
  const dateTravel = document.getElementById('dateTravel')?.value;
  const dateReturn = document.getElementById('dateReturn')?.value;

  summaryName.textContent = firstName || lastName ? `${firstName || ''} ${lastName || ''}`.trim() || 'Not provided' : 'Not provided';
  summaryCountry.textContent = countryResidence || 'Not provided';
  summaryDestination.textContent = countryTravelingTo || 'Not provided';
  summaryPurpose.textContent = purpose || 'Not provided';
  summaryDates.textContent = dateTravel && dateReturn ? `${dateTravel} to ${dateReturn}` : 'Not provided';
};

if (applicationForm) {
  ['input', 'change'].forEach((eventName) => {
    applicationForm.addEventListener(eventName, updateApplicationSummary);
  });

  applicationForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(applicationForm);
    const values = Object.fromEntries(formData.entries());

    const requiredFields = [
      'firstName',
      'lastName',
      'dob',
      'telephone',
      'email',
      'countryBirth',
      'countryResidence',
      'address',
      'countryTravelingTo',
      'purpose',
      'dateTravel',
      'dateReturn',
    ];

    const missing = requiredFields.some((field) => !String(values[field] || '').trim());

    if (missing) {
      applicationStatus.textContent = 'Please complete all required fields before submitting.';
      applicationStatus.style.color = '#c03333';
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email || '').trim())) {
      applicationStatus.textContent = 'Please enter a valid email address.';
      applicationStatus.style.color = '#c03333';
      return;
    }

    if (values.dateTravel && values.dateReturn && values.dateTravel > values.dateReturn) {
      applicationStatus.textContent = 'Return date must be after the departure date.';
      applicationStatus.style.color = '#c03333';
      return;
    }

    try {
      const response = await fetch('/api/application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Travel Application',
          ...values,
          note: values.note || '',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed');
      }

      const emailBody = [
        `First Name: ${values.firstName}`,
        `Last Name: ${values.lastName}`,
        `Date of Birth: ${values.dob}`,
        `Telephone Number: ${values.telephone}`,
        `Email: ${values.email}`,
        `Country of Birth: ${values.countryBirth}`,
        `Current Country of Residence: ${values.countryResidence}`,
        `Address: ${values.address}`,
        `Country Traveling To: ${values.countryTravelingTo}`,
        `Purpose of Travel: ${values.purpose}`,
        `Date of Travel: ${values.dateTravel}`,
        `Date of Return: ${values.dateReturn}`,
        `Note/Message: ${values.note || ''}`,
      ].join('\n');

      const mailLink = `mailto:${adminEmail}?subject=${encodeURIComponent('New Travel Application')}&body=${encodeURIComponent(emailBody)}`;
      window.location.href = mailLink;

      applicationStatus.textContent = 'Your application has been submitted successfully.';
      applicationStatus.style.color = '#0a8659';
      applicationForm.reset();
      updateApplicationSummary();
    } catch (error) {
      applicationStatus.textContent = 'There was a problem submitting your application. Please try again.';
      applicationStatus.style.color = '#c03333';
    }
  });
}

const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginStatus = document.getElementById('admin-login-status');
const adminLoginPanel = document.getElementById('admin-login-panel');
const adminContent = document.getElementById('admin-content');
const adminResetForm = document.getElementById('admin-reset-form');
const adminResetStatus = document.getElementById('admin-reset-status');
const ADMIN_SESSION_KEY = 'seyram_admin_logged_in';
const isAdminPage = /(^|\/|\\)admin\.html$/i.test(window.location.pathname || '');

if (!isAdminPage) {
  setAdminSession(false);
}

function setAdminSession(isLoggedIn) {
  if (isLoggedIn) {
    localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    return;
  }

  localStorage.removeItem(ADMIN_SESSION_KEY);
}

function applyAdminState(isLoggedIn) {
  if (adminLoginPanel) {
    adminLoginPanel.classList.toggle('hidden', isLoggedIn);
  }

  if (adminContent) {
    adminContent.classList.toggle('hidden', !isLoggedIn);
  }

  if (isLoggedIn) {
    setAdminSession(true);
  } else {
    setAdminSession(false);
  }
}

function formatLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const adminPasswordInput = document.getElementById('adminPassword');
const passwordToggles = document.querySelectorAll('.show-password-toggle');

function togglePasswordVisibility(inputId, triggerButton) {
  const targetInput = document.getElementById(inputId);
  if (!targetInput || !triggerButton) {
    return;
  }

  const isPasswordHidden = targetInput.type === 'password';
  targetInput.type = isPasswordHidden ? 'text' : 'password';
  triggerButton.classList.toggle('is-visible', isPasswordHidden);
  triggerButton.setAttribute('aria-label', isPasswordHidden ? `Hide ${inputId}` : `Show ${inputId}`);
  triggerButton.setAttribute('title', isPasswordHidden ? 'Hide code' : 'Show code');
  triggerButton.setAttribute('aria-pressed', String(isPasswordHidden));
  targetInput.focus();
}

if (adminPasswordInput) {
  passwordToggles.forEach((toggleButton) => {
    const targetId = toggleButton.dataset.target || 'adminPassword';
    if (targetId !== 'adminPassword') {
      return;
    }

    toggleButton.addEventListener('click', function () {
      togglePasswordVisibility(targetId, toggleButton);
    });
  });
}

document.querySelectorAll('.reset-code-toggle').forEach((toggleButton) => {
  const targetId = toggleButton.dataset.target;
  if (!targetId) {
    return;
  }

  toggleButton.addEventListener('click', function () {
    togglePasswordVisibility(targetId, toggleButton);
  });
});

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const code = document.getElementById('adminPassword').value.trim();

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Invalid code');
      }

      adminLoginStatus.textContent = 'Access granted.';
      adminLoginStatus.style.color = '#0a8659';
      showToast('Admin login successful.');
      applyAdminState(true);
      await renderOffers();
      await renderApplications();
      await renderDocumentHelpRequests();
      await renderStudyAbroadRequests();
      await renderWorkAbroadRequests();
      await renderFlightBookingRequests();
      await renderHotelBookingRequests();
      await renderOfferApplications();
    } catch (error) {
      adminLoginStatus.textContent = 'Incorrect access code.';
      adminLoginStatus.style.color = '#c03333';
      showToast('Incorrect access code.', 'error');
    }
  });
}

if (adminResetForm) {
  adminResetForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const currentCode = document.getElementById('currentAdminCode').value.trim();
    const newCode = document.getElementById('newAdminCode').value.trim();

    if (!currentCode || !newCode || newCode.length < 6) {
      if (adminResetStatus) {
        adminResetStatus.textContent = 'Please provide the current code and a new code with at least 6 characters.';
        adminResetStatus.style.color = '#c03333';
      }
      return;
    }

    try {
      const response = await fetch('/api/admin/reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentCode, newCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to reset access code');
      }

      if (adminResetStatus) {
        adminResetStatus.textContent = 'Admin access code updated successfully.';
        adminResetStatus.style.color = '#0a8659';
      }
      showToast('Admin access code updated successfully.');
      adminResetForm.reset();
    } catch (error) {
      if (adminResetStatus) {
        adminResetStatus.textContent = error.message || 'Unable to reset access code.';
        adminResetStatus.style.color = '#c03333';
      }
      showToast(error.message || 'Unable to reset access code.', 'error');
    }
  });
}

const jobOfferForm = document.getElementById('job-offer-form');
const offerStatus = document.getElementById('offer-status');
let editingOfferId = null;

if (jobOfferForm) {
  const offerRequiredDocumentsInput = document.getElementById('offerRequiredDocuments');
  const offerRequiredDocumentCount = document.getElementById('offer-required-document-count');

  function collectOfferRequiredDocuments() {
    const selectedDocuments = Array.from(jobOfferForm.querySelectorAll('input[name="offerDocument"]:checked'))
      .map((input) => input.value);
    const otherDocuments = (document.getElementById('offerOtherDocuments')?.value || '')
      .split('\n')
      .map((document) => document.trim())
      .filter(Boolean);
    const requiredDocuments = [...new Set([...selectedDocuments, ...otherDocuments])];
    if (offerRequiredDocumentsInput) {
      offerRequiredDocumentsInput.value = JSON.stringify(requiredDocuments);
    }
    if (offerRequiredDocumentCount) {
      offerRequiredDocumentCount.textContent = `${requiredDocuments.length} ${requiredDocuments.length === 1 ? 'document' : 'documents'} selected`;
    }
    return requiredDocuments;
  }

  jobOfferForm.querySelectorAll('input[name="offerDocument"], #offerOtherDocuments')
    .forEach((control) => {
      control.addEventListener('input', collectOfferRequiredDocuments);
      control.addEventListener('change', collectOfferRequiredDocuments);
    });
  collectOfferRequiredDocuments();

  jobOfferForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const title = document.getElementById('offerTitle').value.trim();
    const location = document.getElementById('offerLocation').value.trim();
    const type = document.getElementById('offerType').value.trim();
    const description = document.getElementById('offerDescription').value.trim();
    let requiredDocuments = collectOfferRequiredDocuments();
    if (offerRequiredDocumentsInput?.value) {
      try {
        const payloadDocuments = JSON.parse(offerRequiredDocumentsInput.value);
        if (Array.isArray(payloadDocuments)) {
          requiredDocuments = payloadDocuments
            .filter((documentName) => typeof documentName === 'string')
            .map((documentName) => documentName.trim())
            .filter(Boolean);
        }
      } catch {
        requiredDocuments = [];
      }
    }
    const imageInput = document.getElementById('offerImage');

    if (!title || !location || !type || !description || requiredDocuments.length > 8) {
      offerStatus.textContent = requiredDocuments.length > 8
        ? 'List no more than 8 required documents.'
        : 'Please complete all required fields to publish an offer.';
      offerStatus.style.color = '#c03333';
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('company', '');
      formData.append('location', location);
      formData.append('type', type);
      formData.append('description', description);
      formData.append('requiredDocuments', JSON.stringify(requiredDocuments));
      formData.append('link', '');

      if (imageInput && imageInput.files && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
      }

      const response = await fetch(editingOfferId ? `/api/offers/${encodeURIComponent(editingOfferId)}` : '/api/offers', {
        method: editingOfferId ? 'PUT' : 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to publish');
      }

      offerStatus.textContent = editingOfferId ? 'Offer updated successfully.' : 'Offer published successfully.';
      offerStatus.style.color = '#0a8659';
      showToast(editingOfferId ? 'Offer updated successfully.' : 'Offer published successfully.');
      jobOfferForm.reset();
      editingOfferId = null;
      const publishButton = jobOfferForm.querySelector('button[type="submit"]');
      if (publishButton) publishButton.textContent = 'Publish Offer';
      window.setTimeout(collectOfferRequiredDocuments);
      await renderOffers();
    } catch (error) {
      offerStatus.textContent = error.message || 'There was a problem publishing the offer.';
      offerStatus.style.color = '#c03333';
      showToast(error.message || 'There was a problem publishing the offer.', 'error');
    }
  });
}

const documentHelpForm = document.getElementById('document-help-form');
const documentHelpStatus = document.getElementById('document-help-status');
const studyAbroadForm = document.getElementById('study-abroad-form');
const studyAbroadStatus = document.getElementById('study-abroad-status');
const workAbroadForm = document.getElementById('work-abroad-form');
const workAbroadStatus = document.getElementById('work-abroad-status');
const flightBookingForm = document.getElementById('flight-booking-form');
const flightBookingStatus = document.getElementById('flight-booking-status');
const hotelBookingForm = document.getElementById('hotel-booking-form');
const hotelBookingStatus = document.getElementById('hotel-booking-status');

function ensureToastContainer() {
  let container = document.getElementById('toast-container');

  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  return container;
}

function showToast(message, type = 'success') {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

if (documentHelpForm) {
  documentHelpForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('docHelpName').value.trim();
    const phone = document.getElementById('docHelpPhone').value.trim();
    const email = document.getElementById('docHelpEmail').value.trim();
    const currentCountry = document.getElementById('docHelpCurrentCountry').value.trim();
    const destinationCountry = document.getElementById('docHelpDestinationCountry').value.trim();
    const documentTypes = Array.from(document.querySelectorAll('input[name="documentTypes"]:checked')).map((input) => input.value);

    if (!name || !phone || !email || !currentCountry || !destinationCountry || !documentTypes.length) {
      if (documentHelpStatus) {
        documentHelpStatus.textContent = 'Please complete all required fields and select at least one document type.';
        documentHelpStatus.style.color = '#c03333';
      }
      return;
    }

    try {
      const response = await fetch('/api/document-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          currentCountry,
          destinationCountry,
          documentTypes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed');
      }

      if (documentHelpStatus) {
        documentHelpStatus.textContent = 'Your document assistance request has been submitted successfully.';
        documentHelpStatus.style.color = '#0a8659';
      }
      showToast('Document help request submitted successfully.');
      documentHelpForm.reset();
    } catch (error) {
      if (documentHelpStatus) {
        documentHelpStatus.textContent = 'There was a problem submitting your request. Please try again.';
        documentHelpStatus.style.color = '#c03333';
      }
      showToast('Unable to submit document help request.', 'error');
    }
  });
}

const studyCountryChoiceInputs = document.querySelectorAll('input[name="countryChoice"]');
const selectedCountryList = document.getElementById('selectedCountryList');

function updateSelectedCountryDisplay() {
  if (!selectedCountryList) {
    return;
  }

  const selected = Array.from(studyCountryChoiceInputs)
    .filter((input) => input.checked)
    .map((input) => input.value);

  selectedCountryList.innerHTML = '';

  if (!selected.length) {
    selectedCountryList.innerHTML = '<span class="empty-selection">No country selected yet.</span>';
    return;
  }

  selected.forEach((country) => {
    const tag = document.createElement('span');
    tag.className = 'selected-country-tag';
    tag.textContent = country;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'remove-country-btn';
    removeButton.setAttribute('aria-label', `Remove ${country}`);
    removeButton.textContent = '×';

    removeButton.addEventListener('click', () => {
      studyCountryChoiceInputs.forEach((input) => {
        if (input.value === country) {
          input.checked = false;
        }
      });
      updateSelectedCountryDisplay();
    });

    tag.appendChild(removeButton);
    selectedCountryList.appendChild(tag);
  });
}

if (studyCountryChoiceInputs.length) {
  studyCountryChoiceInputs.forEach((input) => {
    input.addEventListener('change', (event) => {
      const checkedCount = Array.from(studyCountryChoiceInputs).filter((item) => item.checked).length;

      if (checkedCount > 5) {
        event.target.checked = false;
        if (studyAbroadStatus) {
          studyAbroadStatus.textContent = 'You can select up to 5 countries only.';
          studyAbroadStatus.style.color = '#c03333';
        }
      } else if (studyAbroadStatus && studyAbroadStatus.textContent === 'You can select up to 5 countries only.') {
        studyAbroadStatus.textContent = '';
      }

      updateSelectedCountryDisplay();
    });
  });
  updateSelectedCountryDisplay();
}

if (studyAbroadForm) {
  studyAbroadForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('studyName').value.trim();
    const phone = document.getElementById('studyPhone').value.trim();
    const email = document.getElementById('studyEmail').value.trim();
    const qualification = document.getElementById('studyQualification').value.trim();
    const program = document.getElementById('studyProgram').value.trim();
    const degreeType = document.getElementById('studyDegreeType').value.trim();
    const selectedCountries = Array.from(document.querySelectorAll('input[name="countryChoice"]:checked')).map((input) => input.value);
    const programType = document.querySelector('input[name="programType"]:checked')?.value || '';

    if (!name || !phone || !email || !qualification || !program || !degreeType || selectedCountries.length < 3 || selectedCountries.length > 5 || !programType) {
      if (studyAbroadStatus) {
        studyAbroadStatus.textContent = 'Please complete all required fields and choose between 3 and 5 countries and one program type.';
        studyAbroadStatus.style.color = '#c03333';
      }
      return;
    }

    try {
      const response = await fetch('/api/study-abroad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          qualification,
          program,
          degreeType,
          countryChoice: selectedCountries,
          programType,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed');
      }

      if (studyAbroadStatus) {
        studyAbroadStatus.textContent = 'Your study abroad request has been submitted successfully.';
        studyAbroadStatus.style.color = '#0a8659';
      }
      showToast('Study abroad request submitted successfully.');
      studyAbroadForm.reset();
      updateSelectedCountryDisplay();
    } catch (error) {
      if (studyAbroadStatus) {
        studyAbroadStatus.textContent = 'There was a problem submitting your request. Please try again.';
        studyAbroadStatus.style.color = '#c03333';
      }
      showToast('Unable to submit study abroad request.', 'error');
    }
  });
}

const countryAirportMap = {
  Afghanistan: ["Kabul International Airport (KBL)"],
  Albania: ["Tirana International Airport (TIA)"],
  Algeria: ["Houari Boumediene Airport (ALG)", "Oran Airport (ORN)"],
  Andorra: ["Andorra-La Seu d'Urgell Airport (LEU)"],
  Angola: ["Quatro de Fevereiro Airport (LAD)", "Luanda Airport (LAD)"],
  Argentina: ["Ministro Pistarini Airport (EZE)", "Aeroparque Jorge Newbery (AEP)"],
  Armenia: ["Zvartnots International Airport (EVN)"],
  Australia: ["Sydney Airport (SYD)", "Melbourne Airport (MEL)", "Perth Airport (PER)"],
  Austria: ["Vienna International Airport (VIE)", "Salzburg Airport (SZG)"],
  Azerbaijan: ["Heydar Aliyev International Airport (GYD)"],
  Bahamas: ["Nassau International Airport (NAS)"],
  Bahrain: ["Bahrain International Airport (BAH)"],
  Bangladesh: ["Hazrat Shahjalal Airport (DAC)", "Shah Amanat Airport (CGP)"],
  Barbados: ["Grantley Adams International Airport (BGI)"],
  Belgium: ["Brussels Airport (BRU)", "Antwerp Airport (ANR)"],
  Belize: ["Philip S. W. Goldson International Airport (BZE)"],
  Benin: ["Cotonou Cadjehoun Airport (COO)"],
  Bhutan: ["Paro Airport (PBH)"],
  Bolivia: ["El Alto International Airport (LPB)", "Viru Viru International Airport (VVI)"],
  Botswana: ["Sir Seretse Khama International Airport (GBE)"],
  Brazil: ["São Paulo-Guarulhos Airport (GRU)", "Rio de Janeiro Galeão (GIG)", "Brasília International (BSB)"],
  Brunei: ["Brunei International Airport (BWN)"],
  Bulgaria: ["Sofia Airport (SOF)", "Burgas Airport (BOJ)"],
  'Burkina Faso': ["Ouagadougou Airport (OUA)"],
  Burundi: ["Bujumbura International Airport (BJM)"],
  Cambodia: ["Phnom Penh International Airport (PNH)", "Siem Reap Airport (REP)"],
  Cameroon: ["Douala International Airport (DLA)", "Yaoundé Nsimalen Airport (NSI)"],
  Canada: ["Toronto Pearson (YYZ)", "Vancouver International (YVR)", "Montreal Trudeau (YUL)", "Calgary Airport (YYC)"],
  Chile: ["Arturo Merino Benítez Airport (SCL)"],
  China: ["Beijing Capital International (PEK)", "Shanghai Pudong (PVG)", "Guangzhou Baiyun (CAN)"],
  Colombia: ["El Dorado International Airport (BOG)", "José Maria Córdova Airport (MDE)"],
  Congo: ["Pointe Noire Airport (PNR)"],
  'Costa Rica': ["Juan Santamaría International Airport (SJO)"],
  Croatia: ["Zagreb Airport (ZAG)", "Split Airport (SPU)"],
  Cuba: ["José Martí International Airport (HAV)", "Varadero Airport (VRA)"],
  Cyprus: ["Paphos International Airport (PFO)", "Larnaca International Airport (LCA)"],
  'Czech Republic': ["Václav Havel Airport Prague (PRG)"],
  Denmark: ["Copenhagen Airport (CPH)", "Billund Airport (BLL)"],
  Djibouti: ["Djibouti-Ambouli International Airport (JIB)"],
  'Dominican Republic': ["Las Américas International Airport (SDQ)", "Punta Cana Airport (PUJ)"],
  Ecuador: ["Mariscal Sucre International Airport (UIO)", "Guayaquil Airport (GYE)"],
  Egypt: ["Cairo International Airport (CAI)", "Hurghada International Airport (HRG)"],
  'El Salvador': ["El Salvador International Airport (SAL)"],
  Estonia: ["Tallinn Airport (TLL)"],
  Ethiopia: ["Addis Ababa Bole International Airport (ADD)"],
  Fiji: ["Nadi International Airport (NAN)"],
  Finland: ["Helsinki-Vantaa Airport (HEL)", "Oulu Airport (OUL)"],
  France: ["Charles de Gaulle Airport (CDG)", "Paris Orly (ORY)", "Nice Côte d'Azur (NCE)", "Marseille Provence (MRS)"],
  Gabon: ["Libreville Leon Mba International Airport (LBV)"],
  Gambia: ["Banjul International Airport (BJL)"],
  Georgia: ["Tbilisi International Airport (TBS)"],
  Germany: ["Frankfurt Airport (FRA)", "Munich Airport (MUC)", "Berlin Brandenburg (BER)", "Hamburg Airport (HAM)"],
  Ghana: ["Kotoka International Airport (ACC)", "Kumasi Airport (KMS)", "Takoradi Airport (TKD)"],
  Greece: ["Athens International Airport (ATH)", "Heraklion Airport (HER)"],
  Guatemala: ["La Aurora International Airport (GUA)"],
  Guinea: ["Conakry International Airport (CKY)"],
  Haiti: ["Toussaint Louverture International Airport (PAP)"],
  Honduras: ["Toncontín International Airport (TGU)"],
  Hungary: ["Budapest Ferenc Liszt International Airport (BUD)"],
  Iceland: ["Keflavík International Airport (KEF)"],
  India: ["Indira Gandhi International Airport (DEL)", "Chhatrapati Shivaji Maharaj Airport (BOM)", "Kempegowda International (BLR)"],
  Indonesia: ["Soekarno-Hatta International Airport (CGK)", "Ngurah Rai International Airport (DPS)"],
  Iran: ["Imam Khomeini Airport (IKA)", "Mashhad Airport (MHD)"],
  Iraq: ["Baghdad International Airport (BGW)", "Erbil International Airport (EBL)"],
  Ireland: ["Dublin Airport (DUB)", "Shannon Airport (SNN)"],
  Israel: ["Ben Gurion Airport (TLV)"],
  Italy: ["Rome Fiumicino (FCO)", "Milan Malpensa (MXP)", "Venice Marco Polo (VCE)", "Naples Airport (NAP)"],
  Jamaica: ["Norman Manley International Airport (KIN)", "Sangster International Airport (MBJ)"],
  Japan: ["Haneda Airport (HND)", "Narita International Airport (NRT)", "Kansai Airport (KIX)"],
  Jordan: ["Queen Alia International Airport (AMM)"],
  Kazakhstan: ["Almaty International Airport (ALA)", "Nursultan Nazarbayev International Airport (NQZ)"],
  Kenya: ["Jomo Kenyatta International Airport (NBO)", "Moi International Airport (MBA)"],
  Kuwait: ["Kuwait International Airport (KWI)"],
  Kyrgyzstan: ["Manas International Airport (FRU)"],
  Laos: ["Wattay International Airport (VTE)"],
  Latvia: ["Riga International Airport (RIX)"],
  Lebanon: ["Beirut-Rafic Hariri International Airport (BEY)"],
  Lesotho: ["Maseru Airport (MSU)"],
  Liberia: ["Roberts International Airport (ROB)"],
  Libya: ["Tripoli International Airport (TIP)", "Benghazi Airport (BEN)"],
  Lithuania: ["Vilnius Airport (VNO)"],
  Luxembourg: ["Luxembourg Airport (LUX)"],
  Madagascar: ["Ivato International Airport (TNR)"],
  Malawi: ["Lilongwe International Airport (LLW)"],
  Malaysia: ["Kuala Lumpur International Airport (KUL)", "Penang International Airport (PEN)", "Johor Bahru Airport (JHB)"],
  Malta: ["Malta International Airport (MLA)"],
  Mauritania: ["Nouakchott International Airport (NKC)"],
  Mauritius: ["Sir Seewoosagur Ramgoolam Airport (MRU)"],
  Mexico: ["Mexico City International Airport (MEX)", "Cancún International Airport (CUN)"],
  Moldova: ["Chișinău International Airport (KIV)"],
  Mongolia: ["Chinggis Khaan International Airport (ULN)"],
  Morocco: ["Mohammed V International Airport (CMN)", "Marrakesh Menara Airport (RAK)"],
  Mozambique: ["Maputo International Airport (MPM)"],
  Namibia: ["Windhoek Hosea Kutako International Airport (WDH)"],
  Nepal: ["Tribhuvan International Airport (KTM)"],
  Netherlands: ["Amsterdam Airport Schiphol (AMS)", "Rotterdam The Hague Airport (RTM)"],
  'New Zealand': ["Auckland Airport (AKL)", "Wellington Airport (WLG)"],
  Nicaragua: ["Augusto C. Sandino International Airport (MGA)"],
  Niger: ["Diori Hamani International Airport (NIM)"],
  Nigeria: ["Murtala Muhammed International Airport (LOS)", "Nnamdi Azikiwe International Airport (ABV)", "Port Harcourt International Airport (PHC)"],
  'North Macedonia': ["Skopje Airport (SKP)"],
  Norway: ["Oslo Airport (OSL)", "Bergen Airport (BGO)"],
  Oman: ["Muscat International Airport (MCT)"],
  Pakistan: ["Islamabad International Airport (ISB)", "Karachi Airport (KHI)", "Lahore Airport (LHE)"],
  Panama: ["Tocumen International Airport (PTY)"],
  Paraguay: ["Silvio Pettirossi International Airport (ASU)"],
  Peru: ["Jorge Chávez International Airport (LIM)"],
  Philippines: ["Ninoy Aquino International Airport (MNL)", "Cebu International Airport (CEB)"],
  Poland: ["Warsaw Chopin Airport (WAW)", "Kraków Airport (KRK)"],
  Portugal: ["Lisbon Airport (LIS)", "Porto Airport (OPO)"],
  Qatar: ["Hamad International Airport (DOH)"],
  Romania: ["Henri Coandă International Airport (OTP)", "Bucharest Airport (OTP)"],
  Russia: ["Sheremetyevo International Airport (SVO)", "Domodedovo Airport (DME)"],
  Rwanda: ["Kigali International Airport (KGL)"],
  'Saudi Arabia': ["King Abdulaziz International Airport (JED)", "King Khalid International Airport (RUH)"],
  Senegal: ["Blaise Diagne International Airport (DSS)"],
  Serbia: ["Belgrade Nikola Tesla Airport (BEG)"],
  'Sierra Leone': ["Lungi International Airport (FNA)"],
  Singapore: ["Changi Airport (SIN)"],
  Slovakia: ["M. R. Štefánik Airport (BTS)"],
  Slovenia: ["Ljubljana Jože Pučnik Airport (LJU)"],
  'South Africa': ["Cape Town International Airport (CPT)", "Johannesburg O.R. Tambo Airport (JNB)"],
  'South Korea': ["Incheon International Airport (ICN)", "Gimpo Airport (GMP)"],
  Spain: ["Adolfo Suárez Madrid–Barajas Airport (MAD)", "Barcelona-El Prat Airport (BCN)", "Malaga Airport (AGP)"],
  'Sri Lanka': ["Bandaranaike International Airport (CMB)"],
  Sudan: ["Khartoum International Airport (KRT)"],
  Sweden: ["Stockholm Arlanda Airport (ARN)", "Gothenburg Landvetter (GOT)"],
  Switzerland: ["Zurich Airport (ZRH)", "Geneva Airport (GVA)"],
  Syria: ["Damascus International Airport (DAM)"],
  Tanzania: ["Julius Nyerere International Airport (DAR)", "Kilimanjaro Airport (JRO)"],
  Thailand: ["Suvarnabhumi Airport (BKK)", "Don Mueang Airport (DMK)"],
  Togo: ["Lomé-Tokoin Airport (LFW)"],
  Tunisia: ["Tunis-Carthage International Airport (TUN)"],
  Turkey: ["Istanbul Airport (IST)", "Antalya Airport (AYT)", "Izmir Airport (ADB)"],
  Uganda: ["Entebbe International Airport (EBB)"],
  Ukraine: ["Boryspil International Airport (KBP)", "Lviv Airport (LWO)"],
  'United Arab Emirates': ["Dubai International Airport (DXB)", "Abu Dhabi International Airport (AUH)", "Sharjah Airport (SHJ)"],
  'United Kingdom': ["Heathrow Airport (LHR)", "Gatwick Airport (LGW)", "Manchester Airport (MAN)", "Edinburgh Airport (EDI)"],
  'United States': ["John F. Kennedy International (JFK)", "Los Angeles International (LAX)", "Chicago O'Hare (ORD)", "Hartsfield-Jackson Atlanta (ATL)"],
  Uruguay: ["Carrasco International Airport (MVD)"],
  Uzbekistan: ["Tashkent International Airport (TAS)"],
  Venezuela: ["Simón Bolívar International Airport (CCS)"],
  Vietnam: ["Tan Son Nhat International Airport (SGN)", "Noi Bai International Airport (HAN)"],
  Yemen: ["Aden International Airport (ADE)"],
  Zambia: ["Kenneth Kaunda International Airport (LUN)"],
  Zimbabwe: ["Robert Gabriel Mugabe International Airport (HRE)"],
  'Côte d\'Ivoire': ["Abidjan Airport (ABJ)"],
  Dubai: ["Dubai International Airport (DXB)", "Al Maktoum International Airport (DWC)"],
  UK: ["Heathrow Airport (LHR)", "Gatwick Airport (LGW)", "Manchester Airport (MAN)"],
  USA: ["John F. Kennedy International (JFK)", "Los Angeles International (LAX)", "Chicago O'Hare (ORD)"],
  UAE: ["Dubai International Airport (DXB)", "Abu Dhabi International Airport (AUH)", "Sharjah Airport (SHJ)"],
};

const countryAirportAliases = {
  UK: "United Kingdom",
  'U.K.': "United Kingdom",
  USA: "United States",
  'U.S.A.': "United States",
  'United States of America': "United States",
  America: "United States",
  UAE: "United Arab Emirates",
  'The Netherlands': "Netherlands",
  'Cote d\'Ivoire': "Côte d'Ivoire",
  'Ivory Coast': "Côte d'Ivoire",
  'Republic of Korea': "South Korea",
  Macedonia: "North Macedonia",
};

function normalizeCountryName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s*[-–—]\s*/g, ' ')
    .trim();
}

function getAirportListForCountry(country) {
  const rawCountry = normalizeCountryName(country);
  if (!rawCountry) {
    return [];
  }

  const normalized = rawCountry.toLowerCase();

  const aliasMatch = Object.keys(countryAirportAliases).find((countryName) => normalizeCountryName(countryName).toLowerCase() === normalized);
  const resolvedCountry = aliasMatch ? countryAirportAliases[aliasMatch] : rawCountry;

  const exactMatch = Object.keys(countryAirportMap).find((countryName) => normalizeCountryName(countryName).toLowerCase() === resolvedCountry.toLowerCase());
  if (exactMatch) {
    return countryAirportMap[exactMatch];
  }

  const partialMatch = Object.keys(countryAirportMap).find((countryName) =>
    normalizeCountryName(countryName).toLowerCase().includes(resolvedCountry.toLowerCase()) ||
    resolvedCountry.toLowerCase().includes(normalizeCountryName(countryName).toLowerCase())
  );

  if (partialMatch) {
    return countryAirportMap[partialMatch];
  }

  return [
    `Main International Airport (${resolvedCountry.slice(0, 3).toUpperCase()})`,
    `Commercial Airport (${resolvedCountry.slice(0, 3).toUpperCase()})`,
    `City International Airport (${resolvedCountry.slice(0, 3).toUpperCase()})`,
  ];
}

function populateAirportOptions(countryInputId, airportSelectId) {
  const countryInput = document.getElementById(countryInputId);
  const airportSelect = document.getElementById(airportSelectId);

  if (!countryInput || !airportSelect) {
    return;
  }

  const country = countryInput.value.trim();
  const airports = getAirportListForCountry(country);

  airportSelect.innerHTML = '<option value="">Choose airport</option>';

  if (!airports.length) {
    airportSelect.innerHTML = '<option value="">No airport suggestions available</option>';
    return;
  }

  airports.forEach((airport) => {
    const option = document.createElement('option');
    option.value = airport;
    option.textContent = airport;
    airportSelect.appendChild(option);
  });
}

if (flightBookingForm) {
  const currentCountryInput = document.getElementById('flightCurrentCountry');
  const destinationCountryInput = document.getElementById('flightDestinationCountry');
  const currentAirportSelect = document.getElementById('flightCurrentAirport');
  const destinationAirportSelect = document.getElementById('flightDestinationAirport');

  ['input', 'change'].forEach((eventName) => {
    currentCountryInput?.addEventListener(eventName, () => {
      populateAirportOptions('flightCurrentCountry', 'flightCurrentAirport');
    });

    destinationCountryInput?.addEventListener(eventName, () => {
      populateAirportOptions('flightDestinationCountry', 'flightDestinationAirport');
    });
  });

  flightBookingForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const currentCountry = document.getElementById('flightCurrentCountry').value.trim();
    const name = document.getElementById('flightContactName').value.trim();
    const phone = document.getElementById('flightContactPhone').value.trim();
    const email = document.getElementById('flightContactEmail').value.trim();
    const currentAirport = document.getElementById('flightCurrentAirport').value.trim();
    const destinationCountry = document.getElementById('flightDestinationCountry').value.trim();
    const destinationAirport = document.getElementById('flightDestinationAirport').value.trim();
    const destinationCity = document.getElementById('flightDestinationCity').value.trim();
    const departureDate = document.getElementById('flightDepartureDate').value;
    const returnDate = document.getElementById('flightReturnDate').value;
    const airline = document.getElementById('flightAirline').value.trim();

    if (!name || !phone || !email || !currentCountry || !currentAirport || !destinationCountry || !destinationAirport || !destinationCity || !departureDate || !returnDate) {
      if (flightBookingStatus) {
        flightBookingStatus.textContent = 'Please complete all required fields and choose the suggested airports before submitting.';
        flightBookingStatus.style.color = '#c03333';
      }
      return;
    }

    if (departureDate > returnDate) {
      if (flightBookingStatus) {
        flightBookingStatus.textContent = 'Return date must be after the departure date.';
        flightBookingStatus.style.color = '#c03333';
      }
      return;
    }

    try {
      const response = await fetch('/api/flight-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          currentCountry,
          currentAirport,
          destinationCountry,
          destinationAirport,
          destinationCity,
          departureDate,
          returnDate,
          airline,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed');
      }

      if (flightBookingStatus) {
        flightBookingStatus.textContent = 'Your flight booking request has been submitted successfully.';
        flightBookingStatus.style.color = '#0a8659';
      }
      showToast('Flight booking request submitted successfully.');
      flightBookingForm.reset();
      currentAirportSelect.innerHTML = '<option value="">Choose current airport</option>';
      destinationAirportSelect.innerHTML = '<option value="">Choose destination airport</option>';
    } catch (error) {
      if (flightBookingStatus) {
        flightBookingStatus.textContent = 'There was a problem submitting your flight request. Please try again.';
        flightBookingStatus.style.color = '#c03333';
      }
      showToast('Unable to submit flight booking request.', 'error');
    }
  });
}

if (hotelBookingForm) {
  hotelBookingForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('hotelContactName').value.trim();
    const phone = document.getElementById('hotelContactPhone').value.trim();
    const email = document.getElementById('hotelContactEmail').value.trim();
    const destinationCountry = document.getElementById('hotelDestinationCountry').value.trim();
    const destinationCity = document.getElementById('hotelDestinationCity').value.trim();
    const checkInDate = document.getElementById('hotelCheckInDate').value;
    const checkOutDate = document.getElementById('hotelCheckOutDate').value;
    const adults = document.getElementById('hotelAdults').value.trim();
    const kids = document.getElementById('hotelKids').value.trim();

    if (!name || !phone || !email || !destinationCountry || !destinationCity || !checkInDate || !checkOutDate) {
      if (hotelBookingStatus) {
        hotelBookingStatus.textContent = 'Please complete the required destination and date fields.';
        hotelBookingStatus.style.color = '#c03333';
      }
      return;
    }

    if (checkInDate > checkOutDate) {
      if (hotelBookingStatus) {
        hotelBookingStatus.textContent = 'Check-out date must be after the check-in date.';
        hotelBookingStatus.style.color = '#c03333';
      }
      return;
    }

    try {
      const response = await fetch('/api/hotel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          destinationCountry,
          destinationCity,
          checkInDate,
          checkOutDate,
          adults,
          kids,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed');
      }

      if (hotelBookingStatus) {
        hotelBookingStatus.textContent = 'Your hotel reservation request has been submitted successfully.';
        hotelBookingStatus.style.color = '#0a8659';
      }
      showToast('Hotel reservation request submitted successfully.');
      hotelBookingForm.reset();
    } catch (error) {
      if (hotelBookingStatus) {
        hotelBookingStatus.textContent = 'There was a problem submitting your reservation request. Please try again.';
        hotelBookingStatus.style.color = '#c03333';
      }
      showToast('Unable to submit hotel reservation request.', 'error');
    }
  });
}

if (workAbroadForm) {
  const workCountryChoiceInputs = document.querySelectorAll('#work-abroad-form input[name="countryChoice"]');
  const workSelectedCountryList = document.getElementById('workSelectedCountryList');

  function updateWorkSelectedCountryDisplay() {
    if (!workSelectedCountryList) {
      return;
    }

    const selected = Array.from(workCountryChoiceInputs)
      .filter((input) => input.checked)
      .map((input) => input.value);

    workSelectedCountryList.innerHTML = '';

    if (!selected.length) {
      workSelectedCountryList.innerHTML = '<span class="empty-selection">No country selected yet.</span>';
      return;
    }

    selected.forEach((country) => {
      const tag = document.createElement('span');
      tag.className = 'selected-country-tag';
      tag.textContent = country;

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'remove-country-btn';
      removeButton.setAttribute('aria-label', `Remove ${country}`);
      removeButton.textContent = '×';

      removeButton.addEventListener('click', () => {
        workCountryChoiceInputs.forEach((input) => {
          if (input.value === country) {
            input.checked = false;
          }
        });
        updateWorkSelectedCountryDisplay();
      });

      tag.appendChild(removeButton);
      workSelectedCountryList.appendChild(tag);
    });
  }

  workCountryChoiceInputs.forEach((input) => {
    input.addEventListener('change', (event) => {
      const checkedCount = Array.from(workCountryChoiceInputs).filter((item) => item.checked).length;

      if (checkedCount > 3) {
        event.target.checked = false;
        if (workAbroadStatus) {
          workAbroadStatus.textContent = 'You can select up to 3 countries only.';
          workAbroadStatus.style.color = '#c03333';
        }
      } else if (workAbroadStatus && workAbroadStatus.textContent === 'You can select up to 3 countries only.') {
        workAbroadStatus.textContent = '';
      }

      updateWorkSelectedCountryDisplay();
    });
  });

  workAbroadForm.addEventListener('submit', async function (event) {
    event.preventDefault();

    const name = document.getElementById('workName').value.trim();
    const phone = document.getElementById('workPhone').value.trim();
    const email = document.getElementById('workEmail').value.trim();
    const qualification = document.getElementById('workQualification').value.trim();
    const selectedCountries = Array.from(document.querySelectorAll('#work-abroad-form input[name="countryChoice"]:checked')).map((input) => input.value);

    if (!name || !phone || !email || !qualification || selectedCountries.length < 1 || selectedCountries.length > 3) {
      if (workAbroadStatus) {
        workAbroadStatus.textContent = 'Please complete all required fields and choose between 1 and 3 countries.';
        workAbroadStatus.style.color = '#c03333';
      }
      return;
    }

    try {
      const response = await fetch('/api/work-abroad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          qualification,
          countryChoice: selectedCountries,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Submission failed');
      }

      if (workAbroadStatus) {
        workAbroadStatus.textContent = 'Your work abroad request has been submitted successfully.';
        workAbroadStatus.style.color = '#0a8659';
      }
      showToast('Work abroad request submitted successfully.');
      workAbroadForm.reset();
      updateWorkSelectedCountryDisplay();
    } catch (error) {
      if (workAbroadStatus) {
        workAbroadStatus.textContent = 'There was a problem submitting your request. Please try again.';
        workAbroadStatus.style.color = '#c03333';
      }
      showToast('Unable to submit work abroad request.', 'error');
    }
  });

  updateWorkSelectedCountryDisplay();
}

function renderAdminOfferCards(offers) {
  return offers
    .map((offer) => {
      const imageMarkup = offer.image
        ? `<img src="${escapeHtml(offer.image)}" alt="${escapeHtml(offer.title)}" class="offer-image" />`
        : '';
      const requiredDocuments = Array.isArray(offer.requiredDocuments) ? offer.requiredDocuments : [];

      return `
        <article class="list-item">
          <div class="list-item-header">
            <strong>${escapeHtml(offer.title)}</strong>
            <span>${escapeHtml(offer.type)}</span>
          </div>
          <p>${escapeHtml(offer.location)}</p>
          ${imageMarkup}
          <p>${escapeHtml(offer.description)}</p>
          <p><strong>Required documents:</strong> ${escapeHtml(requiredDocuments.join(', ') || 'None specified')}</p>
          <div class="list-item-actions">
            <button type="button" class="edit-offer-btn" data-edit-offer="${escapeHtml(String(offer.id || ''))}">Edit Documents</button>
            <button type="button" class="delete-item-btn" data-delete-type="offer" data-id="${escapeHtml(String(offer.id || ''))}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

function formatOfferDate(offer) {
  const sourceDate = offer.date || offer.createdAt || new Date().toISOString();
  const parsed = new Date(sourceDate);

  if (Number.isNaN(parsed.getTime())) {
    return { day: '01', month: 'JAN', year: '2026' };
  }

  return {
    day: String(parsed.getDate()).padStart(2, '0'),
    month: parsed.toLocaleString('en-US', { month: 'short' }).toUpperCase(),
    year: String(parsed.getFullYear()),
  };
}

function renderHomeOfferCards(offers) {
  return offers
    .map((offer) => {
      const image = offer.image || '';
      const { day, month, year } = formatOfferDate(offer);
      const location = offer.location || 'Worldwide';
      const typeLabel = offer.type || 'Featured Event';
      const requiredDocuments = Array.isArray(offer.requiredDocuments) ? offer.requiredDocuments : [];
      const documentSummary = requiredDocuments.length
        ? `<p class="featured-offer-documents">Upload ${requiredDocuments.length} required ${requiredDocuments.length === 1 ? 'document' : 'documents'}: ${escapeHtml(requiredDocuments.join(', '))}</p>`
        : '<p class="featured-offer-documents">No documents are required for this opportunity.</p>';

      return `
        <article class="featured-offer-card" data-offer-id="${escapeHtml(String(offer.id || ''))}">
          <div class="featured-offer-date">
            <div class="featured-offer-day">${escapeHtml(day)}</div>
            <div class="featured-offer-month-year">${escapeHtml(month)} ${escapeHtml(year)}</div>
          </div>

          <div class="featured-offer-visual">
            ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(offer.title)}" class="featured-offer-image" />` : '<div class="featured-offer-image placeholder"></div>'}
          </div>

          <div class="featured-offer-content">
            <div class="featured-offer-badge">FEATURED</div>
            <h3>${escapeHtml(offer.title)}</h3>
            <p class="featured-offer-location">${escapeHtml(location)}</p>
            <p class="featured-offer-description">${escapeHtml(offer.description)}</p>
            <div class="featured-offer-meta">
              <span>${escapeHtml(typeLabel)}</span>
            </div>
            ${documentSummary}
            <button type="button" class="primary-btn opportunity-apply-btn" data-offer-id="${escapeHtml(String(offer.id || ''))}">Open Application &amp; Upload Documents</button>
          </div>
        </article>
      `;
    })
    .join('');
}

let availableOffers = [];

async function renderOfferApplications() {
  const applicationList = document.getElementById('offer-applications-list');
  if (!applicationList) return;

  const response = await fetch('/api/admin/offer-applications');
  const data = await response.json();
  if (!response.ok || !Array.isArray(data.applications)) {
    applicationList.innerHTML = `<div class="empty-state">${escapeHtml(data.message || 'Unable to load opportunity applications. Please log in again.')}</div>`;
    return;
  }

  const applications = data.applications;
  if (!applications.length) {
    applicationList.innerHTML = '<div class="empty-state">No opportunity applications received yet.</div>';
    return;
  }

  applicationList.innerHTML = applications.map((application) => {
    const documents = Array.isArray(application.documents) ? application.documents : [];
    return `
      <article class="list-item compact">
        <div class="list-item-header">
          <strong>${escapeHtml(application.name || 'Applicant')}</strong>
          <span>${escapeHtml(application.offerTitle || 'Opportunity')}</span>
        </div>
        <div class="application-fields">
          <div class="application-field"><span>Phone</span><strong>${escapeHtml(application.phone || 'Not provided')}</strong></div>
          <div class="application-field"><span>Email</span><strong>${escapeHtml(application.email || 'Not provided')}</strong></div>
          <div class="application-field full-width"><span>Message</span><strong>${escapeHtml(application.message || 'No message')}</strong></div>
          <div class="application-field full-width">
            <span>Uploaded documents</span>
            <strong>${documents.length ? documents.map((document, index) =>
              `<a href="/api/admin/offer-applications/${encodeURIComponent(application.id)}/documents/${index}">${escapeHtml(document.label)} — ${escapeHtml(document.originalName)}</a>`
            ).join('<br />') : 'None required'}</strong>
          </div>
        </div>
        <div class="list-item-actions">
          <button type="button" class="delete-item-btn" data-delete-type="offer-application" data-id="${escapeHtml(String(application.id || ''))}">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

const opportunityDialog = document.getElementById('opportunity-dialog');
const opportunityApplicationForm = document.getElementById('opportunity-application-form');
const opportunityApplicationStatus = document.getElementById('opportunity-application-status');

function openOpportunityApplication(offer) {
  if (!opportunityDialog || !opportunityApplicationForm || !offer) return;

  const requiredDocuments = Array.isArray(offer.requiredDocuments) ? offer.requiredDocuments : [];
  opportunityApplicationForm.reset();
  document.getElementById('opportunity-dialog-title').textContent = offer.title || 'Opportunity';
  document.getElementById('opportunity-dialog-description').textContent =
    `${offer.type || 'Opportunity'} · ${offer.location || 'Worldwide'}\n\n${offer.description || ''}`;
  opportunityApplicationForm.elements.offerId.value = String(offer.id);
  opportunityApplicationStatus.textContent = '';

  const documentContainer = document.getElementById('opportunity-required-documents');
  documentContainer.replaceChildren();
  const heading = document.createElement('h3');
  heading.textContent = requiredDocuments.length
    ? `Upload required documents (${requiredDocuments.length})`
    : 'Documents';
  documentContainer.append(heading);

  if (!requiredDocuments.length) {
    const message = document.createElement('p');
    message.textContent = 'No documents are specifically required. You can attach supporting documents below if relevant.';
    documentContainer.append(message);
  } else {
    const help = document.createElement('p');
    help.textContent = 'Upload each requested document. Accepted formats: PDF, Word, JPG, or PNG (8 MB max each).';
    documentContainer.append(help);

    const requiredDocumentGrid = document.createElement('div');
    requiredDocumentGrid.className = 'opportunity-required-document-grid';

    requiredDocuments.forEach((documentName, index) => {
      const field = document.createElement('div');
      field.className = 'form-field';
      const label = document.createElement('label');
      label.htmlFor = `opportunityDocument${index}`;
      label.textContent = documentName;
      const input = document.createElement('input');
      input.id = `opportunityDocument${index}`;
      input.name = `document_${index}`;
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
      input.required = true;
      field.append(label, input);
      requiredDocumentGrid.append(field);
    });
    documentContainer.append(requiredDocumentGrid);
  }

  const optionalField = document.createElement('div');
  optionalField.className = 'form-field opportunity-additional-documents';
  const optionalLabel = document.createElement('label');
  optionalLabel.htmlFor = 'opportunitySupportingDocuments';
  optionalLabel.textContent = 'Additional supporting documents (optional)';
  const optionalInput = document.createElement('input');
  optionalInput.id = 'opportunitySupportingDocuments';
  optionalInput.name = 'supportingDocuments';
  optionalInput.type = 'file';
  optionalInput.multiple = true;
  optionalInput.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png';
  const optionalHelp = document.createElement('small');
  optionalHelp.textContent = 'You can attach multiple PDF, Word, JPG, or PNG files (8 MB max each).';
  optionalField.append(optionalLabel, optionalInput, optionalHelp);
  documentContainer.append(optionalField);

  opportunityDialog.showModal();
}

document.addEventListener('click', (event) => {
  const applyButton = event.target.closest('.opportunity-apply-btn');
  const offerCard = applyButton ? null : event.target.closest('.featured-offer-card');
  if (!applyButton && (!offerCard || event.target.closest('a, button, input, select, textarea'))) return;
  const offerId = applyButton?.dataset.offerId || offerCard?.dataset.offerId;
  const offer = availableOffers.find((item) => String(item.id) === offerId);
  openOpportunityApplication(offer);
});

if (opportunityDialog) {
  opportunityDialog.querySelector('.opportunity-dialog-close').addEventListener('click', () => opportunityDialog.close());
  opportunityDialog.addEventListener('click', (event) => {
    if (event.target === opportunityDialog) opportunityDialog.close();
  });
}

if (opportunityApplicationForm) {
  opportunityApplicationForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    opportunityApplicationStatus.textContent = '';
    const offerId = opportunityApplicationForm.elements.offerId.value;

    try {
      const response = await fetch(`/api/offers/${encodeURIComponent(offerId)}/applications`, {
        method: 'POST',
        body: new FormData(opportunityApplicationForm),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to submit your application.');

      opportunityApplicationStatus.textContent = 'Thank you. Your application and documents have been submitted.';
      opportunityApplicationStatus.style.color = '#0a8659';
      opportunityApplicationForm.reset();
      window.setTimeout(() => opportunityDialog.close(), 1800);
    } catch (error) {
      opportunityApplicationStatus.textContent = error.message || 'There was a problem submitting your application.';
      opportunityApplicationStatus.style.color = '#c03333';
    }
  });
}

async function renderOffers() {
  const offerList = document.getElementById('offer-list');
  const homeOfferList = document.getElementById('home-offer-list');

  const response = await fetch('/api/offers');
  const data = await response.json();
  const offers = data.offers || [];
  availableOffers = offers;

  if (offerList) {
    offerList.innerHTML = offers.length
      ? renderAdminOfferCards(offers)
      : '<div class="empty-state">No offers published yet.</div>';
  }

  if (homeOfferList) {
    homeOfferList.innerHTML = offers.length
      ? renderHomeOfferCards(offers)
      : '<div class="empty-state">No opportunities available right now.</div>';
  }
}

async function renderApplications() {
  const applicationList = document.getElementById('application-list');

  if (!applicationList) {
    return;
  }

  const response = await fetch('/api/applications');
  const data = await response.json();
  const applications = data.applications || [];

  if (!applications.length) {
    applicationList.innerHTML = '<div class="empty-state">No applications received yet.</div>';
    return;
  }

  applicationList.innerHTML = applications
    .map((item, index) => {
      const fields = Object.entries(item).filter(
        ([key, value]) => !['id', 'createdAt'].includes(key) && value !== '' && value !== null && value !== undefined
      );

      return `
        <article class="list-item compact">
          <div class="list-item-header">
            <strong>${escapeHtml(item.firstName || item.name || 'Applicant')} ${escapeHtml(item.lastName || '')}</strong>
            <span>${escapeHtml(item.purpose || item.type || 'Application')}</span>
          </div>
          <div class="application-fields">
            ${fields
              .map(
                ([key, value]) => `
                  <div class="application-field">
                    <span>${escapeHtml(formatLabel(key))}</span>
                    <strong>${escapeHtml(String(value))}</strong>
                  </div>
                `
              )
              .join('')}
          </div>
          <div class="list-item-actions">
            <button type="button" class="delete-item-btn" data-delete-type="application" data-id="${escapeHtml(String(item.id || ''))}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

async function renderDocumentHelpRequests() {
  const documentHelpList = document.getElementById('document-help-list');

  if (!documentHelpList) {
    return;
  }

  const response = await fetch('/api/document-help');
  const data = await response.json();
  const requests = data.requests || [];

  if (!requests.length) {
    documentHelpList.innerHTML = '<div class="empty-state">No document assistance requests yet.</div>';
    return;
  }

  documentHelpList.innerHTML = requests
    .map((item) => {
      const documentTypes = Array.isArray(item.documentTypes) ? item.documentTypes : [];

      return `
        <article class="list-item compact">
          <div class="list-item-header">
            <strong>${escapeHtml(item.name || 'Applicant')}</strong>
            <span>Document Help</span>
          </div>
          <div class="application-fields">
            <div class="application-field">
              <span>Phone</span>
              <strong>${escapeHtml(item.phone || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Email</span>
              <strong>${escapeHtml(item.email || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Current Country</span>
              <strong>${escapeHtml(item.currentCountry || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Destination Country</span>
              <strong>${escapeHtml(item.destinationCountry || 'Not provided')}</strong>
            </div>
            <div class="application-field full-width">
              <span>Document Types</span>
              <strong>${escapeHtml(documentTypes.join(', ') || 'Not provided')}</strong>
            </div>
          </div>
          <div class="list-item-actions">
            <button type="button" class="delete-item-btn" data-delete-type="document-help" data-id="${escapeHtml(String(item.id || ''))}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

async function renderStudyAbroadRequests() {
  const studyAbroadList = document.getElementById('study-abroad-list');

  if (!studyAbroadList) {
    return;
  }

  const response = await fetch('/api/study-abroad');
  const data = await response.json();
  const requests = data.requests || [];

  if (!requests.length) {
    studyAbroadList.innerHTML = '<div class="empty-state">No study abroad requests yet.</div>';
    return;
  }

  studyAbroadList.innerHTML = requests
    .map((item) => {
      const countries = Array.isArray(item.countryChoice) ? item.countryChoice : [];

      return `
        <article class="list-item compact">
          <div class="list-item-header">
            <strong>${escapeHtml(item.name || 'Applicant')}</strong>
            <span>Study Abroad</span>
          </div>
          <div class="application-fields">
            <div class="application-field">
              <span>Phone</span>
              <strong>${escapeHtml(item.phone || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Email</span>
              <strong>${escapeHtml(item.email || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Qualification</span>
              <strong>${escapeHtml(item.qualification || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Program</span>
              <strong>${escapeHtml(item.program || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Degree Type</span>
              <strong>${escapeHtml(item.degreeType || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Program Type</span>
              <strong>${escapeHtml(item.programType || 'Not provided')}</strong>
            </div>
            <div class="application-field full-width">
              <span>Country Choices</span>
              <strong>${escapeHtml(countries.join(', ') || 'Not provided')}</strong>
            </div>
          </div>
          <div class="list-item-actions">
            <button type="button" class="delete-item-btn" data-delete-type="study-abroad" data-id="${escapeHtml(String(item.id || ''))}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

async function renderWorkAbroadRequests() {
  const workAbroadList = document.getElementById('work-abroad-list');

  if (!workAbroadList) {
    return;
  }

  const response = await fetch('/api/work-abroad');
  const data = await response.json();
  const requests = data.requests || [];

  if (!requests.length) {
    workAbroadList.innerHTML = '<div class="empty-state">No work abroad requests yet.</div>';
    return;
  }

  workAbroadList.innerHTML = requests
    .map((item) => {
      const countries = Array.isArray(item.countryChoice) ? item.countryChoice : [];

      return `
        <article class="list-item compact">
          <div class="list-item-header">
            <strong>${escapeHtml(item.name || 'Applicant')}</strong>
            <span>Work Abroad</span>
          </div>
          <div class="application-fields">
            <div class="application-field">
              <span>Phone</span>
              <strong>${escapeHtml(item.phone || 'Not provided')}</strong>
            </div>
            <div class="application-field">
              <span>Email</span>
              <strong>${escapeHtml(item.email || 'Not provided')}</strong>
            </div>
            <div class="application-field full-width">
              <span>Qualification</span>
              <strong>${escapeHtml(item.qualification || 'Not provided')}</strong>
            </div>
            <div class="application-field full-width">
              <span>Country Choices</span>
              <strong>${escapeHtml(countries.join(', ') || 'Not provided')}</strong>
            </div>
          </div>
          <div class="list-item-actions">
            <button type="button" class="delete-item-btn" data-delete-type="work-abroad" data-id="${escapeHtml(String(item.id || ''))}">Delete</button>
          </div>
        </article>
      `;
    })
    .join('');
}

async function renderFlightBookingRequests() {
  const flightBookingList = document.getElementById('flight-booking-list');

  if (!flightBookingList) {
    return;
  }

  const response = await fetch('/api/flight-booking');
  const data = await response.json();
  const requests = data.requests || [];

  if (!requests.length) {
    flightBookingList.innerHTML = '<div class="empty-state">No flight booking requests yet.</div>';
    return;
  }

  flightBookingList.innerHTML = requests
    .map((item) => `
      <article class="list-item compact">
        <div class="list-item-header">
          <strong>${escapeHtml(item.destinationCity || 'Flight Request')}</strong>
          <span>Flight Booking</span>
        </div>
        <div class="application-fields">
          <div class="application-field">
            <span>Current Country</span>
            <strong>${escapeHtml(item.currentCountry || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Current Airport</span>
            <strong>${escapeHtml(item.currentAirport || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Destination Country</span>
            <strong>${escapeHtml(item.destinationCountry || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Destination Airport</span>
            <strong>${escapeHtml(item.destinationAirport || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Destination City</span>
            <strong>${escapeHtml(item.destinationCity || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Departure Date</span>
            <strong>${escapeHtml(item.departureDate || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Return Date</span>
            <strong>${escapeHtml(item.returnDate || 'Not provided')}</strong>
          </div>
          <div class="application-field full-width">
            <span>Airline Choice</span>
            <strong>${escapeHtml(item.airline || 'No preference')}</strong>
          </div>
        </div>
        <div class="list-item-actions">
          <button type="button" class="delete-item-btn" data-delete-type="flight-booking" data-id="${escapeHtml(String(item.id || ''))}">Delete</button>
        </div>
      </article>
    `).join('');
}

async function renderHotelBookingRequests() {
  const hotelBookingList = document.getElementById('hotel-booking-list');

  if (!hotelBookingList) {
    return;
  }

  const response = await fetch('/api/hotel-booking');
  const data = await response.json();
  const requests = data.requests || [];

  if (!requests.length) {
    hotelBookingList.innerHTML = '<div class="empty-state">No hotel reservation requests yet.</div>';
    return;
  }

  hotelBookingList.innerHTML = requests
    .map((item) => `
      <article class="list-item compact">
        <div class="list-item-header">
          <strong>${escapeHtml(item.destinationCity || 'Hotel Reservation')}</strong>
          <span>Hotel Reservation</span>
        </div>
        <div class="application-fields">
          <div class="application-field">
            <span>Destination Country</span>
            <strong>${escapeHtml(item.destinationCountry || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Destination City</span>
            <strong>${escapeHtml(item.destinationCity || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Check-in Date</span>
            <strong>${escapeHtml(item.checkInDate || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Check-out Date</span>
            <strong>${escapeHtml(item.checkOutDate || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Adults</span>
            <strong>${escapeHtml(item.adults || 'Not provided')}</strong>
          </div>
          <div class="application-field">
            <span>Kids</span>
            <strong>${escapeHtml(item.kids || 'Not provided')}</strong>
          </div>
        </div>
        <div class="list-item-actions">
          <button type="button" class="delete-item-btn" data-delete-type="hotel-booking" data-id="${escapeHtml(String(item.id || ''))}">Delete</button>
        </div>
      </article>
    `).join('');
}

const viewSubmittedApplicationsBtn = document.getElementById('view-submitted-applications');
const viewDocumentHelpRequestsBtn = document.getElementById('view-document-help-requests');
const viewStudyAbroadRequestsBtn = document.getElementById('view-study-abroad-requests');
const viewWorkAbroadRequestsBtn = document.getElementById('view-work-abroad-requests');
const viewFlightBookingRequestsBtn = document.getElementById('view-flight-booking-requests');
const viewHotelBookingRequestsBtn = document.getElementById('view-hotel-booking-requests');
const viewOfferApplicationsBtn = document.getElementById('view-offer-applications');
const applicationsPanel = document.getElementById('applications-panel');
const documentHelpPanel = document.getElementById('document-help-panel');
const studyAbroadPanel = document.getElementById('study-abroad-panel');
const workAbroadPanel = document.getElementById('work-abroad-panel');
const flightBookingPanel = document.getElementById('flight-booking-panel');
const hotelBookingPanel = document.getElementById('hotel-booking-panel');
const offerApplicationsPanel = document.getElementById('offer-applications-panel');
const adminLogoutBtn = document.getElementById('admin-logout');
const adminRequestsModal = document.getElementById('admin-requests-modal');
const adminRequestsDialog = adminRequestsModal?.querySelector('.admin-requests-dialog');
const adminRequestsTitle = document.getElementById('admin-requests-title');
const requestPanels = [
  applicationsPanel,
  documentHelpPanel,
  studyAbroadPanel,
  workAbroadPanel,
  flightBookingPanel,
  hotelBookingPanel,
  offerApplicationsPanel,
].filter(Boolean);
let adminRequestsTrigger = null;

function closeAdminRequestsModal() {
  if (!adminRequestsModal) return;
  adminRequestsModal.classList.add('hidden');
  adminRequestsModal.setAttribute('aria-hidden', 'true');
  requestPanels.forEach((panel) => panel.classList.add('hidden'));
  document.body.classList.remove('admin-requests-open');
  adminRequestsTrigger?.focus();
  adminRequestsTrigger = null;
}

async function openAdminRequestsModal(panel, title, render, trigger) {
  if (!adminRequestsModal || !panel || !adminRequestsDialog) return;
  requestPanels.forEach((requestPanel) => requestPanel.classList.add('hidden'));
  panel.classList.remove('hidden');
  adminRequestsTitle.textContent = title;
  adminRequestsTrigger = trigger;
  adminRequestsModal.classList.remove('hidden');
  adminRequestsModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('admin-requests-open');
  adminRequestsDialog.focus();
  await render();
}

const requestViews = [
  [viewSubmittedApplicationsBtn, applicationsPanel, 'Travel Applications', renderApplications],
  [viewDocumentHelpRequestsBtn, documentHelpPanel, 'Document Assistance Requests', renderDocumentHelpRequests],
  [viewStudyAbroadRequestsBtn, studyAbroadPanel, 'Study Abroad Requests', renderStudyAbroadRequests],
  [viewWorkAbroadRequestsBtn, workAbroadPanel, 'Work Abroad Requests', renderWorkAbroadRequests],
  [viewFlightBookingRequestsBtn, flightBookingPanel, 'Flight Booking Requests', renderFlightBookingRequests],
  [viewHotelBookingRequestsBtn, hotelBookingPanel, 'Hotel Reservation Requests', renderHotelBookingRequests],
  [viewOfferApplicationsBtn, offerApplicationsPanel, 'Job & Opportunity Applications', renderOfferApplications],
];

requestViews.forEach(([button, panel, title, render]) => {
  button?.addEventListener('click', () => openAdminRequestsModal(panel, title, render, button));
});

adminRequestsModal?.addEventListener('click', (event) => {
  if (event.target.closest('[data-close-admin-requests="true"]')) {
    closeAdminRequestsModal();
  }
});

adminRequestsModal?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeAdminRequestsModal();
    return;
  }
  if (event.key !== 'Tab' || !adminRequestsDialog) return;

  const focusableElements = Array.from(adminRequestsDialog.querySelectorAll(
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.offsetParent !== null);
  if (!focusableElements.length) {
    event.preventDefault();
    adminRequestsDialog.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
});

function ensureDeleteModal() {
  let modal = document.getElementById('delete-confirm-modal');

  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'delete-confirm-modal';
    modal.className = 'delete-modal hidden';
    modal.innerHTML = `
      <div class="delete-modal-backdrop" data-close-delete-modal="true"></div>
      <div class="delete-modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
        <h3 id="delete-modal-title">Delete record?</h3>
        <p id="delete-modal-message">This action cannot be undone.</p>
        <div class="delete-modal-actions">
          <button type="button" class="secondary-btn delete-modal-cancel">Cancel</button>
          <button type="button" class="primary-btn delete-modal-confirm">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
      const closeTarget = event.target.closest('[data-close-delete-modal="true"]');
      if (closeTarget) {
        hideDeleteModal();
      }
    });

    const cancelBtn = modal.querySelector('.delete-modal-cancel');
    const confirmBtn = modal.querySelector('.delete-modal-confirm');

    cancelBtn.addEventListener('click', hideDeleteModal);
    confirmBtn.addEventListener('click', async () => {
      const message = modal.dataset.pendingMessage || 'Delete this record?';
      const type = modal.dataset.pendingType;
      const id = modal.dataset.pendingId;
      hideDeleteModal();
      await deleteRecord(type, id, message);
    });
  }

  return modal;
}

function showDeleteModal(type, id, message = 'Are you sure you want to delete this record?') {
  const modal = ensureDeleteModal();
  modal.dataset.pendingType = type;
  modal.dataset.pendingId = id;
  modal.dataset.pendingMessage = message;
  modal.querySelector('#delete-modal-message').textContent = message;
  modal.classList.remove('hidden');
}

function hideDeleteModal() {
  const modal = document.getElementById('delete-confirm-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

async function deleteRecord(type, id, message = 'Are you sure you want to delete this record?') {
  if (!id) {
    return;
  }

  const endpointMap = {
    application: '/api/applications',
    'document-help': '/api/document-help',
    'study-abroad': '/api/study-abroad',
    'work-abroad': '/api/work-abroad',
    'flight-booking': '/api/flight-booking',
    'hotel-booking': '/api/hotel-booking',
    'offer-application': '/api/admin/offer-applications',
    offer: '/api/offers',
  };

  const endpoint = endpointMap[type];
  if (!endpoint) {
    return;
  }

  const response = await fetch(`${endpoint}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  const result = await response.json().catch(() => ({}));

  if (!response.ok || !result.success) {
    showToast(result.message || 'Unable to delete item.', 'error');
    return;
  }

  showToast(result.message || 'Item deleted successfully.');

  if (type === 'application') {
    await renderApplications();
  } else if (type === 'document-help') {
    await renderDocumentHelpRequests();
  } else if (type === 'study-abroad') {
    await renderStudyAbroadRequests();
  } else if (type === 'work-abroad') {
    await renderWorkAbroadRequests();
  } else if (type === 'flight-booking') {
    await renderFlightBookingRequests();
  } else if (type === 'hotel-booking') {
    await renderHotelBookingRequests();
  } else if (type === 'offer') {
    await renderOffers();
  } else if (type === 'offer-application') {
    await renderOfferApplications();
  }
}

document.addEventListener('click', async (event) => {
  const editOfferButton = event.target.closest('[data-edit-offer]');
  if (editOfferButton) {
    const offerId = editOfferButton.dataset.editOffer;
    const offer = availableOffers.find((item) => String(item.id) === offerId);
    if (!offer || !jobOfferForm) return;

    editingOfferId = offerId;
    document.getElementById('offerTitle').value = offer.title || '';
    document.getElementById('offerLocation').value = offer.location || '';
    document.getElementById('offerType').value = offer.type || '';
    document.getElementById('offerDescription').value = offer.description || '';
    document.getElementById('offerOtherDocuments').value = '';

    const requiredDocuments = Array.isArray(offer.requiredDocuments) ? offer.requiredDocuments : [];
    const knownDocumentValues = new Set(Array.from(jobOfferForm.querySelectorAll('input[name="offerDocument"]')).map((input) => input.value));
    jobOfferForm.querySelectorAll('input[name="offerDocument"]').forEach((input) => {
      input.checked = requiredDocuments.includes(input.value);
    });
    document.getElementById('offerOtherDocuments').value = requiredDocuments
      .filter((documentName) => !knownDocumentValues.has(documentName))
      .join('\n');
    collectOfferRequiredDocuments();
    const publishButton = jobOfferForm.querySelector('button[type="submit"]');
    if (publishButton) publishButton.textContent = 'Update Offer';
    jobOfferForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const deleteButton = event.target.closest('.delete-item-btn');
  if (!deleteButton) {
    return;
  }

  const type = deleteButton.dataset.deleteType;
  const id = deleteButton.dataset.id;
  if (!type || !id) {
    return;
  }

  showDeleteModal(type, id, 'This record will be permanently removed. Continue?');
});

if (documentHelpPanel) {
  documentHelpPanel.classList.add('hidden');
}

if (studyAbroadPanel) {
  studyAbroadPanel.classList.add('hidden');
}

if (workAbroadPanel) {
  workAbroadPanel.classList.add('hidden');
}

if (flightBookingPanel) {
  flightBookingPanel.classList.add('hidden');
}

if (hotelBookingPanel) {
  hotelBookingPanel.classList.add('hidden');
}
if (offerApplicationsPanel) {
  offerApplicationsPanel.classList.add('hidden');
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    closeAdminRequestsModal();
    applyAdminState(false);
    if (adminLoginStatus) {
      adminLoginStatus.textContent = 'Logged out successfully.';
      adminLoginStatus.style.color = '#0a8659';
    }
    if (document.getElementById('adminPassword')) {
      document.getElementById('adminPassword').value = '';
    }
  });
}

if (isAdminPage && localStorage.getItem(ADMIN_SESSION_KEY) === 'true') {
  applyAdminState(true);
  renderOffers();
  renderApplications();
  renderDocumentHelpRequests();
  renderStudyAbroadRequests();
  renderWorkAbroadRequests();
  renderFlightBookingRequests();
  renderOfferApplications();
} else {
  renderOffers();
}

if (document.getElementById('offer-list') || document.getElementById('application-list') || document.getElementById('document-help-list') || document.getElementById('study-abroad-list') || document.getElementById('work-abroad-list') || document.getElementById('flight-booking-list') || document.getElementById('hotel-booking-list') || document.getElementById('offer-applications-list')) {
  renderOffers();
}
