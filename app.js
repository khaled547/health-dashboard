const today = document.getElementById("todaydate");
const date = new Date();
today.textContent = date.toDateString();


// BMI Calculate

function calculateBMI() {
    let height = parseFloat(document.getElementById("height").value);
    let weight = parseFloat(document.getElementById("weight").value);
    let result = document.getElementById("result");

    
    if (!height || !weight) {
        result.textContent = "Height and Weight are required!";
        return;
    }


    height = height / 100;


    const bmi = weight / (height * height);
    
    
    let category = "";
    if (bmi < 18.5) category = "Underweight";
    else if (bmi < 24.9) category = "Normal weight";
    else if (bmi < 29.9) category = "Overweight";
    else category = "Obesity";
    
   // ফলাফল দেখানো (রঙসহ সুন্দরভাবে)
result.innerHTML = `
  <strong>Your BMI:</strong> ${bmi.toFixed(2)} <br>
  <span style="color: ${bmi < 18.5 ? 'orange' 
    : bmi < 24.9 ? 'green' 
    : bmi < 29.9 ? 'gold' 
    : 'red'}">
    ${category}
  </span>
`;

}


// water intake

let totalDrank = 0;
const goal = document.getElementById("goal");
const glass = document.getElementById("glass");

function addWater() {
    totalDrank += parseFloat(glass.value)
    updateWater();
}

function removeWater() {
    totalDrank -= parseFloat(glass.value);                      
    if (totalDrank < 0) totalDrank = 0;
    updateWater();
}

function updateWater() {
    const remain = parseFloat(goal.value) - totalDrank;

    document.getElementById("drank"). textContent = totalDrank;

    document.getElementById("remain").textContent = remain > 0 ? remain : 0;
    if (remain <= 0) {
    
       alert("Goal Reached! stay Hydrated");
    }
}






// Step 
function updateSteps() {
    const goal = parseFloat(document.getElementById("stepGoal").value);
    const current = parseFloat(document.getElementById("currentSteps").value);
    const progressFill = document.getElementById("stepsProgressFill");
    const progressText = document.getElementById("stepsProgressText");

    if (! goal || goal <= 0) {
        progressFill.style.width = "0%";
        progressText.textContent = "0%";
        return;
    }

    const percent = Math.min((current / goal) * 100, 100);
    progressFill.style.width = percent + "%";
    progressText.textContent = percent.toFixed(0) + "%";
}

document.getElementById("stepGoal")?.addEventListener("input", updateSteps);
document.getElementById("currentSteps")?.addEventListener("input", updateSteps);

updateSteps();

//Reminder

function saveReminder() {
    const title = document.getElementById("reminderTitle"). value;
    const time = document.getElementById("reminderTime"). value;
    const note = document.getElementById("reminderNote").value;
    
    if (! title ||! time) {
        alert("Title and Time dite hobe!");
        return;
    }

    const now = new Date();
    const [hours, minutes] = 
    time.split(":").map(Number);
    const reminderTime = new Date();
    reminderTime.setHours(hours, minutes, 0, 0);

    let diff = reminderTime.getTime() -
    now.getTime();
    if (diff < 0) diff += 24 * 60 * 60 * 1000;

    alert('Reminder saved for ${reminderTime.toLocaleTimeString()}');

    setTimeout (() => {
        alert('Reminder: ${title}\n${note}');
    }, diff);
}

function clearReminder() {
    document.getElementById("reminderTitle").value = "";

    document.getElementById("reminderTime"). value = "";

    document.getElementById("reminderNote"). value = "";

    
}