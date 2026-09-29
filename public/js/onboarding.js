/**
 * Onboarding & Financial Assessment Wizard
 */

const Onboarding = {
  currentStep: 1,
  totalSteps: 3,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const openBtn = document.getElementById('btn-open-onboarding');
    const modal = document.getElementById('modal-onboarding');
    const closeBtn = document.getElementById('btn-close-onboarding');
    const nextBtn = document.getElementById('btn-onboard-next');
    const prevBtn = document.getElementById('btn-onboard-prev');
    const form = document.getElementById('form-onboarding');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => {
        this.currentStep = 1;
        this.updateStepView();
        modal.classList.add('open');
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('open');
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentStep < this.totalSteps) {
          if (this.validateCurrentStep()) {
            this.currentStep++;
            this.updateStepView();
          }
        } else {
          // Submit
          this.submitAssessment();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentStep > 1) {
          this.currentStep--;
          this.updateStepView();
        }
      });
    }
  },

  validateCurrentStep() {
    if (this.currentStep === 1) {
      const name = document.getElementById('onboard-name')?.value.trim();
      const income = document.getElementById('onboard-income')?.value;
      if (!name) {
        alert('Please enter your full name');
        return false;
      }
      if (!income || Number(income) <= 0) {
        alert('Please enter a valid monthly net income in ₹');
        return false;
      }
    } else if (this.currentStep === 2) {
      const score = document.getElementById('onboard-score')?.value;
      if (!score || Number(score) < 300 || Number(score) > 900) {
        alert('Please enter a valid credit score between 300 and 900');
        return false;
      }
    }
    return true;
  },

  updateStepView() {
    for (let i = 1; i <= this.totalSteps; i++) {
      const stepEl = document.getElementById(`onboard-step-${i}`);
      if (stepEl) {
        stepEl.style.display = i === this.currentStep ? 'block' : 'none';
      }
    }

    const stepLabel = document.getElementById('onboard-step-indicator');
    if (stepLabel) {
      stepLabel.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }

    const prevBtn = document.getElementById('btn-onboard-prev');
    const nextBtn = document.getElementById('btn-onboard-next');

    if (prevBtn) {
      prevBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
    }

    if (nextBtn) {
      nextBtn.textContent = this.currentStep === this.totalSteps ? 'Finish & Generate Roadmap' : 'Next Step →';
    }
  },

  async submitAssessment() {
    const nextBtn = document.getElementById('btn-onboard-next');
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.innerHTML = '<span class="spinner"></span> Analyzing with AI...';
    }

    try {
      const name = document.getElementById('onboard-name').value.trim();
      const city = document.getElementById('onboard-city').value.trim();
      const income = Number(document.getElementById('onboard-income').value);
      const employment = document.getElementById('onboard-employment').value;
      
      const currentScore = Number(document.getElementById('onboard-score').value);
      const targetScore = Number(document.getElementById('onboard-target-score').value || 790);
      const bureau = document.getElementById('onboard-bureau').value;

      const card1Limit = Number(document.getElementById('onboard-card1-limit').value || 100000);
      const card1Bal = Number(document.getElementById('onboard-card1-bal').value || 30000);

      const loanBal = Number(document.getElementById('onboard-loan-bal').value || 0);
      const loanEmi = Number(document.getElementById('onboard-loan-emi').value || 0);

      const accounts = [
        {
          account_type: 'CREDIT_CARD',
          institution_name: 'Primary Credit Card',
          account_number_last4: '1088',
          sanctioned_limit_or_loan: card1Limit,
          current_outstanding: card1Bal,
          monthly_emi_or_min_due: Math.round(card1Bal * 0.05),
          interest_rate: 42.0,
          is_secured: 0
        }
      ];

      if (loanBal > 0) {
        accounts.push({
          account_type: 'PERSONAL_LOAN',
          institution_name: 'Existing Loan Account',
          account_number_last4: '5542',
          sanctioned_limit_or_loan: loanBal,
          current_outstanding: loanBal,
          monthly_emi_or_min_due: loanEmi,
          interest_rate: 13.5,
          is_secured: 0
        });
      }

      await API.submitOnboarding({
        name,
        city,
        monthly_income: income,
        employment_type: employment,
        current_score: currentScore,
        target_score: targetScore,
        bureau,
        accounts
      });

      const modal = document.getElementById('modal-onboarding');
      if (modal) modal.classList.remove('open');

      await AppState.loadInitialData();
      Advisor.showToast(`🎉 Welcome ${name}! Your CIBIL diagnostic is live!`);
    } catch (err) {
      alert('Assessment failed: ' + err.message);
    } finally {
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Finish & Generate Roadmap';
      }
    }
  }
};

window.Onboarding = Onboarding;
