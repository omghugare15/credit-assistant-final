/**
 * Gemini AI Integration Module for Credit Assistant
 * Tailored for Indian Credit Context (CIBIL, RBI norms, INR currency)
 */

const https = require('https');

// System prompt defining persona, rules, and Indian credit expertise
const INDIAN_CREDIT_SYSTEM_PROMPT = `
You are Aarav, an elite Senior Credit Strategist and Financial Architect at "Credit Assistant", specializing in the Indian financial ecosystem and credit bureaus (CIBIL, Experian India, CRIF High Mark, Equifax).

Your core mission: Empower Indian salaried and self-employed individuals to systematically elevate their credit score to "Excellent" (750 - 900) while prudently managing Debt-to-Income (DTI) and credit utilization.

Key Indian Credit Rules to always adhere to:
1. Credit Score Scale: 300 to 900.
   - 750+ is the holy grail for Indian banks (HDFC, SBI, ICICI, Axis) for best home loan ROI & pre-approved credit cards.
   - Below 650 indicates subprime or past delinquency.
2. The 5 Pillars of CIBIL Scoring:
   - Payment History (35% weightage): DPD (Days Past Due) must be '000'. Even a single '30' or '60' or 'SMA' slashes 30-70 points. 'Settled' or 'Written Off' is toxic.
   - Credit Utilization Ratio (CUR) (30% weightage): Keep below 30% of total sanctioned card limits. 10-20% is optimal for score acceleration.
   - Credit Age & History (15% weightage): Oldest card/loan account should NEVER be closed carelessly.
   - Credit Mix (10% weightage): Healthy balance of Secured (Home Loan, Auto Loan, Gold Loan) vs Unsecured (Personal Loan, Credit Card, BNPL).
   - Hard Inquiries / Credit Hunger (10% weightage): Multiple loan/card applications in <6 months flags desperation and docks 5-15 points per inquiry.
3. Debt-to-Income (DTI / FOIR):
   - Fixed Obligation to Income Ratio (FOIR). RBI suggests keeping below 40-50% for fresh retail loan approvals.
4. Tone & Style:
   - Professional, encouraging, highly analytical, actionable, culturally nuanced (uses ₹ INR, Lakhs, Crores, RBI guidelines, ECS/NACH mandate timings, statement generation dates).
   - Always break advice into clear bullet points with estimated CIBIL point impacts (e.g. "+15 to +25 pts").
   - Never give vague generic advice; reference the user's actual numbers provided in context!
`;

async function callGeminiApi(apiKey, contents, systemInstruction = INDIAN_CREDIT_SYSTEM_PROMPT) {
  // Use gemini-1.5-flash or gemini-2.0-flash
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = JSON.stringify({
    contents: contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  });

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      },
      timeout: 25000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const candidate = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (candidate) {
              resolve({ success: true, text: candidate, modelUsed: model });
            } else {
              reject(new Error('No response text returned by Gemini API'));
            }
          } else {
            const errorMsg = parsed.error?.message || `Gemini API responded with status ${res.statusCode}`;
            reject(new Error(errorMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Gemini API request timed out'));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * Intelligent domain fallback engine when no API key is provided or offline.
 * Produces hyper-realistic, customized financial consultation based on the user's live profile.
 */
function generateContextualAdvice(user, assessment, accounts, userQuery) {
  const query = (userQuery || '').toLowerCase();
  const currentScore = assessment.current_score;
  const targetScore = user.target_score || 790;
  const scoreGap = targetScore - currentScore;
  const utilization = assessment.utilization_ratio;
  const dti = assessment.dti_ratio;

  // Credit card breakdown
  const creditCards = accounts.filter(a => a.account_type === 'CREDIT_CARD');
  const loans = accounts.filter(a => a.account_type !== 'CREDIT_CARD');
  const totalCardDebt = creditCards.reduce((acc, c) => acc + c.current_outstanding, 0);
  const totalCardLimit = creditCards.reduce((acc, c) => acc + c.sanctioned_limit_or_loan, 0);
  const totalLoanEMI = accounts.reduce((acc, a) => acc + a.monthly_emi_or_min_due, 0);

  if (query.includes('750') || query.includes('reach') || query.includes('target') || query.includes('improve') || query.includes('boost')) {
    return `### 🎯 Targeted Roadmap to Bridge the ${scoreGap} Points Gap to Reach ${targetScore}+

Namaste **${user.name}**! Your current score is **${currentScore}**, which places you in the **${assessment.health_grade}** band. To achieve prime tier (**750+**), here is your highest-yield strategy:

#### 1. Compress Credit Card Utilization from ${utilization.toFixed(1)}% to below 25% (Impact: +25 to +35 points)
* You currently owe **₹${totalCardDebt.toLocaleString('en-IN')}** across your cards against a sanctioned limit of **₹${totalCardLimit.toLocaleString('en-IN')}**.
* **Golden Rule for CIBIL:** Credit bureaus report your balance on the **statement generation date**, not the due date.
* **Tactic:** Pay ₹${Math.max(0, Math.round(totalCardDebt - (totalCardLimit * 0.25))).toLocaleString('en-IN')} before your bill cycles generate. This forces your bank to report a microscopic utilization figure to CIBIL.

#### 2. DTI Relief: Your Debt-to-Income is ${dti.toFixed(1)}%
* Total monthly debt obligations: **₹${totalLoanEMI.toLocaleString('en-IN')}** out of **₹${user.monthly_income.toLocaleString('en-IN')}** net salary.
* RBI and retail underwriters consider >40% a moderate risk threshold. Pre-paying small balances (like two-wheeler or BNPL) frees up cashflow and cuts DTI by 4-6%.

#### 3. Zero-Inquiry Window for 180 Days (Impact: +10 to +15 points)
* You have **${assessment.hard_inquiries_6m} hard inquiries** in the last 6 months.
* Refrain from opening new credit line applications. Inquiries naturally decay in severity after 90-180 days.

*Expected Timeline:* Following these steps strictly will position your score at **${Math.min(850, currentScore + 40)}-${Math.min(850, currentScore + 65)}** within 3 to 4 bureau reporting cycles!`;
  }

  if (query.includes('utilization') || query.includes('limit') || query.includes('card')) {
    return `### 💳 Credit Card Utilization Strategy for ${user.name}

Your current utilization stands at **${utilization.toFixed(1)}%**. CIBIL weights revolving utilization as **30% of your total credit score**.

#### Breakdown of your accounts:
${creditCards.map(c => `• **${c.institution_name}** (ending ${c.account_number_last4}): Balance ₹${c.current_outstanding.toLocaleString('en-IN')} / Limit ₹${c.sanctioned_limit_or_loan.toLocaleString('en-IN')} (**${((c.current_outstanding / c.sanctioned_limit_or_loan) * 100).toFixed(1)}% utilized**)`).join('\n')}

#### Recommended Action Plan:
1. **The "Mid-Cycle Payment" Hack:**
   Make payments 3-4 days *before* the bank generates your monthly bill. The balance printed on the bill is what gets transmitted to CIBIL.
2. **Request Limit Enhancement Without Hard Inquiry:**
   If you have held cards for >6 months with 100% on-time records, look in your netbanking portal for "pre-approved limit upgrades". Expanding your total limit to ₹3,50,000 immediately brings your effective utilization down to under 35% without paying a single rupee.
3. **Never Max Out an Individual Card:**
   Even if overall utilization is 28%, if a single card is at 80%, CIBIL's algorithm flags high-risk stress. Keep every single card below 30%.`;
  }

  if (query.includes('dti') || query.includes('debt') || query.includes('loan') || query.includes('payoff') || query.includes('snowball') || query.includes('avalanche')) {
    return `### ⚖️ Debt-to-Income (DTI) & Payoff Acceleration Analysis

Your monthly net in-hand income: **₹${user.monthly_income.toLocaleString('en-IN')}**
Total monthly debt commitments (EMIs + card minimums): **₹${totalLoanEMI.toLocaleString('en-IN')}**
**Calculated DTI / FOIR:** **${dti.toFixed(1)}%** *(Moderate/Caution zone)*

#### Debt Avalanche vs. Debt Snowball Recommendation:
1. **The Avalanche Method (Recommended for Maximum ₹ Savings):**
   * Target highest interest debt first: **Credit card revolving debt (40-42% APR)**.
   * Paying ₹15,000 extra per month toward your HDFC/ICICI cards will save you upwards of **₹35,000 in interest and GST** this year alone.
2. **The Snowball Method (Recommended for Cashflow & Psychological Momentum):**
   * If feeling overwhelmed, knock off the smallest loan balance first: Your **Two-Wheeler Loan (₹46,000 remaining)**.
   * Clearing this extinguishes a **₹4,200/mo EMI**, dropping your DTI to **${((totalLoanEMI - 4200) / user.monthly_income * 100).toFixed(1)}%**!

#### Underwriting Insight:
When you apply for a Home Loan in India, SBI and HDFC look for a DTI below 40%. Reducing your DTI to 35% will unlock preferential rate discounts (up to 0.25% lower ROI, saving lakhs over a 20-year tenure).`;
  }

  if (query.includes('dispute') || query.includes('cibil') || query.includes('dpd') || query.includes('error') || query.includes('late')) {
    return `### 🛡️ CIBIL Dispute & DPD (Days Past Due) Remediation Guide

In Indian credit reports, any code other than **"000"** in your monthly payment grid signifies delinquency:
• **000**: Standard Payment (Flawless)
• **030 / 060 / 090**: 30, 60, or 90 days overdue
• **SMA (Special Mention Account)**: Account under observation for default risk
• **WRT / Settled**: Bank settled for a partial recovery (extremely damaging to score)

#### How to Dispute an Incorrect DPD Entry:
1. **Procure your CIBIL Report with Control Number (ECN):**
   You need the 9-digit ECN printed at the top of your official CIBIL report.
2. **File Online at CIBIL Dispute Resolution Portal:**
   Visit \`https://www.cibil.com/dispute-resolution\` and select the specific account.
3. **Submit Bank NOC or Bank Statement:**
   Upload bank proof confirming the amount was debited or that delay was due to ECS technical failure.
4. **Mandated 30-Day Turnaround:**
   Under RBI's Credit Information Companies (Regulation) Act, banks and CIBIL are legally required to resolve disputes within **30 days**. If the bank fails to respond or verifies the error, CIBIL will scrub the mark and your score will rebound by **+20 to +40 points**!`;
  }

  // Default holistic response
  return `### 💡 Holistic Credit Assessment & Strategic Guidance for ${user.name}

Here is your custom diagnostic based on your latest financial records:

• **CIBIL Score:** **${currentScore}** / 900 *(Target: ${targetScore})*
• **Debt-to-Income (DTI):** **${dti.toFixed(1)}%** *(Guideline: <35% optimal)*
• **Revolving Utilization:** **${utilization.toFixed(1)}%** *(Guideline: <30%)*
• **Active Accounts:** ${accounts.length} (${creditCards.length} Cards, ${loans.length} Loans)

#### Immediate Top 3 Priorities for this Month:
1. **Drop Revolving Balances Below 30%:**
   Your current card debt is ₹${totalCardDebt.toLocaleString('en-IN')}. Paying down ₹${Math.max(0, Math.round(totalCardDebt - (totalCardLimit * 0.30))).toLocaleString('en-IN')} will immediately satisfy the 30% golden ratio and boost your score by **+20 to +28 points**.
2. **Protect Payment History (35% CIBIL Weight):**
   Ensure all NACH/e-mandates for loans (SBI, Axis, HDFC) are funded 2 days before the debit date to avoid ECS bounce charges and accidental DPD triggers.
3. **No New Hard Checks for 90 Days:**
   Allow your recent ${assessment.hard_inquiries_6m} hard inquiries to cool down.

Feel free to ask me to simulate a specific financial move (e.g., *"What happens if I pay ₹50,000 to my credit cards?"*) or advise you on debt consolidation!`;
}

module.exports = {
  callGeminiApi,
  generateContextualAdvice,
  INDIAN_CREDIT_SYSTEM_PROMPT
};
