const samplePrices = [
  {
    category: 'Vé tham quan',
    items: [
      { name: 'Ngũ Hành Sơn', price: '40.000đ/lượt' },
      { name: 'Bảo tàng Điêu khắc Chăm', price: '60.000đ/lượt' },
      { name: 'Bán đảo Sơn Trà - tour ghép', price: 'Từ 350.000đ/người' }
    ]
  },
  {
    category: 'Tour trong ngày',
    items: [
      { name: 'Bà Nà Hills', price: 'Từ 950.000đ/người' },
      { name: 'Hội An nửa ngày', price: 'Từ 450.000đ/người' },
      { name: 'Huế 1 ngày', price: 'Từ 790.000đ/người' }
    ]
  },
  {
    category: 'Xe đưa đón & thuê xe',
    items: [
      { name: 'Đón sân bay Đà Nẵng', price: 'Từ 120.000đ/chuyến' },
      { name: 'Thuê xe 4 chỗ nội thành', price: 'Từ 700.000đ/ngày' },
      { name: 'Thuê xe 7 chỗ đi Bà Nà', price: 'Từ 1.100.000đ/ngày' }
    ]
  }
];

function renderSamplePrices() {
  const container = document.getElementById('price-grid');
  container.innerHTML = samplePrices.map(group => `
    <article class="price-card">
      <span class="badge">${group.category}</span>
      <h3>${group.category}</h3>
      <ul class="price-list">
        ${group.items.map(item => `
          <li>
            <span class="price-name">${item.name}</span>
            <span class="price-value">${item.price}</span>
          </li>
        `).join('')}
      </ul>
    </article>
  `).join('');
}

function renderVideos(videos) {
  const list = document.getElementById('video-list');
  const status = document.getElementById('video-status');

  if (!videos.length) {
    status.textContent = 'Chưa có video MP4 nào được đăng. Hãy đăng nhập admin để tải lên video đầu tiên.';
    list.innerHTML = '<div class="empty-state">Hiện chưa có video công khai.</div>';
    return;
  }

  status.textContent = `Đang hiển thị ${videos.length} video bảng giá mới nhất.`;
  list.innerHTML = videos.map(video => `
    <article class="video-card">
      <video controls preload="metadata" src="${video.video_url}"></video>
      <div class="video-card-content">
        <div class="video-meta">
          <span class="badge">${video.category || 'Bảng giá'}</span>
          <span class="badge">${new Date(video.created_at).toLocaleDateString('vi-VN')}</span>
        </div>
        <h3>${video.title}</h3>
        <p>${video.description || 'Video bảng giá dịch vụ du lịch tại Đà Nẵng.'}</p>
      </div>
    </article>
  `).join('');
}

async function loadPublishedVideos() {
  const status = document.getElementById('video-status');

  if (!window.appConfig?.isReady || !window.db?.client) {
    status.innerHTML = 'Website đang chạy ở chế độ giao diện mẫu. Để dùng tính năng tải MP4, hãy cấu hình <strong>Supabase</strong> trong file <strong>js/config.js</strong>.';
    document.getElementById('video-list').innerHTML = '<div class="empty-state">Chưa kết nối kho video.</div>';
    return;
  }

  const { data, error } = await window.db.client
    .from('videos')
    .select('id,title,description,category,video_url,created_at')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(12);

  if (error) {
    status.textContent = 'Không thể tải danh sách video. Hãy kiểm tra lại bảng videos, bucket storage và policy.';
    document.getElementById('video-list').innerHTML = '<div class="empty-state">Lỗi kết nối dữ liệu video.</div>';
    return;
  }

  renderVideos(data || []);
}

renderSamplePrices();
loadPublishedVideos();
