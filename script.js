document.addEventListener("DOMContentLoaded", function () {
    // Auto-fill expiration date (1 year ahead)
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

    // Apply date values to all rows from Auto Liability
    document.querySelectorAll(".applyToAll").forEach(button => {
        button.addEventListener("click", function () {
            const type = this.getAttribute("data-type");
            const firstRowValue = document.querySelector(`.auto-liability .${type}Date`).value;
            if (!firstRowValue) return;
            document.querySelectorAll(`.coverage-row .${type}Date`).forEach(input => {
                if (!input.closest(".auto-liability")) {
                    input.value = firstRowValue;
                }
            });
        });
    });

    // Calculate ProRated Amounts on click
    document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
});

function calculateProRatedAmounts() {
    let total = 0;

    document.querySelectorAll(".coverage-row").forEach(row => {
        // We might store typed values in data attributes
        const tivField = row.querySelector(".tiv");
        const rateField = row.querySelector(".rate");
        const premiumField = row.querySelector(".premium");
        const carrierTaxField = row.querySelector(".carrierTax");
        const carrierFeeField = row.querySelector(".carrierFee");

        // Retrieve numeric values (remove $ or %)
        const tiv = tivField ? parseFloat(tivField.value.replace(/[^0-9.]/g, "")) || 0 : 0;
        const rate = rateField ? parseFloat(rateField.value.replace(/[^0-9.]/g, "")) || 0 : 0;
        let premium = premiumField ? parseFloat(premiumField.value.replace(/[^0-9.]/g, "")) || 0 : 0;
        const carrierTax = carrierTaxField ? parseFloat(carrierTaxField.value.replace(/[^0-9.]/g, "")) || 0 : 0;
        const carrierFee = carrierFeeField ? parseFloat(carrierFeeField.value.replace(/[^0-9.]/g, "")) || 0 : 0;

        // If TIV is present, recalc premium = TIV * (Rate / 100)
        if (tiv > 0) {
            premium = tiv * (rate / 100);
        }

        // If no premium, skip result
        if (!premium) {
            row.querySelector(".result").innerText = "";
            return;
        }

        // totalAmount = (premium + carrierFee) + tax
        let totalAmount = premium + carrierFee;
        totalAmount += totalAmount * (carrierTax / 100);

        row.querySelector(".result").innerText = `$${totalAmount.toFixed(2)}`;
        total += totalAmount;
    });

    // Update total result
    document.getElementById("totalResult").innerText = `$${total.toFixed(2)}`;
}

// Restrict input to numbers only, and format on blur
document.querySelectorAll(".dollar-input, .percent-input").forEach(input => {
    // Remove invalid chars while typing
    input.addEventListener("input", function () {
        this.value = this.value.replace(/[^0-9.]/g, ""); // keep digits & dot only
        const parts = this.value.split(".");
        if (parts.length > 2) {
            // Remove extra dots
            this.value = parts[0] + "." + parts.slice(1).join("");
        }
    });

    // Format on focus (remove $/%)
    input.addEventListener("focus", function () {
        // strip $ or %
        this.value = this.value.replace(/[$%]/g, "");
    });

    // Format on blur (add $ or %)
    input.addEventListener("blur", function () {
        let raw = parseFloat(this.value);
        if (isNaN(raw)) {
            this.value = "";
            return;
        }
        if (this.classList.contains("dollar-input")) {
            this.value = `$${raw.toFixed(2)}`;
        } else if (this.classList.contains("percent-input")) {
            this.value = `${raw.toFixed(2)}%`;
        }
    });
});
