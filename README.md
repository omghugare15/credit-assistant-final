# 🇮🇳 Credit Assistant — AI-Powered Credit Health Platform (India Edition)

Credit Assistant is an AI-driven financial platform designed specifically for the Indian credit ecosystem (TransUnion CIBIL, Experian India, CRIF High Mark, and Equifax). It empowers Indian borrowers to understand, track, simulate, and improve their credit health to achieve **750+ Prime status**.

---

## ✨ Features

- **📊 Dynamic CIBIL Score Radial Gauge (300 to 900)**: Visualizes score tiers (`Needs Attention`, `Fair`, `Good`, `Excellent / Prime`) and milestone targets.
- **📈 12-Month Interactive Score Trajectory (Chart.js)**: Tracks historical check-ins against an AI-projected roadmap toward 750+.
- **🎚️ What-If Credit Score Simulator**: Sandbox to model debt payoffs, credit limit increases, loan closures, hard inquiries, and missed payment risk before taking real action.
- **🤖 Gemini AI Financial Strategist ("Aarav")**: Conversational AI advisor with Indian banking context (RBI regulations, CIBIL reporting cycles, EMI stress testing).
- **📋 Action Plan Roadmap**: Phase-by-phase actionable milestones that dynamically boost your score upon completion.
- **💳 Accounts & Debt Strategist**: Compares Debt Avalanche (highest APR first, interest savings in ₹) vs Debt Snowball (lowest balance first).
- **🛡️ Bureau Dispute Hub & Legal Letter Generator**: CIBIL Days Past Due (DPD) decoder and formal dispute generator adhering to Section 21 of the Credit Information Companies (Regulation) Act, 2005 (CICRA).
- **🚀 Guided Assessment Wizard**: Multi-step onboarding to recalculate Debt-to-Income (DTI) and Revolving Utilization Ratio.

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (`better-sqlite3`) for local, zero-config data persistence
- **Frontend**: Vanilla HTML5, Vanilla CSS (Glassmorphism & Fintech Dark Theme), ES Modules
- **Data Visualization**: Chart.js & SVG Canvas
- **AI Integration**: Google Gemini AI (`gemini-1.5-flash`) with built-in contextual fallback

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Installation
```bash
# 1. Clone the repository or extract the zip
git clone https://github.com/your-username/credit-assistant.git
cd credit-assistant

# 2. Install dependencies
npm install

# 3. (Optional) Set your Gemini API Key in .env
# echo GEMINI_API_KEY=your_gemini_api_key_here > .env

# 4. Start the application
npm start
```

Visit **`http://localhost:5000`** in your browser.

---

## ☁️ Free Cloud Deployment Guides

### Option 1: Render.com (Recommended — 100% Free Web Service)
1. Push this project to a new **GitHub repository**.
2. Go to [Render.com](https://render.com) and sign up with your GitHub account.
3. Click **New +** → **Web Service**.
4. Select your `credit-assistant` GitHub repository.
5. Set the settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Under **Environment Variables**, add:
   - `PORT`: `10000` (Render will automatically route traffic)
   - `GEMINI_API_KEY`: *(Optional) your Google Gemini API key*
7. Click **Deploy Web Service**. Your app will be live with a free `https://your-app.onrender.com` URL!

---

### Option 2: Railway.app (Free Tier)
1. Go to [Railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select your `credit-assistant` repository.
4. Railway will automatically detect Node.js and deploy your application.

---

### Option 3: Koyeb (Free Hobby Tier)
1. Go to [Koyeb.com](https://www.koyeb.com) and connect your GitHub.
2. Choose **GitHub Deployment** and select `credit-assistant`.
3. Set Build Command: `npm install` and Run Command: `npm start`.
4. Deploy!

---

## 📄 License
MIT License. Created for educational and financial empowerment purposes.
