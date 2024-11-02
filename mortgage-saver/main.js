// const ctx = document.getElementById('myChart');
// new Chart(ctx, {
//     type: 'doughnut',
//     data: {
//         labels: ['Principal', 'Interest'],
//         datasets: [{
//             data: [12, 19],
//             borderWidth: 2
//         }]
//     },
//     options: {
//         rotation: -90,
//         circumference: 180,
//         responsive: true,
//         maintainAspectRatio: false,
//     }
// });

// default some values for testing
$(document).ready(function () {
    // $("#loanAmount").val("$400,000");
    // $("#interestRate").val(5);
    // $("#loanTerm").val(15);
    // const today = new Date();
    // // Format the date to YYYY-MM-DD (required by the input type="date")
    // const formattedDate = today.toISOString().slice(0, 10);
    // $("#firstPaymentDate").val(formattedDate);
    // calculateMortgage();
    formatCurrencyFields();
});

function formatCurrencyFields() {
    $('.currency-field').maskMoney({ prefix: '$ ', allowNegative: false, allowZero: true, thousands: ',', decimal: '.', affixesStay: true, precision: 0 });
    $('.currency-field-exact').maskMoney({ prefix: '$ ', allowNegative: false, allowZero: true, thousands: ',', decimal: '.', affixesStay: true });
}

var loanAmount = 0;
var interestRate = 0;
var loanTermYears = 0;
var firstPaymentDate = "";
var lastChangedPaymentAmount = 0;
var originalPaymentSchedule = [];
var updatedPaymentSchedule = [];

function reset() {
    loanAmount = 0;
    interestRate = 0;
    loanTermYears = 0;
    firstPaymentDate = "";
    lastChangedPaymentAmount = 0;
    originalPaymentSchedule = [];
    updatedPaymentSchedule = [];
    $('#paymentScheduleTable tbody').empty();
    calculateMortgage();
}

var USDollar = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

var DateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' });

function calculateMortgagePayment(paymentNumber, paymentDate, loanAmount, interestRate, numberOfPayments, originalMortgage = false) {
    // Convert annual interest rate to monthly
    const monthlyInterestRate = interestRate / 100 / 12;

    loanAmount = parseFloat(loanAmount);
    interestRate = parseFloat(interestRate);
    numberOfPayments = parseInt(numberOfPayments);
    paymentNumber = parseInt(paymentNumber);

    if (paymentNumber > 0)
        numberOfPayments -= (paymentNumber - 1);

    // Calculate the monthly payment using the formula
    let monthlyPayment = loanAmount *
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
        (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    if (!originalMortgage) {
        if (monthlyPayment < originalPaymentSchedule[0].totalPayment) {
            monthlyPayment = originalPaymentSchedule[0].totalPayment;
        }
    }

    let interestOnly = loanAmount * monthlyInterestRate;
    let principalOnly = monthlyPayment - interestOnly;

    let extraPrincipalPayment = 0;
    let changedPaymentTo = 0;

    if (!originalMortgage) {
        // look at one time extra payment fields and changed payment fields (remove currency and thousand seperators)
        let extraPrincipalPaymentInput = $(`#pmt${paymentNumber}ExtraPayment`).val();
        let changedPaymentToInput = $(`#pmt${paymentNumber}ChangePayment`).val();

        if (extraPrincipalPaymentInput != undefined) {
            extraPrincipalPayment = parseFloat(extraPrincipalPaymentInput.replace(/[^0-9\.-]+/g, ""));
        }
        if (changedPaymentToInput != undefined) {
            changedPaymentTo = parseFloat(changedPaymentToInput.replace(/[^0-9\.-]+/g, ""));
        }

        if (isNaN(extraPrincipalPayment))
            extraPrincipalPayment = 0;
        if (isNaN(changedPaymentTo))
            changedPaymentTo = 0;

        if (changedPaymentTo > 0 || lastChangedPaymentAmount > 0) {
            if (changedPaymentTo <= 0) {
                monthlyPayment = lastChangedPaymentAmount;
            } else {
                lastChangedPaymentAmount = changedPaymentTo;
                monthlyPayment = changedPaymentTo;
            }
            principalOnly = monthlyPayment - interestOnly
        }

        if (extraPrincipalPayment > 0) {
            principalOnly += extraPrincipalPayment
        }

        paymentDate.setMonth(paymentDate.getMonth() + 1);
    }

    // handle the last payment where the balance may be less than the payment amount
    if (loanAmount < principalOnly) {
        monthlyPayment = interestOnly + loanAmount;
        principalOnly = monthlyPayment - interestOnly;
    }

    let balanceAfterPayment = loanAmount - (monthlyPayment - interestOnly)

    return Payment = {
        paymentDate: DateFormatter.format(paymentDate),
        totalPayment: monthlyPayment,
        principalPayment: principalOnly,
        interestPayment: interestOnly,
        paymentNumber: paymentNumber,
        resultingBalance: balanceAfterPayment,
        extraPrincipal: extraPrincipalPayment,
        changePayment: changedPaymentTo
    };
}

function calculateMortgage() {

    // START input validation
    let valid = true;
    let loanAmount = $("#loanAmount");
    let interestRate = $("#interestRate");
    let loanTermYears = $("#loanTerm");
    firstPaymentDate = new Date(Date.parse($("#firstPaymentDate").val()));

    if (loanAmount.val() <= 10000) {
        if (!loanAmount.hasClass('is-invalid')) {
            loanAmount.addClass('is-invalid');
        }
        valid = false;
    } else {
        loanAmount.removeClass("is-invalid");
    }
    if (interestRate.val() <= 0) {
        if (!interestRate.hasClass('is-invalid')) {
            interestRate.addClass('is-invalid');
        }
        valid = false;
    } else {
        interestRate.removeClass("is-invalid");
    }
    if (loanTermYears.val() <= 0) {
        if (!loanTermYears.hasClass('is-invalid')) {
            loanTermYears.addClass('is-invalid');
        }
        valid = false;
    } else {
        loanTermYears.removeClass("is-invalid");
    }
    if (!(firstPaymentDate instanceof Date && !isNaN(firstPaymentDate))) {
        if (!$("#firstPaymentDate").hasClass('is-invalid')) {
            $("#firstPaymentDate").addClass('is-invalid');
        }
        valid = false;
    } else {
        $("#firstPaymentDate").removeClass("is-invalid");
    }

    if (!valid) return;
    // END input validation

    // address some issues with how the date comes on, and subtract a month so we can increment with each payment
    firstPaymentDate.setDate(firstPaymentDate.getDate() + 1);
    firstPaymentDate.setMonth(firstPaymentDate.getMonth() - 1);

    lastChangedPaymentAmount = 0;

    calculatePaymentSchedule(true); // calculate original mortgage
    $("#minMonthlyPayment").val(USDollar.format(originalPaymentSchedule[0].totalPayment));

    calculatePaymentSchedule(false); // calculate updated mortgage (with any payment changes)


    let originalInterestDue = originalPaymentSchedule.reduce((accumulator, currentValue) => accumulator + currentValue.interestPayment, 0);
    let totalInterestPaid = updatedPaymentSchedule.reduce((accumulator, currentValue) => accumulator + currentValue.interestPayment, 0);
    $("#totalInterestPaid").val(USDollar.format(totalInterestPaid));
    $("#totalInterestSaved").val(USDollar.format((originalInterestDue - totalInterestPaid)));

    $("#interestGaugeDiv").css("display","flex");
    let interestGauge = $("#interestGauge");
    let interestPercent = (totalInterestPaid / originalInterestDue) * 100;
    interestGauge.attr("aria-valuenow", interestPercent);
    interestGauge.css("width",`${interestPercent}%`);


    let paymentsSaved = originalPaymentSchedule.length - updatedPaymentSchedule.length;
    let yearsSaved = Math.trunc(paymentsSaved / 12);
    let monthsSaved = paymentsSaved % 12;
    let paymentsSavedDesc = "";
    if (yearsSaved > 0)
        paymentsSavedDesc = `${yearsSaved} year(s) `
    if (monthsSaved > 0)
        paymentsSavedDesc += `${monthsSaved} month(s)`
    $("#loanTermShortenedBy").val(paymentsSavedDesc);

    $('#paymentScheduleTable tbody').empty();

    updatedPaymentSchedule.forEach(payment => {

        const totalPrincipal = updatedPaymentSchedule.reduce((accumulator, currentPayment) => {
            if (currentPayment.paymentNumber <= payment.paymentNumber) {
                return accumulator + currentPayment.principalPayment;
            } else {
                return accumulator;
            }
        }, 0);

        const totalInterest = updatedPaymentSchedule.reduce((accumulator, currentPayment) => {
            if (currentPayment.paymentNumber <= payment.paymentNumber) {
                return accumulator + currentPayment.interestPayment;
            } else {
                return accumulator;
            }
        }, 0);

        $('#paymentScheduleTable > tbody:last-child').append(`
            <tr>
                <th scope="row">${payment.paymentNumber}</th>
                <td>${Math.ceil((payment.paymentNumber) / 12)}</td>
                <td>${payment.paymentDate}</td>
                <td>${USDollar.format(payment.resultingBalance)}</td>
                <td>${USDollar.format(payment.principalPayment)}</td>
                <td>${USDollar.format(payment.interestPayment)}</td>
                <td>${USDollar.format(payment.totalPayment)}</td>
                <!--<td>${USDollar.format(totalPrincipal)}</td>
                <td>${USDollar.format(totalInterest)}</td>-->
                <td>
                    
                        <input type="text" class="form-control form-control-sm mx-auto currency-field-exact" style="max-width:10em;" placeholder="" id="pmt${payment.paymentNumber}ExtraPayment" value='${payment.extraPrincipal > 0 ? USDollar.format(payment.extraPrincipal) : ''}' />
                    
                </td>
                <td>
                    
                        <input type="text" class="form-control form-control-sm mx-auto currency-field-exact" style="max-width:10em;" placeholder="" id="pmt${payment.paymentNumber}ChangePayment" value='${payment.changePayment > 0 ? USDollar.format(payment.changePayment) : ''}' />
                    
                </td>
            </tr>
        `);
    });

    formatCurrencyFields();
}

function calculatePaymentSchedule(originalMortgage = false) {

    if (originalMortgage) {
        loanAmount = $("#loanAmount").val().replace(/[^0-9\.-]+/g, "");
        interestRate = $("#interestRate").val();
        loanTermYears = $("#loanTerm").val();
    } else {
        firstPaymentDate = new Date(Date.parse($("#firstPaymentDate").val()));
        firstPaymentDate.setDate(firstPaymentDate.getDate() + 1);
        firstPaymentDate.setMonth(firstPaymentDate.getMonth() - 1);
    }

    let inLoanAmount = loanAmount;
    let inInterestRate = interestRate;
    let inLoanTermYears = loanTermYears;
    let inFirstPaymentDate = firstPaymentDate;

    let numberOfPayments = inLoanTermYears * 12;

    if (originalMortgage)
        originalPaymentSchedule = [];
    else
        updatedPaymentSchedule = [];

    for (let paymentNumber = 1; paymentNumber <= numberOfPayments; paymentNumber++) {

        let payment = calculateMortgagePayment(paymentNumber, inFirstPaymentDate, inLoanAmount, inInterestRate, numberOfPayments, originalMortgage);

        if (originalMortgage)
            originalPaymentSchedule.push(payment);
        else
            updatedPaymentSchedule.push(payment);

        // reduce the loan amount for the next payment
        inLoanAmount = inLoanAmount - (payment.principalPayment);

        if (inLoanAmount <= 0)
            break;
    }
}