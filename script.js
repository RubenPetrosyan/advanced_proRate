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
  // 1) coverage row proration => coverageSum
  let coverageSum = 0;

  document.querySelectorAll(".coverage-row").forEach(row => {
    const tivField     = row.querySelector(".tiv");
    const rateField    = row.querySelector(".rate");
    const premiumField = row.querySelector(".premium");
    const taxField     = row.querySelector(".carrierTax");
    const feeField     = row.querySelector(".carrierFee");

    // Read numeric inputs (strip $/%)
    const tiv        = tivField     ? parseFloat(stripNonNumeric(tivField.value))     || 0 : 0;
    const rate       = rateField    ? parseFloat(stripNonNumeric(rateField.value))    || 0 : 0;
    let premium      = premiumField ? parseFloat(stripNonNumeric(premiumField.value)) || 0 : 0;
    const carrierTax = taxField     ? parseFloat(stripNonNumeric(taxField.value))     || 0 : 0;
    const carrierFee = feeField     ? parseFloat(stripNonNumeric(feeField.value))     || 0 : 0;

    // If TIV coverage => annual premium = TIV*(rate/100)
    if (tiv > 0) {
      premium = tiv * (rate / 100);
    }

    // If user typed no premium => skip
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

    let totalDays = daysBetween(effDate, expDate);
    let remainDays= daysBetween(endDate, expDate);
    if (totalDays <= 0) {
      row.querySelector(".result").innerText = "Invalid dates!";
      return;
    }

    // prorated portion (before fee/tax)
    let prorated = (premium / totalDays) * remainDays;

    // 2) TAX only the coverage, THEN add fee
    // finalAmt = (prorated * (1 + tax%)) + fee
    let finalAmt = prorated * (1 + carrierTax / 100) + carrierFee;

    // show row result
    row.querySelector(".result").innerText = `$${finalAmt.toFixed(2)}`;
    coverageSum += finalAmt;
  });

  // 2) coverageSum => "Total Prorated Amount"
  document.getElementById("totalResult").innerText = `$${coverageSum.toFixed(2)}`;

  // 3) Additional result lines
  // a) DownPayment => if 0 => interpret 100%
  let dpPct = parseFloat(stripNonNumeric(document.getElementById("downpayment").value)) || 0;
  if (dpPct <= 0) dpPct = 100;
  let dpRatio = dpPct / 100.0;
  const downPaymentDollar = coverageSum * dpRatio;
  document.getElementById("downPaymentDollar").innerText = `$${downPaymentDollar.toFixed(2)}`;

  // b) Earned Broker Fee => totalBrokerFee - financedBrokerFee
  const totalB = parseFloat(stripNonNumeric(document.getElementById("totalBrokerFee").value)) || 0;
  const finB   = parseFloat(stripNonNumeric(document.getElementById("financedBrokerFee").value))|| 0;
  let earnedBF = totalB - finB;
  if (earnedBF < 0) earnedBF = 0;
  document.getElementById("earnedBrokerFee").innerText = `$${earnedBF.toFixed(2)}`;

  // c) ToBeEarned => downPayment + earnedBF
  const toBeEarned = downPaymentDollar + earnedBF;
  document.getElementById("toBeEarned").innerText = `$${toBeEarned.toFixed(2)}`;

  // d) Financed Amount => (coverageSum - downPayment) + financedBrokerFee
  let financedAmt = (coverageSum - downPaymentDollar) + finB;
  if (financedAmt < 0) financedAmt = 0;
  document.getElementById("financedAmount").innerText = `$${financedAmt.toFixed(2)}`;

  // e) monthlyPayment => financedAmt w/ APR% & #Payments
  let aprRaw = parseFloat(stripNonNumeric(document.getElementById("apr").value)) || 0;
  let nPays  = parseInt(stripNonNumeric(document.getElementById("numPayments").value)) || 1;
  if (nPays < 1) nPays = 1;
  if (nPays > 10) nPays = 10;

  let monthlyPay = 0;
  if (aprRaw === 0) {
    // simple division
    monthlyPay = financedAmt / nPays;
  } else {
    // standard loan formula
    let monthlyRate = (aprRaw / 100) / 12;
    monthlyPay = (monthlyRate * financedAmt) /
      (1 - Math.pow(1 + monthlyRate, -nPays));
  }
  document.getElementById("monthlyPayment").innerText = `$${monthlyPay.toFixed(2)}`;
}

// Utility => day difference in days
function daysBetween(d1, d2) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.ceil((d2 - d1) / MS_PER_DAY);
}

// Restrict input => no vanish
function stripNonNumeric(str) {
  return str.replace(/[^0-9.]/g, "");
}

function setupNumericFields() {
  document.querySelectorAll(".dollar-input, .percent-input, .numPay-input").forEach(input => {
    // A) Clean input on typing => only digits & single dot
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

    // C) On blur => parse => reformat
    input.addEventListener("blur", function() {
      let num = parseFloat(stripNonNumeric(this.value));
      if (isNaN(num)) num = 0;
      // Dollar => 2 decimals
      if (this.classList.contains("dollar-input")) {
        this.value = num.toFixed(2);
      }
      // Percent => 2 decimals
      else if (this.classList.contains("percent-input")) {
        this.value = num.toFixed(2);
      }
      // #Payments => integer between 1..10
      else if (this.classList.contains("numPay-input")) {
        if (num < 1) num = 1;
        if (num > 10) num = 10;
        this.value = String(Math.round(num));
      }
    });
  });
}
