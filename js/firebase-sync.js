// Yıldızlı Ortalama ✦ Firebase Senkronizasyonu
// v0.2.5 - Girişte ve uygulama açılışında buluttaki güncel veriyi otomatik getirme eklendi

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCH6F_weKdk0OyACYz_8LlEG0eKg7BbC5U",
  authDomain: "yildizli-ortalama-sync.firebaseapp.com",
  projectId: "yildizli-ortalama-sync",
  storageBucket: "yildizli-ortalama-sync.firebasestorage.app",
  messagingSenderId: "821439438436",
  appId: "1:821439438436:web:1f03742349985a0e42c971"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SYNC_AUTO_KEY = "yanoGanoSyncAuto";
const SYNC_LAST_KEY = "yanoGanoSyncLast";
const SYNC_EMAIL_KEY = "yanoGanoSyncEmail";
const SYNC_LAST_PULL_KEY = "yanoGanoSyncLastPull";
const SYNC_BACKUP_PREFIX = "yanoGanoSyncLocalBackup_";
const SYNC_PANEL_OPEN_KEY = "yanoGanoSyncPanelOpen";
const SYNC_LAST_CLOUD_MS_KEY = "yanoGanoSyncLastCloudMs";

const SYNCABLE_PREFIXES = ["yanoGano", "dersTakip"];
const EXCLUDED_PREFIXES = ["yanoGanoSync"];

let currentUser = null;
let syncElements = {};
let autoSyncTimer = null;
let lastCloudInfo = null;
let suppressAutoSync = false;

function isSyncableKey(key) {
  if (!key) return false;
  if (EXCLUDED_PREFIXES.some(prefix => key.startsWith(prefix))) return false;
  return SYNCABLE_PREFIXES.some(prefix => key.startsWith(prefix));
}

function collectLocalData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (isSyncableKey(key)) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

function appKeysInLocalStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (isSyncableKey(key)) keys.push(key);
  }
  return keys;
}

function safeParse(text, fallback) {
  try {
    if (!text) return fallback;
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

function countCoursesFromStorageData(data) {
  const raw = data && (data.yanoGanoVerileri || data.dersTakipVerileri);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed.length : 0;
}

function countLocalCourses() {
  return countCoursesFromStorageData(collectLocalData());
}

function formatDate(value) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function setMessage(text, type = "info") {
  if (!syncElements.message) return;
  syncElements.message.textContent = text || "";
  syncElements.message.dataset.tip = type;
}

function setBusy(isBusy) {
  if (syncElements.login) syncElements.login.disabled = !!isBusy;
  if (syncElements.signup) syncElements.signup.disabled = !!isBusy;

  const needsUser = ["logout", "upload", "download", "check"];
  needsUser.forEach(key => {
    if (syncElements[key]) syncElements[key].disabled = !!isBusy || !currentUser;
  });

  if (syncElements.auto) syncElements.auto.disabled = !!isBusy || !currentUser;
}

function updateMiniSummary() {
  if (!syncElements.miniSummary) return;
  const localText = `${countLocalCourses()} ders`;
  const cloudText = currentUser ? (lastCloudInfo ? `${lastCloudInfo.courseCount} ders` : "Yok") : "Giriş yok";
  syncElements.miniSummary.textContent = `Bu cihaz: ${localText} • Bulut: ${cloudText}`;
}

function updateLocalSummary() {
  if (syncElements.localCount) {
    syncElements.localCount.textContent = `${countLocalCourses()} ders`;
  }
  if (syncElements.lastSync) {
    syncElements.lastSync.textContent = formatDate(localStorage.getItem(SYNC_LAST_KEY));
  }
  if (syncElements.lastPull) {
    syncElements.lastPull.textContent = formatDate(localStorage.getItem(SYNC_LAST_PULL_KEY));
  }
  updateMiniSummary();
}

function updateAuthUI(user) {
  currentUser = user || null;
  const loggedIn = !!currentUser;

  if (syncElements.status) {
    syncElements.status.textContent = loggedIn ? "Bağlı" : "Giriş yok";
    syncElements.status.dataset.durum = loggedIn ? "bagli" : "kapali";
  }
  if (syncElements.authBox) syncElements.authBox.hidden = loggedIn;
  if (syncElements.userBox) syncElements.userBox.hidden = !loggedIn;
  if (syncElements.userEmail) syncElements.userEmail.textContent = loggedIn ? currentUser.email : "-";
  updateMiniSummary();

  ["upload", "download", "check"].forEach(key => {
    if (syncElements[key]) syncElements[key].disabled = !loggedIn;
  });
  if (syncElements.auto) syncElements.auto.disabled = !loggedIn;

  if (loggedIn) {
    localStorage.setItem(SYNC_EMAIL_KEY, currentUser.email || "");
    updateLocalSummary();
    checkCloudState(false, { autoPull: true });
  } else {
    setMessage("Senkron için e-posta ve şifreyle giriş yap.", "info");
  }
}

function syncDocRef() {
  if (!currentUser) throw new Error("Önce giriş yapmalısın.");
  return doc(db, "users", currentUser.uid, "sync", "appData");
}

function makePayload(reason) {
  const data = collectLocalData();
  return {
    appName: "Yıldızlı Ortalama",
    syncVersion: 1,
    appVersion: "0.2.5",
    reason: reason || "manual",
    data,
    keyCount: Object.keys(data).length,
    courseCount: countCoursesFromStorageData(data),
    updatedAt: serverTimestamp(),
    updatedAtMs: Date.now(),
    updatedBy: currentUser ? currentUser.email || currentUser.uid : "unknown"
  };
}

async function uploadToCloud(reason = "manual") {
  if (!currentUser) {
    setMessage("Önce giriş yapmalısın.", "error");
    return;
  }

  const courseCount = countLocalCourses();
  const keyCount = Object.keys(collectLocalData()).length;
  if (courseCount === 0) {
    const ok = confirm("Yerel ders verin boş görünüyor. Buluttaki verinin üstüne boş veri yazmak istediğine emin misin?");
    if (!ok) return;
  }

  setBusy(true);
  setMessage("Buluta yedekleniyor...", "info");
  try {
    const payload = makePayload(reason);
    await setDoc(syncDocRef(), payload);
    const nowIso = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_KEY, nowIso);
    localStorage.setItem(SYNC_LAST_CLOUD_MS_KEY, String(payload.updatedAtMs));
    lastCloudInfo = { courseCount: payload.courseCount, keyCount: payload.keyCount, updatedAtMs: payload.updatedAtMs };
    updateLocalSummary();
    updateCloudSummary(lastCloudInfo);
    setMessage(`Buluta yedeklendi. (${payload.courseCount} ders, ${keyCount} veri alanı)`, "success");
  } catch (error) {
    console.error("Firebase upload error", error);
    setMessage("Buluta yedekleme başarısız: " + readableFirebaseError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function downloadFromCloud(options = {}) {
  if (!currentUser) {
    setMessage("Önce giriş yapmalısın.", "error");
    return;
  }

  const autoMode = options && options.auto === true;
  setBusy(true);
  setMessage(autoMode ? "Buluttaki güncel veri otomatik getiriliyor..." : "Buluttaki veri kontrol ediliyor...", "info");
  try {
    const snapshot = await getDoc(syncDocRef());
    if (!snapshot.exists()) {
      setMessage("Bulutta henüz yedek yok. Önce verisi olan cihazdan 'Buluta yedekle' yap.", "error");
      return;
    }

    const cloud = snapshot.data() || {};
    const cloudData = cloud.data || {};
    const cloudCourseCount = countCoursesFromStorageData(cloudData);
    const localCourseCount = countLocalCourses();

    if (localCourseCount > 0 && !autoMode) {
      const ok = confirm(
        `Buluttaki veri (${cloudCourseCount} ders) bu cihazdaki mevcut verinin (${localCourseCount} ders) üstüne yazılacak.\n\n` +
        "Devam etmeden önce bu cihazdaki mevcut veri uygulama içinde güvenli yedek olarak saklanacak. Devam edilsin mi?"
      );
      if (!ok) return;
    }

    createLocalSafetyBackup("Buluttan veri almadan önce");

    suppressAutoSync = true;
    const localKeys = appKeysInLocalStorage();
    localKeys.forEach(key => {
      if (!Object.prototype.hasOwnProperty.call(cloudData, key)) {
        localStorage.removeItem(key);
      }
    });
    Object.entries(cloudData).forEach(([key, value]) => {
      if (isSyncableKey(key) && typeof value === "string") {
        localStorage.setItem(key, value);
      }
    });
    const nowIso = new Date().toISOString();
    localStorage.setItem(SYNC_LAST_PULL_KEY, nowIso);
    localStorage.setItem(SYNC_LAST_KEY, nowIso);
    if (cloud.updatedAtMs) localStorage.setItem(SYNC_LAST_CLOUD_MS_KEY, String(cloud.updatedAtMs));
    suppressAutoSync = false;

    setMessage(autoMode ? `Buluttaki güncel veri otomatik getirildi. (${cloudCourseCount} ders) Sayfa yenileniyor...` : `Buluttan getirildi. (${cloudCourseCount} ders) Sayfa yenileniyor...`, "success");
    updateLocalSummary();
    setTimeout(() => window.location.reload(), 900);
  } catch (error) {
    suppressAutoSync = false;
    console.error("Firebase download error", error);
    setMessage("Buluttan getirme başarısız: " + readableFirebaseError(error), "error");
  } finally {
    setBusy(false);
  }
}

function createLocalSafetyBackup(label) {
  const backup = {
    label,
    createdAt: new Date().toISOString(),
    courseCount: countLocalCourses(),
    data: collectLocalData()
  };
  try {
    localStorage.setItem(SYNC_BACKUP_PREFIX + Date.now(), JSON.stringify(backup));
  } catch (error) {
    console.warn("Yerel güvenli yedek oluşturulamadı", error);
  }
}

function getLastCloudMs() {
  const value = Number(localStorage.getItem(SYNC_LAST_CLOUD_MS_KEY) || "0");
  return Number.isFinite(value) ? value : 0;
}

function shouldAutoPullFromCloud(cloud) {
  const cloudData = cloud && cloud.data ? cloud.data : {};
  const cloudCourseCount = countCoursesFromStorageData(cloudData);
  const localCourseCount = countLocalCourses();
  const cloudMs = Number(cloud && cloud.updatedAtMs ? cloud.updatedAtMs : 0);
  const lastCloudMs = getLastCloudMs();

  if (!cloudData || Object.keys(cloudData).length === 0 || cloudCourseCount === 0) {
    return { should: false, reason: "empty-cloud" };
  }

  if (localCourseCount === 0) {
    return { should: true, reason: "local-empty" };
  }

  if (cloudMs && cloudMs > lastCloudMs) {
    return { should: true, reason: "cloud-newer" };
  }

  return { should: false, reason: "already-current" };
}

async function checkCloudState(showMessage = true, options = {}) {
  if (!currentUser) return;
  try {
    const snapshot = await getDoc(syncDocRef());
    if (!snapshot.exists()) {
      lastCloudInfo = null;
      updateCloudSummary(null);
      if (showMessage) setMessage("Bulutta henüz yedek yok.", "info");
      return;
    }
    const cloud = snapshot.data() || {};
    lastCloudInfo = {
      courseCount: typeof cloud.courseCount === "number" ? cloud.courseCount : countCoursesFromStorageData(cloud.data || {}),
      keyCount: typeof cloud.keyCount === "number" ? cloud.keyCount : Object.keys(cloud.data || {}).length,
      updatedAtMs: cloud.updatedAtMs || null,
      updatedBy: cloud.updatedBy || "-"
    };
    updateCloudSummary(lastCloudInfo);

    if (options && options.autoPull) {
      const decision = shouldAutoPullFromCloud(cloud);
      if (decision.should) {
        setMessage(
          decision.reason === "local-empty"
            ? "Bu cihaz boş. Buluttaki veriler otomatik getiriliyor..."
            : "Bulutta daha güncel veri var. Otomatik getiriliyor...",
          "info"
        );
        setTimeout(() => downloadFromCloud({ auto: true }), 250);
        return;
      }
      if (!showMessage) {
        setMessage(`Bulut kontrol edildi. Bu cihaz güncel görünüyor. (${lastCloudInfo.courseCount} ders)`, "success");
      }
    }

    if (showMessage) {
      setMessage(`Bulut yedeği bulundu. (${lastCloudInfo.courseCount} ders)`, "success");
    }
  } catch (error) {
    console.error("Firebase cloud check error", error);
    if (showMessage) setMessage("Bulut durumu alınamadı: " + readableFirebaseError(error), "error");
  }
}

function updateCloudSummary(info) {
  if (syncElements.cloudCount) syncElements.cloudCount.textContent = info ? `${info.courseCount} ders` : "Yok";
  if (syncElements.cloudDate) syncElements.cloudDate.textContent = info && info.updatedAtMs ? formatDate(info.updatedAtMs) : "-";
  updateMiniSummary();
}

function readableFirebaseError(error) {
  const code = error && error.code ? String(error.code) : "";
  if (code.includes("auth/email-already-in-use")) return "Bu e-posta ile zaten hesap var. Giriş yapmayı dene.";
  if (code.includes("auth/invalid-email")) return "E-posta adresi geçersiz.";
  if (code.includes("auth/weak-password")) return "Şifre en az 6 karakter olmalı.";
  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) return "E-posta veya şifre hatalı.";
  if (code.includes("permission-denied")) return "Yetki reddedildi. Firebase Rules veya giriş durumunu kontrol et.";
  if (code.includes("unavailable")) return "Bağlantı yok veya Firebase geçici olarak ulaşılamıyor.";
  return (error && error.message) ? error.message : "Bilinmeyen hata.";
}

async function handleSignup() {
  const email = (syncElements.email.value || "").trim();
  const password = syncElements.password.value || "";
  if (!email || !password) {
    setMessage("E-posta ve şifre yazmalısın.", "error");
    return;
  }
  setBusy(true);
  setMessage("Hesap oluşturuluyor...", "info");
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    syncElements.password.value = "";
    setMessage("Hesap oluşturuldu ve giriş yapıldı. Bulutta güncel veri varsa otomatik getirilecek.", "success");
  } catch (error) {
    setMessage("Kayıt başarısız: " + readableFirebaseError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function handleLogin() {
  const email = (syncElements.email.value || "").trim();
  const password = syncElements.password.value || "";
  if (!email || !password) {
    setMessage("E-posta ve şifre yazmalısın.", "error");
    return;
  }
  setBusy(true);
  setMessage("Giriş yapılıyor...", "info");
  try {
    await signInWithEmailAndPassword(auth, email, password);
    syncElements.password.value = "";
    setMessage("Giriş yapıldı. Bulutta güncel veri varsa otomatik getirilecek...", "success");
  } catch (error) {
    setMessage("Giriş başarısız: " + readableFirebaseError(error), "error");
  } finally {
    setBusy(false);
  }
}

async function handleLogout() {
  setBusy(true);
  try {
    await signOut(auth);
    setMessage("Çıkış yapıldı. Yerel veriler bu cihazda duruyor.", "info");
  } catch (error) {
    setMessage("Çıkış yapılamadı: " + readableFirebaseError(error), "error");
  } finally {
    setBusy(false);
  }
}

function queueAutoSync(reason) {
  if (suppressAutoSync) return;
  if (!currentUser) return;
  if (localStorage.getItem(SYNC_AUTO_KEY) !== "true") return;
  clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(() => uploadToCloud(reason || "auto"), 1800);
}

function patchLocalStorageForAutoSync() {
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);

  localStorage.setItem = function patchedSetItem(key, value) {
    originalSetItem(key, value);
    if (isSyncableKey(String(key))) {
      updateLocalSummary();
      queueAutoSync("auto:setItem:" + key);
    }
  };

  localStorage.removeItem = function patchedRemoveItem(key) {
    originalRemoveItem(key);
    if (isSyncableKey(String(key))) {
      updateLocalSummary();
      queueAutoSync("auto:removeItem:" + key);
    }
  };
}

function createSyncPanel() {
  if (document.getElementById("firebaseSyncPanel")) return;

  const panel = document.createElement("details");
  panel.className = "panel senkron-panel";
  panel.id = "firebaseSyncPanel";
  panel.open = localStorage.getItem(SYNC_PANEL_OPEN_KEY) === "true";
  panel.innerHTML = `
    <summary>
      <span class="senkron-baslik">Bulut Senkronizasyon ✦</span>
      <span class="senkron-mini-ozet" id="syncMiniSummary">Bu cihaz: - • Bulut: -</span>
      <span class="senkron-durum" id="syncStatus" data-durum="kapali">Giriş yok</span>
    </summary>
    <div class="senkron-icerik">
      <p class="senkron-aciklama">PC ve telefon arasında ders verilerini ücretsiz Firebase hesabınla eşitle. Giriş yaptığında bulutta güncel veri varsa otomatik getirilir.</p>

      <div class="senkron-auth" id="syncAuthBox">
        <input id="syncEmail" type="email" autocomplete="email" placeholder="E-posta">
        <input id="syncPassword" type="password" autocomplete="current-password" placeholder="Şifre">
        <button type="button" class="birincil" id="syncLogin">Giriş yap</button>
        <button type="button" class="ikincil" id="syncSignup">Kayıt ol</button>
      </div>

      <div class="senkron-kullanici" id="syncUserBox" hidden>
        <span>Bağlı hesap: <strong id="syncUserEmail">-</strong></span>
        <button type="button" class="ikincil" id="syncLogout">Çıkış</button>
      </div>

      <div class="senkron-ozet-grid">
        <div><span>Bu cihaz</span><strong id="syncLocalCount">0 ders</strong></div>
        <div><span>Bulut</span><strong id="syncCloudCount">-</strong></div>
        <div><span>Son yedek</span><strong id="syncLastSync">-</strong></div>
        <div><span>Son getirme</span><strong id="syncLastPull">-</strong></div>
      </div>

      <div class="senkron-butonlar">
        <button type="button" class="birincil" id="syncUpload" disabled>Buluta yedekle</button>
        <button type="button" class="ikincil" id="syncDownload" disabled>Buluttan getir</button>
        <button type="button" class="ikincil" id="syncCheck" disabled>Bulut durumu</button>
        <label class="senkron-auto">
          <input type="checkbox" id="syncAuto" disabled>
          <span>Değişiklikleri otomatik yedekle</span>
        </label>
      </div>

      <p class="senkron-mesaj" id="syncMessage" data-tip="info">Senkron için e-posta ve şifreyle giriş yap.</p>
    </div>
  `;

  const main = document.querySelector("main.sayfa");
  const header = document.querySelector("main.sayfa > header");
  if (main && header && header.parentNode === main) {
    main.insertBefore(panel, header.nextSibling);
  } else if (main) {
    main.prepend(panel);
  } else {
    document.body.prepend(panel);
  }

  syncElements = {
    panel,
    status: document.getElementById("syncStatus"),
    miniSummary: document.getElementById("syncMiniSummary"),
    authBox: document.getElementById("syncAuthBox"),
    userBox: document.getElementById("syncUserBox"),
    userEmail: document.getElementById("syncUserEmail"),
    email: document.getElementById("syncEmail"),
    password: document.getElementById("syncPassword"),
    login: document.getElementById("syncLogin"),
    signup: document.getElementById("syncSignup"),
    logout: document.getElementById("syncLogout"),
    upload: document.getElementById("syncUpload"),
    download: document.getElementById("syncDownload"),
    check: document.getElementById("syncCheck"),
    auto: document.getElementById("syncAuto"),
    message: document.getElementById("syncMessage"),
    localCount: document.getElementById("syncLocalCount"),
    cloudCount: document.getElementById("syncCloudCount"),
    lastSync: document.getElementById("syncLastSync"),
    lastPull: document.getElementById("syncLastPull")
  };

  const rememberedEmail = localStorage.getItem(SYNC_EMAIL_KEY);
  if (rememberedEmail && syncElements.email) syncElements.email.value = rememberedEmail;
  if (syncElements.auto) syncElements.auto.checked = localStorage.getItem(SYNC_AUTO_KEY) === "true";

  panel.addEventListener("toggle", () => {
    localStorage.setItem(SYNC_PANEL_OPEN_KEY, panel.open ? "true" : "false");
  });

  syncElements.login.addEventListener("click", handleLogin);
  syncElements.signup.addEventListener("click", handleSignup);
  syncElements.logout.addEventListener("click", handleLogout);
  syncElements.upload.addEventListener("click", () => uploadToCloud("manual"));
  syncElements.download.addEventListener("click", downloadFromCloud);
  syncElements.check.addEventListener("click", () => checkCloudState(true));
  syncElements.auto.addEventListener("change", () => {
    localStorage.setItem(SYNC_AUTO_KEY, syncElements.auto.checked ? "true" : "false");
    setMessage(syncElements.auto.checked ? "Değişiklikleri otomatik yedekleme açıldı. Bulutta güncel veri varsa uygulama girişte zaten otomatik getirir." : "Değişiklikleri otomatik yedekleme kapatıldı.", "info");
    if (syncElements.auto.checked && currentUser) queueAutoSync("auto-enabled");
  });
  [syncElements.email, syncElements.password].forEach(input => {
    input.addEventListener("keydown", event => {
      if (event.key === "Enter") handleLogin();
    });
  });

  updateLocalSummary();
}

function initSync() {
  createSyncPanel();
  patchLocalStorageForAutoSync();
  onAuthStateChanged(auth, updateAuthUI);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSync);
} else {
  initSync();
}
