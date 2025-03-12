document.addEventListener('DOMContentLoaded', function () {
    console.log('Page has loaded and JavaScript is running!');

    const sheetURL = 'https://docs.google.com/spreadsheets/d/11tDzUNBq9zIX6_9Rel__fdAUezAQzSnh5AVYzCP060c/gviz/tq?tqx=out:json';

    fetch(sheetURL)
        .then(response => response.text())
        .then(data => {
            const jsonData = JSON.parse(data.substring(data.indexOf('{'), data.lastIndexOf('}') + 1));
            //console.log("Raw Data from Google Sheets:", jsonData);

            const headers = jsonData.table.cols.map(col => col.label.trim());

            const structuredData = transformDataToJSON(headers, jsonData.table.rows);

            //console.log("Transformed JSON:", JSON.stringify(structuredData, null, 2));
            //displayData(structuredData);
            displaySpecificWeapons(structuredData);
            populateWeaponSelects(structuredData);
        })
        .catch(error => console.error('Error fetching sheet data:', error));
});
function transformDataToJSON(headers, rows) {
    const categoryOrder = ["Pistols", "Shotguns", "SMGs", "Automatic Rifles", "LMGs", "Sniper Rifles"];
    const structuredData = {};
    let currentCategory = null;
    let lastWeaponData = null; 

    rows.forEach(row => {
        if (!row.c) return;

        const firstCell = row.c[0]?.v?.trim();
        if (!firstCell) return;

        if (categoryOrder.includes(firstCell)) {
            currentCategory = firstCell;
            if (!structuredData[currentCategory]) {
                structuredData[currentCategory] = [];
            }
            lastWeaponData = null;
            return;
        }

        if (!currentCategory) {
            console.warn(`No category detected before "${firstCell}". Defaulting to 'Unknown'.`);
            currentCategory = categoryOrder[0];
            structuredData[currentCategory] = [];
        }

        const isAlternateMode = lastWeaponData && firstCell.includes(lastWeaponData.name);

        const weaponDetails = isAlternateMode ? { ...lastWeaponData } : {};

        headers.slice(1).forEach((header, index) => {
            let value = row.c[index + 1]?.v;

            if ((value === "-" || value === undefined) && isAlternateMode) {
                value = lastWeaponData[header.toLowerCase().replace(/\s+/g, "_")];
            } else {
                if (typeof value === "string" && value.includes("$")) value = parseInt(value.replace(/\$|,/g, ""), 10);
                else if (typeof value === "string" && value.includes("%")) value = parseFloat(value.replace("%", "")) / 100;
                else if (!isNaN(value)) value = parseFloat(value);
            }

            weaponDetails[header.toLowerCase().replace(/\s+/g, "_")] = value;
        });

        structuredData[currentCategory].push({ name: firstCell, ...weaponDetails });
    });
    console.log(structuredData);
    return structuredData;
}


function displayData(structuredData) {
    const container = document.getElementById('sheet-data');
    container.innerHTML = "<h2>Transformed Weapon Data</h2>";

    Object.keys(structuredData).forEach(category => {
        const categorySection = document.createElement('div');
        categorySection.innerHTML = `<h3>${category}</h3><ul>`;

        structuredData[category].forEach(weapon => {
            const weaponDetails = Object.entries(weapon)
                .map(([key, value]) => `<strong>${key.replace(/_/g, " ")}:</strong> ${value}`)
                .join(" | ");
            categorySection.innerHTML += `<li>${weaponDetails}</li>`;
        });

        categorySection.innerHTML += "</ul>";
        container.appendChild(categorySection);
    });
}

function displaySpecificWeapons(data) {
    //console.log(data);
    const leftWeapon = "Glock-18";
    const rightWeapon = "USP-S (no silencer)";

    const leftSide = document.getElementById("left-weapon");
    const rightSide = document.getElementById("right-weapon");

    let leftWeaponData = null;
    let rightWeaponData = null;

    Object.entries(data).forEach(([weaponName, weaponArray]) => {

        if (weaponName.toLowerCase() == leftWeapon.toLowerCase()) {
            leftWeaponData = weaponArray[0];
        }

        if (weaponName.toLowerCase() == rightWeapon.toLowerCase()) {
            rightWeaponData = weaponArray[0];
        }
    });

    leftSide.innerHTML = leftWeaponData
        ? `<h2>${leftWeapon}</h2><pre>${JSON.stringify(leftWeaponData, null, 2)}</pre>`
        : `<h2>${leftWeapon} Not Found</h2>`;

    rightSide.innerHTML = rightWeaponData
        ? `<h2>${rightWeapon}</h2><pre>${JSON.stringify(rightWeaponData, null, 2)}</pre>`
        : `<h2>${rightWeapon} Not Found</h2>`;
}

function populateWeaponSelects(data) {
    const leftSelect = document.getElementById("left-select");
    const rightSelect = document.getElementById("right-select");

    leftSelect.innerHTML = "";
    rightSelect.innerHTML = "";

    Object.keys(data).forEach(weaponName => {
        const optionLeft = document.createElement("option");
        optionLeft.value = weaponName;
        optionLeft.textContent = weaponName;
        leftSelect.appendChild(optionLeft);

        const optionRight = document.createElement("option");
        optionRight.value = weaponName;
        optionRight.textContent = weaponName;
        rightSelect.appendChild(optionRight);
    });

    if (data["Glock-18"]) leftSelect.value = "Glock-18";
    if (data["USP-S (no silencer)"]) rightSelect.value = "USP-S (no silencer)";

    leftSelect.addEventListener("change", () => displaySelectedWeapon("left", data));
    rightSelect.addEventListener("change", () => displaySelectedWeapon("right", data));
}