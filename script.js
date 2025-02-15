document.addEventListener("DOMContentLoaded", function () {
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
      }
    });
  });

  // 2) "Apply to All" for dates from Auto Liability
  document.querySelectorAll(".applyToAll").forEach(btn => {
    btn.addEventListener("click", function () {
      const type = this.getAttribute("data-type"); // 'effective', 'expiration', or 'endorsement'
      const firstRowVal = document.querySelector(`.auto-liability .${type}Date`).value;
      if (!firstRowVal) return;
      document.querySelectorAll(`.coverage-row .${type}Date`).forEach(dateInput => {
        if (!dateInput.closest(".auto-liability")) {
          dateInput.value = firstRowVal;
        }
      });
    });
  });

  // 3) On calculate
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);

  // 4) Setup numeric constraints
  setupNumericFields();
});

function calculateProRatedAmounts() {
  let coverageTotal = 0;

  // 1) Sum coverage proration
  document.querySelectorAll(".coverage-row").forEach(row => {
    const tivField     = row.querySelector(".tiv");
    const rateField    = row.querySelector(".rate");
    const premiumField = row.querySelector(".premium");
    const taxField     = row.querySelector(".carrierTax");
    const feeField     = row.querySelector(".carrierFee");

    const tiv        = tivField     ? parseFloat(stripNonNumeric(tivField.value))     || 0 : 0;
    const rate       = rateField    ? parseFloat(stripNonNumeric(rateField.value))    || 0 : 0;
    let premium      = premiumField ? parseFloat(stripNonNumeric(premiumField.value)) || 0 : 0;
    const carrierTax = taxField     ? parseFloat(stripNonNumeric(taxField.value))     || 0 : 0;
    const carrierFee = feeField     ? parseFloat(stripNonNumeric(feeField.value))     || 0 : 0;

    // TIV => annual premium = TIV * (rate / 100)
    if (tiv > 0) {
      premium = tiv * (rate / 100);
    }

    // If no premium => skip
    if (!premium) {
      row.querySelector(".result").innerText = "";
      return;
    }

    // Prorate by dates
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

    // Days calc
    let totalDays = daysBetween(effDate, expDate);
    let remainDays = daysBetween(endDate, expDate);

    if (totalDays <= 0) {
      row.querySelector(".result").innerText = "Invalid dates!";
      return;
    }

    let prorated = (premium / totalDays) * remainDays;

    // Add carrier fee => then tax
    let finalAmount = prorated + carrierFee;
    finalAmount += finalAmount * (carrierTax / 100);

    row.querySelector(".result").innerText = `$${finalAmount.toFixed(2)}`;
    coverageTotal += finalAmount;
  });

  // 2) Add Broker Fee
  const brokerFee = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
  let preliminaryTotal = coverageTotal + brokerFee;

  // 3) Show "Total Prorated Amount"
  document.getElementById("totalResult").innerText = `$${preliminaryTotal.toFixed(2)}`;

  // 4) Calculate Monthly Payment => APR & #Payments
  let aprRaw  = parseFloat(stripNonNumeric(document.getElementById("apr").value)) || 0;
  let numPays = parseInt(stripNonNumeric(document.getElementById("numPayments").value)) || 1;

  // Restrict numPays to [1..10]
  if (numPays < 1) numPays = 1;
  if (numPays > 10) numPays = 10;

  let monthlyPay = 0;
  // If aprRaw == 0 => simple monthly
  if (aprRaw === 0) {
    monthlyPay = preliminaryTotal / numPays;
  } else {
    // standard loan formula => APR is annual => monthlyRate = (aprRaw / 100)/12
    let monthlyRate = (aprRaw / 100) / 12;
    monthlyPay = (monthlyRate * preliminaryTotal) /
      (1 - Math.pow(1 + monthlyRate, -numPays));
  }

  // 5) Show "Monthly Payment"
  document.getElementById("monthlyPayment").innerText = `$${monthlyPay.toFixed(2)}`;
}

function daysBetween(d1, d2) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.ceil((d2 - d1) / MS_PER_DAY);
}

// Convert to numeric
function stripNonNumeric(str) {
  return str.replace(/[^0-9.]/g, "");
}

function setupNumericFields() {
  // a) Add numeric logic to all .dollar-input, .percent-input, plus #numPayments
  document.querySelectorAll(".dollar-input, .percent-input, .numPay-input").forEach(input => {

    // A) Clean typed input => only digits & one dot
    input.addEventListener("input", function() {
      let raw = stripNonNumeric(this.value);
      const parts = raw.split(".");
      if (parts.length > 2) {
        raw = parts[0] + "." + parts.slice(1).join("");
      }
      this.value = raw;
    });

    // B) On focus => remove $ or %
    input.addEventListener("focus", function() {
      this.value = stripNonNumeric(this.value);
    });

    // C) On blur => format if needed
    input.addEventListener("blur", function() {
      let num = parseFloat(stripNonNumeric(this.value)) || 0;
      // if it's a dollar or percent => do standard format
      if (this.classList.contains("dollar-input")) {
        this.value = num.toFixed(2);
      } else if (this.classList.contains("percent-input")) {
        this.value = num.toFixed(2);
      } else if (this.classList.contains("numPay-input")) {
        // must be 1..10
        if (num < 1) num = 1;
        if (num > 10) num = 10;
        this.value = num.toFixed(0); // integer
      }
    });
  });
}
