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

    // Apply date values to all rows
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

    // Calculate ProRated Amounts
    document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
});

function calculateProRatedAmounts() {
    let total = 0;

    document.querySelectorAll(".coverage-row").forEach(row => {
        const tiv = parseFloat(row.querySelector(".tiv")?.value.replace(/[$,]/g, "")) || 0;
        const rate = parseFloat(row.querySelector(".rate")?.value.replace(/[%]/g, "")) || 0;
        const premium = tiv > 0 ? (tiv * rate / 100) : parseFloat(row.querySelector(".premium")?.value.replace(/[$,]/g, "")) || 0;
        const carrierTax = parseFloat(row.querySelector(".carrierTax")?.value.replace(/[%]/g, "")) || 0;
        const carrierFee = parseFloat(row.querySelector(".carrierFee")?.value.replace(/[$,]/g, "")) || 0;

        if (!premium) {
            row.querySelector(".result").innerText = "";
            return;
        }

        let totalAmount = premium + carrierFee;
        totalAmount += totalAmount * (carrierTax / 100);

        row.querySelector(".result").innerText = `$${totalAmount.toFixed(2)}`;
        total += totalAmount;
    });

    document.getElementById("totalResult").innerText = `$${total.toFixed(2)}`;
}

// 🔹 Prevent values from disappearing while typing
document.querySelectorAll(".dollar-input, .percent-input").forEach(input => {
    input.addEventListener("input", function () {
        let value = this.value.replace(/[^0-9.]/g, "");
        if (value.split(".").length > 2) value = value.replace(/\.+$/, "");
        this.setAttribute("data-raw", value);
    });

    input.addEventListener("blur", function () {
        let rawValue = this.getAttribute("data-raw") || this.value;
        if (this.classList.contains("dollar-input") && rawValue) {
            this.value = `$${parseFloat(rawValue).toFixed(2)}`;
        } else if (this.classList.contains("percent-input") && rawValue) {
            this.value = `${parseFloat(rawValue).toFixed(2)}%`;
        }
    });

    input.addEventListener("focus", function () {
        let rawValue = this.getAttribute("data-raw") || this.value;
        this.value = rawValue.replace(/[$%]/g, "");
    });
});
