document.addEventListener("DOMContentLoaded", function () {
  // 1) Auto-fill Expiration Date (+1 year)
  document.querySelectorAll(".effectiveDate").forEach(input => {
    input.addEventListener("change", function () {
      const expDateInput = this.closest(".coverage-row").querySelector(".expirationDate");
      let effectiveDate = new Date(this.value);
      if (!isNaN(effectiveDate.getTime())) {
        // Add exactly 1 year
        let newYear = effectiveDate.getFullYear() + 1;
        let expirationDate = new Date(effectiveDate);
        expirationDate.setFullYear(newYear);
        expDateInput.value = expirationDate.toISOString().split("T")[0];
      }
    });
  });

  // 2) "Apply to All" for dates from Auto Liability
  document.querySelectorAll(".applyToAll").forEach(button => {
    button.addEventListener("click", function () {
      const type = this.getAttribute("data-type"); // 'effective', 'expiration', or 'endorsement'
      const firstRowValue = document.querySelector(`.auto-liability .${type}Date`).value;
      if (!firstRowValue) return;
      document.querySelectorAll(`.coverage-row .${type}Date`).forEach(input => {
        if (!input.closest(".auto-liability")) {
          input.value = firstRowValue;
        }
      });
    });
  });

  // 3) On calculate
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);

  // 4) Setup numeric constraints
  setupNumericFields();
});

// Main Calculation => Prorated Premium
function calculateProRatedAmounts() {
  let total = 0;

  document.querySelectorAll(".coverage-row").forEach(row => {
    const tivField     = row.querySelector(".tiv");
    const rateField    = row.querySelector(".rate");
    const premiumField = row.querySelector(".premium");
    const taxField     = row.querySelector(".carrierTax");
    const feeField     = row.querySelector(".carrierFee");

    // Convert to numeric
    const tiv        = tivField     ? parseFloat(stripNonNumeric(tivField.value))     || 0 : 0;
    const rate       = rateField    ? parseFloat(stripNonNumeric(rateField.value))    || 0 : 0;
    let premium      = premiumField ? parseFloat(stripNonNumeric(premiumField.value)) || 0 : 0;
    const carrierTax = taxField     ? parseFloat(stripNonNumeric(taxField.value))     || 0 : 0;
    const carrierFee = feeField     ? parseFloat(stripNonNumeric(feeField.value))     || 0 : 0;

    // If TIV coverage => annual premium = TIV * (rate / 100)
    if (tiv > 0) {
      premium = tiv * (rate / 100);
    }

    // If no premium => skip
    if (!premium) {
      row.querySelector(".result").innerText = "";
      return;
    }

    // 1) totalPolicyDays = (expiration - effective) in days
    const effDate = row.querySelector(".effectiveDate")?.value;
    const expDate = row.querySelector(".expirationDate")?.value;
    const endDate = row.querySelector(".endorsementDate")?.value;

    let effectiveDate    = new Date(effDate || "");
    let expirationDate   = new Date(expDate || "");
    let endorsementDate  = new Date(endDate || "");

    // If any date is invalid => skip
    if (isNaN(effectiveDate) || isNaN(expirationDate) || isNaN(endorsementDate)) {
      row.querySelector(".result").innerText = "";
      return;
    }

    const totalPolicyDays = daysBetween(effectiveDate, expirationDate);
    const remainingDays   = daysBetween(endorsementDate, expirationDate);

    // If totalPolicyDays <= 0 => skip
    if (totalPolicyDays <= 0) {
      row.querySelector(".result").innerText = "Invalid dates!";
      return;
    }

    // 2) prorated = (premium / totalPolicyDays) * remainingDays
    let prorated = (premium / totalPolicyDays) * remainingDays;

    // 3) Add carrierFee => then apply tax
    let finalAmount = prorated + carrierFee;
    finalAmount += finalAmount * (carrierTax / 100);

    row.querySelector(".result").innerText = `$${finalAmount.toFixed(2)}`;
    total += finalAmount;
  });

  // Summation
  document.getElementById("totalResult").innerText = `$${total.toFixed(2)}`;
}

// Utility => day difference ignoring time
function daysBetween(d1, d2) {
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;
  return Math.ceil((d2 - d1) / ONE_DAY_MS);
}

// Remove all non-digit/dot
function stripNonNumeric(str) {
  return str.replace(/[^0-9.]/g, "");
}

// Setup numeric constraints => no vanish on tab
function setupNumericFields() {
  document.querySelectorAll(".dollar-input, .percent-input").forEach(input => {
    // A) Clean input as user types
    input.addEventListener("input", function () {
      let raw = stripNonNumeric(this.value);
      const parts = raw.split(".");
      if (parts.length > 2) {
        // remove extra dots
        raw = parts[0] + "." + parts.slice(1).join("");
      }
      this.value = raw;
    });

    // B) On focus => remove $/% => user sees raw
    input.addEventListener("focus", function() {
      this.value = stripNonNumeric(this.value);
    });

    // C) On blur => parse => format
    input.addEventListener("blur", function() {
      let num = parseFloat(stripNonNumeric(this.value));
      if (isNaN(num)) num = 0;
      if (this.classList.contains("dollar-input")) {
        this.value = `${num.toFixed(2)}`;
      } else if (this.classList.contains("percent-input")) {
        this.value = `${num.toFixed(2)}`;
      }
    });
  });
}
