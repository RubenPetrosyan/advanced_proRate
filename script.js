document.addEventListener("DOMContentLoaded", function () {
  // Utility: Remove non-numeric characters (except the dot)
  function stripNonNumeric(str) {
    return str.replace(/[^0-9.]/g, "");
  }

  // Utility: calculate day difference (rounded up) between two dates
  function daysBetween(d1, d2) {
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    return Math.ceil((d2 - d1) / MS_PER_DAY);
  }

  // Utility functions for showing and clearing error messages
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

  // Validate Financed Broker Fee: cannot exceed Total Broker Fee
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

  // Validate Expiration Date: must not be earlier than the Effective Date
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

  // 1) Auto-fill Expiration Date (+1 year)
  document.querySelectorAll(".effectiveDate").forEach(input => {
    input.addEventListener("change", function () {
      const expDateInput = this.closest(".coverage-row").querySelector(".expirationDate");
      let eff = new Date(this.value);
      if (!isNaN(eff.getTime())) {
        let newYear = eff.getFullYear() + 1;
        let expirationDate = new Date(eff);
        expirationDate.setFullYear(newYear);
        expDateInput.value = expirationDate.toISOString().split("T")[0];
        // Validate in case the auto-filled date doesn't meet the criteria
        validateExpirationDate.call(expDateInput);
      }
    });
  });

  // 2) "Apply to All" for dates from Auto Liability row
  document.querySelectorAll(".applyToAll").forEach(btn => {
    btn.addEventListener("click", function () {
      const type = this.getAttribute("data-type"); // 'effective', 'expiration', or 'endorsement'
      const firstRowVal = document.querySelector(`.auto-liability .${type}Date`).value;
      if (!firstRowVal) return;
      document.querySelectorAll(`.coverage-row .${type}Date`).forEach(dateInput => {
        if (!dateInput.closest(".auto-liability")) {
          dateInput.value = firstRowVal;
          if (type === "expiration") {
            validateExpirationDate.call(dateInput);
          }
        }
      });
    });
  });

  // Setup numeric fields validations
  function setupNumericFields() {
    document.querySelectorAll(".dollar-input, .percent-input, .numPay-input").forEach(input => {
      // A) On input: allow only digits and a single dot.
      // For percent inputs, also clamp the value to the 0–100 range as the user types.
      input.addEventListener("input", function() {
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

      // B) On focus: remove formatting and clear any error messages
      input.addEventListener("focus", function() {
        this.value = stripNonNumeric(this.value);
        clearError(this);
      });

      // C) On blur: reformat the value and perform validations
      input.addEventListener("blur", function() {
        let num = parseFloat(stripNonNumeric(this.value));
        if (isNaN(num)) num = 0;

        if (this.classList.contains("dollar-input")) {
          this.value = num.toFixed(2);
        }
        // For percent inputs, ensure the value is between 0 and 100.
        else if (this.classList.contains("percent-input")) {
          if (num < 0) {
            showError(this, "Percentage cannot be less than 0. Auto-correcting to 0.");
            num = 0;
          } else if (num > 100) {
            showError(this, "Percentage cannot be more than 100. Auto-correcting to 100.");
            num = 100;
          } else {
            clearError(this);
          }
          this.value = num.toFixed(2);
        }
        // Number of Payments: ensure an integer between 1 and 10
        else if (this.classList.contains("numPay-input")) {
          if (num < 1) num = 1;
          if (num > 10) num = 10;
          this.value = String(Math.round(num));
        }
      });
    });
  }

  setupNumericFields();

  // Main calculation function
  function calculateProRatedAmounts() {
    // SAFEGUARD: Clamp all percent inputs to 0–100 in case any are out-of-range.
    document.querySelectorAll(".percent-input").forEach(input => {
      let num = parseFloat(stripNonNumeric(input.value));
      if (isNaN(num)) num = 0;
      if (num < 0) {
        num = 0;
        showError(input, "Percentage cannot be less than 0. Auto-correcting to 0.");
      } else if (num > 100) {
        num = 100;
        showError(input, "Percentage cannot be more than 100. Auto-correcting to 100.");
      } else {
        clearError(input);
      }
      input.value = num.toFixed(2);
    });

    // Prevent calculation if any validation errors exist
    const errorElements = document.querySelectorAll(".error-message");
    for (let err of errorElements) {
      if (err.innerText.trim() !== "") {
        alert("Please fix validation errors before calculating.");
        return;
      }
    }

    // 1) Calculate coverage proration per row => coverageSum
    let coverageSum = 0;
    document.querySelectorAll(".coverage-row").forEach(row => {
      const tivField     = row.querySelector(".tiv");
      const rateField    = row.querySelector(".rate");
      const premiumField = row.querySelector(".premium");
      const taxField     = row.querySelector(".carrierTax");
      const feeField     = row.querySelector(".carrierFee");

      // Read numeric inputs (stripping $/%)
      const tiv        = tivField     ? parseFloat(stripNonNumeric(tivField.value))     || 0 : 0;
      const rate       = rateField    ? parseFloat(stripNonNumeric(rateField.value))    || 0 : 0;
      let premium      = premiumField ? parseFloat(stripNonNumeric(premiumField.value)) || 0 : 0;
      const carrierTax = taxField     ? parseFloat(stripNonNumeric(taxField.value))     || 0 : 0;
      const carrierFee = feeField     ? parseFloat(stripNonNumeric(feeField.value))     || 0 : 0;

      // For TIV-based coverage: annual premium = TIV * (rate/100)
      if (tiv > 0) {
        premium = tiv * (rate / 100);
      }

      // Skip row if no premium
      if (!premium) {
        row.querySelector(".result").innerText = "";
        return;
      }

      // Prorate based on dates
      const effVal = row.querySelector(".effectiveDate")?.value;
      const expVal = row.querySelector(".expirationDate")?.value;
      const endVal = row.querySelector(".endorsementDate")?.value;

      let effDate = new Date(effVal || "");
      let expDate = new Date(expVal || "");
      let endDate = new Date(endVal || "");

      if (isNaN(effDate) || isNaN(expDate) || isNaN(endDate)) {
        row.querySelector(".result").innerText = "";
        return;
      }

      let totalDays = daysBetween(effDate, expDate);
      let remainDays = daysBetween(endDate, expDate);
      if (totalDays <= 0) {
        row.querySelector(".result").innerText = "Invalid dates!";
        return;
      }

      // Prorated premium before fee/tax
      let prorated = (premium / totalDays) * remainDays;

      // Final amount = (prorated * (1 + tax%)) + fee
      let finalAmt = prorated * (1 + carrierTax / 100) + carrierFee;

      // Display row result
      row.querySelector(".result").innerText = `$${finalAmt.toFixed(2)}`;
      coverageSum += finalAmt;
    });

    // Update final result fields
    document.getElementById("totalResult").innerText = `$${coverageSum.toFixed(2)}`;

    // DownPayment: if 0, interpret as 100%
    let dpPct = parseFloat(stripNonNumeric(document.getElementById("downpayment").value)) || 0;
    if (dpPct <= 0) dpPct = 100;
    let dpRatio = dpPct / 100.0;
    const downPaymentDollar = coverageSum * dpRatio;
    document.getElementById("downPaymentDollar").innerText = `$${downPaymentDollar.toFixed(2)}`;

    // Earned Broker Fee: Total Broker Fee - Financed Broker Fee
    const totalB = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
    const finB   = parseFloat(stripNonNumeric(document.getElementById("financedBrokerFee").value)) || 0;
    let earnedBF = totalB - finB;
    if (earnedBF < 0) earnedBF = 0;
    document.getElementById("earnedBrokerFee").innerText = `$${earnedBF.toFixed(2)}`;

    // To Be Earned: DownPayment + Earned Broker Fee
    const toBeEarned = downPaymentDollar + earnedBF;
    document.getElementById("toBeEarned").innerText = `$${toBeEarned.toFixed(2)}`;

    // Financed Amount: (coverageSum - DownPayment) + Financed Broker Fee
    let financedAmt = (coverageSum - downPaymentDollar) + finB;
    if (financedAmt < 0) financedAmt = 0;
    document.getElementById("financedAmount").innerText = `$${financedAmt.toFixed(2)}`;

    // Monthly Payment calculation with APR and number of payments
    let aprRaw = parseFloat(stripNonNumeric(document.getElementById("apr").value)) || 0;
    let nPays  = parseInt(stripNonNumeric(document.getElementById("numPayments").value)) || 1;
    if (nPays < 1) nPays = 1;
    if (nPays > 10) nPays = 10;

    let monthlyPay = 0;
    if (aprRaw === 0) {
      monthlyPay = financedAmt / nPays;
    } else {
      let monthlyRate = (aprRaw / 100) / 12;
      monthlyPay = (monthlyRate * financedAmt) / (1 - Math.pow(1 + monthlyRate, -nPays));
    }
    document.getElementById("monthlyPayment").innerText = `$${monthlyPay.toFixed(2)}`;
  }

  // Attach calculate button event
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
  // Attach additional validations
  document.getElementById("financedBrokerFee").addEventListener("blur", validateFinancedBrokerFee);
  document.querySelectorAll(".expirationDate").forEach(expInput => {
    expInput.addEventListener("blur", validateExpirationDate);
  });
});
