document.addEventListener("DOMContentLoaded", function () {
  // ------------------- UTILITY FUNCTIONS -------------------
  function stripNonNumeric(str) {
    if (typeof str !== "string") return "";
    return str.replace(/[^0-9.]/g, "");
  }
  function daysBetween(d1, d2) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.ceil((d2 - d1) / MS_PER_DAY);
  }
  function showError(input, message) {
    let errorElem = input.parentNode.querySelector(".error-message");
    if (!errorElem) {
      errorElem = document.createElement("div");
      errorElem.className = "error-message";
      errorElem.style.color = "red";
      errorElem.style.fontSize = "0.8em";
      input.parentNode.appendChild(errorElem);
    }
    errorElem.innerText = message;
  }
  function clearError(input) {
    let errorElem = input.parentNode.querySelector(".error-message");
    if (errorElem) {
      errorElem.innerText = "";
    }
  }
  
  // ------------------- VALIDATION FUNCTIONS -------------------
  function validateFinancedBrokerFee() {
    const totalB = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
    const finBInput = document.getElementById("financedBrokerFee");
    const finB = parseFloat(stripNonNumeric(finBInput.value)) || 0;
    if (finB > totalB) {
      showError(finBInput, "Financed Broker Fee cannot exceed Total Broker Fee.");
    } else {
      clearError(finBInput);
    }
  }
  function validateExpirationDate() {
    const row = this.closest(".coverage-row");
    if (!row) return;
    const effInput = row.querySelector(".effectiveDate");
    if (!effInput || !effInput.value) {
      clearError(this);
      return;
    }
    const effDate = new Date(effInput.value);
    const expDate = new Date(this.value);
    if (expDate < effDate) {
      showError(this, "Expiration Date cannot be earlier than Effective Date.");
    } else {
      clearError(this);
    }
  }
  
  // ------------------- AUTO LIABILITY DATE AUTO-FILL -------------------
  const autoLiabilityRow = document.querySelector(".auto-liability");
  if (autoLiabilityRow) {
    const effectiveInput = autoLiabilityRow.querySelector(".effectiveDate");
    const expirationInput = autoLiabilityRow.querySelector(".expirationDate");
    const endorsementInput = autoLiabilityRow.querySelector(".endorsementDate");
    effectiveInput.addEventListener("change", function () {
      let eff = new Date(this.value);
      if (!isNaN(eff.getTime())) {
        let expirationDate = new Date(eff);
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        expirationInput.value = expirationDate.toISOString().split("T")[0];
      }
      autoCopyDates();
    });
    expirationInput.addEventListener("change", autoCopyDates);
    endorsementInput.addEventListener("change", autoCopyDates);
  }
  function autoCopyDates() {
    const autoRow = document.querySelector(".auto-liability");
    if (!autoRow) return;
    const effVal = autoRow.querySelector(".effectiveDate")?.value;
    const expVal = autoRow.querySelector(".expirationDate")?.value;
    const endVal = autoRow.querySelector(".endorsementDate")?.value;
    document.querySelectorAll(".coverage-row").forEach(row => {
      if (!row.classList.contains("auto-liability")) {
        if (effVal) row.querySelector(".effectiveDate").value = effVal;
        if (expVal) row.querySelector(".expirationDate").value = expVal;
        if (endVal) row.querySelector(".endorsementDate").value = endVal;
      }
    });
  }
  
  // ------------------- SETUP NUMERIC FIELDS -------------------
  function setupNumericFields() {
    document.querySelectorAll(".dollar-input, .percent-input, .numPay-input").forEach(input => {
      input.addEventListener("input", function () {
        let raw = stripNonNumeric(this.value);
        const parts = raw.split(".");
        if (parts.length > 2) {
          raw = parts[0] + "." + parts.slice(1).join("");
        }
        if (this.classList.contains("percent-input")) {
          let num = parseFloat(raw);
          if (!isNaN(num)) {
            if (num > 100) {
              raw = "100";
              showError(this, "Percentage cannot be more than 100. Auto-correcting to 100.");
            } else if (num < 0) {
              raw = "0";
              showError(this, "Percentage cannot be less than 0. Auto-correcting to 0.");
            } else {
              clearError(this);
            }
          }
        }
        this.value = raw;
      });
      input.addEventListener("focus", function () {
        this.value = stripNonNumeric(this.value);
        clearError(this);
      });
      input.addEventListener("blur", function () {
        let num = parseFloat(stripNonNumeric(this.value));
        if (isNaN(num)) num = 0;
        if (this.classList.contains("dollar-input")) {
          this.value = num.toFixed(2);
        } else if (this.classList.contains("percent-input")) {
          if (num < 0) {
            num = 0;
            showError(this, "Percentage cannot be less than 0. Auto-correcting to 0.");
          } else if (num > 100) {
            num = 100;
            showError(this, "Percentage cannot be more than 100. Auto-correcting to 100.");
          } else {
            clearError(this);
          }
          this.value = num.toFixed(2);
        } else if (this.classList.contains("numPay-input")) {
          if (num < 1) num = 1;
          if (num > 10) num = 10;
          this.value = String(Math.round(num));
        }
      });
    });
  }
  setupNumericFields();
  
  // ------------------- BIDIRECTIONAL LOGIC PER ROW (Main Calculator) -------------------
  function setupDownPaymentBidirectional(row) {
    const premiumInput = row.querySelector(".premium");
    const downPayPctInput = row.querySelector(".downPayPct");
    const downPayDollarInput = row.querySelector(".downPayDollar");
    if (downPayPctInput && downPayDollarInput && premiumInput) {
      downPayPctInput.addEventListener("blur", function () {
        let pct = parseFloat(stripNonNumeric(this.value)) || 0;
        let premium = parseFloat(stripNonNumeric(premiumInput.value)) || 0;
        let dollarVal = premium * (pct / 100);
        downPayDollarInput.value = dollarVal.toFixed(2);
      });
      downPayDollarInput.addEventListener("blur", function () {
        let dollar = parseFloat(stripNonNumeric(this.value)) || 0;
        let premium = parseFloat(stripNonNumeric(premiumInput.value)) || 0;
        let pctVal = premium ? (dollar / premium) * 100 : 0;
        downPayPctInput.value = pctVal.toFixed(2);
      });
    }
  }
  function setupCarrierTaxBidirectional(row) {
    const premiumInput = row.querySelector(".premium");
    const tivInput = row.querySelector(".tiv");
    const rateInput = row.querySelector(".rate");
    const carrierTaxPctInput = row.querySelector(".carrierTax");
    const carrierTaxDollarInput = row.querySelector(".carrierTaxDollar");
    if (carrierTaxPctInput && carrierTaxDollarInput) {
      function getBasePremium() {
        let pVal = parseFloat(stripNonNumeric(premiumInput?.value)) || 0;
        if ((pVal === 0) && tivInput && rateInput) {
          let tiv = parseFloat(stripNonNumeric(tivInput.value)) || 0;
          let rate = parseFloat(stripNonNumeric(rateInput.value)) || 0;
          pVal = tiv * (rate / 100);
        }
        return pVal;
      }
      carrierTaxPctInput.addEventListener("blur", function () {
        let pct = parseFloat(stripNonNumeric(this.value)) || 0;
        let base = getBasePremium();
        let taxDollar = base * (pct / 100);
        carrierTaxDollarInput.value = taxDollar.toFixed(2);
      });
      carrierTaxDollarInput.addEventListener("blur", function () {
        let taxDollar = parseFloat(stripNonNumeric(this.value)) || 0;
        let base = getBasePremium();
        let pct = base ? (taxDollar / base) * 100 : 0;
        carrierTaxPctInput.value = pct.toFixed(2);
      });
    }
  }
  document.querySelectorAll(".coverage-row").forEach(row => {
    setupDownPaymentBidirectional(row);
    setupCarrierTaxBidirectional(row);
  });
  
  // ------------------- SECONDARY CALCULATOR SECTION -------------------
  // For each coverage row (from Main Calculator) that has a premium,
  // generate a secondary block.
  // For Auto Liability, include 4 rows (Prorated Premium, Policy Fee, Broker Fee, Prorated Tax).
  // For other coverages, include only 3 rows (Prorated Premium, Policy Fee, Prorated Tax).
  // Each row has 3 columns: Line Item, Amount ($) and Down Payment (with two inline inputs for % and $).
  // Default Down Payment % values are: Prorated Premium:20%, Policy Fee:100%, Broker Fee:100%, Prorated Tax:100%.
  // Bidirectional behavior is implemented using a data attribute "lastEdited" on the secondary block.
  function populateSecondaryCalculator() {
    const secContainer = document.getElementById("secondaryBlocks");
    secContainer.innerHTML = "";
    const coverageRows = document.querySelectorAll(".coverage-row");
    coverageRows.forEach(row => {
      const premiumField = row.querySelector(".premium");
      let premium = parseFloat(stripNonNumeric(premiumField?.value)) || 0;
      if (premium <= 0) return; // Only for rows with premium
      const coverageName = row.querySelector("td:first-child")?.innerText.trim() || "Unknown Coverage";
      
      // Retrieve extra data from main calc dataset
      let proratedPremium = row.dataset.proratedPremium || "0.00";
      let policyFee = row.dataset.policyFee || "0.00";
      let proratedTax = row.dataset.proratedTax || "0.00";
      
      // For Broker Fee, only include if Auto Liability (by checking class)
      let includeBrokerFee = row.classList.contains("auto-liability");
      let brokerFeeHtml = "";
      if (includeBrokerFee) {
        let brokerFee = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
        brokerFeeHtml = `
          <tr data-line="brokerFee">
            <td>Broker Fee</td>
            <td><input type="text" class="sec-amount sec-brokerFee" value="${brokerFee.toFixed(2)}" /></td>
            <td class="downPaymentCell">
              <div class="dpContainer">
                <input type="text" class="sec-dpPct sec-dpPct-broker" value="100" placeholder="%" />
                <input type="text" class="sec-dpAmt sec-dpAmt-broker" value="0" placeholder="$" />
              </div>
            </td>
          </tr>
        `;
      }
      
      let blockHtml = `
        <div class="secondary-block" data-last-edited="">
          <h3>${coverageName} - Secondary Calculator</h3>
          <table>
            <thead>
              <tr>
                <th>Line Item</th>
                <th>Amount ($)</th>
                <th>Down Payment (% / $)</th>
              </tr>
            </thead>
            <tbody>
              <tr data-line="proratedPremium">
                <td>Prorated Premium</td>
                <td><input type="text" class="sec-amount sec-proratedPremium" value="${proratedPremium}" readonly /></td>
                <td class="downPaymentCell">
                  <div class="dpContainer">
                    <input type="text" class="sec-dpPct sec-dpPct-proratedPremium" value="20" placeholder="%" />
                    <input type="text" class="sec-dpAmt sec-dpAmt-proratedPremium" value="0" placeholder="$" />
                  </div>
                </td>
              </tr>
              <tr data-line="policyFee">
                <td>Policy Fee</td>
                <td><input type="text" class="sec-amount sec-policyFee" value="${policyFee}" readonly /></td>
                <td class="downPaymentCell">
                  <div class="dpContainer">
                    <input type="text" class="sec-dpPct sec-dpPct-policyFee" value="100" placeholder="%" />
                    <input type="text" class="sec-dpAmt sec-dpAmt-policyFee" value="0" placeholder="$" />
                  </div>
                </td>
              </tr>
              ${brokerFeeHtml}
              <tr data-line="proratedTax">
                <td>Prorated Tax</td>
                <td><input type="text" class="sec-amount sec-proratedTax" value="${proratedTax}" readonly /></td>
                <td class="downPaymentCell">
                  <div class="dpContainer">
                    <input type="text" class="sec-dpPct sec-dpPct-tax" value="100" placeholder="%" />
                    <input type="text" class="sec-dpAmt sec-dpAmt-tax" value="0" placeholder="$" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <button class="sec-calcDP">Calculate DP</button>
        </div>
      `;
      secContainer.innerHTML += blockHtml;
    });
    if (secContainer.innerHTML.trim() !== "") {
      document.getElementById("secondaryCalculator").style.display = "block";
    }
    // Attach focus event listeners for bidirectional updates
    document.querySelectorAll(".secondary-block").forEach(block => {
      block.querySelectorAll(".sec-dpPct, .sec-dpAmt").forEach(input => {
        input.addEventListener("focus", function () {
          const blockEl = this.closest(".secondary-block");
          if (this.classList.contains("sec-dpPct")) {
            blockEl.dataset.lastEdited = "pct";
          } else if (this.classList.contains("sec-dpAmt")) {
            blockEl.dataset.lastEdited = "amt";
          }
        });
      });
    });
    // Use event delegation for the "Calculate DP" button
    document.getElementById("secondaryBlocks").addEventListener("click", function(e) {
      if (e.target && e.target.matches(".sec-calcDP")) {
        const block = e.target.closest(".secondary-block");
        const lastEdited = block.dataset.lastEdited; // "pct" or "amt"
        block.querySelectorAll("tbody tr").forEach(tr => {
          const amountInput = tr.querySelector(".sec-amount");
          const dpPctInput = tr.querySelector(".sec-dpPct");
          const dpAmtInput = tr.querySelector(".sec-dpAmt");
          let amount = parseFloat(stripNonNumeric(amountInput.value)) || 0;
          if (lastEdited === "pct") {
            let dpPct = parseFloat(stripNonNumeric(dpPctInput.value)) || 0;
            dpAmtInput.value = ((amount * dpPct) / 100).toFixed(2);
          } else if (lastEdited === "amt") {
            let dpAmt = parseFloat(stripNonNumeric(dpAmtInput.value)) || 0;
            let calcPct = amount ? (dpAmt / amount) * 100 : 0;
            dpPctInput.value = calcPct.toFixed(2);
          }
        });
      }
    });
  }
  
  // ------------------- MAIN CALCULATION FUNCTION (Main Calculator) -------------------
  function calculateProRatedAmounts() {
    const paymentStatus = document.querySelector('input[name="paymentStatus"]:checked').value;
    if (paymentStatus === "no") {
      alert("Error: Client has not completed payments. Proration cannot be calculated.");
      return;
    }
    document.querySelectorAll(".percent-input").forEach(input => {
      let num = parseFloat(stripNonNumeric(input.value)) || 0;
      if (num < 0) {
        num = 0;
        showError(input, "Percentage cannot be negative. Auto-correcting to 0.");
      } else if (num > 100) {
        num = 100;
        showError(input, "Percentage cannot exceed 100. Auto-correcting to 100.");
      } else {
        clearError(input);
      }
      input.value = num.toFixed(2);
    });
    const errorElements = document.querySelectorAll(".error-message");
    for (let err of errorElements) {
      if (err.innerText.trim() !== "") {
        alert("Please fix validation errors before calculating.");
        return;
      }
    }
    let coverageSum = 0;
    let totalDownPaymentDollar = 0;
    const totalB = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
    const finB = parseFloat(stripNonNumeric(document.getElementById("financedBrokerFee").value)) || 0;
    let totalEarnedBrokerFee = totalB - finB;
    if (totalEarnedBrokerFee < 0) totalEarnedBrokerFee = 0;
    const coverageRows = document.querySelectorAll(".coverage-row");
    coverageRows.forEach(row => {
      const premiumField = row.querySelector(".premium");
      let premium = parseFloat(stripNonNumeric(premiumField?.value)) || 0;
      const tivField = row.querySelector(".tiv");
      const rateField = row.querySelector(".rate");
      if (tivField && tivField.style.display !== "none") {
        let tiv = parseFloat(stripNonNumeric(tivField.value)) || 0;
        let rate = parseFloat(stripNonNumeric(rateField?.value)) || 0;
        premium = tiv * (rate / 100);
      }
      if (premium <= 0) return;
      const taxPctField = row.querySelector(".carrierTax");
      const feeField = row.querySelector(".carrierFee");
      const commissionPctField = row.querySelector(".commissionPct");
      const downPayDollarField = row.querySelector(".downPayDollar");
      const taxPct = taxPctField ? parseFloat(stripNonNumeric(taxPctField.value)) || 0 : 0;
      const fee = feeField ? parseFloat(stripNonNumeric(feeField.value)) || 0 : 0;
      const commissionPct = commissionPctField ? parseFloat(stripNonNumeric(commissionPctField.value)) || 0 : 0;
      const downPayDollar = downPayDollarField ? parseFloat(stripNonNumeric(downPayDollarField.value)) || 0 : 0;
      const effVal = row.querySelector(".effectiveDate")?.value;
      const expVal = row.querySelector(".expirationDate")?.value;
      const endVal = row.querySelector(".endorsementDate")?.value;
      let effDate = new Date(effVal || "");
      let expDate = new Date(expVal || "");
      let endDate = new Date(endVal || "");
      if (isNaN(effDate) || isNaN(expDate) || isNaN(endDate)) return;
      let totalDays = daysBetween(effDate, expDate);
      let remainDays = daysBetween(endDate, expDate);
      if (totalDays <= 0) return;
      let proratedPremium = (premium / totalDays) * remainDays;
      let proratedCarrierTax = proratedPremium * (taxPct / 100);
      let finalAmt = proratedPremium + proratedCarrierTax + fee;
      let commissionDollar = premium * (commissionPct / 100);
      totalDownPaymentDollar += downPayDollar;
      coverageSum += finalAmt;
      row.dataset.proratedPremium = proratedPremium.toFixed(2);
      row.dataset.policyFee = fee.toFixed(2);
      row.dataset.proratedTax = proratedCarrierTax.toFixed(2);
    });
    coverageRows.forEach(row => {
      let finalAmtField = row.querySelector(".finalAmt");
      if (!finalAmtField || finalAmtField.value === "") return;
      let rowFinalAmt = parseFloat(stripNonNumeric(finalAmtField.value));
      let proratedBrokerFee = 0;
      if (coverageSum > 0 && totalEarnedBrokerFee > 0) {
        proratedBrokerFee = (rowFinalAmt / coverageSum) * totalEarnedBrokerFee;
      }
      row.dataset.brokerFee = proratedBrokerFee.toFixed(2);
    });
    populateSecondaryCalculator();
    // Optionally, call populateExtraResults() if needed.
  }
  
  // ------------------- EVENT LISTENERS -------------------
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
  document.getElementById("financedBrokerFee").addEventListener("blur", validateFinancedBrokerFee);
  document.querySelectorAll(".expirationDate").forEach(expInput => {
    expInput.addEventListener("blur", validateExpirationDate);
  });
});
