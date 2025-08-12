// memory-tribunal.js
// Requires: Chart.js loaded in the HTML before this script

document.addEventListener("DOMContentLoaded", function () {
  // ---------- Modal Logic ----------
  const activeModals = new Set();

  window.showModal = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "block";
    activeModals.add(id);
  };

  window.closeModal = function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "none";
    activeModals.delete(id);
  };

  // click outside to close
  document.addEventListener("click", (e) => {
    activeModals.forEach((id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      const content = modal.querySelector(".modal-content");
      if (modal.style.display === "block" && !content.contains(e.target) && e.target === modal) {
        closeModal(id);
      }
    });
  });

  // Esc to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      activeModals.forEach((id) => closeModal(id));
    }
  });

  // ---------- Voting + Chart ----------
  const ctxEl = document.getElementById("voteChart");
  if (!ctxEl) return; // guard if canvas missing

  // Persistent storage helpers
  const LS_KEY = "mtl_emilywu_votes_v1";
  const loadVotes = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const parsed = raw ? JSON.parse(raw) : { yes: 0, no: 0 };
      if (typeof parsed.yes !== "number" || typeof parsed.no !== "number") throw 0;
      return parsed;
    } catch {
      return { yes: 0, no: 0 };
    }
  };
  const saveVotes = (data) => localStorage.setItem(LS_KEY, JSON.stringify(data));

  const votes = loadVotes();

  // Create Chart
  const ctx = ctxEl.getContext("2d");
  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Yes", "No"],
      datasets: [
        {
          label: "Votes",
          data: [votes.yes, votes.no],
          backgroundColor: ["#00ffe1", "#ff007a"],
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      animation: {
        duration: 600
      },
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Live Vote Results"
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: "#333" },
          ticks: { color: "#fff" }
        },
        y: {
          beginAtZero: true,
          grid: { color: "#333" },
          ticks: {
            color: "#fff",
            precision: 0,
            stepSize: 1
          }
        }
      }
    }
  });

  // Button press ripple (tiny flair)
  const addRipple = (btn) => {
    const r = document.createElement("span");
    r.style.position = "absolute";
    r.style.inset = "0";
    r.style.borderRadius = "8px";
    r.style.boxShadow = "0 0 0 0 rgba(0,255,225,0.6)";
    r.style.animation = "mtlPulse 700ms ease-out forwards";
    r.style.pointerEvents = "none";
    btn.style.position = "relative";
    btn.appendChild(r);
    setTimeout(() => r.remove(), 700);
  };

  // Inject ripple keyframes once
  if (!document.getElementById("mtlPulseKF")) {
    const style = document.createElement("style");
    style.id = "mtlPulseKF";
    style.textContent = `
      @keyframes mtlPulse {
        0% { box-shadow: 0 0 0 0 rgba(0,255,225,0.6); }
        100% { box-shadow: 0 0 16px 12px rgba(0,255,225,0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Public vote API for inline onclick handlers
  window.vote = function (option) {
    const yesBtn = document.querySelector('button[onclick*="vote(\'yes\')"]');
    const noBtn = document.querySelector('button[onclick*="vote(\'no\')"]');

    if (option === "yes") {
      votes.yes += 1;
      chart.data.datasets[0].data[0] = votes.yes;
      if (yesBtn) addRipple(yesBtn);
    } else if (option === "no") {
      votes.no += 1;
      chart.data.datasets[0].data[1] = votes.no;
      if (noBtn) addRipple(noBtn);
    } else {
      return;
    }

    saveVotes(votes);
    chart.update();

    // micro haptic via CSS class (subtle scale)
    const container = document.getElementById("voting");
    if (container) {
      container.animate([{ transform: "scale(1.0)" }, { transform: "scale(1.02)" }, { transform: "scale(1.0)" }], {
        duration: 220,
        easing: "ease-out"
      });
    }
  };
});

window.addEventListener("load", () => {
  const audio = document.getElementById("bg-audio");
  audio.volume = 0; // 开始为静音
  audio.play().catch(() => {}); // 避免阻止自动播放

  // 解锁音频播放：用户首次点击任意处
  document.body.addEventListener(
    "click",
    () => {
      audio.muted = false;
      fadeInAudio(audio);
    },
    { once: true }
  );
});

// 🌫️ 渐入音量
function fadeInAudio(audio, targetVolume = 0.5, duration = 3000) {
  const steps = 30;
  const stepTime = duration / steps;
  let currentStep = 0;

  const fade = setInterval(() => {
    currentStep++;
    audio.volume = (targetVolume * currentStep) / steps;
    if (currentStep >= steps) clearInterval(fade);
  }, stepTime);
}

// 🔄 切换音源
function switchSound(file) {
  const audio = document.getElementById("bg-audio");
  const currentVolume = audio.volume;
  audio.pause();
  audio.src = `sounds/${file}`;
  audio.load();
  audio.play().then(() => {
    audio.volume = 0;
    fadeInAudio(audio, currentVolume);
  });
}

// 🔇 静音 / 取消静音切换
function toggleMute() {
  const audio = document.getElementById("bg-audio");
  audio.muted = !audio.muted;
}

function showGlitchMessage(message = "⚠ MEMORY FRAGMENT CORRUPTED") {
  const textBox = document.getElementById("glitch-text");
  const sound = document.getElementById("glitch-sound");
  if (!textBox || !sound) return;

  textBox.textContent = message;
  textBox.style.opacity = "1";
  textBox.classList.add("glitch-flash");

  // 播放音效
  sound.currentTime = 0;
  sound.play().catch(() => {}); // 静音浏览器会阻止播放

  // 恢复状态
  setTimeout(() => {
    textBox.style.opacity = "0";
    textBox.classList.remove("glitch-flash");
  }, 1600);
}

// 点击页面时触发
document.addEventListener("click", () => {
  showGlitchMessage("⚠ UNAUTHORIZED ACCESS DETECTED");
});

// 每 20 秒触发一次
setInterval(() => {
  const messages = [
    "⚠ MEMORY FRAGMENT CORRUPTED",
    "⚠ UNAUTHORIZED ACCESS DETECTED",
    "⚠ COGNITIVE BREACH IN PROGRESS",
    "⚠ MEMORYLINK INTERFERENCE",
    "⚠ SIGNAL LOST – RECONNECTING..."
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  showGlitchMessage(msg);
}, 20000);

document.addEventListener("DOMContentLoaded", function () {
  const ctx = document.getElementById("emotionChart").getContext("2d");

  const emotionChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["00:00", "00:10", "00:20", "00:30", "00:40", "00:50", "01:00"],
      datasets: [{
        label: "Emotional Intensity",
        data: [10, 15, 30, 80, 60, 40, 20],
        fill: true,
        borderColor: "#ff007a",
        backgroundColor: "rgba(255, 0, 122, 0.2)",
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#fff"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Emotion Peaks During Testimony",
          color: "#fff"
        }
      },
      scales: {
        x: {
          ticks: { color: "#fff" },
          grid: { color: "#333" }
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: "#fff" },
          grid: { color: "#333" }
        }
      }
    }
  });

  // Optional: Animate over time
  let index = 7;
  setInterval(() => {
    if (index > 20) return;
    const next = Math.floor(Math.random() * 80) + 20;
    emotionChart.data.labels.push(`+${index}s`);
    emotionChart.data.datasets[0].data.push(next);
    emotionChart.update();
    index += 5;
  }, 3000);
});

let playing = false;
let slideshowInterval = null;

const images = [
  { src: "images/neural-scan.png", caption: "Neural Scan / Memory Map" },
  { src: "images/memorylink-usb.png", caption: "MemoryLink USB Interface" },
  { src: "images/future-courtroom.png", caption: "Futuristic Tribunal Courtroom" },
  { src: "images/protest-wall.png", caption: "Neon Protest Wall" },
  { src: "images/emotion-face.png", caption: "Emotional Portrait" },
  { src: "images/mind-rain.png", caption: "Mind Rain Hack" },
  { src: "images/memoryseal-guide.png", caption: "MemorySeal User Guide" }
];

let currentIndex = 0;

function toggleSlideshow() {
  const btn = document.querySelector("#image-player button");
  if (!playing) {
    btn.textContent = "⏸ Pause Playback";
    slideshowInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % images.length;
      document.getElementById("slideshow").src = images[currentIndex].src;
      document.getElementById("caption").textContent = images[currentIndex].caption;
    }, 3000);
    playing = true;
  } else {
    btn.textContent = "▶ Play Visual Archive";
    clearInterval(slideshowInterval);
    playing = false;
  }
}
