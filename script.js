// script.js — VNL Aurora Landing Page
// Xử lý form đặt hàng (gửi qua Google Apps Script), tracking CTA, FAQ, bộ lọc đối tượng khách.
// Kiến trúc và giới hạn: xem mục 11 PRD_Landing_Page_Nhan_Kim_Cuong_VNL.md

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzuxYDAHx8OmY2ouRW99ZLeioRfhWuahoX-oMqVzpxlwksdhIC5lqPbOADvXzeH1Wo86Q/exec';

// ===== Google Analytics helper =====
function trackEvent(eventName, params) {
  if (typeof gtag === 'function') {
    gtag('event', eventName, params || {});
  }
}

function getUtmSource() {
  const params = new URLSearchParams(window.location.search);
  return params.get('utm_source') || 'direct';
}

// ===== CTA click tracking theo từng vị trí (hero, giữa trang, cuối trang...) — mục 6 PRD =====
document.querySelectorAll('[data-cta-position]').forEach((el) => {
  el.addEventListener('click', () => {
    trackEvent('click_cta', {
      cta_position: el.dataset.ctaPosition || 'unknown',
      cta_label: el.dataset.ctaLabel || el.textContent.trim()
    });
  });
});

// ===== Nút CTA cuộn tới form và gán sẵn "loại yêu cầu" =====
document.querySelectorAll('[data-scroll-to]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetSection = document.getElementById('order-form-section');
    const loaiYeuCauHidden = document.getElementById('loaiYeuCauHidden');
    if (loaiYeuCauHidden && btn.dataset.loaiYeuCau) {
      loaiYeuCauHidden.value = btn.dataset.loaiYeuCau;
    }
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const hoTenInput = document.getElementById('hoTen');
    if (hoTenInput) {
      setTimeout(() => hoTenInput.focus({ preventScroll: true }), 400);
    }
  });
});

// ===== Bộ lọc nhanh "Cầu hôn / Cưới" vs "Mua tặng / Tự thưởng" — mục 3.2 PRD =====
document.querySelectorAll('.audience-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const audience = tab.dataset.audience;

    document.querySelectorAll('.audience-tab').forEach((t) => {
      t.classList.toggle('is-active', t === tab);
      t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
    });

    document.querySelectorAll('[data-audience-panel]').forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.audiencePanel === audience);
    });

    trackEvent('select_audience', { audience });
  });
});

// ===== FAQ accordion =====
document.querySelectorAll('.faq-question').forEach((question) => {
  const answer = question.nextElementSibling;
  question.addEventListener('click', () => {
    const isOpen = question.getAttribute('aria-expanded') === 'true';

    document.querySelectorAll('.faq-question').forEach((q) => {
      q.setAttribute('aria-expanded', 'false');
      q.nextElementSibling.style.maxHeight = null;
    });

    if (!isOpen) {
      question.setAttribute('aria-expanded', 'true');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  });
});

// ===== Form đặt hàng/đặt cọc =====
const orderForm = document.getElementById('order-form');

function showFormError(message) {
  const errorEl = document.getElementById('form-error');
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideFormError() {
  document.getElementById('form-error').hidden = true;
}

async function submitOrderForm(event) {
  event.preventDefault();
  hideFormError();

  // Chống spam đơn giản: chặn gửi lại trong 10 giây — mục 11.5 PRD
  const lastSubmit = localStorage.getItem('lastSubmitTime');
  if (lastSubmit && Date.now() - parseInt(lastSubmit, 10) < 10000) {
    showFormError('Vui lòng đợi vài giây trước khi gửi lại.');
    return;
  }

  // Honeypot check — field ẩn, người thật sẽ không điền — mục 11.4 PRD
  if (document.getElementById('website').value !== '') {
    return; // im lặng bỏ qua, nghi là bot
  }

  const loaiYeuCau = event.submitter && event.submitter.dataset.loaiYeuCau
    ? event.submitter.dataset.loaiYeuCau
    : document.getElementById('loaiYeuCauHidden').value;

  const formData = {
    hoTen: document.getElementById('hoTen').value.trim(),
    soDienThoai: document.getElementById('soDienThoai').value.trim(),
    email: document.getElementById('email').value.trim(),
    sanPham: document.getElementById('sanPham').value,
    loaiYeuCau: loaiYeuCau,
    ghiChu: document.getElementById('ghiChu').value.trim(),
    utmSource: getUtmSource()
  };

  if (!formData.hoTen) {
    showFormError('Vui lòng nhập họ tên.');
    return;
  }
  if (!/^[0-9]{9,11}$/.test(formData.soDienThoai)) {
    showFormError('Vui lòng nhập số điện thoại hợp lệ (9-11 chữ số).');
    return;
  }

  try {
    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors', // Apps Script Web App không trả CORS header chuẩn — mục 11.5 PRD
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(formData)
    });

    localStorage.setItem('lastSubmitTime', Date.now().toString());
    document.getElementById('form-thanh-cong').hidden = false;
    orderForm.reset();
    document.getElementById('loaiYeuCauHidden').value = 'Đặt mua';

    trackEvent('submit_order_form', { loai_yeu_cau: formData.loaiYeuCau });
  } catch (error) {
    showFormError('Có lỗi xảy ra, vui lòng thử lại hoặc liên hệ hotline [SỐ_HOTLINE].');
  }
}

if (orderForm) {
  orderForm.addEventListener('submit', submitOrderForm);
}

// ===== Ẩn thanh CTA mobile khi form đặt hàng đang hiển thị trên màn hình =====
const stickyCta = document.getElementById('sticky-cta');
const orderFormSection = document.getElementById('order-form-section');

if (stickyCta && orderFormSection && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        stickyCta.classList.toggle('is-hidden', entry.isIntersecting);
      });
    },
    { threshold: 0.2 }
  );
  observer.observe(orderFormSection);
}
