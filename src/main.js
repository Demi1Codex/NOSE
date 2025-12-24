// Borrachos.docx Idea Manager Logic
let ideas = JSON.parse(localStorage.getItem('borrachos-ideas')) || JSON.parse(localStorage.getItem('patata-ideas')) || [];
const modal = document.getElementById('ideaModal');
const ideaForm = document.getElementById('ideaForm');
const themeToggle = document.getElementById('themeToggle');
const calendarModal = document.getElementById('calendarModal');
const sharedFileInput = document.getElementById('sharedFileInput');
const imageViewerModal = document.getElementById('imageViewerModal');
const fullImage = document.getElementById('fullImage');
const imageCaption = document.getElementById('imageCaption');

// State
let currentFilter = 'all';

// Initialize
function init() {
  renderIdeas();
  setupEventListeners();
  applySavedTheme();
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

function setupEventListeners() {
  // Theme Toggle
  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });

  // Modal Open (Main button)
  document.getElementById('addIdeaBtn').addEventListener('click', () => {
    openModal();
  });

  // Modal Close
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('cancelIdea').addEventListener('click', closeModal);

  // Calendar
  document.getElementById('calendarBtn').addEventListener('click', openCalendar);
  document.getElementById('closeCalendar').addEventListener('click', closeCalendar);
  document.getElementById('closeCalendarBtn').addEventListener('click', closeCalendar);

  // Share (Export)
  document.getElementById('shareBtn').addEventListener('click', exportIdeas);

  // Open (Import)
  document.getElementById('openSharedBtn').addEventListener('click', () => sharedFileInput.click());
  sharedFileInput.addEventListener('change', importIdeas);

  // Form Submit
  ideaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveIdea();
  });

  // Filter change
  document.querySelectorAll('input[name="category"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      renderIdeas();
    });
  });

  // Drag and Drop
  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.lock') || file.name.endsWith('.json'))) {
      handleImport(file);
    }
  });

  // Notifications Permission
  const requestNotifyBtn = document.getElementById('requestNotifyBtn');
  if (requestNotifyBtn) {
    requestNotifyBtn.addEventListener('click', async () => {
      try {
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const permission = await LocalNotifications.requestPermissions();
          if (permission.display === 'granted') {
            showToast('✅ Notificaciones activadas');
          } else {
            showToast('❌ Permiso denegado');
          }
        } else if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            showToast('✅ Notificaciones activadas');
          } else {
            showToast('❌ Permiso denegado');
          }
        }
      } catch (err) {
        console.error('Error requesting notifications', err);
      }
    });
  }
  // Permissions Setup Button (Android)
  const setupPermsBtn = document.getElementById('setupPermsBtn');
  if (setupPermsBtn) {
    setupPermsBtn.addEventListener('click', setupPermissions);
  }

  // Image Viewer Close
  const closeImageBtn = document.querySelector('.close-image-modal');
  if (closeImageBtn) {
    closeImageBtn.addEventListener('click', closeImageViewer);
  }

  if (imageViewerModal) {
    imageViewerModal.addEventListener('click', (e) => {
      if (e.target === imageViewerModal) closeImageViewer();
    });
  }
}

async function setupPermissions() {
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Request permissions
      const perm = await Filesystem.requestPermissions();
      if (perm.publicStorage === 'granted') {
        showToast('✅ Permisos concedidos');
        // Try to create the folder right away
        await createLocksFolder();
      } else {
        alert('❌ Permisos denegados. Debes activarlos manualmente en los ajustes de la app.');
      }
    } catch (err) {
      console.error('Error in setupPermissions:', err);
      alert('Error: ' + err.message);
    }
  } else {
    showToast('💡 Solo necesario en Android');
  }
}

async function createLocksFolder() {
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const folderName = 'borrachos.locks';
    const dir = Directory.Documents;

    await Filesystem.mkdir({
      path: folderName,
      directory: dir,
      recursive: true
    });
    showToast('📂 Carpeta creada en Documentos');
  } catch (e) {
    if (e.message && e.message.includes('exists')) {
      showToast('✅ Carpeta ya existe');
    } else {
      console.error('Error creating folder:', e);
    }
  }
}

function openModal(idea = null, defaultStatus = 'progress') {
  const title = document.getElementById('modalTitle');
  const idInput = document.getElementById('ideaId');
  const nameInput = document.getElementById('ideaTitle');
  const descInput = document.getElementById('ideaDesc');
  const catSelect = document.getElementById('ideaCategory');
  const statusSelect = document.getElementById('ideaStatus');
  const dateInput = document.getElementById('ideaDate');
  const notifySelect = document.getElementById('ideaNotify');

  if (idea) {
    title.textContent = 'Editar Idea';
    idInput.value = idea.id;
    nameInput.value = idea.name;
    descInput.value = idea.description;
    catSelect.value = idea.category;
    statusSelect.value = idea.status;
    dateInput.value = idea.date || '';
    notifySelect.value = idea.notify !== undefined ? idea.notify.toString() : 'true';
    // Clear image input
    document.getElementById('ideaImage').value = '';
  } else {
    title.textContent = 'Nueva Idea';
    idInput.value = '';
    ideaForm.reset();
    statusSelect.value = defaultStatus;
    document.getElementById('ideaImage').value = '';
  }

  modal.classList.add('open');
}

function closeModal() {
  modal.classList.remove('open');
}

function openCalendar() {
  const eventsContainer = document.getElementById('eventsContainer');
  eventsContainer.innerHTML = '';

  const ideasWithDate = ideas.filter(i => i.date).sort((a, b) => new Date(a.date) - new Date(b.date));

  if (ideasWithDate.length === 0) {
    eventsContainer.innerHTML = '<p class="empty-state">No hay ideas con fecha programada.</p>';
  } else {
    ideasWithDate.forEach(idea => {
      const dateObj = new Date(idea.date);
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' });

      const item = document.createElement('div');
      item.className = 'event-item';
      item.innerHTML = `
        <div class="event-time-badge">
          <span class="time">${timeStr}</span>
          <span class="date">${dateStr}</span>
        </div>
        <div class="event-details">
          <div class="event-title">${idea.name}</div>
          <div class="event-meta">
            <span class="category">${idea.category}</span>
          </div>
        </div>
      `;
      eventsContainer.appendChild(item);
    });
  }

  calendarModal.classList.add('open');
}

function closeCalendar() {
  calendarModal.classList.remove('open');
}

function openImageViewer(src, caption) {
  imageViewerModal.classList.add('open');
  fullImage.src = src;
  imageCaption.innerHTML = caption ? caption : '';
}
// Expose for inline onclick
window.viewImage = openImageViewer;

function closeImageViewer() {
  imageViewerModal.classList.remove('open');
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}


async function exportIdeas() {
  const password = prompt('Elige una contraseña para cifrar el archivo (déjala vacía para no cifrar):');
  const dataStr = JSON.stringify(ideas, null, 2);
  const fileName = `borrachos-ideas-${new Date().toISOString().split('T')[0]}.lock`;

  let exportData;
  if (password) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(JSON.stringify(ideas))
    );

    exportData = {
      salt: Array.from(salt),
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext))
    };
  } else {
    exportData = ideas;
  }

  const contentToSave = password ? JSON.stringify(exportData) : JSON.stringify(exportData, null, 2);

  // 1. Android / iOS (Capacitor Native)
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');

      // Request permission explicitly
      if (window.Capacitor.getPlatform() === 'android') {
        let perm = await Filesystem.checkPermissions();
        console.log('Current permissions:', perm);

        if (perm.publicStorage !== 'granted') {
          perm = await Filesystem.requestPermissions();
          if (perm.publicStorage !== 'granted') {
            alert('Permiso de almacenamiento denegado. No se puede guardar el archivo.');
            return;
          }
        }
      }

      const folderName = 'borrachos.locks';
      const dir = Directory.Documents; // Using Documents corresponds to /storage/emulated/0/Documents
      // Documents is much more reliable on Android 11+ (API 30+)

      try {
        await Filesystem.mkdir({
          path: folderName,
          directory: dir,
          recursive: true
        });
      } catch (e) {
        // Folder might already exist
      }

      const writeResult = await Filesystem.writeFile({
        path: `${folderName}/${fileName}`,
        data: contentToSave,
        directory: dir,
        encoding: 'utf8'
      });

      showToast(`✅ Guardado en Documentos/${folderName}`);
      console.log('Save result:', writeResult);
      return;
    } catch (err) {
      console.error('Filesystem Error:', err);
      alert('Error técnico al guardar: ' + err.message);
    }
  }

  // 2. Electron Native Dialog (Previous implementation)
  if (window.ipcRenderer || (window.process && window.process.type === 'renderer')) {
    const ipc = window.ipcRenderer || require('electron').ipcRenderer;
    try {
      const result = await ipc.invoke('show-save-dialog', {
        title: 'Guardar tablero',
        defaultPath: fileName,
        filters: [{ name: 'Borrachos Lock', extensions: ['lock'] }]
      });

      if (!result.canceled && result.filePath) {
        const writeResult = await ipc.invoke('write-file', result.filePath, contentToSave);
        if (writeResult.success) {
          showToast('✅ Archivo guardado correctamente');
          return;
        } else {
          alert('Error al guardar el archivo: ' + writeResult.error);
        }
      } else {
        return; // Canceled
      }
    } catch (err) {
      console.warn('Electron IPC failed, falling back to web methods', err);
    }
  }

  // 3. Modern Web File System Access API
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'Borrachos Lock File',
          accept: { 'application/json': ['.lock'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(contentToSave);
      await writable.close();
      showToast('✅ Archivo guardado correctamente');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('File System Access API failed, falling back to legacy download', err);
    }
  }

  // 4. Legacy fallback (Old method)
  const blob = new Blob([contentToSave], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('✅ Descarga iniciada');
}

function importIdeas(e) {
  const file = e.target.files[0];
  if (!file) return;
  handleImport(file);
}

function handleImport(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      processImport(imported);
    } catch (err) {
      alert('Error al importar el archivo.');
    }
  };
  reader.readAsText(file);
}

async function processImport(imported) {
  let finalData = imported;

  if (imported.salt && imported.iv && imported.ciphertext) {
    const password = prompt('Este archivo está cifrado. Introduce la contraseña:');
    if (!password) return;

    try {
      const salt = new Uint8Array(imported.salt);
      const iv = new Uint8Array(imported.iv);
      const ciphertext = new Uint8Array(imported.ciphertext);
      const key = await deriveKey(password, salt);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        ciphertext
      );

      const dec = new TextDecoder();
      finalData = JSON.parse(dec.decode(decrypted));
    } catch (err) {
      alert('Contraseña incorrecta o archivo corrupto.');
      return;
    }
  }

  if (Array.isArray(finalData)) {
    if (confirm('¿Deseas importar estas ideas? Las actuales se mantendrán.')) {
      ideas = [...ideas, ...finalData.filter(i => !ideas.find(ex => ex.id === i.id))];
      localStorage.setItem('borrachos-ideas', JSON.stringify(ideas));
      renderIdeas();
    }
  } else {
    alert('El formato del archivo no es válido.');
  }
}

async function saveIdea() {
  const id = document.getElementById('ideaId').value;
  const imageInput = document.getElementById('ideaImage');
  let imageData = null;

  if (imageInput.files && imageInput.files[0]) {
    imageData = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(imageInput.files[0]);
    });
  }

  // If editing and no new image is selected, keep the old one
  if (id && !imageData) {
    const existing = ideas.find(i => i.id === id);
    if (existing) imageData = existing.image || existing.img;
  }

  const newIdea = {
    id: id || Date.now().toString(),
    name: document.getElementById('ideaTitle').value,
    description: document.getElementById('ideaDesc').value,
    category: document.getElementById('ideaCategory').value,
    status: document.getElementById('ideaStatus').value,
    date: document.getElementById('ideaDate').value,
    notify: document.getElementById('ideaNotify').value === 'true',
    image: imageData,
    timestamp: Date.now()
  };

  if (id) {
    ideas = ideas.map(i => i.id === id ? newIdea : i);
  } else {
    ideas.push(newIdea);
  }

  localStorage.setItem('borrachos-ideas', JSON.stringify(ideas));
  renderIdeas();

  if (newIdea.date && newIdea.notify) {
    scheduleNotification(newIdea);
  }

  closeModal();
}


function deleteIdea(id) {
  if (confirm('¿Seguro que quieres borrar esta idea?')) {
    ideas = ideas.filter(i => i.id !== id);
    localStorage.setItem('borrachos-ideas', JSON.stringify(ideas));
    renderIdeas();
  }
}

function toggleStatus(id) {
  ideas = ideas.map(i => {
    if (i.id === id) {
      const current = (i.status === 'progress' || i.status === 'progreso') ? 'progress' : 'paused';
      i.status = current === 'progress' ? 'paused' : 'progress';
    }
    return i;
  });
  localStorage.setItem('borrachos-ideas', JSON.stringify(ideas));
  renderIdeas();
}

function renderIdeas() {
  const progressList = document.getElementById('progressList');
  const pausedList = document.getElementById('pausedList');
  const progressCount = document.getElementById('progressCount');
  const pausedCount = document.getElementById('pausedCount');

  progressList.innerHTML = '<div class="empty-state">No hay ideas en progreso</div>';
  pausedList.innerHTML = '<div class="empty-state">No hay ideas pausadas</div>';

  const filteredIdeas = ideas.filter(i => currentFilter === 'all' || i.category === currentFilter);

  const progIdeas = filteredIdeas.filter(i => i.status === 'progress' || i.status === 'progreso');
  const pausIdeas = filteredIdeas.filter(i => i.status === 'paused' || i.status === 'pausado');

  if (progIdeas.length > 0) progressList.innerHTML = '';
  if (pausIdeas.length > 0) pausedList.innerHTML = '';

  filteredIdeas.forEach(idea => {
    // Standardize status for rendering
    const statusClass = (idea.status === 'progress' || idea.status === 'progreso') ? 'progress' : 'paused';

    const card = document.createElement('div');
    card.className = `idea-card ${statusClass}`;

    const ideaName = idea.name || idea.title || idea.nombre || 'Sin nombre';
    const ideaDesc = idea.description || idea.desc || idea.descripcion || '';
    const ideaImg = idea.image || idea.img || idea.imagen || null;
    const ideaCategory = idea.category || idea.categoria || 'Sin categoría';
    const ideaDate = idea.date || idea.fecha || '';

    let dateHtml = '';
    if (ideaDate) {
      const d = new Date(ideaDate);
      dateHtml = `<div class="event-time">📅 ${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
    }

    let imgHtml = '';
    if (ideaImg) {
      // Add onclick handler to open the viewer
      const escapedName = ideaName.replace(/'/g, "\\'").replace(/"/g, "&quot;");
      imgHtml = `<div class="card-image"><img src="${ideaImg}" alt="Idea Image" class="clickable-image" onclick="window.viewImage('${ideaImg}', '${escapedName}')"></div>`;
    }


    card.innerHTML = `
      ${imgHtml}
      <div class="category-badge">${ideaCategory}</div>
      <div class="card-title">${ideaName}</div>
      <div class="card-desc">${ideaDesc}</div>
      ${dateHtml}
      <div class="card-actions">
        <button class="btn-icon status-btn" title="${statusClass === 'progress' ? 'Pausar' : 'Reanudar'}">${statusClass === 'progress' ? '⏸️' : '▶️'}</button>
        <button class="btn-icon edit-btn" title="Editar">✏️</button>
        <button class="btn-icon btn-delete delete-btn" title="Borrar">🗑️</button>
      </div>
    `;



    card.querySelector('.status-btn').onclick = () => toggleStatus(idea.id);
    card.querySelector('.edit-btn').onclick = () => openModal(idea);
    card.querySelector('.delete-btn').onclick = () => deleteIdea(idea.id);

    if (statusClass === 'progress') {
      progressList.appendChild(card);
    } else {
      pausedList.appendChild(card);
    }
  });

  progressCount.textContent = progIdeas.length;
  pausedCount.textContent = pausIdeas.length;
}

async function scheduleNotification(idea) {
  if (!idea.date || !idea.notify) return;
  const fireDate = new Date(idea.date);
  if (fireDate <= new Date()) return;

  try {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Recordatorio: ' + idea.name,
            body: idea.description,
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: fireDate },
            actionTypeId: "",
            extra: null
          }
        ]
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      const delay = fireDate.getTime() - Date.now();
      setTimeout(() => {
        new Notification('Recordatorio: ' + idea.name, {
          body: idea.description,
          icon: '/palpueblo.png'
        });
      }, delay);
    }
  } catch (err) {
    console.error('Error scheduling notification', err);
  }
}

function showToast(message) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.innerHTML = `
    <span class="notify-icon">🔔</span>
    <div class="notify-body">
      <div class="notify-header">Borrachos.docx</div>
      <div class="notify-msg">${message}</div>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

init();
