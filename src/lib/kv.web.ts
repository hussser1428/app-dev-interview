// Bản web (xem trước trên trình duyệt): localStorage thay cho SQLite.
const kv = {
  getItemSync: (k: string) => localStorage.getItem(k),
  setItemSync: (k: string, v: string) => localStorage.setItem(k, v),
};
export default kv;
