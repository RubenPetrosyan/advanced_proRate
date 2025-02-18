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
  // ------------------- BIDIRECTIONAL LOGIC PER ROW -------------------
  // (Down Payment and Carrier Tax bidirectional logic remain even though those columns are not visible in the main table;
  // they may still be used in extra detailed results if needed. You can remove them if desired.)
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
  // ------------------- EXTRA DETAILED RESULTS SECTION -------------------
  // This section will appear after Calculate is clicked.
  // It displays extra input fields for each coverage that had a premium:
  // Prorated Premium, Policy Fee, Broker Fee, Prorated Tax – each with Down Payment % and Down Payment Amount.
  function populateExtraResults() {
    const extraContainer = document.getElementById("extraResultsContainer");
    extraContainer.innerHTML = "";
    const coverageRows = document.querySelectorAll(".coverage-row");
    coverageRows.forEach(row => {
      const premiumField = row.querySelector(".premium");
      let premium = parseFloat(stripNonNumeric(premiumField?.value)) || 0;
      if (premium <= 0) return;
      const coverageName = row.querySelector("td:first-child")?.innerText.trim() || "Unknown Coverage";
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
      let basePremium = premium;
      let proratedPremium = (basePremium / totalDays) * remainDays;
      let feeField = row.querySelector(".carrierFee");
      let policyFee = feeField ? parseFloat(stripNonNumeric(feeField.value)) || 0 : 0;
      let proratedTaxField = row.querySelector(".proratedTax");
      let proratedTax = proratedTaxField ? parseFloat(stripNonNumeric(proratedTaxField.value)) || 0 : 0;
      let brokerFeeField = row.querySelector(".proratedBrokerFee");
      let brokerFee = brokerFeeField ? parseFloat(stripNonNumeric(brokerFeeField.value)) || 0 : 0;
      let extraHtml = `
        <div class="extra-result-row">
          <h3>${coverageName} - Detailed Results</h3>
          <table>
            <thead>
              <tr>
                <th>Line Item</th>
                <th>Amount ($)</th>
                <th>Down Payment %</th>
                <th>Down Payment $</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Prorated Premium</td>
                <td><input type="text" class="extra-amount" value="${proratedPremium.toFixed(2)}" readonly /></td>
                <td><input type="text" class="extra-dpPct" value="0" /></td>
                <td><input type="text" class="extra-dpAmt" value="0" /></td>
              </tr>
              <tr>
                <td>Policy Fee</td>
                <td><input type="text" class="extra-amount" value="${policyFee.toFixed(2)}" readonly /></td>
                <td><input type="text" class="extra-dpPct" value="0" /></td>
                <td><input type="text" class="extra-dpAmt" value="0" /></td>
              </tr>
              <tr>
                <td>Broker Fee</td>
                <td><input type="text" class="extra-amount" value="${brokerFee.toFixed(2)}" readonly /></td>
                <td><input type="text" class="extra-dpPct" value="0" /></td>
                <td><input type="text" class="extra-dpAmt" value="0" /></td>
              </tr>
              <tr>
                <td>Prorated Tax</td>
                <td><input type="text" class="extra-amount" value="${proratedTax.toFixed(2)}" readonly /></td>
                <td><input type="text" class="extra-dpPct" value="0" /></td>
                <td><input type="text" class="extra-dpAmt" value="0" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      extraContainer.innerHTML += extraHtml;
    });
    if (extraContainer.innerHTML.trim() !== "") {
      extraContainer.style.display = "block";
    }
  }
  // ------------------- MAIN CALCULATION FUNCTION -------------------
  function calculateProRatedAmounts() {
    // Validate Payment Status
    const paymentStatus = document.querySelector('input[name="paymentStatus"]:checked').value;
    if (paymentStatus === "no") {
      alert("Error: Client has not completed payments. Proration cannot be calculated.");
      return;
    }
    // Clamp all percent inputs & check for errors
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
    // Initialize totals (used internally for per-row calculations)
    let coverageSum = 0;
    let totalDownPaymentDollar = 0;
    const totalB = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
    const finB = parseFloat(stripNonNumeric(document.getElementById("financedBrokerFee").value)) || 0;
    let totalEarnedBrokerFee = totalB - finB;
    if (totalEarnedBrokerFee < 0) totalEarnedBrokerFee = 0;
    // Process each coverage row
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
      if (premium <= 0) return; // process only rows with a premium
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
      // Update main table result fields (if still needed for reference)
      const finalAmtField = row.querySelector(".finalAmt");
      const proratedTaxField = row.querySelector(".proratedTax");
      const commissionDollarField = row.querySelector(".commissionDollar");
      if (finalAmtField) finalAmtField.value = "$" + finalAmt.toFixed(2);
      if (proratedTaxField) proratedTaxField.value = "$" + proratedCarrierTax.toFixed(2);
      if (commissionDollarField) commissionDollarField.value = "$" + commissionDollar.toFixed(2);
      // Save extra data in dataset for extra results:
      row.dataset.proratedPremium = proratedPremium.toFixed(2);
      row.dataset.policyFee = fee.toFixed(2);
      row.dataset.brokerFee = ""; // will be allocated later
      row.dataset.proratedTax = proratedCarrierTax.toFixed(2);
    });
    // Allocate prorated broker fee per row
    coverageRows.forEach(row => {
      let finalAmtField = row.querySelector(".finalAmt");
      if (!finalAmtField || finalAmtField.value === "") return;
      let rowFinalAmt = parseFloat(stripNonNumeric(finalAmtField.value));
      let proratedBrokerFee = 0;
      if (coverageSum > 0 && totalEarnedBrokerFee > 0) {
        proratedBrokerFee = (rowFinalAmt / coverageSum) * totalEarnedBrokerFee;
      }
      let proratedBrokerFeeField = row.querySelector(".proratedBrokerFee");
      if (proratedBrokerFeeField)
        proratedBrokerFeeField.value = "$" + proratedBrokerFee.toFixed(2);
      row.dataset.brokerFee = proratedBrokerFee.toFixed(2);
    });
    // Populate extra detailed results section
    populateExtraResults();
  }
  // ------------------- EVENT LISTENERS -------------------
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
  document.getElementById("financedBrokerFee").addEventListener("blur", validateFinancedBrokerFee);
  document.querySelectorAll(".expirationDate").forEach(expInput => {
    expInput.addEventListener("blur", validateExpirationDate);
  });
});
