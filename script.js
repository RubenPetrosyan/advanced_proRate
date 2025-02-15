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

  // coverage row logic => sum
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

    // if no premium => skip
    if (!premium) {
      row.querySelector(".result").innerText = "";
      return;
    }

    // date-based proration
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
    let remainDays= daysBetween(endDate, expDate);

    if (totalDays <= 0) {
      row.querySelector(".result").innerText = "Invalid dates!";
      return;
    }

    // prorated
    let prorated = (premium / totalDays) * remainDays;

    // add fee => then tax
    let finalAmt = prorated + carrierFee;
    finalAmt += finalAmt * (carrierTax / 100);

    row.querySelector(".result").innerText = `$${finalAmt.toFixed(2)}`;
    coverageTotal += finalAmt;
  });

  // add Broker Fee to coverage total
  const brokerFee = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
  let preliminaryTotal = coverageTotal + brokerFee;

  // show total prorated
  document.getElementById("totalResult").innerText = `$${preliminaryTotal.toFixed(2)}`;

  // monthly payment => using # of payments (1..10) & APR
  let aprRaw  = parseFloat(stripNonNumeric(document.getElementById("apr").value)) || 0;
  let numPays = parseInt(stripNonNumeric(document.getElementById("numPayments").value)) || 1;
  if (numPays < 1) numPays = 1;
  if (numPays > 10) numPays = 10;

  let monthlyPay = 0;
  if (aprRaw === 0) {
    // simple division
    monthlyPay = preliminaryTotal / numPays;
  } else {
    // standard loan formula
    let monthlyRate = (aprRaw / 100) / 12;
    monthlyPay = (monthlyRate * preliminaryTotal) /
      (1 - Math.pow(1 + monthlyRate, -numPays));
  }

  document.getElementById("monthlyPayment").innerText = `$${monthlyPay.toFixed(2)}`;
}

function daysBetween(d1, d2) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.ceil((d2 - d1) / MS_PER_DAY);
}

function stripNonNumeric(str) {
  return str.replace(/[^0-9.]/g, "");
}

function setupNumericFields() {
  // handle .dollar-input, .percent-input, and .numPay-input
  document.querySelectorAll(".dollar-input, .percent-input, .numPay-input").forEach(input => {

    // remove invalid chars as user types
    input.addEventListener("input", function() {
      let raw = stripNonNumeric(this.value);
      const parts = raw.split(".");
      if (parts.length > 2) {
        raw = parts[0] + "." + parts.slice(1).join("");
      }
      this.value = raw;
    });

    // on focus => remove $ or %
    input.addEventListener("focus", function() {
      this.value = stripNonNumeric(this.value);
    });

    // on blur => parse => reformat if needed
    input.addEventListener("blur", function() {
      let num = parseFloat(stripNonNumeric(this.value));
      if (isNaN(num)) num = 0;
      if (this.classList.contains("dollar-input")) {
        // keep as decimal
        this.value = num.toFixed(2);
      } else if (this.classList.contains("percent-input")) {
        // keep as decimal
        this.value = num.toFixed(2);
      } else if (this.classList.contains("numPay-input")) {
        // 1..10
        if (num < 1) num = 1;
        if (num > 10) num = 10;
        this.value = String(Math.round(num));
      }
    });
  });
}
