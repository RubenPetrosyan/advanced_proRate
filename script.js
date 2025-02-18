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

  // ------------------- MAIN CALCULATION FUNCTION -------------------
  function calculateProRatedAmounts() {
    // Validate Payment Status
    const paymentStatus = document.querySelector('input[name="paymentStatus"]:checked').value;
    if (paymentStatus === "no") {
      alert("Error: Client has not completed payments. Proration cannot be calculated.");
      return;
    }

    // Hide Totals section initially
    document.getElementById("totalResults").style.display = "none";

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

    // Initialize totals
    let coverageSum = 0;
    let totalDownPaymentDollar = 0;
    const totalB = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
    const finB = parseFloat(stripNonNumeric(document.getElementById("financedBrokerFee").value)) || 0;
    let totalEarnedBrokerFee = totalB - finB;
    if (totalEarnedBrokerFee < 0) totalEarnedBrokerFee = 0;

    // Process each coverage row
    const coverageRows = document.querySelectorAll(".coverage-row");
    coverageRows.forEach(row => {
      const coverageName = row.querySelector("td:first-child")?.innerText.trim() || "Unknown Coverage";
      const tivField = row.querySelector(".tiv");
      const rateField = row.querySelector(".rate");
      const premiumField = row.querySelector(".premium");
      const taxPctField = row.querySelector(".carrierTax");
      const feeField = row.querySelector(".carrierFee");
      const commissionPctField = row.querySelector(".commissionPct");
      const downPayDollarField = row.querySelector(".downPayDollar");

      let premium = parseFloat(stripNonNumeric(premiumField?.value)) || 0;
      if (tivField && tivField.style.display !== "none") {
        let tiv = parseFloat(stripNonNumeric(tivField.value)) || 0;
        let rate = parseFloat(stripNonNumeric(rateField?.value)) || 0;
        premium = tiv * (rate / 100);
      }
      if (premium <= 0) return;

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

      const finalAmtField = row.querySelector(".finalAmt");
      const proratedTaxField = row.querySelector(".proratedTax");
      const proratedBrokerFeeField = row.querySelector(".proratedBrokerFee");
      const commissionDollarField = row.querySelector(".commissionDollar");

      if (finalAmtField) finalAmtField.value = "$" + finalAmt.toFixed(2);
      if (proratedTaxField) proratedTaxField.value = "$" + proratedCarrierTax.toFixed(2);
      if (commissionDollarField) commissionDollarField.value = "$" + commissionDollar.toFixed(2);
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
    });

    // Update Totals Section
    document.getElementById("totalResult").innerText = "$" + coverageSum.toFixed(2);
    document.getElementById("totalBrokerFeeResult").innerText = "$" + totalB.toFixed(2);
    document.getElementById("totalDownPaymentDollar").innerText = "$" + totalDownPaymentDollar.toFixed(2);
    document.getElementById("earnedBrokerFee").innerText = "$" + totalEarnedBrokerFee.toFixed(2);
    const toBeEarned = totalDownPaymentDollar + totalEarnedBrokerFee;
    document.getElementById("toBeEarned").innerText = "$" + toBeEarned.toFixed(2);

    let financedAmt = 0;
    if (totalDownPaymentDollar >= coverageSum) {
      financedAmt = 0;
    } else {
      financedAmt = (coverageSum - totalDownPaymentDollar) + finB;
      if (financedAmt < 0) financedAmt = 0;
    }
    document.getElementById("financedAmount").innerText = "$" + financedAmt.toFixed(2);

    let aprRaw = parseFloat(stripNonNumeric(document.getElementById("apr").value)) || 0;
    let nPays = parseInt(stripNonNumeric(document.getElementById("numPayments").value)) || 1;
    if (nPays < 1) nPays = 1;
    if (nPays > 10) nPays = 10;

    let monthlyPay = 0;
    if (aprRaw === 0) {
      monthlyPay = financedAmt / nPays;
    } else {
      let monthlyRate = (aprRaw / 100) / 12;
      monthlyPay = (monthlyRate * financedAmt) / (1 - Math.pow(1 + monthlyRate, -nPays));
    }
    document.getElementById("monthlyPayment").innerText = "$" + monthlyPay.toFixed(2);

    // Show Totals Section
    document.getElementById("totalResults").style.display = "flex";
  }

  // ------------------- EVENT LISTENERS -------------------
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
  document.getElementById("financedBrokerFee").addEventListener("blur", validateFinancedBrokerFee);
  document.querySelectorAll(".expirationDate").forEach(expInput => {
    expInput.addEventListener("blur", validateExpirationDate);
  });
});
