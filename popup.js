const importBtn = document.getElementById("importJson");
const fillBtn = document.getElementById("fillForm");
const fileInput = document.getElementById("fileInput");
const status = document.getElementById("status");

// Click import → open file dialog
importBtn.addEventListener("click", () => fileInput.click());

// Handle file import
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      let data;
      if (file.name.endsWith(".csv")) {
        data = parseCSV(event.target.result);
      } else {
        data = JSON.parse(event.target.result);
      }

      chrome.storage.local.set({ formData: data }, () => {
        status.textContent = "✅ Données importées.";
      });
    } catch (err) {
      status.textContent = "❌ Erreur: " + err.message;
    }
  };
  reader.readAsText(file);
});

// Parse CSV
function parseCSV(csv) {
  const [header, ...lines] = csv.trim().split("\n");
  const keys = header.split(",");
  const values = lines[0].split(",");
  const obj = {};
  keys.forEach((k, i) => (obj[k.trim()] = values[i].trim()));
  return obj;
}

// Send data to content.js
fillBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.storage.local.get("formData", ({ formData }) => {
    if (!formData) {
      status.textContent = "⚠️ Importez d'abord un fichier.";
      return;
    }
    chrome.tabs.sendMessage(tab.id, { action: "fillForm", data: formData });
    status.textContent = "✍️ Remplissage en cours...";
  });
});
