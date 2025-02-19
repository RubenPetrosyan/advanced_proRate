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
            showError(this, "Percentage cannot exceed 100. Auto-correcting to 100.");
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
    const premiumInput = row.classList.contains("tiv-row") 
      ? row.querySelector(".tiv") 
      : row.querySelector(".premium");
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
  function populateSecondaryCalculator() {
    const secContainer = document.getElementById("secondaryBlocks");
    secContainer.innerHTML = "";
    const coverageRows = document.querySelectorAll(".coverage-row");
    coverageRows.forEach(row => {
      let premium = 0;
      if (row.classList.contains("tiv-row")) {
        const tivField = row.querySelector(".tiv");
        premium = parseFloat(stripNonNumeric(tivField?.value)) || 0;
      } else {
        const premiumField = row.querySelector(".premium");
        premium = parseFloat(stripNonNumeric(premiumField?.value)) || 0;
      }
      if (premium <= 0) return; // skip rows with no premium
      const coverageName = row.querySelector("td:first-child")?.innerText.trim() || "Unknown Coverage";
      
      let proratedPremium = row.dataset.proratedPremium || "0.00";
      let policyFee      = row.dataset.policyFee      || "0.00";
      let proratedTax    = row.dataset.proratedTax    || "0.00";

      // If auto liability => show broker fee row
      let isAuto = row.classList.contains("auto-liability");
      let brokerFeeHtml = "";
      if (isAuto) {
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

      // Commission row for all coverage
      let commissionRowHtml = `
        <tr data-line="commission">
          <td>Commission</td>
          <td><input type="text" class="sec-commBase" value="${proratedPremium}" readonly /></td>
          <td><input type="text" class="sec-commPct" value="" placeholder="Commission %" /></td>
          <td><input type="text" class="sec-commDollar" value="0" placeholder="$" readonly /></td>
        </tr>
      `;

      let blockHtml = `
        <div class="secondary-block" data-last-edited="pct">
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

          <!-- Commission Table -->
          <table>
            <thead>
              <tr>
                <th>Line Item</th>
                <th>Amount ($)</th>
                <th>Commission % (Required)</th>
                <th>Commission $</th>
              </tr>
            </thead>
            <tbody>
              ${commissionRowHtml}
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
    
    // Focus events for DP fields
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
    
    // Event delegation for "Calculate DP"
    document.getElementById("secondaryBlocks").addEventListener("click", function(e) {
      if (e.target && e.target.matches(".sec-calcDP")) {
        const block = e.target.closest(".secondary-block");
        const lastEdited = block.dataset.lastEdited || "pct";

        // 1) Commission row logic
        const commRow = block.querySelector('tr[data-line="commission"]');
        if (commRow) {
          let baseEl = commRow.querySelector(".sec-commBase");
          let pctEl  = commRow.querySelector(".sec-commPct");
          let dolEl  = commRow.querySelector(".sec-commDollar");
          let baseVal = parseFloat(stripNonNumeric(baseEl.value)) || 0;
          let pctVal  = parseFloat(stripNonNumeric(pctEl.value));
          if (isNaN(pctVal)) {
            showError(pctEl, "Commission% is required.");
            return; // skip
          } else {
            clearError(pctEl);
          }
          if (pctVal < 0) pctVal = 0;
          if (pctVal > 100) pctVal = 100;
          let commDollar = baseVal * (pctVal / 100);
          dolEl.value = commDollar.toFixed(2);
        }

        // 2) DP calc on first table
        block.querySelectorAll("table:nth-of-type(1) tbody tr").forEach(tr => {
          const line = tr.dataset.line;
          if (!line) return;
          const amountInput = tr.querySelector(".sec-amount");
          const dpPctInput  = tr.querySelector(".sec-dpPct");
          const dpAmtInput  = tr.querySelector(".sec-dpAmt");
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
    let coverageRows = document.querySelectorAll(".coverage-row");
    coverageRows.forEach(row => {
      // 1) Determine premium
      let premium = 0;
      if (row.classList.contains("tiv-row")) {
        const tivField = row.querySelector(".tiv");
        premium = parseFloat(stripNonNumeric(tivField?.value)) || 0;
      } else {
        const premiumField = row.querySelector(".premium");
        premium = parseFloat(stripNonNumeric(premiumField?.value)) || 0;
      }
      const tivField = row.querySelector(".tiv");
      const rateField = row.querySelector(".rate");
      if (tivField && tivField.style.display !== "none") {
        let tiv = parseFloat(stripNonNumeric(tivField.value)) || 0;
        let rate = parseFloat(stripNonNumeric(rateField?.value)) || 0;
        premium = tiv * (rate / 100);
      }
      if (premium <= 0) return;

      // 2) Prorate by dates
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

      // 3) Tax% & Fee
      let taxPctField = row.querySelector(".carrierTax");
      let feeField    = row.querySelector(".carrierFee");
      let taxPct = taxPctField ? parseFloat(stripNonNumeric(taxPctField.value)) || 0 : 0;
      let fee    = feeField    ? parseFloat(stripNonNumeric(feeField.value))    || 0 : 0;

      let proratedPremium    = (premium / totalDays) * remainDays;
      let proratedCarrierTax = proratedPremium * (taxPct / 100);

      row.dataset.proratedPremium = proratedPremium.toFixed(2);
      row.dataset.policyFee       = fee.toFixed(2);
      row.dataset.proratedTax     = proratedCarrierTax.toFixed(2);
    });

    populateSecondaryCalculator();
  }

  // ------------------- PRODUCER QUOTE FUNCTION -------------------
  function generateProducerQuote() {
    const blocks = document.querySelectorAll(".secondary-block");
    if (!blocks.length) {
      alert("No data in secondary calculator. Please Calculate Main and fill Secondary blocks first.");
      return;
    }

    // We'll accumulate coverage data
    let coverageData = [];
    let pageTotals = {
      premiumAmt: 0,
      dpAmt: 0,
      financed: 0,
      payProducer: 0,
      payGenAgent: 0
    };

    blocks.forEach(block => {
      let coverageName = block.querySelector("h3")?.innerText || "Unknown Coverage";
      let coverageItems = [];
      let coverageTotals = {
        premiumAmt: 0,
        dpAmt: 0,
        financed: 0,
        payProducer: 0,
        payGenAgent: 0
      };

      // 1) Commission row => we read Commission% & Commission$ for the Premium row usage
      let commRow = block.querySelector('tr[data-line="commission"]');
      let commissionDollar = 0; // default
      if (commRow) {
        let baseEl = commRow.querySelector(".sec-commBase");
        let pctEl  = commRow.querySelector(".sec-commPct");
        let dolEl  = commRow.querySelector(".sec-commDollar");
        let baseVal = parseFloat(stripNonNumeric(baseEl?.value)) || 0;
        let pctVal  = parseFloat(stripNonNumeric(pctEl?.value)) || 0;
        commissionDollar = parseFloat(stripNonNumeric(dolEl?.value)) || 0;
        // if needed, clamp or handle errors
      }

      // 2) Table #1 has Prorated Premium, Policy Fee, Broker Fee, Tax
      let mainRows = block.querySelectorAll('table:nth-of-type(1) tbody tr');
      mainRows.forEach(tr => {
        let line = tr.dataset.line || "";
        let mappedName = mapLineItemName(line);

        // read row amount, dp, etc.
        let amtEl  = tr.querySelector(".sec-amount");
        let pctEl  = tr.querySelector(".sec-dpPct");
        let dpEl   = tr.querySelector(".sec-dpAmt");

        let amtVal  = parseFloat(stripNonNumeric(amtEl?.value)) || 0;
        let dpPct   = parseFloat(stripNonNumeric(pctEl?.value)) || 0;
        let dpVal   = parseFloat(stripNonNumeric(dpEl?.value)) || 0;
        let financed = amtVal - dpVal;

        // Now apply your custom logic:
        let payProducer = 0;
        let payGenAgent = 0;

        switch (line) {
          case "proratedPremium":
            // Premium row: 
            //   Pay Producer = Commission$
            //   Pay Gen Agent = DP - Commission$
            payProducer = commissionDollar;
            payGenAgent = dpVal - commissionDollar;
            if (payGenAgent < 0) {
              // If DP < Commission, clamp or handle error
              payGenAgent = 0;
            }
            break;

          case "policyFee":
            // Policy Fee row:
            //   Pay Producer = 0
            //   Pay Gen Agent = DP
            payProducer = 0;
            payGenAgent = dpVal;
            break;

          case "brokerFee":
            // Broker Fee row:
            //   Pay Producer = DP
            //   Pay Gen Agent = financed portion
            payProducer = dpVal;
            payGenAgent = financed;
            break;

          case "proratedTax":
            // Tax row:
            //   Pay Producer = 0
            //   Pay Gen Agent = DP
            payProducer = 0;
            payGenAgent = dpVal;
            break;
        }

        // store line item
        coverageItems.push({
          name: mappedName,
          amt: amtVal,
          dpPct,
          dpVal,
          financed,
          payProducer,
          payGenAgent
        });

        // update coverage totals
        coverageTotals.premiumAmt  += amtVal;
        coverageTotals.dpAmt       += dpVal;
        coverageTotals.financed    += financed;
        coverageTotals.payProducer += payProducer;
        coverageTotals.payGenAgent += payGenAgent;
      });

      // update page totals
      pageTotals.premiumAmt   += coverageTotals.premiumAmt;
      pageTotals.dpAmt        += coverageTotals.dpAmt;
      pageTotals.financed     += coverageTotals.financed;
      pageTotals.payProducer  += coverageTotals.payProducer;
      pageTotals.payGenAgent  += coverageTotals.payGenAgent;

      coverageData.push({
        coverageName,
        items: coverageItems,
        totals: coverageTotals
      });
    });

    // Build new tab
    let newTab = window.open("", "_blank");
    if (!newTab) {
      alert("Pop-up blocked. Please allow pop-ups for this site.");
      return;
    }

    let html = `
    <html>
    <head>
      <title>Producer Quote</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        h1, h2 {
          text-align: center;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 8px;
          text-align: right;
        }
        th {
          background-color: #f2f2f2;
        }
        .lineName {
          text-align: left;
        }
        .totalsRow {
          font-weight: bold;
          background-color: #fafafa;
        }
      </style>
    </head>
    <body>
      <h1>Producer Quote</h1>
    `;

    // For each coverage
    coverageData.forEach(cov => {
      html += `
        <h2>${cov.coverageName}</h2>
        <table>
          <thead>
            <tr>
              <th class="lineName">Line Item</th>
              <th>Premium Amount</th>
              <th>Down Payment %</th>
              <th>Down Payment</th>
              <th>Amount Financed</th>
              <th>Pay: Producer</th>
              <th>Pay: Gen Agent</th>
            </tr>
          </thead>
          <tbody>
      `;
      cov.items.forEach(item => {
        html += `
          <tr>
            <td class="lineName">${item.name}</td>
            <td>${item.amt.toFixed(2)}</td>
            <td>${item.dpPct.toFixed(2)}</td>
            <td>${item.dpVal.toFixed(2)}</td>
            <td>${item.financed.toFixed(2)}</td>
            <td>${item.payProducer.toFixed(2)}</td>
            <td>${item.payGenAgent.toFixed(2)}</td>
          </tr>
        `;
      });
      html += `
          <tr class="totalsRow">
            <td class="lineName">Total for ${cov.coverageName}</td>
            <td>${cov.totals.premiumAmt.toFixed(2)}</td>
            <td>-</td>
            <td>${cov.totals.dpAmt.toFixed(2)}</td>
            <td>${cov.totals.financed.toFixed(2)}</td>
            <td>${cov.totals.payProducer.toFixed(2)}</td>
            <td>${cov.totals.payGenAgent.toFixed(2)}</td>
          </tr>
        </tbody>
        </table>
      `;
    });

    // Page Totals
    html += `
      <table>
        <thead>
          <tr>
            <th class="lineName">Page Totals</th>
            <th>Premium Amount</th>
            <th>Down Payment %</th>
            <th>Down Payment</th>
            <th>Amount Financed</th>
            <th>Pay: Producer</th>
            <th>Pay: Gen Agent</th>
          </tr>
        </thead>
        <tbody>
          <tr class="totalsRow">
            <td class="lineName">Page Totals</td>
            <td>${pageTotals.premiumAmt.toFixed(2)}</td>
            <td>-</td>
            <td>${pageTotals.dpAmt.toFixed(2)}</td>
            <td>${pageTotals.financed.toFixed(2)}</td>
            <td>${pageTotals.payProducer.toFixed(2)}</td>
            <td>${pageTotals.payGenAgent.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
    `;

    html += `</body></html>`;
    newTab.document.write(html);
    newTab.document.close();
  }

  function mapLineItemName(line) {
    let lower = line.toLowerCase();
    if (lower.includes("proratedpremium")) return "PREMIUM AMOUNT";
    if (lower.includes("policyfee"))       return "POLICY FEES";
    if (lower.includes("brokerfee"))       return "BROKER FEES";
    if (lower.includes("tax"))             return "TAXES";
    // We skip Commission row in final quote logic, so no mapping needed
    return line.toUpperCase();
  }

  // EVENT LISTENERS
  document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
  document.getElementById("financedBrokerFee").addEventListener("blur", validateFinancedBrokerFee);
  document.querySelectorAll(".expirationDate").forEach(expInput => {
    expInput.addEventListener("blur", validateExpirationDate);
  });
  const producerQuoteBtn = document.getElementById("producerQuoteBtn");
  if (producerQuoteBtn) {
    producerQuoteBtn.addEventListener("click", generateProducerQuote);
  }
});
