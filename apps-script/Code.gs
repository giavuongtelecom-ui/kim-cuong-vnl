// Code.gs — Google Apps Script cho landing page VNL Aurora
// Ghi dữ liệu đăng ký từ landing page vào Google Sheet "Khach-Hang"
// Sheet: https://docs.google.com/spreadsheets/d/1A8afNQbO_w4uc-Xvs6LO9ZhYb6y66Q3CIweJKUEENhI/edit
// Cột A-F: Thời gian, Tên, Email, Số điện thoại, Mẫu quan tâm, Ghi chú

const SPREADSHEET_ID = '1A8afNQbO_w4uc-Xvs6LO9ZhYb6y66Q3CIweJKUEENhI';
const SHEET_NAME = 'Khach-Hang';

function doPost(e) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  const data = JSON.parse(e.postData.contents);

  // Validate tối thiểu trước khi ghi - tránh dòng rác nếu form bị gửi thiếu
  if (!data.hoTen || !data.soDienThoai) {
    return ContentService.createTextOutput(
      JSON.stringify({ result: 'error', message: 'Thiếu tên hoặc số điện thoại' })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  // Sheet không có cột riêng cho "loại yêu cầu" (Đặt mua/Đặt cọc/Tư vấn trả góp),
  // nên gộp vào đầu Ghi chú để không mất thông tin.
  let ghiChu = data.ghiChu || '';
  if (data.loaiYeuCau) {
    ghiChu = '[' + data.loaiYeuCau + '] ' + ghiChu;
  }

  sheet.appendRow([
    new Date(),           // A - Thời gian
    data.hoTen,            // B - Tên
    data.email || '',      // C - Email
    data.soDienThoai,      // D - Số điện thoại
    data.sanPham || '',    // E - Mẫu quan tâm
    ghiChu.trim()           // F - Ghi chú
  ]);

  // Tùy chọn: bỏ comment đoạn dưới để nhận email báo ngay khi có khách đăng ký mới
  // MailApp.sendEmail({
  //   to: '[email nhận đơn của bạn]',
  //   subject: 'Khách hàng mới từ Landing Page: ' + data.hoTen,
  //   body: 'Tên: ' + data.hoTen + '\nSĐT: ' + data.soDienThoai + '\nEmail: ' + (data.email || '(không có)') +
  //         '\nMẫu quan tâm: ' + (data.sanPham || '') + '\nGhi chú: ' + ghiChu
  // });

  return ContentService.createTextOutput(
    JSON.stringify({ result: 'success' })
  ).setMimeType(ContentService.MimeType.JSON);
}
