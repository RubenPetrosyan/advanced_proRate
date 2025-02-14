document.addEventListener("DOMContentLoaded", function () {
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

    document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
});

function calculateProRatedAmounts() {
    let total = 0;
    
    document.querySelectorAll(".coverage-row").forEach(row => {
        const tiv = parseFloat(row.querySelector(".tiv")?.value) || 0;
        const rate = parseFloat(row.querySelector(".rate")?.value) || 0;
        const premium = tiv > 0 ? (tiv * rate / 100) : parseFloat(row.querySelector(".premium")?.value) || 0;
        const carrierTax = parseFloat(row.querySelector(".carrierTax")?.value) || 0;
        const carrierFee = parseFloat(row.querySelector(".carrierFee")?.value) || 0;

        if (!premium) {
            row.querySelector(".result").innerText = "";
            return;
        }

        const totalAmount = premium + (premium * (carrierTax / 100)) + carrierFee;
        row.querySelector(".result").innerText = `$${totalAmount.toFixed(2)}`;
        total += totalAmount;
    });

    document.getElementById("totalResult").innerText = `$${total.toFixed(2)}`;
}
