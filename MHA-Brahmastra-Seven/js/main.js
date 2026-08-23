"use strict";

/*
 * TASKFORGE CORE
 * Quantum Bounty Board + Elite Marketplace
 *
 * Storage:
 * taskforge_forge_balance
 * taskforge_inventory
 * taskforge_bounties
 */

const STORAGE_KEYS = {
  balance: "taskforge_forge_balance",
  inventory: "taskforge_inventory",
  bounties: "taskforge_bounties"
};

const DEFAULT_BALANCE = 50000;

const bountyData = [
  {
    id: "deep-work",
    type: "FOCUS PROTOCOL",
    title: "Deep Work: 3 Hours",
    description: "Complete a distraction-free three-hour focused work session.",
    reward: 6500,
    duration: 6 * 60 * 60 * 1000
  },
  {
    id: "ghost-mode",
    type: "DISCIPLINE PROTOCOL",
    title: "Ghost Mode: 0 Distractions",
    description: "Maintain a distraction-free environment during your active session.",
    reward: 4200,
    duration: 4 * 60 * 60 * 1000
  },
  {
    id: "study-sprint",
    type: "KNOWLEDGE PROTOCOL",
    title: "Study Sprint: 90 Minutes",
    description: "Complete a structured 90-minute learning sprint.",
    reward: 2800,
    duration: 3 * 60 * 60 * 1000
  },
  {
    id: "task-zero",
    type: "EXECUTION PROTOCOL",
    title: "Task Zero: Clear Priority",
    description: "Finish your highest-priority task before starting another.",
    reward: 3500,
    duration: 5 * 60 * 60 * 1000
  },
  {
    id: "reading-core",
    type: "KNOWLEDGE PROTOCOL",
    title: "Knowledge Core: 45 Minutes",
    description: "Complete a focused reading or learning session.",
    reward: 1800,
    duration: 2 * 60 * 60 * 1000
  },
  {
    id: "daily-stack",
    type: "EXECUTION PROTOCOL",
    title: "Daily Stack: 5 Tasks",
    description: "Complete five meaningful tasks from your daily priority list.",
    reward: 5000,
    duration: 8 * 60 * 60 * 1000
  }
];

const marketItems = [
  {
    id: "avatar-frame",
    title: "Legendary Avatar Frame",
    description: "A premium operator frame for your TaskForge identity.",
    price: 12000,
    rarity: "LEGENDARY",
    icon: "◇"
  },
  {
    id: "xp-booster",
    title: "XP Booster Pack",
    description: "A permanent visual badge representing accelerated progress.",
    price: 8500,
    rarity: "EPIC",
    icon: "✦"
  },
  {
    id: "quantum-badge",
    title: "Quantum Operator Badge",
    description: "A high-tier badge for consistent mission completion.",
    price: 15000,
    rarity: "MYTHIC",
    icon: "⬢"
  },
  {
    id: "neon-crown",
    title: "Neon Crown",
    description: "A premium cosmetic crown for your operator profile.",
    price: 20000,
    rarity: "LEGENDARY",
    icon: "♛"
  },
  {
    id: "forge-core",
    title: "Forge Core Emblem",
    description: "A rare emblem representing mastery of the Forge economy.",
    price: 10000,
    rarity: "EPIC",
    icon: "◈"
  },
  {
    id: "titan-frame",
    title: "Titan Profile Frame",
    description: "A heavyweight profile frame for elite operators.",
    price: 17500,
    rarity: "MYTHIC",
    icon: "⬡"
  }
];

let state = {
  balance: DEFAULT_BALANCE,
  inventory: [],
  bounties: {}
};

let pendingPurchaseId = null;

const $ = selector => document.querySelector(selector);

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function loadState() {
  const storedBalance = localStorage.getItem(STORAGE_KEYS.balance);
  const storedInventory = localStorage.getItem(STORAGE_KEYS.inventory);
  const storedBounties = localStorage.getItem(STORAGE_KEYS.bounties);

  state.balance = storedBalance === null
    ? DEFAULT_BALANCE
    : Math.max(0, safeNumber(storedBalance, DEFAULT_BALANCE));

  try {
    state.inventory = storedInventory
      ? JSON.parse(storedInventory)
      : [];
  } catch {
    state.inventory = [];
  }

  try {
    state.bounties = storedBounties
      ? JSON.parse(storedBounties)
      : {};
  } catch {
    state.bounties = {};
  }

  if (!Array.isArray(state.inventory)) {
    state.inventory = [];
  }

  if (!state.bounties || typeof state.bounties !== "object") {
    state.bounties = {};
  }
}

function saveBalance() {
  localStorage.setItem(
    STORAGE_KEYS.balance,
    String(Math.floor(state.balance))
  );
}

function saveInventory() {
  localStorage.setItem(
    STORAGE_KEYS.inventory,
    JSON.stringify(state.inventory)
  );
}

function saveBounties() {
  localStorage.setItem(
    STORAGE_KEYS.bounties,
    JSON.stringify(state.bounties)
  );
}

function formatNumber(value) {
  return Math.floor(value).toLocaleString("en-IN");
}

function formatTime(milliseconds) {
  const totalSeconds = Math.max(
    0,
    Math.floor(milliseconds / 1000)
  );

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

function updateVault() {
  $("#forgeBalance").textContent = formatNumber(state.balance);
  $("#inventoryCount").textContent = state.inventory.length;

  const active = bountyData.filter(item => {
    const record = state.bounties[item.id];
    return record && record.status === "accepted";
  }).length;

  const completed = bountyData.filter(item => {
    const record = state.bounties[item.id];
    return record && record.status === "completed";
  }).length;

  $("#activeBounties").textContent = active;
  $("#completedBounties").textContent = completed;
}

function renderBounties() {
  const grid = $("#bountyGrid");

  grid.innerHTML = bountyData.map(bounty => {
    const record = state.bounties[bounty.id];

    let actionHTML = `
      <button
        class="primary-btn accept-btn"
        data-bounty-id="${bounty.id}"
      >
        ACCEPT BOUNTY
      </button>
    `;

    let timerHTML = `<span class="timer">READY</span>`;
    let cardClass = "bounty-card";

    if (record && record.status === "accepted") {
      cardClass += " accepted";

      const remaining = record.expiresAt - Date.now();

      if (remaining > 0) {
        timerHTML = `
          <span
            class="timer"
            data-timer-id="${bounty.id}"
          >
            ${formatTime(remaining)}
          </span>
        `;

        actionHTML = `
          <span class="accepted-badge">
            MISSION ACTIVE
          </span>
        `;
      }
    }

    if (record && record.status === "completed") {
      timerHTML = `<span class="accepted-badge">COMPLETED</span>`;

      actionHTML = `
        <button
          class="primary-btn accept-btn"
          data-bounty-id="${bounty.id}"
          disabled
        >
          COMPLETED
        </button>
      `;
    }

    return `
      <article class="${cardClass}">
        <div class="bounty-top">
          <div>
            <div class="bounty-type">${bounty.type}</div>
            <h4>${bounty.title}</h4>
          </div>

          ${timerHTML}
        </div>

        <p>${bounty.description}</p>

        <div class="bounty-bottom">
          <div class="reward">
            +${formatNumber(bounty.reward)}
            <small>$FORGE</small>
          </div>

          ${actionHTML}
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".accept-btn").forEach(button => {
    button.addEventListener("click", () => {
      const bountyId = button.dataset.bountyId;
      acceptBounty(bountyId);
    });
  });
}

function acceptBounty(id) {
  const bounty = bountyData.find(item => item.id === id);

  if (!bounty) {
    return;
  }

  const existing = state.bounties[id];

  if (existing && existing.status === "accepted") {
    showToast(
      "MISSION ALREADY ACTIVE",
      "Complete the current mission before accepting it again.",
      "error"
    );
    return;
  }

  if (existing && existing.status === "completed") {
    showToast(
      "MISSION COMPLETE",
      "This bounty has already been completed.",
      "gold"
    );
    return;
  }

  state.bounties[id] = {
    status: "accepted",
    acceptedAt: Date.now(),
    expiresAt: Date.now() + bounty.duration
  };

  saveBounties();
  renderBounties();
  updateVault();

  showToast(
    "BOUNTY ACCEPTED",
    `${bounty.title} is now active.`,
    "success"
  );
}

function checkBountyTimers() {
  let changed = false;

  bountyData.forEach(bounty => {
    const record = state.bounties[bounty.id];

    if (!record || record.status !== "accepted") {
      return;
    }

    const remaining = record.expiresAt - Date.now();

    const timer = document.querySelector(
      `[data-timer-id="${bounty.id}"]`
    );

    if (remaining <= 0) {
      record.status = "completed";
      record.completedAt = Date.now();

      state.balance += bounty.reward;

      changed = true;

      showToast(
        "BOUNTY COMPLETE",
        `+${formatNumber(bounty.reward)} $FORGE earned.`,
        "success"
      );
    } else if (timer) {
      timer.textContent = formatTime(remaining);
    }
  });

  if (changed) {
    saveBounties();
    saveBalance();
    renderBounties();
    updateVault();
  }
}

function renderMarketplace() {
  const grid = $("#marketGrid");

  grid.innerHTML = marketItems.map(item => {
    const owned = state.inventory.some(
      inventoryItem => inventoryItem.id === item.id
    );

    return `
      <article class="market-card ${owned ? "owned" : ""}">
        <div class="item-visual">
          <div class="item-icon">
            <span>${item.icon}</span>
          </div>
        </div>

        <div class="market-content">
          <span class="rarity">${item.rarity}</span>

          <h4>${item.title}</h4>

          <p>${item.description}</p>

          <div class="market-price">
            <div class="price">
              ${formatNumber(item.price)}
              <small>$FORGE</small>
            </div>

            <button
              class="primary-btn buy-btn"
              data-item-id="${item.id}"
              ${owned ? "disabled" : ""}
            >
              ${owned ? "OWNED" : "PURCHASE"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".buy-btn").forEach(button => {
    button.addEventListener("click", () => {
      openPurchaseModal(button.dataset.itemId);
    });
  });
}

function openPurchaseModal(itemId) {
  const item = marketItems.find(
    marketItem => marketItem.id === itemId
  );

  if (!item) {
    return;
  }

  if (state.inventory.some(entry => entry.id === item.id)) {
    showToast(
      "ALREADY OWNED",
      "This digital asset is already in your inventory.",
      "gold"
    );
    return;
  }

  pendingPurchaseId = itemId;

  $("#confirmTitle").textContent = "CONFIRM PURCHASE";
  $("#confirmText").textContent =
    `${item.title} will be permanently added to your inventory.`;

  $("#confirmPrice").textContent =
    formatNumber(item.price);

  $("#confirmOverlay").classList.add("visible");
  $("#confirmOverlay").setAttribute("aria-hidden", "false");
}

function closePurchaseModal() {
  pendingPurchaseId = null;

  $("#confirmOverlay").classList.remove("visible");
  $("#confirmOverlay").setAttribute("aria-hidden", "true");
}

function confirmPurchase() {
  if (!pendingPurchaseId) {
    return;
  }

  const item = marketItems.find(
    marketItem => marketItem.id === pendingPurchaseId
  );

  if (!item) {
    closePurchaseModal();
    return;
  }

  if (state.balance < item.price) {
    closePurchaseModal();

    showToast(
      "INSUFFICIENT FUNDS",
      `You need ${formatNumber(item.price - state.balance)} more $FORGE.`,
      "error"
    );

    return;
  }

  if (state.inventory.some(entry => entry.id === item.id)) {
    closePurchaseModal();

    showToast(
      "ALREADY OWNED",
      "This item is already in your inventory.",
      "gold"
    );

    return;
  }

  state.balance -= item.price;

  state.inventory.push({
    id: item.id,
    title: item.title,
    rarity: item.rarity,
    icon: item.icon,
    purchasedAt: Date.now()
  });

  saveBalance();
  saveInventory();

  closePurchaseModal();

  updateVault();
  renderMarketplace();
  renderInventory();

  triggerUnlockAnimation(item);
}

function renderInventory() {
  const grid = $("#inventoryGrid");

  if (state.inventory.length === 0) {
    grid.innerHTML = `
      <div class="empty-inventory">
        NO DIGITAL ASSETS ACQUIRED YET.
        <br>
        Visit the Elite Marketplace to expand your loadout.
      </div>
    `;

    return;
  }

  grid.innerHTML = state.inventory.map(item => `
    <article class="inventory-card">
      <div class="inventory-icon">${item.icon}</div>

      <div>
        <h4>${item.title}</h4>
        <p>${item.rarity} ASSET // OWNED</p>
      </div>
    </article>
  `).join("");
}

function triggerUnlockAnimation(item) {
  $("#unlockIcon").textContent = item.icon;
  $("#unlockTitle").textContent = "ITEM UNLOCKED";
  $("#unlockDescription").textContent =
    `${item.title} has been permanently added to your inventory.`;
  $("#unlockRarity").textContent = item.rarity;

  createUnlockParticles();

  const overlay = $("#unlockOverlay");

  overlay.classList.add("visible");
  overlay.setAttribute("aria-hidden", "false");

  showToast(
    "PURCHASE COMPLETE",
    `${formatNumber(item.price)} $FORGE spent.`,
    "gold"
  );
}

function closeUnlockAnimation() {
  const overlay = $("#unlockOverlay");

  overlay.classList.remove("visible");
  overlay.setAttribute("aria-hidden", "true");

  document.querySelectorAll(".unlock-particle").forEach(
    particle => particle.remove()
  );
}

function createUnlockParticles() {
  const container = document.querySelector(".unlock-particles");

  container.innerHTML = "";

  for (let i = 0; i < 36; i++) {
    const particle = document.createElement("span");

    particle.className = "unlock-particle";

    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 180;

    particle.style.position = "absolute";
    particle.style.left = "50%";
    particle.style.top = "50%";
    particle.style.width = `${2 + Math.random() * 4}px`;
    particle.style.height = `${2 + Math.random() * 4}px`;
    particle.style.borderRadius = "50%";
    particle.style.background = i % 3 === 0
      ? "#ffd700"
      : "#39ff14";

    particle.style.boxShadow = `0 0 12px ${
      i % 3 === 0 ? "#ffd700" : "#39ff14"
    }`;

    particle.animate(
      [
        {
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 1
        },
        {
          transform:
            `translate(calc(-50% + ${Math.cos(angle) * distance}px), ` +
            `calc(-50% + ${Math.sin(angle) * distance}px)) scale(0)`,
          opacity: 0
        }
      ],
      {
        duration: 900 + Math.random() * 900,
        easing: "cubic-bezier(.1,.8,.2,1)",
        fill: "forwards"
      }
    );

    container.appendChild(particle);
  }
}

function showToast(title, message, type = "success") {
  const container = $("#toastContainer");

  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "error" : type === "gold" ? "gold" : ""}`;

  toast.innerHTML = `
    <strong>${title}</strong>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(30px)";

    setTimeout(() => {
      toast.remove();
    }, 250);
  }, 3500);
}

function setupEvents() {
  $("#cancelPurchase").addEventListener(
    "click",
    closePurchaseModal
  );

  $("#confirmPurchase").addEventListener(
    "click",
    confirmPurchase
  );

  $("#closeUnlock").addEventListener(
    "click",
    closeUnlockAnimation
  );

  $("#confirmOverlay").addEventListener(
    "click",
    event => {
      if (event.target === $("#confirmOverlay")) {
        closePurchaseModal();
      }
    }
  );

  $("#unlockOverlay").addEventListener(
    "click",
    event => {
      if (event.target === $("#unlockOverlay")) {
        closeUnlockAnimation();
      }
    }
  );

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closePurchaseModal();
      closeUnlockAnimation();
    }
  });
}

function initialize() {
  loadState();
  setupEvents();
  renderBounties();
  renderMarketplace();
  renderInventory();
  updateVault();

  checkBountyTimers();

  setInterval(checkBountyTimers, 1000);
}

document.addEventListener("DOMContentLoaded", initialize);