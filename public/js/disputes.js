/**
 * Indian Credit Bureau & CIBIL Dispute Hub
 */

const Disputes = {
  init() {
    this.bindEvents();
    AppState.on('dataLoaded', (data) => this.populateAccountOptions(data.accounts));
  },

  populateAccountOptions(accounts = []) {
    const select = document.getElementById('dispute-account-select');
    if (!select) return;

    select.innerHTML = `<option value="">-- Select Account from your profile --</option>` +
      accounts.map(a => `<option value="${a.institution_name} (••${a.account_number_last4})">${a.institution_name} [${a.account_type}]</option>`).join('');
  },

  bindEvents() {
    const generateBtn = document.getElementById('btn-generate-dispute');
    const copyBtn = document.getElementById('btn-copy-dispute');

    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateDisputeLetter());
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = document.getElementById('dispute-letter-output')?.value;
        if (text) {
          navigator.clipboard.writeText(text);
          Advisor.showToast('📋 Dispute draft copied to clipboard!');
        }
      });
    }
  },

  generateDisputeLetter() {
    const user = AppState.profile;
    const accountName = document.getElementById('dispute-account-select')?.value || 'The Specified Loan/Credit Account';
    const errorType = document.getElementById('dispute-error-type')?.value;
    const disputeEcn = document.getElementById('dispute-ecn-input')?.value.trim() || 'ECN-XXXX-XXXX';
    const additionalNotes = document.getElementById('dispute-notes-input')?.value.trim() || '';
    const outputArea = document.getElementById('dispute-letter-output');
    const resultBox = document.getElementById('dispute-result-box');

    if (!user) return;

    const dateToday = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    let groundsStatement = '';
    if (errorType === 'incorrect_dpd') {
      groundsStatement = `The payment grid for ${accountName} erroneously reflects a Days Past Due (DPD) status other than "000". I hereby confirm that all monthly payments and NACH auto-debits were successfully cleared in full within the permissible grace period as evidenced by attached bank statement. The erroneous delinquency mark has severely depressed my CIBIL score.`;
    } else if (errorType === 'account_still_open') {
      groundsStatement = `The account ${accountName} was closed in full, and a No Objection Certificate (NOC) was issued. However, the current bureau report incorrectly displays this account as "Active/Open" with an outstanding balance.`;
    } else if (errorType === 'unauthorized_inquiry') {
      groundsStatement = `A hard inquiry was recorded on my credit report by the specified entity without my explicit consent or formal loan application submission. Under RBI guidelines, hard pulls require verifiable user authorization.`;
    } else {
      groundsStatement = `An incorrect balance is currently reflected for ${accountName}. Substantial pre-payment was acknowledged by the lender but has not been transmitted to the credit bureau.`;
    }

    const letter = `Date: ${dateToday}

To,
The Nodal Grievance Redressal Officer / Dispute Resolution Cell
TransUnion CIBIL Limited & ${accountName}

Subject: Formal Dispute regarding Inaccurate Credit Information (CIBIL Report Control No: ${disputeEcn})
Governing Law: Section 21 of the Credit Information Companies (Regulation) Act, 2005 (CICRA)

Dear Sir/Madam,

I am writing to file an official grievance regarding inaccurate information reflected on my credit report.

Complainant Details:
• Full Name: ${user.name}
• City/State: ${user.city}
• Mobile: ${user.phone || '+91 XXXXX XXXXX'}
• Email: ${user.email || 'user@example.in'}
• Report Control Number (ECN): ${disputeEcn}

Details of Inaccuracy:
• Disputed Account: ${accountName}
• Nature of Dispute: ${errorType.replace('_', ' ').toUpperCase()}

Grounds for Dispute:
${groundsStatement}
${additionalNotes ? `\nAdditional Observations:\n${additionalNotes}` : ''}

Statutory Obligation:
As per Reserve Bank of India (RBI) circular RBI/2023-24/72 and provisions of CICRA 2005, Credit Institutions and Credit Information Companies are legally mandated to investigate and resolve disputes within 30 days of submission.

I request you to rectify the aforementioned record, submit updated data to TransUnion CIBIL / Experian, and furnish an updated Credit Information Report (CIR) free of charge.

Yours sincerely,

${user.name}`;

    if (outputArea) {
      outputArea.value = letter;
    }
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.scrollIntoView({ behavior: 'smooth' });
    }
  }
};

window.Disputes = Disputes;
