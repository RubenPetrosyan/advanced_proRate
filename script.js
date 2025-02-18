document.addEventListener("DOMContentLoaded", function () {
  // Utility: Remove non-numeric characters (except the dot)
  function stripNonNumeric(str) {
    return str.replace(/[^0-9.]/g, "");
  }

  // Utility: Calculate day difference (rounded up) between two dates
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

  // Auto-copy dates from Auto Liability row to other rows
  function autoCopyDates() {
    const autoRow = document.querySelector(".auto-liability");
    if (!autoRow) return;
    const effVal = autoRow.querySelector(".effectiveDate")?.value;
    const expVal = autoRow.querySelector(".expirationDate")?.value;
    const endVal = autoRow.querySelector(".endorsementDate")?.value;
    if (!effVal && !expVal && !endVal) return;
    document.querySelectorAll(".coverage-row").forEach(row => {
      if (!row.classList.contains("auto-liability")) {
        if (effVal) row.querySelector(".effectiveDate").value = effVal;
        if (expVal) row.querySelector(".expirationDate").value = expVal;
        if (endVal) row.querySelector(".endorsementDate").value = endVal;
      }
    });
  }

  // Remove Apply to All buttons (they are removed in HTML)

  // Setup numeric fields validations
  function setupNumericFields() {
    document.querySelectorAll(".dollar-input, .percent-input, .numPay-input").forEach(input => {
      // On input: allow only digits and a single dot.
      input.addEventListener("input", function () {
        let raw = stripNonNumeric(this.value);
        const parts = raw.split(".");
        if (parts.length > 2) {
          raw = parts[0] + "." + parts.slice(1).join("");
        }
        // For percent inputs, clamp the value to 0–100 as the user types.
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

      // On focus: remove formatting and clear any error messages
      input.addEventListener("focus", function () {
        this.value = stripNonNumeric(this.value);
        clearError(this);
      });

      // On blur: reformat the value and perform validations
      input.addEventListener("blur", function () {
        let num = parseFloat(stripNonNumeric(this.value));
        if (isNaN(num)) num = 0;
        if (this.classList.contains("dollar-input")) {
          this.value = num.toFixed(2);
        } else if (this.classList.contains("percent-input")) {
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
        } else if (this.classList.contains("numPay-input")) {
          if (num < 1) num = 1;
          if (num > 10) num = 10;
          this.value = String(Math.round(num));
        }
      });
    });
  }

  setupNumericFields();

  // Bidirectional update for Down-Payment fields per row
  function setupDownPaymentBidirectional(row) {
    const premiumInput = row.querySelector(".premium");
    const downPayPctInput = row.querySelector(".downPayPct");
    const downPayDollarInput = row.querySelector(".downPayDollar");

    // When downPayPct changes, update downPayDollar
    downPayPctInput.addEventListener("blur", function () {
      let pct = parseFloat(stripNonNumeric(this.value)) || 0;
      let premium = parseFloat(stripNonNumeric(premiumInput.value)) || 0;
      let dollarVal = premium * (pct / 100);
      downPayDollarInput.value = dollarVal.toFixed(2);
    });

    // When downPayDollar changes, update downPayPct
    downPayDollarInput.addEventListener("blur", function () {
      let dollar = parseFloat(stripNonNumeric(this.value)) || 0;
      let premium = parseFloat(stripNonNumeric(premiumInput.value)) || 0;
      let pctVal = premium ? (dollar / premium) * 100 : 0;
      downPayPctInput.value = pctVal.toFixed(2);
    });
  }

  // Bidirectional update for Carrier Tax fields per row
  function setupCarrierTaxBidirectional(row) {
    const premiumInput = row.querySelector(".premium");
    // For TIV rows, if premium is not directly provided, try TIV * (rate/100)
    const tivInput = row.querySelector(".tiv");
    const rateInput = row.querySelector(".rate");
    const carrierTaxPctInput = row.querySelector(".carrierTax");
    const carrierTaxDollarInput = row.querySelector(".carrierTaxDollar");

    function getBasePremium() {
      let premium = parseFloat(stripNonNumeric(premiumInput.value));
      if ((!premium || premium === 0) && tivInput && rateInput) {
        let tiv = parseFloat(stripNonNumeric(tivInput.value)) || 0;
        let rate = parseFloat(stripNonNumeric(rateInput.value)) || 0;
        premium = tiv * (rate / 100);
      }
      return premium || 0;
    }

    // When carrierTaxPct changes, update carrierTaxDollar
    carrierTaxPctInput.addEventListener("blur", function () {
      let pct = parseFloat(stripNonNumeric(this.value)) || 0;
      let base = getBasePremium();
      let taxDollar = base * (pct / 100);
      carrierTaxDollarInput.value = taxDollar.toFixed(2);
    });

    // When carrierTaxDollar changes, update carrierTaxPct
    carrierTaxDollarInput.addEventListener("blur", function () {
      let taxDollar = parseFloat(stripNonNumeric(this.value)) || 0;
      let base = getBasePremium();
      let pct = base ? (taxDollar / base) * 100 : 0;
      carrierTaxPctInput.value = pct.toFixed(2);
    });
  }

  // For each row, initialize bidirectional updates for Down-Payment and Carrier Tax
  document.querySelectorAll(".coverage-row").forEach(row => {
    setupDownPaymentBidirectional(row);
    setupCarrierTaxBidirectional(row);
  });

  // Main calculation function
  function calculateProRatedAmounts() {
    // Validate Payment Status
    const paymentStatus = document.querySelector('input[name="paymentStatus"]:checked').value;
    if (paymentStatus === "no") {
      alert("Error: Client has not completed payments. Proration cannot be calculated.");
      return;
    }

    // Hide total results initially
    document.getElementById("totalResults").style.display = "none";

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

    // Initialize totals
    let coverageSum = 0;
    let totalDownPaymentDollar = 0;
    let totalEarnedBrokerFee = 0;

    // Get Total Broker Fee and Financed Broker Fee from general inputs
    const totalB = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
    const finB   = parseFloat(stripNonNumeric(document.getElementById("financedBrokerFee").value)) || 0;

    // Process each coverage row
    document.querySelectorAll(".coverage-row").forEach(row => {
      // Retrieve inputs
      const tivField     = row.querySelector(".tiv");
      const rateField    = row.querySelector(".rate");
      const premiumField = row.querySelector(".premium");
      const taxPctField  = row.querySelector(".carrierTax");
      const feeField     = row.querySelector(".carrierFee");
      const commissionPctField = row.querySelector(".commissionPct");
      const downPayPctField = row.querySelector(".downPayPct");
      const downPayDollarField = row.querySelector(".downPayDollar");

      // Determine premium value
      let premium = parseFloat(stripNonNumeric(premiumField?.value)) || 0;
      if (tivField && tivField.style.display !== "none") {
        // For TIV row, use TIV * (rate/100)
        let tiv = parseFloat(stripNonNumeric(tivField.value)) || 0;
        let rate = parseFloat(stripNonNumeric(rateField.value)) || 0;
        premium = tiv * (rate / 100);
      }

      // Read other values
      const taxPct     = taxPctField  ? parseFloat(stripNonNumeric(taxPctField.value))  || 0 : 0;
      const fee        = feeField     ? parseFloat(stripNonNumeric(feeField.value))     || 0 : 0;
      const commissionPct = commissionPctField ? parseFloat(stripNonNumeric(commissionPctField.value)) || 0 : 0;
      const downPayPct = downPayPctField ? parseFloat(stripNonNumeric(downPayPctField.value)) || 0 : 0;
      const downPayDollar = downPayDollarField ? parseFloat(stripNonNumeric(downPayDollarField.value)) || 0 : 0;

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
        row.querySelector(".result").innerText = "Invalid dates!";
        return;
      }

      let totalDays = daysBetween(effDate, expDate);
      let remainDays = daysBetween(endDate, expDate);
      if (totalDays <= 0) {
        row.querySelector(".result").innerText = "Invalid dates!";
        return;
      }

      // Prorated premium before fee/tax
      let proratedPremium = (premium / totalDays) * remainDays;

      // Calculate prorated Carrier Tax in dollars
      let proratedCarrierTax = proratedPremium * (taxPct / 100);

      // Final amount = (prorated premium + prorated carrier tax) + carrier fee
      let finalAmt = proratedPremium + proratedCarrierTax + fee;

      // Commission $ for the row
      let commissionDollar = premium * (commissionPct / 100);

      // Earned Broker Fee for the row is allocated proportionally from (Total Broker Fee - Financed Broker Fee)
      // Proportional share is based on finalAmt relative to overall coverageSum (calculated later)
      // For now, store the row's finalAmt for later allocation.
      // Also, accumulate Down-Payment dollars.
      totalDownPaymentDollar += downPayDollar;

      // Save the computed finalAmt in the row's result cell with detailed breakdown
      let resultHTML = `<div><strong>Final Amt:</strong> $${finalAmt.toFixed(2)}</div>
                        <div><strong>Prorated Carrier TAX:</strong> $${proratedCarrierTax.toFixed(2)}</div>
                        <div><strong>Commission $:</strong> $${commissionDollar.toFixed(2)}</div>`;
      row.querySelector(".result").innerHTML = resultHTML;

      coverageSum += finalAmt;
    });

    // Now, allocate Earned Broker Fee proportionally if coverageSum > 0.
    // Total Earned Broker Fee = Total Broker Fee - Financed Broker Fee.
    totalEarnedBrokerFee = totalB - finB;
    if (totalEarnedBrokerFee < 0) totalEarnedBrokerFee = 0;

    // Update total results
    document.getElementById("totalResult").innerText = "$" + coverageSum.toFixed(2);
    document.getElementById("totalBrokerFeeResult").innerText = "$" + totalB.toFixed(2);
    document.getElementById("totalDownPaymentDollar").innerText = "$" + totalDownPaymentDollar.toFixed(2);
    document.getElementById("earnedBrokerFee").innerText = "$" + totalEarnedBrokerFee.toFixed(2);

    // To Be Earned: Down-Payment + Earned Broker Fee
    const toBeEarned = totalDownPaymentDollar + totalEarnedBrokerFee;
    document.getElementById("toBeEarned").innerText = "$" + toBeEarned.toFixed(2);

    // Financed Amount:
    // If down-payment (per row sum) is 100% then financed amount is 0.
    // Otherwise, financed amount = (coverageSum - totalDownPaymentDollar) + financedBrokerFee.
    let financedAmt = 0;
    // Here, we check if each row's down-payment is 100% is ambiguous; instead, if overall down-payment equals coverageSum, set financedAmt to 0.
    if (totalDownPaymentDollar >= coverageSum) {
      financedAmt = 0;
    } else {
      financedAmt = (coverageSum - totalDownPaymentDollar) + finB;
      if (financedAmt < 0) financedAmt = 0;
    }
    document.getElementById("financedAmount").innerText = "$" + financedAmt.toFixed(2);

    // Monthly Payment calculation based on financed amount, APR, and number of payments.
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
    document.getElementById("monthlyPayment").innerText = "$" + monthlyPay.toFixed(2);

    // Show total results section now that calculation is done
    document.getElementById("totalResults").style.display = "flex";
  }

  // Attach calculate button event and additional validations
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
  document.getElementById("financedBrokerFee").addEventListener("blur", validateFinancedBrokerFee);
  document.querySelectorAll(".expirationDate").forEach(expInput => {
    expInput.addEventListener("blur", validateExpirationDate);
  });

  // Auto-copy dates when Auto Liability row dates change
  // For the auto liability row, set up auto-fill for dates
// For the auto liability row, set up auto-fill for dates
const autoLiabilityRow = document.querySelector(".auto-liability");
if (autoLiabilityRow) {
  const effectiveInput = autoLiabilityRow.querySelector(".effectiveDate");
  const expirationInput = autoLiabilityRow.querySelector(".expirationDate");
  const endorsementInput = autoLiabilityRow.querySelector(".endorsementDate");

  effectiveInput.addEventListener("change", function () {
    let eff = new Date(this.value);
    if (!isNaN(eff.getTime())) {
      // Calculate expiration date as effective date + 1 year
      let expirationDate = new Date(eff);
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      // Format as YYYY-MM-DD for the input field
      expirationInput.value = expirationDate.toISOString().split("T")[0];
    }
    // Copy updated dates to other rows
    autoCopyDates();
  });

  // Also update other rows when expiration or endorsement dates change
  expirationInput.addEventListener("change", autoCopyDates);
  endorsementInput.addEventListener("change", autoCopyDates);
}

// Function to copy dates from Auto Liability row to all other rows
function autoCopyDates() {
  const autoRow = document.querySelector(".auto-liability");
  if (!autoRow) return;
  const effVal = autoRow.querySelector(".effectiveDate")?.value;
  const expVal = autoRow.querySelector(".expirationDate")?.value;
  const endVal = autoRow.querySelector(".endorsementDate")?.value;
  if (!effVal && !expVal && !endVal) return;
  document.querySelectorAll(".coverage-row").forEach(row => {
    if (!row.classList.contains("auto-liability")) {
      if (effVal) row.querySelector(".effectiveDate").value = effVal;
      if (expVal) row.querySelector(".expirationDate").value = expVal;
      if (endVal) row.querySelector(".endorsementDate").value = endVal;
    }
  });
}
