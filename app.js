 // ================= STATE & CONSTANTS =================
const state = {
  currentStep: 0,
  answers: {
    commuteMethod: '', // Car, Public Transit, Bike, Walk, WFH
    carType: '',       // Petrol, Diesel, Hybrid, Electric
    carKmWeekly: 0,
    flightsYearly: '', // 0, 1-3, 4-10, 10+
    energySource: '',  // Grid, Solar, Wind, Mix
    electricityBill: 0,
    diet: '',          // Meat daily, Meat sometimes, Pescatarian, Vegetarian, Vegan
    shopping: '',      // Weekly, Monthly, Rarely
    country: 'United States'
  },
  emissions: {
    transport: 0,
    energy: 0,
    diet: 0,
    shopping: 0,
    total: 0
  },
  aiSettings: {
    directMode: false,
    apiKey: ''
  },
  recommendations: [],
  motivation: '',
  checkedActions: {},
  streak: 1,
  charts: {
    donut: null,
    line: null
  }
};

// Average monthly footprint per country (in kg CO2)
const COUNTRY_AVERAGES = {
  'United States': 1300,
  'Canada': 1200,
  'Germany': 750,
  'United Kingdom': 500,
  'Australia': 1300,
  'India': 150,
  'Global Average': 400
};

// hardcoded emissions constants
const EMISSION_FACTORS = {
  car: {
    Petrol: 0.21,
    Diesel: 0.17,
    Hybrid: 0.10,
    Electric: 0.05
  },
  transit: 0.03, // assume 50 km/week if selected
  flights: {
    '0': 0,
    '1–3': 50,
    '4–10': 150,
    '10+': 300
  },
  electricity: 0.8, // bill USD * 0.8
  diet: {
    'Meat every day': 150,
    'Meat sometimes': 100,
    'Pescatarian': 70,
    'Vegetarian': 50,
    'Vegan': 30
  },
  shopping: {
    'Weekly': 40,
    'Monthly': 15,
    'Rarely': 5
  }
};

// Lucide icon mapping for UI cards
const ICON_MAP = {
  transport: 'car',
  energy: 'zap',
  diet: 'leaf',
  shopping: 'shopping-bag'
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  lucide.createIcons();

  // Load Saved AI Settings
  const savedSettings = localStorage.getItem('ecotrace_ai_settings');
  if (savedSettings) {
    try {
      const parsed = JSON.parse(savedSettings);
      state.aiSettings.directMode = !!parsed.directMode;
      state.aiSettings.apiKey = parsed.apiKey || '';
      
      // Sync to Modal UI
      document.getElementById('api-toggle').checked = state.aiSettings.directMode;
      document.getElementById('api-key-input').value = state.aiSettings.apiKey;
      toggleKeyInputState(state.aiSettings.directMode);
    } catch (e) {
      console.error('Error loading settings', e);
    }
  }

  // Bind Event Listeners
  setupEventListeners();

  // Load First Question
  renderQuestion();
});

// ================= EVENT LISTENERS =================
function setupEventListeners() {
  // Hero CTA to scroll down
  const ctaBtn = document.getElementById('cta-start');
  const scrollChevron = document.getElementById('scroll-chevron');
  const appSection = document.getElementById('app');

  const scrollToApp = () => {
    appSection.scrollIntoView({ behavior: 'smooth' });
  };

  if (ctaBtn) ctaBtn.addEventListener('click', scrollToApp);
  if (scrollChevron) scrollChevron.addEventListener('click', scrollToApp);

  // Parallax Scroll Effect on Hero Video
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    const videoContainer = document.getElementById('hero-video-container');
    
    if (scrollY <= heroHeight && videoContainer) {
      // Parallax translation
      videoContainer.style.transform = `translateY(${scrollY * 0.3}px)`;
      // Fade out
      const opacity = Math.max(0, 1 - (scrollY / (heroHeight * 0.8)));
      videoContainer.style.opacity = opacity;
    }
  });

  // Quiz Navigation Buttons
  document.getElementById('quiz-prev').addEventListener('click', handleQuizBack);
  document.getElementById('quiz-next').addEventListener('click', handleQuizNext);

  // Settings Modal Toggle
  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('settings-toggle').addEventListener('click', () => {
    settingsModal.classList.remove('pointer-events-none', 'opacity-0');
  });
  document.getElementById('settings-close').addEventListener('click', () => {
    settingsModal.classList.add('pointer-events-none', 'opacity-0');
  });

  // Settings Save API Key
  document.getElementById('settings-save-btn').addEventListener('click', saveAiSettings);

  // Toggle key input depending on switch state
  document.getElementById('api-toggle').addEventListener('change', (e) => {
    toggleKeyInputState(e.target.checked);
  });

  // AI Refresh button
  document.getElementById('trigger-ai-refresh').addEventListener('click', () => {
    generateAiInsights(true);
  });

  // Share Progress button
  document.getElementById('share-progress-btn').addEventListener('click', shareProgress);

  // Mock Streak Increment
  document.getElementById('streak-container').addEventListener('click', () => {
    state.streak += 1;
    document.getElementById('streak-counter').textContent = `${state.streak} week streak`;
    showToast(`🔥 Streak incremented! Keep it up!`);
  });
  
  // Menu Button Mock
  document.getElementById('menu-btn').addEventListener('click', () => {
    showToast("🧭 Menu panel mock triggered.");
  });
}

// ================= QUIZ LOGIC =================
const QUESTIONS = [
  {
    id: 'commuteMethod',
    category: 'transport',
    title: 'How do you usually commute?',
    subtitle: 'Daily transit choices make up a major portion of individual output.',
    type: 'choice',
    options: ['Car', 'Public Transit', 'Bike', 'Walk', 'WFH']
  },
  {
    id: 'carDetails',
    category: 'transport',
    title: 'Customize your driving profile',
    subtitle: 'Provide your car fuel type and average weekly travel distance.',
    type: 'conditional_car'
  },
  {
    id: 'flightsYearly',
    category: 'transport',
    title: 'How many flights do you take per year?',
    subtitle: 'Air travel emits concentrated greenhouse gases directly into the upper atmosphere.',
    type: 'choice',
    options: ['0', '1–3', '4–10', '10+']
  },
  {
    id: 'energy',
    category: 'energy',
    title: 'What powers your home?',
    subtitle: 'Choose your primary energy source and monthly utility spend.',
    type: 'energy_slider'
  },
  {
    id: 'diet',
    category: 'diet',
    title: 'What is your typical diet?',
    subtitle: 'Food production, especially livestock, is a heavy contributor to emissions.',
    type: 'choice',
    options: ['Meat every day', 'Meat sometimes', 'Pescatarian', 'Vegetarian', 'Vegan']
  },
  {
    id: 'shopping',
    category: 'shopping',
    title: 'How often do you buy new clothing?',
    subtitle: 'Fast fashion creates massive water usage and manufacturing carbon.',
    type: 'choice',
    options: ['Weekly', 'Monthly', 'Rarely']
  },
  {
    id: 'country',
    category: 'general',
    title: 'Select your country of residence',
    subtitle: 'We use this to compare your footprint against regional national averages.',
    type: 'country_dropdown'
  }
];

function renderQuestion() {
  const container = document.getElementById('quiz-question-container');
  const question = QUESTIONS[state.currentStep];
  
  // Update step indicators
  document.getElementById('quiz-step-indicator').textContent = `Question ${state.currentStep + 1} of ${QUESTIONS.length}`;
  const progressPercent = ((state.currentStep + 1) / QUESTIONS.length) * 100;
  document.getElementById('quiz-progress').style.width = `${progressPercent}%`;
  
  // Disable / Enable back button
  document.getElementById('quiz-prev').disabled = (state.currentStep === 0);

  // Setup Exit transition
  const oldContent = container.firstElementChild;
  if (oldContent) {
    oldContent.classList.add('quiz-card-exit');
    setTimeout(() => oldContent.remove(), 400);
  }

  // Create new question node
  const questionNode = document.createElement('div');
  questionNode.className = 'quiz-card quiz-card-enter flex flex-col gap-6 w-full';

  // Render question text
  let html = `
    <div class="flex flex-col gap-2">
      <span class="text-xs uppercase tracking-widest text-mint/60 font-semibold">${question.category}</span>
      <h3 class="text-2xl font-medium tracking-tight">${question.title}</h3>
      <p class="text-xs text-white/50 leading-relaxed font-light">${question.subtitle}</p>
    </div>
  `;

  // Render inputs based on type
  if (question.type === 'choice') {
    html += `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-2">`;
    question.options.forEach(option => {
      const isSelected = state.answers[question.id] === option;
      html += `
        <button onclick="selectChoice('${question.id}', '${option}')" 
          class="liquid-glass py-4 px-6 rounded-2xl text-sm font-medium hover:bg-white/5 text-center transition-all interactive-hover ${isSelected ? 'bg-white/10 text-mint shadow-inner ring-1 ring-mint/20' : 'text-white/80'}">
          ${option}
        </button>
      `;
    });
    html += `</div>`;
  } 
  else if (question.type === 'conditional_car') {
    const selectedFuel = state.answers.carType || 'Petrol';
    const selectedDistance = state.answers.carKmWeekly || 100;
    
    html += `
      <div class="space-y-6 mt-2">
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-white/60">Engine / Fuel Type</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            ${['Petrol', 'Diesel', 'Hybrid', 'Electric'].map(fuel => {
              const active = selectedFuel === fuel;
              return `
                <button onclick="selectCarFuel('${fuel}')" 
                  class="liquid-glass py-3 rounded-xl text-xs font-medium hover:bg-white/5 transition-all interactive-hover ${active ? 'bg-white/10 text-mint ring-1 ring-mint/20' : 'text-white/70'}">
                  ${fuel}
                </button>
              `;
            }).join('')}
          </div>
        </div>
        <div class="space-y-2 pt-2">
          <div class="flex justify-between items-center">
            <label class="text-xs font-semibold text-white/60">Weekly Commute Distance</label>
            <span class="text-sm font-bold text-mint">${selectedDistance} km / week</span>
          </div>
          <input type="range" min="0" max="500" step="10" value="${selectedDistance}" 
            oninput="selectCarDistance(this.value)" class="w-full h-1.5 rounded-lg appearance-none cursor-pointer">
          <div class="flex justify-between text-[10px] text-white/30 px-1">
            <span>0 km</span>
            <span>250 km</span>
            <span>500+ km</span>
          </div>
        </div>
      </div>
    `;
  }
  else if (question.type === 'energy_slider') {
    const selectedSource = state.answers.energySource || 'Grid';
    const selectedBill = state.answers.electricityBill || 100;

    html += `
      <div class="space-y-6 mt-2">
        <div class="space-y-2">
          <label class="block text-xs font-semibold text-white/60">Primary Energy Source</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            ${['Grid', 'Solar', 'Wind', 'Mix'].map(source => {
              const active = selectedSource === source;
              return `
                <button onclick="selectEnergySource('${source}')" 
                  class="liquid-glass py-3 rounded-xl text-xs font-medium hover:bg-white/5 transition-all interactive-hover ${active ? 'bg-white/10 text-mint ring-1 ring-mint/20' : 'text-white/70'}">
                  ${source}
                </button>
              `;
            }).join('')}
          </div>
        </div>
        <div class="space-y-2 pt-2">
          <div class="flex justify-between items-center">
            <label class="text-xs font-semibold text-white/60">Monthly Electricity spend</label>
            <span class="text-sm font-bold text-mint">$${selectedBill} / month</span>
          </div>
          <input type="range" min="0" max="500" step="10" value="${selectedBill}" 
            oninput="selectEnergyBill(this.value)" class="w-full h-1.5 rounded-lg appearance-none cursor-pointer">
          <div class="flex justify-between text-[10px] text-white/30 px-1">
            <span>$0</span>
            <span>$250</span>
            <span>$500</span>
          </div>
        </div>
      </div>
    `;
  }
  else if (question.type === 'country_dropdown') {
    const selectedCountry = state.answers.country || 'United States';
    html += `
      <div class="space-y-2 mt-4 max-w-md">
        <label class="block text-xs font-semibold text-white/60">Select Country</label>
        <div class="relative">
          <select onchange="selectCountry(this.value)" 
            class="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-sm outline-none text-white focus:border-mint transition-colors appearance-none cursor-pointer">
            ${Object.keys(COUNTRY_AVERAGES).filter(c => c !== 'Global Average').map(c => `
              <option value="${c}" ${selectedCountry === c ? 'selected' : ''} class="bg-forest text-white">${c}</option>
            `).join('')}
          </select>
          <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-white/50">
            <i data-lucide="chevron-down" class="w-4 h-4"></i>
          </div>
        </div>
      </div>
    `;
  }

  questionNode.innerHTML = html;
  container.appendChild(questionNode);
  
  // Trigger entry animation
  setTimeout(() => {
    questionNode.classList.remove('quiz-card-enter');
    // Initialize icons in newly rendered questions
    lucide.createIcons();
  }, 50);

  // Validate next button status
  validateNextButton();
}

function validateNextButton() {
  const question = QUESTIONS[state.currentStep];
  const nextBtn = document.getElementById('quiz-next');
  let valid = false;

  if (question.type === 'choice') {
    valid = !!state.answers[question.id];
  } else if (question.type === 'conditional_car') {
    valid = !!state.answers.carType;
  } else if (question.type === 'energy_slider') {
    valid = !!state.answers.energySource;
  } else if (question.type === 'country_dropdown') {
    valid = !!state.answers.country;
  }

  nextBtn.disabled = !valid;
}

// Selection triggers bound to window for dynamic onclicks
window.selectChoice = function(key, val) {
  state.answers[key] = val;
  renderQuestion();
};

window.selectCarFuel = function(fuel) {
  state.answers.carType = fuel;
  if (state.answers.carKmWeekly === 0) {
    state.answers.carKmWeekly = 100; // default value
  }
  renderQuestion();
};

window.selectCarDistance = function(val) {
  state.answers.carKmWeekly = parseInt(val);
  const display = document.querySelector('.text-sm.font-bold.text-mint');
  if (display) display.textContent = `${val} km / week`;
};

window.selectEnergySource = function(source) {
  state.answers.energySource = source;
  if (state.answers.electricityBill === 0) {
    state.answers.electricityBill = 100; // default value
  }
  renderQuestion();
};

window.selectEnergyBill = function(val) {
  state.answers.electricityBill = parseInt(val);
  const display = document.querySelector('.text-sm.font-bold.text-mint');
  if (display) display.textContent = `$${val} / month`;
};

window.selectCountry = function(val) {
  state.answers.country = val;
  validateNextButton();
};

function handleQuizNext() {
  const question = QUESTIONS[state.currentStep];
  
  // Skip logic: If commuteMethod is NOT Car, skip the carDetails question
  if (state.currentStep === 0 && state.answers.commuteMethod !== 'Car') {
    state.currentStep = 2; // Jump to Flights question
  } else {
    state.currentStep++;
  }

  if (state.currentStep < QUESTIONS.length) {
    renderQuestion();
  } else {
    // End of quiz, transition to results
    finishQuiz();
  }
}

function handleQuizBack() {
  // Back Skip logic: If commuteMethod was not Car and we are going back from Flights, jump back to commuteMethod
  if (state.currentStep === 2 && state.answers.commuteMethod !== 'Car') {
    state.currentStep = 0;
  } else {
    state.currentStep--;
  }
  renderQuestion();
}

// ================= EMISSION CALCULATIONS =================
function calculateFootprint() {
  let transport = 0;
  let energy = 0;
  let diet = 0;
  let shopping = 0;

  // 1. Transport Emissions
  const method = state.answers.commuteMethod;
  if (method === 'Car') {
    const fuel = state.answers.carType || 'Petrol';
    const km = state.answers.carKmWeekly || 0;
    const factor = EMISSION_FACTORS.car[fuel] || 0.21;
    transport = km * factor * 4.33; // Monthly
  } else if (method === 'Public Transit') {
    transport = 50 * EMISSION_FACTORS.transit * 4.33; // ~6.5 kg CO2/month
  } else {
    transport = 0;
  }

  // Add Flight Emissions
  const flightsChoice = state.answers.flightsYearly || '0';
  transport += EMISSION_FACTORS.flights[flightsChoice] || 0;

  // 2. Energy Emissions
  const bill = state.answers.electricityBill || 0;
  energy = bill * EMISSION_FACTORS.electricity; // bill USD * 0.8
  
  // Adjust base on source
  const source = state.answers.energySource;
  if (source === 'Solar') energy *= 0.1; // 90% savings
  else if (source === 'Wind') energy *= 0.05; // 95% savings
  else if (source === 'Mix') energy *= 0.5; // 50% savings

  // 3. Diet Emissions
  const dietChoice = state.answers.diet || 'Meat sometimes';
  diet = EMISSION_FACTORS.diet[dietChoice] || 100;

  // 4. Shopping Emissions
  const shopChoice = state.answers.shopping || 'Monthly';
  shopping = EMISSION_FACTORS.shopping[shopChoice] || 15;

  // Store in State
  state.emissions.transport = Math.round(transport);
  state.emissions.energy = Math.round(energy);
  state.emissions.diet = Math.round(diet);
  state.emissions.shopping = Math.round(shopping);
  state.emissions.total = state.emissions.transport + state.emissions.energy + state.emissions.diet + state.emissions.shopping;
}

// ================= FINISH QUIZ / SHOW RESULTS =================
function finishQuiz() {
  // Hide Quiz section, reveal results dashboard, insights panel, and tracker
  document.getElementById('quiz-section').classList.add('hidden');
  
  // Calculate and refresh calculations
  calculateFootprint();

  // Show app cards
  document.getElementById('results-section').classList.remove('hidden');
  document.getElementById('insights-section').classList.remove('hidden');
  document.getElementById('tracker-section').classList.remove('hidden');

  // Trigger Scroll to Results
  setTimeout(() => {
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
    
    // Animate emissions count-up number
    animateCountUp(state.emissions.total);
    
    // Update comparison context
    updateComparisonUI();
    
    // Render Donut Chart
    renderDonutChart();

    // Fetch AI insights
    generateAiInsights(false);
  }, 100);
}

function animateCountUp(targetVal) {
  const display = document.getElementById('results-co2-value');
  let currentVal = 0;
  const duration = 1500; // 1.5s
  const stepTime = 15;
  const steps = duration / stepTime;
  const increment = targetVal / steps;

  const timer = setInterval(() => {
    currentVal += increment;
    if (currentVal >= targetVal) {
      display.textContent = Math.round(targetVal);
      clearInterval(timer);
    } else {
      display.textContent = Math.round(currentVal);
    }
  }, stepTime);
}

function updateComparisonUI() {
  const country = state.answers.country;
  const avg = COUNTRY_AVERAGES[country] || COUNTRY_AVERAGES['Global Average'];
  const userFootprint = state.emissions.total;
  
  const diffPercent = Math.round(((Math.abs(userFootprint - avg)) / avg) * 100);
  const statusBadge = document.getElementById('results-status-badge');

  let text = '';
  if (userFootprint > avg) {
    text = `You emit <span class="font-bold text-red-400">${diffPercent}% more</span> than the average person in <strong>${country}</strong> (${avg} kg CO₂ / mo).`;
    statusBadge.textContent = 'High potential for reduction';
    statusBadge.className = 'text-xs text-red-400 flex items-center gap-2 mt-1';
  } else {
    text = `You emit <span class="font-bold text-mint">${diffPercent}% less</span> than the average person in <strong>${country}</strong> (${avg} kg CO₂ / mo).`;
    statusBadge.textContent = 'Eco-friendly baseline achieved';
    statusBadge.className = 'text-xs text-mint flex items-center gap-2 mt-1';
  }

  document.getElementById('results-comparison-text').innerHTML = text;
}

// ================= CHARTS INTEGRATION =================
function renderDonutChart() {
  const ctx = document.getElementById('emissionDonutChart').getContext('2d');
  
  if (state.charts.donut) {
    state.charts.donut.destroy();
  }

  state.charts.donut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Transport', 'Energy', 'Diet', 'Shopping'],
      datasets: [{
        data: [
          state.emissions.transport,
          state.emissions.energy,
          state.emissions.diet,
          state.emissions.shopping
        ],
        backgroundColor: [
          '#f87171', // Red-400 (Transport)
          '#fbbf24', // Amber-400 (Energy)
          '#34d399', // Emerald-400 (Diet)
          '#22d3ee'  // Cyan-400 (Shopping)
        ],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // We use our own custom HTML legend
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw;
              const percent = Math.round((val / state.emissions.total) * 100);
              return ` ${context.label}: ${val} kg CO₂ (${percent}%)`;
            }
          },
          backgroundColor: 'rgba(13, 43, 31, 0.95)',
          titleFont: { family: 'Poppins', size: 12 },
          bodyFont: { family: 'Poppins', size: 12 },
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      },
      cutout: '72%'
    }
  });
}

function renderLineChart(checkedSavings = 0) {
  const ctx = document.getElementById('projectionLineChart').getContext('2d');
  
  if (state.charts.line) {
    state.charts.line.destroy();
  }

  // Projections over 4 weeks
  const base = state.emissions.total;
  const finalSavings = checkedSavings;
  
  // Calculate simulated reduction values
  const week1 = base;
  const week2 = Math.max(0, Math.round(base - (finalSavings * 0.3)));
  const week3 = Math.max(0, Math.round(base - (finalSavings * 0.7)));
  const week4 = Math.max(0, Math.round(base - finalSavings));

  // Determine Country Average line
  const avg = COUNTRY_AVERAGES[state.answers.country] || 400;
  const avgDataset = Array(4).fill(avg);

  state.charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Your Projected Path',
          data: [week1, week2, week3, week4],
          borderColor: '#A8F0C6', // Mint
          backgroundColor: 'rgba(168, 240, 198, 0.05)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#A8F0C6',
          pointBorderColor: 'rgba(255,255,255,0.2)',
          pointHoverRadius: 6
        },
        {
          label: 'Country Average',
          data: avgDataset,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderDash: [5, 5],
          fill: false,
          tension: 0,
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(13, 43, 31, 0.95)',
          titleFont: { family: 'Poppins', size: 12 },
          bodyFont: { family: 'Poppins', size: 12 },
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.04)'
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.4)',
            font: { family: 'Poppins', size: 10 }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(255, 255, 255, 0.4)',
            font: { family: 'Poppins', size: 10 }
          }
        }
      }
    }
  });
}

// ================= AI INSIGHTS & Fallback LOCAL ADVISOR =================
async function generateAiInsights(forceRefresh = false) {
  const container = document.getElementById('ai-cards-container');
  const loading = document.getElementById('ai-loading');
  const motivationCard = document.getElementById('ai-motivation-card');

  // Skip loading if recommendations already exist and we aren't forcing
  if (state.recommendations.length > 0 && !forceRefresh) {
    renderRecommendations();
    return;
  }

  // Reveal shimmer skeletons
  container.innerHTML = '';
  loading.classList.remove('hidden');
  motivationCard.classList.add('hidden');

  let result;
  
  if (state.aiSettings.directMode && state.aiSettings.apiKey) {
    try {
      result = await fetchClaudeAPI();
    } catch (e) {
      console.error('Anthropic API connection failed. Falling back to Local Advisor...', e);
      showToast('⚠️ Claude API Connection failed. Running Local Advisor.');
      result = getSmartLocalRecommendations();
    }
  } else {
    // Simulated loader delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 1500));
    result = getSmartLocalRecommendations();
  }

  // Update State
  state.recommendations = result.recommendations || [];
  state.motivation = result.motivation || '';
  
  // Initialize checklist items in state if not done
  state.recommendations.forEach((rec, idx) => {
    if (state.checkedActions[idx] === undefined) {
      state.checkedActions[idx] = false;
    }
  });

  // Hide loading shimmer
  loading.classList.add('hidden');

  // Render cards and checklist
  renderRecommendations();
  renderChecklist();
}

// Actual Fetch client to Anthropic
async function fetchClaudeAPI() {
  const systemPrompt = `You are a friendly, world-class carbon footprint advisor.
The user has shared their lifestyle data. Your job:
1. Give 4 personalized action recommendations ranked by CO2 impact (highest first)
2. Each action: title, 1-sentence description, estimated monthly CO2 savings in kg, difficulty (Easy/Medium/Hard)
3. Be warm, specific, non-judgmental. Reference their actual inputs.
   (e.g. "Since you drive a petrol car 200km/week...")
4. End with one motivational sentence.
Respond ONLY in this JSON:
{
  "recommendations": [
    { "title": "", "description": "", "saving_kg": 0, "difficulty": "" }
  ],
  "motivation": ""
}`;

  const userPayload = `
    User footprint data:
    - Commute: ${state.answers.commuteMethod} ${state.answers.commuteMethod === 'Car' ? `(${state.answers.carType}, ${state.answers.carKmWeekly} km/week)` : ''}
    - Flights: ${state.answers.flightsYearly} flights per year
    - Energy: ${state.answers.energySource} ($${state.answers.electricityBill}/month bill)
    - Diet: ${state.answers.diet}
    - Clothes shopping: ${state.answers.shopping}
    - Country: ${state.answers.country}

    Calculated monthly footprint:
    - Transport Category: ${state.emissions.transport} kg CO2
    - Home Energy Category: ${state.emissions.energy} kg CO2
    - Diet Category: ${state.emissions.diet} kg CO2
    - Shopping Category: ${state.emissions.shopping} kg CO2
    - Total: ${state.emissions.total} kg CO2/month
  `;

  // Direct fetch to Anthropic messages endpoint
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': state.aiSettings.apiKey,
      'anthropic-version': '2023-06-01',
      // Since it's client-side, Anthropic might CORS block it. If it fails, our catch fallback kicks in.
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPayload }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic endpoint returned status: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text;
  
  // Parse JSON response
  return JSON.parse(text);
}

// Smart local engine that matches Claude Sonnet JSON formats and references quiz answers
function getSmartLocalRecommendations() {
  const recs = [];
  const answers = state.answers;
  const emissions = state.emissions;

  // 1. Evaluate Transport
  if (answers.commuteMethod === 'Car') {
    const savings = Math.round(emissions.transport * 0.4); // 40% reduction if hybrid/carpool
    recs.push({
      category: 'transport',
      title: 'Eco-Commute Optimizer',
      description: `Since you commute ${answers.carKmWeekly} km/weekly in a ${answers.carType} car, transitioning to carpooling or taking public transit two days a week will significantly reduce fuel burn.`,
      saving_kg: savings,
      difficulty: 'Medium'
    });
  } else if (answers.commuteMethod === 'Public Transit') {
    recs.push({
      category: 'transport',
      title: 'Active Commuting Transition',
      description: 'Your public transit commute is clean, but replacing 10km of transit with biking or walking weekly adds active fitness while shaving emissions.',
      saving_kg: 8,
      difficulty: 'Easy'
    });
  }

  // 2. Evaluate Air Travel
  if (answers.flightsYearly === '4–10' || answers.flightsYearly === '10+') {
    const savings = Math.round(emissions.transport * 0.25);
    recs.push({
      category: 'transport',
      title: 'Direct Route & Flight Consolidation',
      description: `With ${answers.flightsYearly} flights yearly, combining trips and choosing direct routes (avoiding connections) reduces taxiing fuel.`,
      saving_kg: savings,
      difficulty: 'Medium'
    });
  }

  // 3. Evaluate Home Energy
  if (answers.energySource === 'Grid' || answers.energySource === 'Mix') {
    const savings = Math.round(emissions.energy * 0.35);
    recs.push({
      category: 'energy',
      title: 'Smart Home Energy Retrofit',
      description: `With your utility bill at $${answers.electricityBill}/mo, replacing standard bulbs with LEDs and using smart plugs to eliminate phantom power loads creates instant savings.`,
      saving_kg: savings,
      difficulty: 'Easy'
    });
  }

  // 4. Evaluate Diet
  if (answers.diet === 'Meat every day') {
    recs.push({
      category: 'diet',
      title: 'Green Plate Shift',
      description: 'Since you eat meat daily, swapping beef or pork for plant-based proteins or poultry 3 days a week minimizes high-impact agriculture carbon.',
      saving_kg: 50,
      difficulty: 'Easy'
    });
  } else if (answers.diet === 'Meat sometimes' || answers.diet === 'Pescatarian') {
    recs.push({
      category: 'diet',
      title: 'Vocal Vegan Days',
      description: 'Your meat intake is moderate. Adapting 2 fully vegan days weekly will optimize your dietary footprint further.',
      saving_kg: 30,
      difficulty: 'Easy'
    });
  }

  // 5. Evaluate Shopping
  if (answers.shopping === 'Weekly') {
    recs.push({
      category: 'shopping',
      title: 'Circular Wardrobe Routine',
      description: 'Buying clothes weekly causes high carbon demand. Shifting to vintage thrift stores or a "one-in-one-out" wardrobe rule helps break the fast fashion cycle.',
      saving_kg: 25,
      difficulty: 'Medium'
    });
  } else if (answers.shopping === 'Monthly') {
    recs.push({
      category: 'shopping',
      title: 'Thrift & Rent Alternatives',
      description: 'Try shopping only for essential clothing replacements, or utilize clothes renting platforms for special occasions.',
      saving_kg: 10,
      difficulty: 'Easy'
    });
  }

  // Ensure we always have exactly 4 recommendations. If not enough, fill with high-quality general items.
  const fallbackRecs = [
    {
      category: 'energy',
      title: 'Thermal Efficiency Adjustment',
      description: 'Adjusting your thermostat by just 2°C (cooler in winter, warmer in summer) saves heating/cooling power.',
      saving_kg: 15,
      difficulty: 'Easy'
    },
    {
      category: 'shopping',
      title: 'Single-Use Plastic Purge',
      description: 'Reducing plastic container purchases lowers petrochemical manufacturing emissions.',
      saving_kg: 5,
      difficulty: 'Easy'
    },
    {
      category: 'diet',
      title: 'Compost Organic Waste',
      description: 'Composting food waste avoids anaerobic landfill decomposition, preventing methane release.',
      saving_kg: 12,
      difficulty: 'Easy'
    }
  ];

  while (recs.length < 4 && fallbackRecs.length > 0) {
    recs.push(fallbackRecs.shift());
  }

  // Sort by saving_kg (highest impact first)
  recs.sort((a, b) => b.saving_kg - a.saving_kg);
  
  // Keep only top 4
  const finalRecs = recs.slice(0, 4);

  // Generate a dynamic motivational phrase
  const motivationText = `By addressing your ${answers.commuteMethod === 'Car' ? 'commuting distance' : 'lifestyle choices'} and optimizing energy inputs, you can lead your community in ${answers.country} toward a sustainable net-zero future!`;

  return {
    recommendations: finalRecs,
    motivation: motivationText
  };
}

function renderRecommendations() {
  const container = document.getElementById('ai-cards-container');
  const motivationCard = document.getElementById('ai-motivation-card');
  const motivationText = document.getElementById('ai-motivation-text');

  container.innerHTML = '';

  state.recommendations.forEach((rec, index) => {
    const delay = index * 150; // Staggered delays
    const card = document.createElement('div');
    card.className = 'liquid-glass-strong rounded-3xl p-6 shadow-lg flex flex-col justify-between animate-fade-in-up';
    card.style.animationDelay = `${delay}ms`;

    const icon = ICON_MAP[rec.category] || 'sparkles';
    
    card.innerHTML = `
      <div class="flex justify-between items-start gap-4">
        <div class="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/80">
          <i data-lucide="${icon}" class="w-6 h-6 text-mint"></i>
        </div>
        <span class="text-[10px] uppercase font-bold tracking-wider text-white/40 bg-white/5 py-1 px-2.5 rounded-full">${rec.category}</span>
      </div>
      
      <div class="my-4">
        <h4 class="text-base font-semibold leading-tight text-white">${rec.title}</h4>
        <p class="text-xs text-white/60 leading-relaxed font-light mt-1.5">${rec.description}</p>
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        <div class="flex items-center gap-1.5 text-xs text-mint font-medium">
          <span class="bg-mint/10 px-2 py-0.5 rounded-full">${rec.saving_kg} kg CO₂/mo saved</span>
        </div>
        <span class="text-[10px] font-semibold tracking-wider text-white/50 border border-white/10 rounded-full px-2 py-0.5">${rec.difficulty}</span>
      </div>
    `;

    container.appendChild(card);
  });

  // Render motivation phrase
  if (state.motivation) {
    motivationText.textContent = `"${state.motivation}"`;
    motivationCard.classList.remove('hidden');
  }

  // Initialize newly added icons
  lucide.createIcons();
}

// ================= PROGRESS TRACKER & CHECKLIST =================
function renderChecklist() {
  const container = document.getElementById('tracker-checklist');
  container.innerHTML = '';

  state.recommendations.forEach((rec, index) => {
    const isChecked = state.checkedActions[index] || false;
    const checkboxId = `checkbox-${index}`;
    
    const item = document.createElement('div');
    item.className = `liquid-glass p-4 rounded-2xl flex items-center justify-between border-l-4 transition-all ${isChecked ? 'bg-mint/5 border-mint' : 'border-white/5'}`;
    
    item.innerHTML = `
      <div class="flex items-center gap-3.5 flex-1 pr-4">
        <div class="relative flex items-center">
          <input type="checkbox" id="${checkboxId}" ${isChecked ? 'checked' : ''} 
            onchange="toggleChecklistAction(${index})"
            class="peer w-5 h-5 opacity-0 absolute cursor-pointer">
          <div class="w-5 h-5 rounded-md border-2 border-white/20 peer-checked:bg-mint peer-checked:border-mint flex items-center justify-center transition-colors">
            <i data-lucide="check" class="w-3.5 h-3.5 text-forest font-bold hidden peer-checked:block"></i>
          </div>
        </div>
        <label for="${checkboxId}" class="cursor-pointer">
          <p class="text-xs font-semibold ${isChecked ? 'text-mint line-through' : 'text-white'}">${rec.title}</p>
          <p class="text-[10px] text-white/40 mt-0.5">Saves ${rec.saving_kg} kg CO₂ / mo</p>
        </label>
      </div>
      <span class="text-[10px] font-medium tracking-wide text-white/60 bg-white/5 px-2 py-0.5 rounded-full">${rec.difficulty}</span>
    `;

    container.appendChild(item);
  });

  lucide.createIcons();
  
  // Re-calculate projection chart
  calculateProjection();
}

window.toggleChecklistAction = function(index) {
  state.checkedActions[index] = !state.checkedActions[index];
  
  // Re-render checklist and projection
  renderChecklist();
};

function calculateProjection() {
  let totalSaved = 0;
  state.recommendations.forEach((rec, index) => {
    if (state.checkedActions[index]) {
      totalSaved += rec.saving_kg;
    }
  });

  // Re-render Line Chart with current checked savings
  renderLineChart(totalSaved);
}

function shareProgress() {
  const userFootprint = state.emissions.total;
  const country = state.answers.country;
  
  let checkedCount = 0;
  let totalSaved = 0;
  state.recommendations.forEach((rec, index) => {
    if (state.checkedActions[index]) {
      checkedCount++;
      totalSaved += rec.saving_kg;
    }
  });

  const text = `🌱 My Carbon Footprint is ${userFootprint} kg CO₂/month. I'm tracking my footprint with EcoTrace AI and I've committed to ${checkedCount} actions, projecting a savings of ${totalSaved} kg CO₂/month. Check out your footprint profile and heal the planet!`;
  
  navigator.clipboard.writeText(text).then(() => {
    showToast("📋 Copy successful! Share your green steps.");
  }).catch(err => {
    console.error('Error copying text', err);
    showToast("⚠️ Copy failed. Manually share progress.");
  });
}

// ================= SETTINGS DRAWER MANAGEMENT =================
function toggleKeyInputState(active) {
  const container = document.getElementById('api-key-container');
  if (active) {
    container.classList.remove('opacity-50', 'pointer-events-none');
  } else {
    container.classList.add('opacity-50', 'pointer-events-none');
  }
}

function saveAiSettings() {
  const directMode = document.getElementById('api-toggle').checked;
  const apiKey = document.getElementById('api-key-input').value.trim();

  state.aiSettings.directMode = directMode;
  state.aiSettings.apiKey = apiKey;

  localStorage.setItem('ecotrace_ai_settings', JSON.stringify({
    directMode,
    apiKey
  }));

  // Hide Modal
  document.getElementById('settings-modal').classList.add('pointer-events-none', 'opacity-0');
  showToast("⚙️ AI Preferences saved successfully.");

  // If dashboard is visible, refresh recommendations
  if (!document.getElementById('results-section').classList.contains('hidden')) {
    generateAiInsights(true);
  }
}

// ================= TOAST SYSTEM =================
function showToast(message) {
  const toast = document.getElementById('toast');
  const msgText = document.getElementById('toast-message');
  
  msgText.textContent = message;
  
  // Show toast
  toast.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-12');
  toast.classList.add('opacity-100', 'translate-y-0');

  // Hide toast after 3s
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'pointer-events-none', 'translate-y-12');
  }, 3000);
}
