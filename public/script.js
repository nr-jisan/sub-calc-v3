// DOM Elements
const olevelContainer = document.getElementById("olevelContainer");
const sscInput = document.getElementById("sscGpa");
const hscInput = document.getElementById("hscGpa");
const goldenContainer = document.getElementById("goldenContainer");
const goldenSsc = document.getElementById("goldenSsc");
const goldenHsc = document.getElementById("goldenHsc");
const diplomaCgpaInput = document.getElementById("diplomaCgpa");
const diplomaContainer = document.getElementById("diplomaContainer");
const admissionTypeSelect = document.getElementById("admissionType");
const departmentSelect = document.getElementById("department");
const form = document.getElementById("feeForm");
const resultSection = document.getElementById("result");
const resultCard = resultSection.querySelector(".result-card");

function gradeToPoint(grade) {
  const map = { A: 5.00, B: 4.00, C: 3.50, D: 3.00, E: 2.00 };
  return map[grade.toUpperCase()] ?? 0;
}

let nationalDepartments = {};
let diplomaDepartments = {};

fetch('/config')
  .then(res => res.json())
  .then(data => {
    nationalDepartments = data.nationalDepartments;
    diplomaDepartments = data.diplomaDepartments;

    [nationalDepartments, diplomaDepartments].forEach(group => {
      Object.values(group).forEach(dept => {
        if (dept.totalCredit && dept.costPerCredit && dept.flatWeiver !== undefined) {
          dept.baseTuition = dept.totalCredit * dept.costPerCredit * (1 - dept.flatWeiver);
        }
      });
    });

    updateDepartments();
  });

document.addEventListener("DOMContentLoaded", () => {
  toggleAdmissionType();
  updateDepartments();
  if (departmentSelect.options.length > 0) departmentSelect.selectedIndex = 0;
});

admissionTypeSelect.addEventListener("change", () => {
  toggleAdmissionType();
  updateDepartments();
  if (departmentSelect.options.length > 0) departmentSelect.selectedIndex = 0;
});

sscInput.addEventListener("input", toggleGolden);
hscInput.addEventListener("input", toggleGolden);

function toggleAdmissionType() {
  const type = admissionTypeSelect.value;
  const isNational = type === "national";
  const isDiploma = type === "diploma";
  const isOlevel = type === "olevel";

  document.querySelectorAll(".gpa-group").forEach(el => {
    el.style.display = isNational ? "" : "none";
  });

  diplomaContainer.classList.toggle("hidden", !isDiploma);
  olevelContainer.classList.toggle("hidden", !isOlevel);
  goldenContainer.classList.toggle("hidden", !(isNational && (parseFloat(sscInput.value) === 5 || parseFloat(hscInput.value) === 5)));
}

function toggleGolden() {
  const s = parseFloat(sscInput.value) === 5;
  const h = parseFloat(hscInput.value) === 5;
  goldenContainer.classList.toggle("hidden", !(s || h));
  if (!s && !h) {
    goldenSsc.checked = false;
    goldenHsc.checked = false;
  }
}

function updateDepartments() {
  const displayNames = {
    cse: "Computer Science & Engineering (CSE)",
    architecture: "Architecture",
    bba: "Business Studies (BBA)",
    english: "English Studies (BA in English)",
    fens: "Food Engineering and Nutritional Science (FENS)",
    jcms: "Journalism, Communication & Media Studies (JCMS)",
    law: "Law (LLB Hons.)",
    pharmacy: "Pharmacy"
  };

  const selected = admissionTypeSelect.value;
  const depts = selected === "diploma" ? diplomaDepartments : nationalDepartments;
  departmentSelect.innerHTML = "";

  const preferredOrder = selected === "diploma"
    ? ["cse", "architecture", "fens"]
    : ["cse", "architecture", "bba", "english", "fens", "jcms", "law", "pharmacy"];

  preferredOrder.forEach(key => {
    if (depts[key]) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = displayNames[key] || key.toUpperCase();
      departmentSelect.appendChild(option);
    }
  });
}

function getWaiverFromRules(rules, inputs) {
  for (const rule of rules) {
    let match = true;
    for (const key in rule) {
      if (key === "waiver") continue;

      const value = rule[key];
      let inputKey = key;
      let inputValue = inputs[key];

      if (key.startsWith("min")) {
        inputKey = key.slice(3).toLowerCase();
        inputValue = inputs[inputKey];
        if (inputValue === undefined || inputValue < value) {
          match = false;
          break;
        }
      } else if (key.startsWith("max")) {
        inputKey = key.slice(3).toLowerCase();
        inputValue = inputs[inputKey];
        if (inputValue === undefined || inputValue > value) {
          match = false;
          break;
        }
      } else if (typeof value === "boolean") {
        if (!!inputValue !== value) {
          match = false;
          break;
        }
      } else {
        if (inputValue === undefined || inputValue < value) {
          match = false;
          break;
        }
      }
    }

    if (match) return rule.waiver;
  }
  return 0;
}


form.addEventListener("submit", e => {
  e.preventDefault();

  const admissionType = admissionTypeSelect.value;
  const dept = departmentSelect.value;
  const gender = form.gender.value;
  let cfg = null, w = 0;

if (admissionType === "diploma") {
  const cgpa = parseFloat(diplomaCgpaInput.value);
  if (isNaN(cgpa)) return alert("Enter your Diploma CGPA.");
  if (cgpa < 2.5) {
    resultCard.innerHTML = `<strong>Ineligible.</strong><br>Minimum CGPA of 2.50 is required for Diploma admission.`;
    resultSection.classList.remove("hidden");
    return;
  }

  cfg = diplomaDepartments[dept];
  const rules = cfg.waiverRules?.diploma || [];
  w = getWaiverFromRules(rules, { cgpa });
}
 else if (admissionType === "olevel") {
    const oGrades = Array.from(document.querySelectorAll(".olevel-grade")).map(sel => sel.value.toUpperCase());
    const aGrades = Array.from(document.querySelectorAll(".alevel-grade")).map(sel => sel.value.toUpperCase());
    const allGrades = [...oGrades, ...aGrades];

    if (oGrades.length < 5 || aGrades.length < 2 || allGrades.length !== 7) {
      resultCard.innerHTML = `<strong>Ineligible.</strong><br>5 O-Level and 2 A-Level subjects required (total 7).`;
      resultSection.classList.remove("hidden");
      return;
    }

    const points = allGrades.map(gradeToPoint);
    if (points.filter(p => p >= 4).length < 4 || points.filter(p => p >= 3.5).length < 7 || points.some(p => p < 3.5)) {
      resultCard.innerHTML = `<strong>Ineligible.</strong><br>At least 4 subjects with GPA ≥ 4.00 and all 7 subjects ≥ 3.50.`;
      resultSection.classList.remove("hidden");
      return;
    }

    const oAs = oGrades.map(gradeToPoint).filter(p => p === 5.0).length;
    const aAs = aGrades.map(gradeToPoint).filter(p => p === 5.0).length;
    const aBs = aGrades.map(gradeToPoint).filter(p => p === 4.0).length;

    cfg = nationalDepartments[dept];
    const rules = cfg.waiverRules?.olevel || [];
    w = getWaiverFromRules(rules, { olevelAs: oAs, alevelAs: aAs, alevelBs: aBs });

  } else {
    const ssc = parseFloat(sscInput.value);
    const hsc = parseFloat(hscInput.value);
    if (isNaN(ssc) || isNaN(hsc) || ((ssc < 2.5 || hsc < 2.5) && (ssc + hsc < 6.0))) {
      resultCard.innerHTML = `<strong>Ineligible.</strong><br>Min GPA 2.50 or combined ≥ 6.00 required.`;
      resultSection.classList.remove("hidden");
      return;
    }
    cfg = nationalDepartments[dept];
    const rules = cfg.waiverRules?.national || [];
    w = getWaiverFromRules(rules, {
      hsc,
      ssc,
      goldenHsc: goldenHsc.checked,
      goldenSsc: goldenSsc.checked
    });
  }

  if (!cfg) return alert("Invalid department configuration.");

  let totalWaiver = w;
  if (gender === "female") totalWaiver += 0.10;
  if (totalWaiver > 1) totalWaiver = 1;

  const tuitionAfterWaiver = cfg.baseTuition * (1 - totalWaiver);
  const tuitionPerSem = Math.round(tuitionAfterWaiver / cfg.semesters);
  const totalCostAfterWaiver = Math.round(
    tuitionAfterWaiver +
    cfg.regPerSem * cfg.semesters +
    cfg.devPerSem * cfg.semesters +
    cfg.labPerSem * cfg.semesters +
    cfg.admissionFee + cfg.ethicsFee
  );
  const totalSemesterCost = Math.round(tuitionPerSem + cfg.regPerSem + cfg.devPerSem + cfg.labPerSem);

  resultCard.innerHTML = `
  <div class="department-info">
    <h3 class="department-heading">Department of ${dept.toUpperCase()}</h3>
    <p><strong>Total Credit:</strong> ${cfg.totalCredit}</p>
    <p><strong>Per Credit Fee:</strong> ${cfg.costPerCredit.toLocaleString()} BDT</p>
    <p><strong>Total Semester:</strong> ${cfg.semesters}</p>
    <p><strong>Flat Waiver:</strong> ${(cfg.flatWeiver * 100).toFixed(0)}%</p>
    <br>
    <p><strong>Base Tuition After Flat Waiver (${cfg.durationYears} year):<br></strong> ${cfg.baseTuition.toLocaleString()} BDT</p>
    <p><strong>Total Waiver:</strong> ${(w * 100).toFixed(0)}%${gender === "female" ? " +10% female" : ""}</p>
  </div>
  <hr>
  <h3>Semester Breakdown <br> (Avarage Cost Each Semester):</h3>
  <div class="semester-fees">
    <p><strong>Tuition Fees (Avg):<br></strong> ${tuitionPerSem.toLocaleString()} BDT</p>
    <p><strong>Registration Fee:<br></strong> ${cfg.regPerSem.toLocaleString()} BDT</p>
    <p><strong>Development Fees:<br></strong> ${cfg.devPerSem.toLocaleString()} BDT</p>
    <p><strong>Lab Fee:<br></strong> ${cfg.labPerSem.toLocaleString()} BDT</p>
    <hr>
    <h3 style="color:DarkSlateGray;"><strong>Total (Avg):</strong> ${totalSemesterCost.toLocaleString()} BDT</h3>
  </div>
  <hr>
  <h3>Total Fee Breakdown (${cfg.durationYears} year):</h3>
  <div class="total-costs">
    <p><strong>Admission Fee:</strong> ${cfg.admissionFee.toLocaleString()} BDT</p>
    <p><strong>Ethics Fee:</strong> ${cfg.ethicsFee.toLocaleString()} BDT</p>
    <p><strong>Registration Fees (${cfg.durationYears} year):<br></strong> ${(cfg.regPerSem * cfg.semesters).toLocaleString()} BDT</p>
    <p><strong>Development Fees (${cfg.durationYears} year):<br></strong> ${(cfg.devPerSem * cfg.semesters).toLocaleString()} BDT</p>
    <p><strong>Lab Fees(${cfg.durationYears} year):</strong><br> ${(cfg.labPerSem * cfg.semesters).toLocaleString()} BDT</p>
    <p><strong>Base Tuition Fees (${cfg.durationYears} year):</strong><br> ${cfg.baseTuition.toLocaleString()} BDT</p>
    <hr>
    <p><strong>Total Cost After Waiver (${cfg.durationYears} year):</strong><br><h1 style="color:green;">${totalCostAfterWaiver.toLocaleString()} BDT</h1></p>
  </div>
`;

  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
});
