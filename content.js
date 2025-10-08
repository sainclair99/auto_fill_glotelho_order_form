chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillForm") {
    fillOrderForm(request.data);
    sendResponse({ status: "done" });
  }
});

async function fillOrderForm(data) {
  const fill = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) {
      el.value = value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  fill("#last_name", data.last_name);
  fill("#first_name", data.first_name);
  fill("#tel", data.tel);
  fill("#email", data.email);
  fill("#telephone2", data.telephone2);
  fill("#whatsappTelephone", data.whatsappTelephone);

  // === Gestion spéciale pour la ville et le quartier ===
  await fillTownAndQuarter(data.town, data.quartier);

  // Scroll and click the submit button automatically
  await clickSubmitButton();

  setTimeout(async () => {
    //   ** Etape 2 livraison
    livrer = document.querySelector(`input[id=${data.deliverAgent}]`);
    if (livrer) {
      livrer.click();
      await new Promise((res) => setTimeout(res, 500)); // wait a bit for the next step to load
      await clickSubmitButton("valider");
    }
    setTimeout(async () => {
      //   ** Etape 2 paiement
      await new Promise((res) => setTimeout(res, 500));
      payment = document.querySelector(`input[id=${data.paymentMethod}]`);
      if (payment) {
        payment.click();
      }
    }, 1000);
  }, 1000);
}

// Fonction pour attendre que les options d’un <select> soient disponibles
function waitForOptions(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const select = document.querySelector(selector);
      if (select && select.options.length > 1) {
        clearInterval(interval);
        resolve(select);
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject("Timeout: options not loaded for " + selector);
      }
    }, 300);
  });
}

// Sélectionne la ville puis le quartier
async function fillTownAndQuarter(townValue, quartierText) {
  const townSelect = document.querySelector("#town");
  if (!townSelect) return;

  // Sélectionne la ville (ici ton JSON donne déjà "1" = l'ID de la ville)
  townSelect.value = townValue;
  townSelect.dispatchEvent(new Event("change", { bubbles: true }));

  // Attend que la liste des quartiers soit chargée
  try {
    const quarterSelect = await waitForOptions("#quarter");
    const normalizedTarget = normalizeText(quartierText);
    
    // Trouve la meilleure correspondance
    const match = Array.from(quarterSelect.options).find((opt) => {
      return normalizeText(opt.textContent).includes(normalizedTarget);
    });

    if (match) {
      match.selected = true; // Marque l'option comme sélectionnée
      quarterSelect.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      console.warn(`Quartier "${quartierText}" non trouvé.`);
    }
  } catch (e) {
    console.error(e);
  }
}

// Normalisation (pour ignorer accents, majuscules/minuscules)
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ") // remplacer les espaces multiples par un seul
    .replace(/[^\w\sÀ-ÿ?]/g, "") // supprimer ponctuation sauf les lettres accentuées
    .trim();
}

async function clickSubmitButton(textP) {
  const selector = "button, input[type='submit']";
  const submitBtn = await waitForElement(selector);

  // Find the one that has the desired text
  const buttons = document.querySelectorAll(selector);
  let targetButton = null;

  buttons.forEach((btn) => {
    const text = btn.textContent.trim().toLowerCase();
    if (textP) {
      if (text.includes(textP)) {
        targetButton = btn;
      }
    } else {
      if (text.includes("enregistrer") && text.includes("continuer")) {
        targetButton = btn;
      }
    }
  });

  if (targetButton) {
    targetButton.scrollIntoView({ behavior: "smooth", block: "center" });

    await new Promise((res) => setTimeout(res, 500));

    // Dispatch a true user-like click
    const realClick = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
    });

    targetButton.dispatchEvent(realClick);
    console.log("✅ Clicked 'Enregistrer et continuer' button successfully!");
  } else {
    console.warn("⚠️ 'Enregistrer et continuer' button not found.");
  }
}

// Wait helper
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector);
      if (found) {
        observer.disconnect();
        resolve(found);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}