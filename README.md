# 🇮🇳 Credit Assistant — AI-Powered Credit Health Platform

<div align="center">

![Platform](https://img.shields.io/badge/Platform-Credit%20Assistant%20India-6366f1?style=for-the-badge)
![Node Version](https://img.shields.io/badge/Node.js-v18%2B-10b981?style=for-the-badge&logo=node.js)
![Database](https://img.shields.io/badge/Database-SQLite%203-06b6d4?style=for-the-badge&logo=sqlite)
![AI Model](https://img.shields.io/badge/AI%20Engine-Google%20Gemini-f59e0b?style=for-the-badge&logo=google)
![License](https://img.shields.io/badge/License-MIT-slate?style=for-the-badge)

<p align="center">
  <b>A comprehensive, AI-driven financial platform designed for Indian borrowers to understand, track, simulate, and improve their credit health to achieve an "Excellent" (750+) CIBIL score.</b>
</p>

</div>

---

## 📌 Table of Contents
- [Executive Overview](#-executive-overview)
- [Why Indian Credit Context Matters](#-why-indian-credit-context-matters)
- [Core Features & Modules](#-core-features--modules)
  - [1. Dashboard & Radial Gauge](#1-dashboard--score-health-engine)
  - [2. Gemini AI Financial Strategist](#2-gemini-ai-financial-strategist-aarav)
  - [3. Interactive What-If Simulator](#3-interactive-what-if-credit-score-simulator)
  - [4. Accounts & Debt Payoff Strategist](#4-accounts--debt-payoff-strategist)
  - [5. Bureau Dispute Hub & Legal Notice Generator](#5-bureau-dispute-hub--legal-notice-generator)
  - [6. Guided Onboarding & Assessment Wizard](#6-guided-onboarding--assessment-wizard)
- [Financial Scoring Engine & Formulas](#-financial-scoring-engine--formulas)
- [System Architecture](#-system-architecture)
- [Database Schema & Data Persistence](#-database-schema--data-persistence)
- [REST API Specifications](#-rest-api-specifications)
- [Tech Stack](#-tech-stack)
- [Local Installation & Setup](#-local-installation--setup)

---

## 🎯 Executive Overview

In India, credit health remains widely misunderstood. Over 70% of retail borrowers are unaware of how credit card billing cycle cutoffs, unsecured-to-secured loan ratios, and Days Past Due (DPD) reporting impact their loan eligibility. 

**Credit Assistant** bridges this gap by functioning as a personal, 24/7 AI credit architect. It pairs **Google Gemini AI** with an Indian regulatory compliance model (RBI guidelines, CICRA Act 2005) to decode bureau reports (CIBIL, Experian India, CRIF High Mark, Equifax) and give users step-by-step roadmaps to reach **750+ Prime status**.

---

## 🇮🇳 Why Indian Credit Context Matters

Most generic credit monitoring tools reflect US FICO scoring, which differs significantly from Indian bureau algorithms:
* **Score Scale**: Indian scores range from **300 to 900** (where 750+ unlocks the lowest home loan and car loan interest rates).
* **Statement Date vs Due Date**: In India, credit bureaus capture card outstandings on the **statement generation date**, penalizing users with high utilization even if they clear the bill by the due date.
* **Days Past Due (DPD)**: Rather than generic delinquency flags, Indian banks record explicit DPD grids (`000`, `030`, `060`, `090`, `SMA`, `WRT`).
* **FOIR / DTI Thresholds**: The Reserve Bank of India (RBI) mandates retail lenders enforce a Fixed Obligation to Income Ratio (FOIR/DTI) of **40% to 50%**.

---

## 🚀 Core Features & Modules

### 1. Dashboard & Score Health Engine
* **Circular CIBIL Score Radial Gauge**: Dynamic SVG needle and gradient arc showing scores from 300 to 900 across 4 standard tiers:
  * `300 - 649`: Needs Attention (High risk, subprime)
  * `650 - 699`: Fair / Average (Standard retail lending)
  * `700 - 749`: Good (Eligible for most credit cards/loans)
  * `750 - 900`: Excellent / Prime (Lowest interest rates, pre-approved offers)
* **Key Health Metrics**:
  * **Debt-to-Income (DTI / FOIR)**: Live computation with color-coded risk flags.
  * **Revolving Credit Card Utilization (CUR)**: Card balance vs. total sanctioned limit with alerts if over 30%.
  * **Monthly EMI Outflow**: Aggregate monthly commitments in ₹ INR.
  * **Total Outstanding Liabilities**: Split by Secured (Home, Auto) vs. Unsecured (Cards, Personal, BNPL).
* **12-Month Score Trajectory Chart**: Interactive time-series comparing verified historical check-ins with an AI-modeled future trajectory.
* **CIBIL 5 Pillars Diagnostic**: Detailed progress bars assessing the 5 core factors of the bureau algorithm.

---

### 2. Gemini AI Financial Strategist ("Aarav")
* **Domain-Specialized Persona**: Context-engineered with Indian credit underwriting regulations, statutory dispute channels, and payoff mathematics.
* **Real-Time Financial Snapshot Context**: Injects the user's live salary, card debts, individual card limits, loan terms, and past delinquencies directly into prompts for tailored advice.
* **Dual-Engine Architecture**:
  * **Live Google Gemini API**: Connects to `gemini-1.5-flash` with streaming reasoning.
  * **Built-in Offline Rule Engine**: Seamless mathematical fallback ensuring the app is 100% operational offline or before an API key is configured.
* **Interactive Action Plan Roadmap**:
  * Generates structured 3-phase milestones: *Phase 1 (Quick Wins: 0-30 Days)*, *Phase 2 (Debt Optimization: 30-90 Days)*, and *Phase 3 (Score Surge: 90-180 Days)*.
  * **Live Score Impact**: Checking off an item immediately logs completion, credits points to the user's score in SQLite, and animates the score gauge in real time.

---

### 3. Interactive What-If Credit Score Simulator
A zero-risk algorithmic sandbox where users can test financial moves before making them:
* 💳 **Pay Down Card Debt**: Slider from ₹0 to total card balance with quick chips for the 30% golden ratio and 15% prime goal.
* 📈 **Request Limit Enhancement**: Test expanding credit limits by +10% to +100% to compress utilization without taking on debt.
* 🏦 **Pay Off & Close Active Loan**: Select active personal or auto loans to simulate premature closure and EMI savings.
* ⚠️ **Missed Payment Stress Test**: Models the score penalty of 1 or 2 missed payments (30-day or 60-day DPD).
* 🔍 **Hard Inquiries & On-Time Streak**: Models inquiry cooldowns and 3 to 12 months of consecutive on-time payments.
* **Real-Time Feedback**: Live score delta badge (`+28 Points`), updated DTI, updated utilization, and AI qualitative commentary explaining why the algorithm reacted.

---

### 4. Accounts & Debt Payoff Strategist
* **Credit Card Manager**: Visual utilization bars for each individual card with warning tags for cards exceeding 30% or 50%.
* **Loan Portfolio Manager**: Tracks active EMIs, interest rates (APR), and DPD statuses.
* **Avalanche vs. Snowball Calculator**:
  * **Debt Avalanche**: Prioritizes highest APR first (e.g., credit cards at 40-42% APR) and calculates exact estimated annual interest saved in ₹ INR.
  * **Debt Snowball**: Prioritizes lowest balance first to build psychological momentum and extinguish monthly commitments.

---

### 5. Bureau Dispute Hub & Legal Notice Generator
* **CIBIL DPD Code Explanations**: Decodes codes including `000`, `030`, `060`, `090`, `SMA` (Special Mention Account), `SUB` (Sub-standard), `DBT` (Doubtful), and `WRT` (Written Off).
* **Statutory Dispute Letter Generator**: Generates formal grievance notices citing **Section 21 of the Credit Information Companies (Regulation) Act, 2005 (CICRA)** and RBI's 30-day dispute resolution mandate with 1-click clipboard copy.

---

### 6. Guided Onboarding & Assessment Wizard
* 3-step interactive setup wizard collecting:
  1. Full Name, City, Employment Type, and Monthly Net In-Hand Salary (₹).
  2. Baseline Credit Score (300-900), Reporting Bureau, and Target Score.
  3. Total Credit Card Limits, Current Outstandings, and Active Loan EMIs.
* Instantly persists the profile and calculates initial DTI, utilization, and health grade.

---

## 📐 Financial Scoring Engine & Formulas

### 1. The 5 Pillars of CIBIL Scoring
| Factor | Weight | Evaluation Criteria |
| :--- | :---: | :--- |
| **Payment History** | **35%** | Track record of on-time payments. DPD must be `000`. A single `030` or `SMA` docks 40-70 points. |
| **Credit Utilization Ratio** | **30%** | Total card outstandings divided by total sanctioned limits. Keeping it under 30% is critical. |
| **Credit History Age** | **15%** | Age of oldest active credit account. Average account tenure should ideally exceed 36 months. |
| **Credit Mix** | **10%** | Proportion of Secured debt (Home, Vehicle, Gold) vs Unsecured debt (Personal, Cards, BNPL). |
| **Recent Hard Inquiries** | **10%** | Number of hard credit checks initiated by lenders in the past 6 months. High frequency flags credit hunger. |

### 2. Debt-to-Income (DTI / FOIR)
$$\text{DTI} = \left(\frac{\sum \text{Monthly EMIs}}{\text{Net Monthly In-Hand Salary}}\right) \times 100\%$$

* **&le; 30%**: Low Risk (High borrowing power)
* **30% - 45%**: Moderate / Manageable
* **> 45%**: High Risk (Approaching RBI retail ceiling)

### 3. Credit Card Utilization Ratio (CUR)
$$\text{CUR} = \left(\frac{\sum \text{Current Outstanding on All Cards}}{\sum \text{Total Sanctioned Credit Limits}}\right) \times 100\%$$

* **&le; 30%**: Optimal / Prime Acceleration
* **30% - 50%**: Moderate (Slows down score growth)
* **> 50%**: High Risk (Causes rapid point drops)

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Client["Client: HTML5 / Vanilla CSS / ES Modules / Chart.js"]
    Server["Backend: Node.js + Express REST API"]
    DB[("SQLite Database: better-sqlite3")]
    Gemini["Google Gemini AI: gemini-1.5-flash"]
    Engine["Local Indian Credit Rule Engine"]

    Client -->|REST API Requests| Server
    Server -->|Sync Read/Write Queries| DB
    Server -->|Contextual System Prompt| Gemini
    Server -->|Fallback when offline| Engine

    subgraph "Application Views"
        V1["1. Dashboard & Radial Gauge"]
        V2["2. Gemini AI Strategist"]
        V3["3. What-If Simulator"]
        V4["4. Accounts & Debt Strategist"]
        V5["5. Bureau Disputes & DPD"]
        V6["6. Onboarding Wizard"]
    end

    Client --- V1
    Client --- V2
    Client --- V3
    Client --- V4
    Client --- V5
    Client --- V6
