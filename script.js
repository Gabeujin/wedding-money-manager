// --- 상수 정의 ---
const GUEST_DATA_KEY = "weddingGuestsFinal";
const PREDEFINED_GUEST_KEY = "weddingPredefinedGuestsFinal";
const TICKET_CONFIG_KEY = "weddingTicketConfigFinal";
const TICKET_PASSWORD_KEY = "weddingTicketPassword";
const TOAST_DISPLAY_MISEC = 2200;

// --- 전역 변수 및 데이터 ---
let predefinedGuests =
  JSON.parse(localStorage.getItem(PREDEFINED_GUEST_KEY)) || [];
let guests = JSON.parse(localStorage.getItem(GUEST_DATA_KEY)) || [];
let guestCounter =
  guests.length > 0 ? Math.max(...guests.map((g) => g.no)) + 1 : 1;
let ticketConfig = JSON.parse(localStorage.getItem(TICKET_CONFIG_KEY)) || {
  price: 60000,
  limit: 180,
  buffer: "10%",
};
let tempPredefinedGuests = [];
let editIndex = -1;
const commonRelations = [
  "신랑 지인",
  "신부 지인",
  "신랑 부모님 지인",
  "신부 부모님 지인",
];
let lastFocusedElement;
let ticketChartInstance = null;
let currentSort = { key: "no", order: "asc" };

// --- DOM Elements ---
const nameInput = document.getElementById("name");
const relationInput = document.getElementById("relation");
const guestListBody = document.getElementById("guest-list-body");
const totalAmountEl = document.getElementById("total-amount");
const totalTicketsEl = document.getElementById("total-tickets");
const autocompleteBox = document.getElementById("autocomplete-box");
const relationSuggestionBox = document.getElementById(
  "relation-suggestion-box"
);
const progressBar = document.getElementById("ticket-progress-bar");
const progressBarContainer = document.querySelector(".progress-bar-container");
const memoModal = document.getElementById("memo-modal");
const relationModal = document.getElementById("relation-modal");
const statsModal = document.getElementById("stats-modal");
const ticketStatsModal = document.getElementById("ticket-stats-modal");
const jsonPreview = document.getElementById("json-preview");
const manualNameInput = document.getElementById("manual-name");
const manualRelationInput = document.getElementById("manual-relation");
const ticketPasswordInput = document.getElementById("ticket-password");
const unlockSettingsBtn = document.getElementById("unlock-settings-btn");
const resetPasswordLink = document.getElementById("reset-password-link");
const ticketConfigSection = document.getElementById("ticket-config-section");
const passwordLabel = document.getElementById("password-label");
const formToggleBtn = document.getElementById("form-toggle-btn");
const guestForm = document.getElementById("guest-form");
const guestListHeader = document.querySelector(".guest-list thead");
const scrollToTopBtn = document.getElementById("scroll-to-top");
const scrollToBottomBtn = document.getElementById("scroll-to-bottom");
const confirmModal = document.getElementById("confirm-modal");

// --- 함수 정의 ---
document.addEventListener("DOMContentLoaded", () => {
  const toastContainer = document.getElementById("toast-container");
  if (toastContainer) {
    toastContainer.setAttribute("aria-live", "assertive");
    toastContainer.setAttribute("aria-atomic", "true");
  }
});

const showToast = (message, type = "info") => {
  const toastContainer = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");
  let iconClass = "fa-solid fa-circle-info";
  if (type === "success") {
    iconClass = "fa-solid fa-check-circle";
  } else if (type === "error") {
    iconClass = "fa-solid fa-triangle-exclamation";
  }
  toast.innerHTML = `<i class="${iconClass}"></i> ${message}`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, TOAST_DISPLAY_MISEC);
};

const saveData = () =>
  localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(guests));
const saveTicketConfig = () =>
  localStorage.setItem(TICKET_CONFIG_KEY, JSON.stringify(ticketConfig));
const savePredefinedGuests = () => {
  predefinedGuests = [...tempPredefinedGuests];
  localStorage.setItem(PREDEFINED_GUEST_KEY, JSON.stringify(predefinedGuests));
};

const updateTicketProgress = () => {
  const totalTicketsIssued = guests.reduce((sum, g) => sum + g.tickets, 0);
  const limit = ticketConfig.limit || 0;
  if (limit === 0) {
    progressBar.style.width = "0%";
    progressBarContainer.style.setProperty("--buffer-position", `100%`);
    return;
  }
  const bufferValue = ticketConfig.buffer.toString();
  let bufferAmount = 0;
  if (bufferValue.includes("%")) {
    bufferAmount = limit * (parseFloat(bufferValue) / 100);
  } else {
    bufferAmount = parseFloat(bufferValue) || 0;
  }
  const totalAvailable = limit + bufferAmount;
  const percentage = (totalTicketsIssued / totalAvailable) * 100;
  progressBar.style.width = `${Math.min(percentage, 100)}%`;
  const bufferPosition = (limit / totalAvailable) * 100;
  progressBarContainer.style.setProperty(
    "--buffer-position",
    `${bufferPosition}%`
  );
  progressBar.classList.remove("warning", "danger");
  if (totalTicketsIssued > limit) {
    progressBar.classList.add("danger");
  } else if (totalTicketsIssued > limit * 0.85) {
    progressBar.classList.add("warning");
  }
};

const renderGuests = () => {
  sortGuests();
  guestListBody.innerHTML = "";
  let totalAmount = 0;
  let totalTickets = 0;
  if (guests.length === 0) {
    const emptyStateHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <i class="fa-solid fa-clipboard-list"></i>
            <h3>아직 기록된 하객이 없어요</h3>
            <p>상단 입력창에 첫 번째 하객 정보를 추가해보세요!</p>
          </div>
        </td>
      </tr>
    `;
    guestListBody.innerHTML = emptyStateHTML;
  } else {
    guests.forEach((guest, index) => {
      const row = document.createElement("tr");
      const memoButton = guest.memo
        ? `<button class="memo-btn" data-index="${index}"><i class="fa-solid fa-note-sticky"></i> 메모</button>`
        : `<button class="placeholder" disabled></button>`;
      const amountInManwon = guest.amount / 10000;
      const displayAmount = Number.isInteger(amountInManwon)
        ? `${amountInManwon}만원`
        : `${amountInManwon.toLocaleString()}만원`;
      row.innerHTML = `<td>${guest.no}</td><td>${
        guest.name
      }</td><td>${displayAmount}</td><td>${
        guest.relation
      }</td><td>${guest.tickets}개</td><td class="action-buttons">${memoButton}<button class="edit-btn" data-index="${index}"><i class="fa-solid fa-pencil"></i> 수정</button><button class="delete-btn" data-index="${index}"><i class="fa-solid fa-trash-can"></i> 삭제</button></td>`;
      guestListBody.appendChild(row);
      totalAmount += guest.amount;
      totalTickets += guest.tickets;
    });
  }
  totalAmountEl.textContent = `${totalAmount.toLocaleString()}원`;
  totalTicketsEl.textContent = `${totalTickets}개`;
  updateTicketProgress();
  updateSortIcons();
};

const updateJsonPreview = () => {
  jsonPreview.textContent = JSON.stringify(tempPredefinedGuests, null, 2);
};

const openModal = (modal) => {
  lastFocusedElement = document.activeElement;
  modal.style.display = "flex";
  const focusableElements = modal.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  firstElement?.focus();
  modal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  });
};

const closeModal = (modal) => {
  modal.style.display = "none";
  lastFocusedElement?.focus();
};

const showConfirm = (message) => {
  return new Promise((resolve) => {
    const confirmModal = document.getElementById("confirm-modal");
    const modalBody = document.getElementById("confirm-modal-body");
    const yesBtn = document.getElementById("confirm-btn-yes");
    const noBtn = document.getElementById("confirm-btn-no");
    modalBody.textContent = message;
    openModal(confirmModal);
    const handleYes = () => {
      closeModal(confirmModal);
      resolve(true);
      removeListeners();
    };
    const handleNo = () => {
      closeModal(confirmModal);
      resolve(false);
      removeListeners();
    };
    const removeListeners = () => {
      yesBtn.removeEventListener("click", handleYes);
      noBtn.removeEventListener("click", handleNo);
    };
    yesBtn.addEventListener("click", handleYes);
    noBtn.addEventListener("click", handleNo);
  });
};

// --- 이벤트 리스너 설정 ---
relationInput.addEventListener("focus", () => {
  relationSuggestionBox.innerHTML = "";
  commonRelations.forEach((relation) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.textContent = relation;
    item.addEventListener("click", () => {
      relationInput.value = relation;
      relationSuggestionBox.innerHTML = "";
    });
    relationSuggestionBox.appendChild(item);
  });
});

document
  .getElementById("total-amount-summary")
  .addEventListener("click", () => {
    if (guests.length === 0) {
      showToast("먼저 하객 정보를 추가해주세요.", "error");
      return;
    }
    const statsBody = document.getElementById("stats-modal-body");
    const totalGuests = guests.length;
    const totalAmount = guests.reduce((sum, g) => sum + g.amount, 0);
    const averageAmount = totalAmount / totalGuests;
    const maxGuest = guests.reduce(
      (max, g) => (g.amount > max.amount ? g : max),
      guests[0]
    );
    const minGuest = guests.reduce(
      (min, g) => (g.amount < min.amount ? g : min),
      guests[0]
    );
    statsBody.innerHTML = `<div class="stat-card"><h3>총 하객 수</h3><p>${totalGuests} 명</p></div><div class="stat-card"><h3>평균 축의금</h3><p>${Math.round(
      averageAmount
    ).toLocaleString()} 원</p></div><div class="stat-card"><h3>최고액</h3><p>${maxGuest.amount.toLocaleString()} 원</p><span>${
      maxGuest.name
    } (${
      maxGuest.relation
    })</span></div><div class="stat-card"><h3>최저액</h3><p>${minGuest.amount.toLocaleString()} 원</p><span>${
      minGuest.name
    } (${minGuest.relation})</span></div>`;
    openModal(statsModal);
  });

document
  .getElementById("total-tickets-summary")
  .addEventListener("click", () => {
    const ticketPassword = localStorage.getItem(TICKET_PASSWORD_KEY);
    const unlockArea = document.getElementById("settings-unlock-area");
    ticketConfigSection.style.display = "none";
    unlockArea.style.display = "flex";
    ticketPasswordInput.value = "";
    if (ticketPassword) {
      passwordLabel.textContent = "비밀번호 입력";
      ticketPasswordInput.placeholder = "6자리 숫자";
      unlockSettingsBtn.textContent = "설정 열기";
    } else {
      passwordLabel.textContent = "최초 비밀번호 설정";
      ticketPasswordInput.placeholder = "사용할 6자리 숫자";
      unlockSettingsBtn.textContent = "비밀번호 저장";
    }
    const statsBody = document.getElementById("ticket-stats-body");
    const totalTicketsIssued = guests.reduce((sum, g) => sum + g.tickets, 0);
    const limit = ticketConfig.limit || 0;
    const bufferValue = ticketConfig.buffer.toString();
    let bufferAmount = 0;
    if (bufferValue.includes("%")) {
      bufferAmount = limit * (parseFloat(bufferValue) / 100);
    } else {
      bufferAmount = parseFloat(bufferValue) || 0;
    }
    const totalAvailable = limit + bufferAmount;
    const remainingTickets = Math.max(0, totalAvailable - totalTicketsIssued);
    const totalAmount = guests.reduce((sum, g) => sum + g.amount, 0);
    statsBody.innerHTML = `<h3>통계</h3><div class="stat-card"><h3>총 발행 가능 식권</h3><p>${totalAvailable.toLocaleString()} 장 <span>(기본 ${limit} + 여유 ${bufferAmount})</span></p></div><div class="stat-card"><h3>현재 배부된 식권</h3><p>${totalTicketsIssued.toLocaleString()} 장</p></div><div class="stat-card"><h3>남은 식권</h3><p>${remainingTickets.toLocaleString()} 장</p></div><div class="stat-card"><h3>예상 식권 총 비용</h3><p>${(
      totalTicketsIssued * ticketConfig.price
    ).toLocaleString()} 원</p></div><div class="stat-card"><h3>1인당 평균 배부 식권</h3><p>${
      guests.length > 0
        ? (totalTicketsIssued / guests.length).toFixed(2)
        : 0
    } 장</p></div><div class="stat-card"><h3>식권 1장당 평균 축의금</h3><p>${
      totalTicketsIssued > 0
        ? Math.round(totalAmount / totalTicketsIssued).toLocaleString()
        : 0
    } 원</p></div>`;
    const chartCanvas = document.getElementById("ticket-chart");
    const chartEmptyState = document.getElementById("chart-empty-state");
    if (ticketChartInstance) {
      ticketChartInstance.destroy();
      ticketChartInstance = null;
    }
    if (totalAvailable > 0) {
      chartCanvas.style.display = "block";
      chartEmptyState.classList.remove("visible");
      ticketChartInstance = new Chart(chartCanvas.getContext("2d"), {
        type: "doughnut",
        data: {
          labels: ["배부 식권", "남은 식권"],
          datasets: [
            {
              data: [totalTicketsIssued, remainingTickets],
              backgroundColor: ["#FFC107", "#E9ECEF"],
              borderColor: ["#FFC107", "#E9ECEF"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          cutout: "70%",
          plugins: {
            legend: { position: "bottom" },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return `${
                    context.label
                  }: ${context.raw.toLocaleString()} 장`;
                },
              },
            },
          },
        },
      });
    } else {
      chartCanvas.style.display = "none";
      chartEmptyState.classList.add("visible");
    }
    openModal(ticketStatsModal);
  });

unlockSettingsBtn.addEventListener("click", () => {
  const savedPassword = localStorage.getItem(TICKET_PASSWORD_KEY);
  const enteredPassword = ticketPasswordInput.value;
  if (savedPassword) {
    if (enteredPassword === savedPassword) {
      document.getElementById("settings-unlock-area").style.display = "none";
      ticketConfigSection.style.display = "block";
      showToast("인증되었습니다.", "success");
    } else {
      showToast("비밀번호가 일치하지 않습니다.", "error");
    }
  } else {
    if (enteredPassword.length === 6 && !isNaN(enteredPassword)) {
      localStorage.setItem(TICKET_PASSWORD_KEY, enteredPassword);
      document.getElementById("settings-unlock-area").style.display = "none";
      ticketConfigSection.style.display = "block";
      showToast("비밀번호가 설정되었습니다.", "success");
    } else {
      showToast("6자리 숫자로 설정해주세요.", "error");
    }
  }
});

resetPasswordLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const confirmed = await showConfirm(
    "정말로 비밀번호와 식권 설정을 초기화하시겠습니까?"
  );
  if (confirmed) {
    localStorage.removeItem(TICKET_PASSWORD_KEY);
    ticketConfig = { price: 50000, limit: 0, buffer: "0" };
    saveTicketConfig();
    renderGuests();
    closeModal(ticketStatsModal);
    showToast("비밀번호와 설정이 초기화되었습니다.", "info");
  }
});

document
  .getElementById("save-ticket-config-btn")
  .addEventListener("click", () => {
    ticketConfig.price =
      parseInt(document.getElementById("ticket-price").value) || 0;
    ticketConfig.limit =
      parseInt(document.getElementById("ticket-limit").value) || 0;
    ticketConfig.buffer = document.getElementById("ticket-buffer").value || "0";
    saveTicketConfig();
    updateTicketProgress();
    showToast("식권 설정이 저장되었습니다.", "success");
    closeModal(ticketStatsModal);
  });

document.getElementById("guest-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const guestData = {
    no: guestCounter++,
    name: nameInput.value.trim(),
    amount: (parseInt(document.getElementById("amount").value) || 0) * 10000,
    relation: relationInput.value.trim(),
    memo: document.getElementById("memo").value.trim(),
    tickets: parseInt(document.getElementById("tickets").value) || 0,
  };
  if (!guestData.name) {
    showToast("하객 이름을 입력해주세요.", "error");
    return;
  }
  if (editIndex > -1) {
    const originalNo = guests[editIndex].no;
    guestData.no = originalNo; // 수정 시에는 no 유지
    guests[editIndex] = guestData;
    guestCounter--; // 불필요하게 증가된 카운터 복원
  } else {
    guests.push(guestData);
  }
  saveData();
  renderGuests();
  document.getElementById("guest-form").reset();
  document.getElementById("add-btn").textContent = "추가";
  editIndex = -1;
  nameInput.focus();
});

// 이름 자동완성
nameInput.addEventListener("input", () => {
  const value = nameInput.value.toLowerCase();
  autocompleteBox.innerHTML = "";
  if (!value || predefinedGuests.length === 0) return;
  const filtered = predefinedGuests.filter((g) =>
    g.name.toLowerCase().includes(value)
  );
  filtered.forEach((guest) => {
    const item = document.createElement("div");
    item.className = "autocomplete-item";
    item.textContent = `${guest.name} : ${guest.relation}`;
    item.addEventListener("click", () => {
      nameInput.value = guest.name;
      relationInput.value = guest.relation;
      autocompleteBox.innerHTML = "";
      document.getElementById("amount").focus();
    });
    autocompleteBox.appendChild(item);
  });
});

document.addEventListener("click", (e) => {
  if (e.target !== nameInput) {
    autocompleteBox.innerHTML = "";
  }
  if (e.target !== relationInput) {
    relationSuggestionBox.innerHTML = "";
  }
});

guestListBody.addEventListener("click", async (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  const { classList, dataset } = button;
  const index = parseInt(dataset.index);
  if (classList.contains("delete-btn")) {
    const confirmed = await showConfirm(
      `'${guests[index].name}'님의 기록을 삭제하시겠습니까?`
    );
    if (confirmed) {
      guests.splice(index, 1);
      saveData();
      renderGuests();
      showToast("삭제되었습니다.", "info");
    }
  } else if (classList.contains("edit-btn")) {
    const guest = guests[index];
    nameInput.value = guest.name;
    document.getElementById("amount").value = guest.amount / 10000;
    relationInput.value = guest.relation;
    document.getElementById("memo").value = guest.memo;
    document.getElementById("tickets").value = guest.tickets;
    editIndex = index;
    document.getElementById("add-btn").textContent = "수정 완료";
    nameInput.focus();
  } else if (classList.contains("memo-btn")) {
    document.getElementById(
      "memo-modal-title"
    ).textContent = `${guests[index].name}님 메모`;
    document.getElementById("memo-modal-body").textContent =
      guests[index].memo;
    openModal(memoModal);
  }
});

document
  .getElementById("manage-relations-btn")
  .addEventListener("click", () => {
    tempPredefinedGuests = [...predefinedGuests];
    updateJsonPreview();
    openModal(relationModal);
  });

document.getElementById("clear-all").addEventListener("click", async () => {
  const confirmed = await showConfirm("정말로 모든 기록을 삭제하시겠습니까?");
  if (confirmed) {
    guests = [];
    guestCounter = 1; // 전체 삭제 시 카운터도 초기화
    saveData();
    renderGuests();
    showToast("모든 기록이 삭제되었습니다.", "info");
  }
});

document.getElementById("export-csv").addEventListener("click", () => {
  if (guests.length === 0) {
    showToast("내보낼 데이터가 없습니다.", "error");
    return;
  }
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
  csvContent += "No.,이름,금액,관계,식권,메모\r\n";
  guests.forEach((g) => {
    const row = [
      g.no,
      `"${g.name}"`,
      g.amount,
      `"${g.relation}"`,
      g.tickets,
      `"${g.memo}"`,
    ].join(",");
    csvContent += row + "\r\n";
  });
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = "wedding_money_list.csv";
  link.click();
});

const setupModalClose = (modal, closeButtonId) => {
  const closeModalFn = () => closeModal(modal);
  document.getElementById(closeButtonId).addEventListener("click", closeModalFn);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModalFn();
    }
  });
};
setupModalClose(memoModal, "memo-modal-close");
setupModalClose(relationModal, "relation-modal-close");
setupModalClose(statsModal, "stats-modal-close");
setupModalClose(ticketStatsModal, "ticket-stats-modal-close");
setupModalClose(confirmModal, "confirm-btn-no"); // confirm modal의 취소 버튼

// --- 하객 명단 관리 모달 로직 ---
const relationTabs = document.querySelectorAll(".tab-nav button");
const relationTabContents = document.querySelectorAll(".tab-content");
relationTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    relationTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    relationTabContents.forEach((c) => c.classList.remove("active"));
    document.getElementById(tab.dataset.tab + "-tab").classList.add("active");
  });
});

document.getElementById("file-upload").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  const fileExtension = file.name.split(".").pop().toLowerCase();
  reader.onload = (e) => {
    try {
      let data = [];
      if (fileExtension === "json") {
        data = JSON.parse(e.target.result);
      } else if (["xlsx", "xls"].includes(fileExtension)) {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const header = jsonData[0].map((h) => h.toString().toLowerCase().trim());
        const nameIndex = header.indexOf("이름");
        const relationIndex = header.indexOf("관계");
        if (nameIndex === -1 || relationIndex === -1) {
          throw new Error("엑셀 파일에 '이름'과 '관계' 컬럼이 모두 존재해야 합니다.");
        }
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row[nameIndex] && row[relationIndex]) {
            data.push({
              name: row[nameIndex].toString(),
              relation: row[relationIndex].toString(),
            });
          }
        }
      }
      if (
        !Array.isArray(data) ||
        !data.every((item) => "name" in item && "relation" in item)
      ) {
        throw new Error("데이터 형식이 올바르지 않습니다.");
      }
      tempPredefinedGuests = data;
      updateJsonPreview();
      showToast("파일을 성공적으로 읽었습니다.", "success");
    } catch (err) {
      showToast("파일 처리 중 오류: " + err.message, "error");
    }
  };
  if (["xlsx", "xls"].includes(fileExtension)) {
    reader.readAsBinaryString(file);
  } else {
    reader.readAsText(file);
  }
});

document.getElementById("manual-add-btn").addEventListener("click", () => {
  const name = manualNameInput.value.trim();
  const relation = manualRelationInput.value.trim();
  if (name && relation) {
    tempPredefinedGuests.push({ name, relation });
    updateJsonPreview();
    manualNameInput.value = "";
    manualRelationInput.value = "";
    manualNameInput.focus();
  } else {
    showToast("이름과 관계를 모두 입력해주세요.", "error");
  }
});

manualRelationInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("manual-add-btn").click();
  }
});

document.getElementById("copy-json-btn").addEventListener("click", () => {
  navigator.clipboard
    .writeText(jsonPreview.textContent)
    .then(() => showToast("JSON 데이터가 복사되었습니다.", "success"))
    .catch(() => showToast("복사에 실패했습니다.", "error"));
});

document
  .getElementById("clear-json-btn")
  .addEventListener("click", async () => {
    const confirmed = await showConfirm(
      "현재 미리보기 중인 명단을 모두 비우시겠습니까?"
    );
    if (confirmed) {
      tempPredefinedGuests = [];
      updateJsonPreview();
      showToast("명단이 비워졌습니다.", "info");
    }
  });

document
  .getElementById("save-relations-btn")
  .addEventListener("click", async () => {
    const confirmed = await showConfirm(
      "현재 명단을 저장하시겠습니까? 기존 명단은 덮어씌워집니다."
    );
    if (confirmed) {
      savePredefinedGuests();
      showToast("하객 명단이 저장되었습니다.", "success");
      closeModal(relationModal);
    }
  });

// --- 신규 기능 함수 및 이벤트 리스너 ---
formToggleBtn.addEventListener("click", () => {
  const isCollapsed = guestForm.style.display === "none";
  guestForm.style.display = isCollapsed ? "grid" : "none";
  formToggleBtn.classList.toggle("collapsed", !isCollapsed);
  const icon = formToggleBtn.querySelector("i");
  const span = formToggleBtn.querySelector("span");
  if (!isCollapsed) {
    span.textContent = "입력창 보이기";
    icon.title = "입력창 보이기";
  } else {
    span.textContent = "입력창 숨기기";
    icon.title = "입력창 숨기기";
  }
});

const sortGuests = () => {
  const { key, order } = currentSort;
  guests.sort((a, b) => {
    if (key === 'name') {
      return order === 'asc' 
        ? a.name.localeCompare(b.name, 'ko') 
        : b.name.localeCompare(a.name, 'ko');
    } else {
      const valA = a[key];
      const valB = b[key];
      if (valA < valB) return order === 'asc' ? -1 : 1;
      if (valA > valB) return order === 'asc' ? 1 : -1;
      return 0;
    }
  });
};

const updateSortIcons = () => {
  document.querySelectorAll(".guest-list th[data-sort]").forEach((th) => {
    th.classList.remove("sorted-asc", "sorted-desc");
    const icon = th.querySelector(".sort-icon");
    icon.className = "sort-icon fa-solid fa-sort";
    if (th.dataset.sort === currentSort.key) {
      th.classList.add(currentSort.order === "asc" ? "sorted-asc" : "sorted-desc");
      icon.className = `sort-icon fa-solid fa-sort-${
        currentSort.order === "asc" ? "up" : "down"
      }`;
    }
  });
};

guestListHeader.addEventListener("click", (e) => {
  const header = e.target.closest("th[data-sort]");
  if (!header) return;
  const sortKey = header.dataset.sort;
  if (currentSort.key === sortKey) {
    currentSort.order = currentSort.order === "asc" ? "desc" : "asc";
  } else {
    currentSort.key = sortKey;
    currentSort.order = "asc";
  }
  renderGuests();
});

const handleScrollButtons = () => {
  const isScrollable = document.body.scrollHeight > window.innerHeight * 1.2;
  scrollToTopBtn.style.display = isScrollable ? "flex" : "none";
  scrollToBottomBtn.style.display = isScrollable ? "flex" : "none";
};
window.addEventListener("scroll", handleScrollButtons);
window.addEventListener("resize", handleScrollButtons);
scrollToTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
scrollToBottomBtn.addEventListener("click", () => {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
});

// --- 초기 실행 ---
renderGuests();
nameInput.focus();
handleScrollButtons();

// --- PWA 서비스 워커 등록 ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // [중요!] GitHub Pages 저장소 이름에 맞게 경로를 수정해야 합니다.
    navigator.serviceWorker.register('/wedding-money-manager/sw.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch(registrationError => {
        console.log('Service Worker registration failed:', registrationError);
      });
  });
}