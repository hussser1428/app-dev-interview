# DevInterview – app mobile (Expo)

Bản iOS/Android của `../web`, giao diện theo mockup `v3/mobile.html`. 5 tab: Câu hỏi · Hôm nay · Luyện · Thuật ngữ · Phỏng vấn.

## Chạy thử

```bash
npm install
cp .env.example .env          # EXPO_PUBLIC_API_URL = địa chỉ web đang chạy API AI
npx expo start                # quét QR bằng Expo Go
```

- Học, flashcard, thuật ngữ, tiến độ chạy **offline** (câu hỏi đóng gói sẵn, tiến độ lưu SQLite trên máy).
- Phỏng vấn AI gọi `POST {EXPO_PUBLIC_API_URL}/api/interview` của web (key Gemini nằm trên server). Chạy local: `npm run dev` trong `web/`, dùng IP LAN của máy (không phải `localhost`).
- **Nói bằng giọng** (expo-speech-recognition) không có trong Expo Go → ở Expo Go chỉ gõ được. Cần development build: `npx eas-cli build --profile development`.
- `npx expo start --web` để xem nhanh trên trình duyệt (phỏng vấn AI sẽ bị CORS chặn ở bản web).

## Kiểm tra

```bash
npx tsc --noEmit && npx expo lint && npx expo-doctor
```

## Dùng chung với web

`src/lib/shared.ts` + `src/lib/data.ts` import thẳng từ `../web/src` (Metro `watchFolders`, xem `metro.config.js`):
`lib/{catalog,srs,glossary-match,report,icon-paths}.ts`, `locales.ts`, `data/questions/*.json`, `data/glossary.json`, `dictionaries/vi.json`.
Sửa câu hỏi/thuật ngữ bên web thì app có luôn ở lần build sau.

## Đưa lên store

1. Đổi `ios.bundleIdentifier` / `android.package` trong `app.json` (đang là `com.devinterview.app`), thay icon + splash trong `assets/`.
2. Deploy `web/` (vd Vercel) và đặt `EXPO_PUBLIC_API_URL` cho bản production. **Thêm giới hạn số lần gọi cho `/api/*` trước khi phát hành.**
3. `npx eas-cli build --platform all` → `npx eas-cli submit`. Google Play với tài khoản cá nhân mới cần closed test 12 người × 14 ngày.
4. Cần trang chính sách quyền riêng tư; khai báo việc gửi câu trả lời cho AI bên thứ ba (Gemini), quyền micro + nhận giọng nói.

Để sau: chatbot gia sư (API `/api/chat` đã có bên web), Project Deep-dive, widget màn khoá, tiếng Anh, đăng nhập + đồng bộ.
