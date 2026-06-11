# 🌱 EcoTrace AI — Premium Carbon Footprint Tracker

EcoTrace AI is a premium, client-side climate-tech web application designed to help individuals calculate, analyze, and mitigate their carbon footprints. Built with visual excellence in mind, the app features a stunning **3D Liquid Glass hero landing**, a **multi-step onboarding quiz**, and **AI-powered personalized insights** to drive real climate action.



## 🚀 Live Demo

🔗 **Deployed App:** [EcoTrace](https://astonishing-lollipop-2ccd0a.netlify.app)

---

## ✨ Features

- **3D Liquid Glass Hero Landing**: Full-screen split-panel hero section with a looping background video, clean typography (Poppins & Source Serif 4), custom-masked gradient borders, and responsive design (desktop split view & mobile-optimized single-panel layout).
- **Multi-step Onboarding Quiz**: Interactive 7-step profile builder tracking Transport commute methods, weekly mileage, yearly flights, home utility source/spending, diet type, clothes shopping frequency, and country of residence. It features dynamic transitions (fade + slide-up) and conditional skips (e.g. skipping car details for non-drivers).
- **Results Dashboard**: Monthly footprint display with count-up animations, national average benchmarking calculations based on regional dataset comparisons, and custom-legend borderless Chart.js Donut charts.
- **AI-Powered Insights (Dual-Mode)**:
  1. **Direct Claude API Connector**: Fetch requests made directly to `https://api.anthropic.com/v1/messages` using `claude-sonnet-4-20250514`.
  2. **Smart Local Advisor Fallback**: Evaluates profile variables locally in under 200ms when the API key is absent or blocks due to CORS, outputting 4 ranked recommendations with kg CO₂ weights and difficulty ratings matching the Claude Sonnet format.
- **Mitigation Checklist & Projections**: Checkboxes to commit to actions dynamically recalculate and animate a 4-week Chart.js Line chart projection.
- **Streak & Share**: An interactive weekly streak tracker and a single-click clipboard share generator featuring customized footprint briefs.

---

## 🛠️ Technology Stack

- **Structure**: Semantic HTML5 & DOM Manipulation.
- **Styling**: Tailwind CSS v3 (via CDN) + Custom Vanilla CSS for the Liquid Glassmorphism system (`backdrop-filter: blur`, `box-shadow` depth, and custom-masked borders via `mask-composite: exclude` to avoid standard solid lines).
- **Icons**: Lucide Icons CDN.
- **Charts**: Chart.js v4 CDN (Donut charts & Line projections).
- **Fonts**: Poppins (body/display) + Source Serif 4 (italic accents) via Google Fonts.

---

## 🚀 Quick Start

EcoTrace AI is completely serverless and lightweight. You can run it instantly using any of the following approaches:

### Method 1: Direct Execution
Simply double-click the `index.html` file in your file explorer to launch it in any modern browser.

### Method 2: Local HTTP Server (Recommended)
Spawning a local server ensures consistent assets loading and video autoplay behavior. Run one of the commands below in the project directory:

**Using Python:**
```bash
python -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

**Using Node (if installed):**
```bash
npx serve
```
Then visit `http://localhost:3000`.

---

## ⚙️ AI Engine Settings

By default, EcoTrace runs in **Smart Local Advisor** mode, which yields realistic recommendations instantly. To activate the live Claude Sonnet model:
1. Scroll to the app section and click **AI Engine Settings** in the top right.
2. Toggle **Direct API Connection** on.
3. Input your Anthropic API Key (`sk-ant-...`).
4. Click **Save Preferences** (the key is stored securely in your browser's local storage).

---

## 📐 Emission Formula Reference

All factors represent monthly CO₂ values computed inside `app.js`:

| Category | Parameter | Calculation Formula / Factor |
| :--- | :--- | :--- |
| **Transport** | Car | `Weekly km * Factor * 4.33` <br> *(Factors — Petrol: 0.21, Diesel: 0.17, Hybrid: 0.10, Electric: 0.05)* |
| **Transport** | Public Transit | `50 km * 0.03 * 4.33` = `6.5 kg CO₂ / mo` |
| **Transport** | Bike / Walk / WFH | `0 kg CO₂ / mo` |
| **Transport** | Flights (annual) | `0` (0 kg), `1–3` (50 kg), `4–10` (150 kg), `10+` (300 kg) |
| **Energy** | Utility Spend | `Monthly Bill (USD) * 0.8` |
| **Energy** | Clean Source | *Discounts: Solar (90% reduction), Wind (95%), Mix (50%), Grid (0%)* |
| **Diet** | Food Type | Meat daily (150 kg), Sometimes (100 kg), Pescatarian (70 kg), Vegetarian (50 kg), Vegan (30 kg) |
| **Shopping** | Fast Fashion | Weekly purchases (40 kg), Monthly (15 kg), Rarely (5 kg) |

---

## 📂 File Structure

```
.
├── index.html                  # Main layout and structure
├── style.css                   # Custom liquid glass and keyframes
├── app.js                      # Calculations, charts, and AI connector
├── README.md                   # Repository documentation
└── earth_forest_thumbnail.png  # Optional Climate-AI card graphic
```

---

## 📄 License

This project is licensed under the MIT License. Feel free to copy, modify, and build upon it to promote global climate awareness.
