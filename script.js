document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".effectiveDate").forEach(input => {
        input.addEventListener("change", function () {
            const expDateInput = this.closest(".coverage-row").querySelector(".expirationDate");
            let effectiveDate = new Date(this.value);
            if (!isNaN(effectiveDate.getTime())) {
                effectiveDate.setFullYear(effectiveDate.getFullYear() + (isLeapYear(effectiveDate.getFullYear()) ? 366 : 365));
                expDateInput.value = effectiveDate.toISOString().split("T")[0];
            }
        });
    });

    document.getElementById("calculateBtn").addEventListener("click", calculateProRatedAmounts);
});

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function calculateProRatedAmounts() {
    document.querySelectorAll(".coverage-row").forEach(row => {
        const premium = parseFloat(row.querySelector(".premium").value) || 0;
        const carrierTax = parseFloat(row.querySelector(".carrierTax").value) || 0;
        const carrierFee = parseFloat(row.querySelector(".carrierFee").value) || 0;
        const effectiveDate = new Date(row.querySelector(".effectiveDate").value);
        const expirationDate = new Date(row.querySelector(".expirationDate").value);
        const endorsementDate = new Date(row.querySelector(".endorsementDate").value);

        if (!premium || isNaN(effectiveDate.getTime()) || isNaN(expirationDate.getTime()) || isNaN(endorsementDate.getTime())) {
            row.querySelector(".result").innerText = "⚠️ Missing required values!";
            return;
        }

        // Calculate the total amount including tax
        const totalAmount = premium + (premium * (carrierTax / 100));

        // Calculate remaining policy days
        const remainingDays = Math.ceil((expirationDate - endorsementDate) / (1000 * 60 * 60 * 24));
        const totalPolicyDays = Math.ceil((expirationDate - effectiveDate) / (1000 * 60 * 60 * 24));

        if (remainingDays < 0 || totalPolicyDays <= 0) {
            row.querySelector(".result").innerText = "⚠️ Invalid date selection!";
            return;
        }

        // Calculate prorated premium
        const proratedPremium = (totalAmount / totalPolicyDays) * remainingDays + carrierFee;

        row.querySelector(".result").innerText = `$${proratedPremium.toFixed(2)}`;
    });
}
