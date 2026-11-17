# Bản đồ mưa Hà Nội

Bản thử nghiệm nhận báo cáo đường ngập bằng ảnh và mô tả, kết hợp với bản đồ các vị trí minh hoạ tại Hà Nội.

## Tính năng

- Gửi ảnh và mô tả tình trạng đường ngập
- Dùng OpenAI để ước tính mực nước và nhận diện tên đường
- Chuẩn hoá đơn vị và ngưỡng kết quả; dùng thiết lập sinh phản hồi ổn định hơn
- Giảm độ tin cậy khi nội dung ảnh khác với mô tả
- Bản đồ Leaflet với các điểm minh hoạ tại Hà Nội
- Gom các điểm gần nhau; phóng to để xem từng vị trí
- Giới hạn thao tác bản đồ trong khu vực Hà Nội
- Có báo cáo minh hoạ để xem thử khi chưa kết nối dịch vụ
- Ghi rõ dữ liệu trên bản đồ chỉ dùng để minh hoạ

## Chạy trên máy cá nhân

1. Sao chép `.env.example` thành `.env`.
2. Thêm `OPENAI_API_KEY` vào `.env`. Không đưa khoá API vào mã giao diện hoặc kho lưu trữ công khai.
3. Có thể đặt `OPENAI_MODEL` thành model hỗ trợ ảnh mà tài khoản API của bạn được phép dùng.
4. Cài các gói cần thiết:

```bash
npm install
```

5. Khởi động giao diện và API:

```bash
npm run dev
```

Chạy kiểm thử chuẩn hoá kết quả bằng `npm test`.

Giao diện chạy tại `http://localhost:5173`, API chạy tại `http://localhost:3001`.
Khởi động lại máy chủ sau khi thay đổi `.env`.

## Triển khai lên Vercel

1. Đẩy mã nguồn lên GitHub và nhập dự án đó vào Vercel.
2. Trong **Project Settings → Environment Variables**, thêm `OPENAI_API_KEY` (bắt buộc). Có thể thêm `OPENAI_MODEL` nếu muốn chọn model khác; mặc định là `gpt-4o-mini`.
3. Bật biến môi trường cho Production (và Preview nếu cần), sau đó triển khai lại.

Vercel tự dựng giao diện Vite từ `dist` và chạy API tại `/api/analyze` bằng serverless function. Tệp `.env` chỉ dùng trên máy cá nhân; không tải tệp này lên GitHub. Cấu hình triển khai nằm trong `vercel.json`.

## Lưu ý

- Đây là bản thử nghiệm; các điểm đường và mức ngập đều là dữ liệu minh hoạ, không phải báo cáo thực tế.
- Ngưỡng mực nước chỉ là ước tính, không thay thế khuyến cáo của cơ quan chức năng.
- Khoá OpenAI chỉ được lưu trong biến môi trường phía máy chủ.
