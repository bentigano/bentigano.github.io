const ctx = document.getElementById('myChart');
new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Principal', 'Interest'],
      datasets: [{
        data: [12, 19],
        borderWidth: 2
      }]
    },
    options: {
        rotation: -90,
        circumference: 180,
      }
  });

// default some values for testing
$( document ).ready(function() {
    $("#loanAmount").val(400000);
    $("#interestRate").val(5);
    $("#loanTerm").val(15);
    calculateMortgage();
});

let loanAmount = 0;
let interestRate = 0;
let loanTermYears = 0;
let lastChangedPaymentAmount = 0;
let originalPaymentSchedule = [];
let updatedPaymentSchedule = [];

function reset() {
    loanAmount = 0;
    interestRate = 0;
    loanTermYears = 0;
    lastChangedPaymentAmount = 0;
    originalPaymentSchedule = [];
    updatedPaymentSchedule = [];
    $('#paymentScheduleTable tbody').empty();
    calculateMortgage();
}

function calculateMortgagePayment(paymentNumber, loanAmount, interestRate, numberOfPayments, originalMortgage = false) {
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
        // look at one time extra payment fields and changed payment fields
        extraPrincipalPayment = parseFloat($(`#pmt${paymentNumber}ExtraPayment`).val());
        changedPaymentTo = parseFloat($(`#pmt${paymentNumber}ChangePayment`).val());

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
    }

    // handle the last payment where the balance may be less than the payment amount
    if (loanAmount < principalOnly) {
        monthlyPayment = interestOnly + loanAmount;
        principalOnly = monthlyPayment - interestOnly;
    }

    let balanceAfterPayment = loanAmount - (monthlyPayment - interestOnly)

    return Payment = {
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

    // add validation to ensure all values are present and numeric/valid
    let loanAmount = $("#loanAmount").val();
    let interestRate = $("#interestRate").val();
    let loanTermYears = $("#loanTerm").val();
    lastChangedPaymentAmount = 0;

    calculatePaymentSchedule(true); // calculate original mortgage
    $("#minMonthlyPayment").val(originalPaymentSchedule[0].totalPayment.toFixed(2));

    calculatePaymentSchedule(false); // calculate updated mortgage (with any payment changes)


    let originalInterestDue = originalPaymentSchedule.reduce((accumulator, currentValue) => accumulator + currentValue.interestPayment, 0);
    let totalInterestPaid = updatedPaymentSchedule.reduce((accumulator, currentValue) => accumulator + currentValue.interestPayment, 0);
    $("#totalInterestPaid").val(totalInterestPaid.toFixed(2));
    $("#totalInterestSaved").val((originalInterestDue - totalInterestPaid).toFixed(2));

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
                <td>${payment.resultingBalance.toFixed(2)}</td>
                <td>${payment.principalPayment.toFixed(2)}</td>
                <td>${payment.interestPayment.toFixed(2)}</td>
                <td>${payment.totalPayment.toFixed(2)}</td>
                <td>${totalPrincipal.toFixed(2)}</td>
                <td>${totalInterest.toFixed(2)}</td>
                <td><div class="input-group input-group-sm">
                    <div class="input-group-prepend">
                        <span class="input-group-text">$</span>
                    </div>
                    <input type="number" class="form-control" placeholder="" id="pmt${payment.paymentNumber}ExtraPayment" value=${payment.extraPrincipal} />
                </div></td>
                <td><div class="input-group input-group-sm">
                    <div class="input-group-prepend">
                        <span class="input-group-text">$</span>
                    </div>
                    <input type="number" class="form-control" placeholder="" id="pmt${payment.paymentNumber}ChangePayment" value=${payment.changePayment} />
                </div></td>
            </tr>
        `);
    });
}

function calculatePaymentSchedule(originalMortgage = false) {

    if (originalMortgage) {
        loanAmount = $("#loanAmount").val();
        interestRate = $("#interestRate").val();
        loanTermYears = $("#loanTerm").val();
    }

    let inLoanAmount = loanAmount;
    let inInterestRate = interestRate;
    let inLoanTermYears = loanTermYears;
    
    let numberOfPayments = inLoanTermYears * 12;

    if (originalMortgage)
        originalPaymentSchedule = [];
    else
        updatedPaymentSchedule = [];

    for (let paymentNumber = 1; paymentNumber <= numberOfPayments; paymentNumber++) {   

        let payment = calculateMortgagePayment(paymentNumber, inLoanAmount, inInterestRate, numberOfPayments, originalMortgage);

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