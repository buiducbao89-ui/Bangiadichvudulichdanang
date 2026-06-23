const client = window.db?.client;
const cfg = window.appConfig || {};

const setupNotice = document.getElementById('setupNotice');
const authStatus = document.getElementById('authStatus');
const uploadStatus = document.getElementById('uploadStatus');
const authCard = document.getElementById('authCard');
const uploadCard = document.getElementById('uploadCard');
const videoManagerCard = document.getElementById('videoManagerCard');
const logoutBtn = document.getElementById('logoutBtn');
const adminVideoList = document.getElementById('adminVideoList');

function setAuthMessage(message, muted = true) {
  authStatus.textContent = message;
  authStatus.className = muted ? 'notice muted' : 'notice';
}

function setUploadMessage(message, muted = true) {
  uploadStatus.textContent = message;
  uploadStatus.className = muted ? 'notice muted' : 'notice';
}

function showAdminArea(show) {
  uploadCard.classList.toggle('hidden', !show);
  videoManagerCard.classList.toggle('hidden', !show);
  logoutBtn.classList.toggle('hidden', !show);
}

async function loadAdminVideos() {
  if (!client) return;
  const { data, error } = await client
    .from('videos')
    .select('id,title,description,category,video_url,created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    adminVideoList.innerHTML = '<div class="empty-state">Không thể tải danh sách video.</div>';
    return;
  }

  if (!data?.length) {
    adminVideoList.innerHTML = '<div class="empty-state">Chưa có video nào được tải lên.</div>';
    return;
  }

  adminVideoList.innerHTML = data.map(video => `
    <article class="video-card">
      <video controls preload="metadata" src="${video.video_url}"></video>
      <div class="video-card-content">
        <div class="video-meta">
          <span class="badge">${video.category || 'Bảng giá'}</span>
          <span class="badge">${new Date(video.created_at).toLocaleDateString('vi-VN')}</span>
        </div>
        <h3>${video.title}</h3>
        <p>${video.description || ''}</p>
      </div>
    </article>
  `).join('');
}

async function checkSession() {
  if (!cfg.isReady || !client) {
    setupNotice.classList.remove('hidden');
    setAuthMessage('Chưa cấu hình Supabase. Hãy sửa js/config.js trước.', false);
    showAdminArea(false);
    return;
  }

  setupNotice.classList.add('hidden');
  const { data: { session } } = await client.auth.getSession();
  const email = session?.user?.email || '';

  if (session && email === cfg.adminEmail) {
    setAuthMessage(`Đã đăng nhập: ${email}`, false);
    showAdminArea(true);
    await loadAdminVideos();
  } else {
    setAuthMessage('Chưa đăng nhập đúng tài khoản admin.');
    showAdminArea(false);
  }
}

async function login(email, password) {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  if (data.user?.email !== cfg.adminEmail) {
    await client.auth.signOut();
    throw new Error('Tài khoản này không phải admin được khai báo trong cấu hình.');
  }
}

async function uploadVideo(payload) {
  const file = payload.file;
  const safeName = file.name.replace(/\s+/g, '-').toLowerCase();
  const filePath = `public/${Date.now()}-${safeName}`;

  const uploadRes = await client.storage
    .from(cfg.bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'video/mp4'
    });

  if (uploadRes.error) throw uploadRes.error;

  const { data: publicUrlData } = client.storage.from(cfg.bucket).getPublicUrl(filePath);
  const videoUrl = publicUrlData.publicUrl;

  const { error: insertError } = await client.from('videos').insert({
    title: payload.title,
    category: payload.category,
    description: payload.description,
    video_url: videoUrl,
    storage_path: filePath,
    is_published: true,
    created_by: cfg.adminEmail
  });

  if (insertError) throw insertError;
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!cfg.isReady || !client) {
    setAuthMessage('Chưa cấu hình Supabase.', false);
    return;
  }

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    setAuthMessage('Đang đăng nhập...', true);
    await login(email, password);
    await checkSession();
  } catch (error) {
    setAuthMessage(`Lỗi đăng nhập: ${error.message}`, false);
  }
});

document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const file = document.getElementById('videoFile').files[0];

  if (!file) {
    setUploadMessage('Bạn chưa chọn file MP4.', false);
    return;
  }

  if (file.type !== 'video/mp4') {
    setUploadMessage('Chỉ chấp nhận file MP4.', false);
    return;
  }

  const payload = {
    title: document.getElementById('title').value.trim(),
    category: document.getElementById('category').value,
    description: document.getElementById('description').value.trim(),
    file
  };

  try {
    setUploadMessage('Đang tải video lên, vui lòng đợi...', true);
    await uploadVideo(payload);
    setUploadMessage('Tải video thành công. Video đã xuất hiện trên website.', false);
    document.getElementById('uploadForm').reset();
    await loadAdminVideos();
  } catch (error) {
    setUploadMessage(`Lỗi tải video: ${error.message}`, false);
  }
});

logoutBtn.addEventListener('click', async () => {
  if (!client) return;
  await client.auth.signOut();
  setAuthMessage('Đã đăng xuất.', false);
  showAdminArea(false);
});

if (client) {
  client.auth.onAuthStateChange(() => {
    checkSession();
  });
}

checkSession();
