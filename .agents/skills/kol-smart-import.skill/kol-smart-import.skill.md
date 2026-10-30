# Skill: Nhận diện & Chuẩn hóa Tự động File Import KOL/KOC Đa Định Dạng (Smart Schema Mapping & Value Normalization)

## 1. Mục tiêu Nghiệp vụ
Giải quyết bài toán import các file Excel/CSV danh sách KOL/KOC từ nhiều nguồn khác nhau (Kalodata, FastMoss, báo giá Agency, file tổng hợp nội bộ) có cấu trúc cột, vị trí dòng tiêu đề và định dạng giá trị không đồng nhất vào bảng `kols` mà không bắt người dùng phải chỉnh sửa file Excel thủ công theo mẫu cứng.

## 2. Kiến trúc Nhận diện Cột Tự động 3 Tầng (3-Tier Header & Content Detection)
Hệ thống bắt buộc xử lý qua 3 tầng tuần tự để đạt độ chính xác tối đa với chi phí tối ưu:

1. **Bước 0 - Tự động dò dòng Tiêu đề (Header Row Locator):**
   - Các file báo giá của Agency thường chèn Logo hoặc tiêu đề bảng ở 1-5 dòng đầu.
   - Quét 10 dòng đầu tiên của Sheet: Dòng nào có số lượng ô chứa chuỗi văn bản khớp với từ điển từ khóa nhiều nhất (tối thiểu >= 2 cột khớp) thì xác định đó là `header_row_index`, các dòng bên dưới mới là `data_rows`.

2. **Tầng 1 - So khớp Từ điển Đồng nghĩa & Fuzzy Matching (`Dictionary & Fuzzy Matcher`):**
   - Chuẩn hóa tên cột (chuyển chữ thường, bỏ dấu tiếng Việt, bỏ ký tự đặc biệt).
   - So khớp chính xác hoặc chứa cụm từ (`str_contains`) hoặc độ tương đồng chuỗi (`similar_text >= 80%`) với từ điển các trường chuẩn của Database.
   - Nếu trong 1 file có nhiều cột giá (VD: "Giá Video", "Giá Livestream"), ưu tiên map cột giá chính vào `booking_price`, các cột phụ tự động gom vào cột JSON `extra_attributes` (hoặc `raw_metrics`) để không làm mất dữ liệu.

3. **Tầng 2 - Nhận diện qua Định dạng Giá trị Thực tế (`Regex Value Sniffing`):**
   - Với các cột không có tiêu đề rõ ràng hoặc tiêu đề bị lệch, lấy mẫu 5 dòng dữ liệu đầu tiên không rỗng của cột đó để kiểm tra bằng Regex:
     - Chứa URL `tiktok.com`, `facebook.com`, `youtube.com`, `instagram.com`, `vt.tiktok.com` -> Map vào `profile_url` (mức độ tin cậy: 95%).
     - Chứa chuỗi bắt đầu bằng `@` hoặc ID viết liền không dấu đi kèm ngữ cảnh kênh -> Map vào `username`.
     - Chứa định dạng Email chuẩn -> Map vào `email`.
     - Chứa chuỗi 9-11 chữ số đầu `03, 05, 07, 08, 09, 84` (sau khi lọc dấu chấm/khoảng trắng) -> Map vào `phone`.

4. **Tầng 3 - AI Schema Mapper Fallback (`Groq / LLM API`):**
   - Chỉ kích hoạt khi vẫn còn các cột dữ liệu chưa map được sau Tầng 1 và 2 (và hệ thống có cấu hình `GROQ_API_KEY` hoặc `OPENAI_API_KEY`).
   - Chỉ gửi danh sách tên cột chưa rõ + 2 dòng dữ liệu mẫu (ẩn thông tin nhạy cảm nếu cần) với `response_format = json_object` và `temperature = 0` để lấy kết quả ánh xạ.

## 3. Quy tắc Chuẩn hóa Giá trị (`Value Normalization Rules`)
Mọi ô dữ liệu sau khi được map phải đi qua bộ lọc chuẩn hóa kiểu dữ liệu trước khi Validate & Upsert:

1. **Chuẩn hóa Số lượng & Tiền tệ (`followers_count`, `avg_views`, `booking_price`, `gmv_30d`):**
   - Chuyển đổi các hậu tố viết tắt tiếng Anh và tiếng Việt:
     - `K`, `N`, `nghìn`, `ngàn` -> nhân `1,000`.
     - `M`, `Tr`, `Triệu`, `Củ` -> nhân `1,000,000`.
     - `B`, `Tỷ`, `Ty` -> nhân `1,000,000,000`.
   - Hỗ trợ kiểu viết tắt kẹp giữa của tiếng Việt: `4tr5` -> `4500000`, `1m2` -> `1200000`, `500k` -> `500000`.
   - Phân biệt dấu chấm/phẩy thập phân đi kèm hậu tố (`1,25M` hoặc `1.25M` -> `1250000`) với dấu phân cách hàng nghìn (`1.250.000` hoặc `1,250,000` -> `1250000`).
   - Các chuỗi như `Liên hệ`, `Tặng kèm`, `N/A`, `-`, trống -> chuyển về `0` (hoặc `null` đối với giá booking) và lưu nguyên văn chuỗi gốc vào `raw_metrics.price_note`.

2. **Chuẩn hóa Tỷ lệ Tương tác (`engagement_rate`):**
   - Nếu giá trị là số thập phân trong khoảng `(0, 1)` (do Excel lưu `4.5%` thành `0.045`) VÀ tên cột có chứa dấu `%` hoặc từ khóa `er`/`tương tác` -> Nhân `100` để lưu thành `4.50`.
   - Nếu là chuỗi `"4,5%"` hoặc `"4.5 %"` -> Bỏ dấu `%`, đổi dấu phẩy thành chấm -> `4.50`.

3. **Chuẩn hóa Số điện thoại (`phone`):**
   - Loại bỏ khoảng trắng, dấu chấm, dấu gạch ngang (`098.123.4567` -> `0981234567`).
   - Khôi phục số `0` bị Excel làm mất ở đầu: Nếu chuỗi có đúng 9 chữ số và bắt đầu bằng `3, 5, 7, 8, 9` -> Tự động nối số `0` vào đầu.
   - Đổi mã vùng `+84` hoặc `84` ở đầu (khi độ dài 11 số) về `0`.

4. **Suy luận Chéo Định danh (`Cross-Field Inference`):**
   - Có `profile_url` nhưng thiếu `username` hoặc `platform`: Tự động bóc tách `platform` và `username` từ URL.
   - Có `username` (VD: `@koc_review`) nhưng thiếu `profile_url`: Dựa vào cột `platform` (mặc định là `tiktok` nếu trống) để tự động dựng `profile_url = https://www.tiktok.com/@koc_review`.

5. **Tự động kích hoạt Queue Cào bù dữ liệu khuyết (`Auto-Enrichment Trigger`):**
   - Sau khi Upsert dòng dữ liệu từ file vào bảng `kols`, nếu bản ghi đã có `profile_url` hợp lệ nhưng bị khuyết các chỉ số hiệu quả (`followers_count == 0` hoặc `avg_views == 0`), hệ thống tự động đẩy `SyncKolProfileJob` vào Queue để cào bổ sung chỉ số mới nhất.