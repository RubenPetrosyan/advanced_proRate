document.addEventListener("DOMContentLoaded", function () {
  // 1) Auto-fill Expiration Date (+1 year)
  document.querySelectorAll(".effectiveDate").forEach(input => {
    input.addEventListener("change", function () {
      const expDateInput = this.closest(".coverage-row").querySelector(".expirationDate");
      let effectiveDate = new Date(this.value);
      if (!isNaN(effectiveDate.getTime())) {
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
      const type = this.getAttribute("data-type"); // effective, expiration, or endorsement
      const firstRowValue = document.querySelector(`.auto-liability .${type}Date`).value;
      if (!firstRowValue) return;
      document.querySelectorAll(`.coverage-row .${type}Date`).forEach(input => {
        if (!input.closest(".auto-liability")) {
          input.value = firstRowValue;
        }
      });
    });
  });

  // 3) Calculate on click
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);

  // 4) Enforce numeric constraints & format on blur
  setupNumericFields();
});

// Main Calculation
function calculateProRatedAmounts() {
  let total = 0;

  document.querySelectorAll(".coverage-row").forEach(row => {
    const tivField       = row.querySelector(".tiv");
    const rateField      = row.querySelector(".rate");
    const premiumField   = row.querySelector(".premium");
    const taxField       = row.querySelector(".carrierTax");
    const feeField       = row.querySelector(".carrierFee");

    // Convert to numeric (remove $ or % if any got forced in)
    const tiv        = tivField    ? parseFloat(tivField.value.replace(/[^\d.]/g, ""))    || 0 : 0;
    const rate       = rateField   ? parseFloat(rateField.value.replace(/[^\d.]/g, ""))   || 0 : 0;
    let premium      = premiumField? parseFloat(premiumField.value.replace(/[^\d.]/g, ""))|| 0 : 0;
    const carrierTax = taxField    ? parseFloat(taxField.value.replace(/[^\d.]/g, ""))    || 0 : 0;
    const carrierFee = feeField    ? parseFloat(feeField.value.replace(/[^\d.]/g, ""))    || 0 : 0;

    // If TIV coverage => premium = TIV * (rate / 100)
    if (tiv > 0) {
      premium = tiv * (rate / 100);
    }

    if (!premium) {
      row.querySelector(".result").innerText = "";
      return; // skip if no premium
    }

    // totalAmount = (premium + carrierFee) + tax
    let totalAmount = premium + carrierFee;
    totalAmount += totalAmount * (carrierTax / 100);

    row.querySelector(".result").innerText = `$${totalAmount.toFixed(2)}`;
    total += totalAmount;
  });

  document.getElementById("totalResult").innerText = `$${total.toFixed(2)}`;
}

// Numeric Fields => type number + auto-format on blur
function setupNumericFields() {
  document.querySelectorAll(".dollar-input, .percent-input").forEach(input => {

    // A) Clean input (only digits & dot) as user types
    input.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9.]/g, "");
      // Ensure only one dot
      const parts = this.value.split(".");
      if (parts.length > 2) {
        this.value = parts[0] + "." + parts.slice(1).join("");
      }
    });

    // B) On focus => remove $/% from display
    input.addEventListener("focus", function() {
      this.value = this.value.replace(/[$%]/g, "");
    });

    // C) On blur => parse to float & reformat
    input.addEventListener("blur", function() {
      let raw = parseFloat(this.value);
      if (isNaN(raw)) {
        // If user typed nothing valid => default to 0
        raw = 0;
      }
      if (this.classList.contains("dollar-input")) {
        this.value = `$${raw.toFixed(2)}`;
      } else if (this.classList.contains("percent-input")) {
        this.value = `${raw.toFixed(2)}%`;
      }
    });
  });
}
