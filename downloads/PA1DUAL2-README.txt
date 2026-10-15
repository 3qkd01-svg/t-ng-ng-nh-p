PA1DUAL2 0.8.0 - 1 tab, UI + toi da 2 ID API

1. Dung ban cu truoc khi chay ban nay. Can Node.js 22+ va Edge/Chrome
   tren Windows duoc cac phan mem nay ho tro. Mo start-pa1dual2.cmd.
   Lan dau npm ci tai playwright-core 1.63.0 tu lockfile qua HTTPS.
2. Chon 1=Edge (Enter mac dinh), 2=Chrome. API offset mac dinh 50ms.
   Co the nhap so nguyen 0..10000ms. Moc gio theo dong ho VPS, hien thi gio Ha Noi.
   Offset la muc tieu, khong dam bao gui/den may chu dung tung mili giay.
3. Tu dang nhap trong tab duoc mo. Sau hai cau hoi ban dau,
   nhan Enter trong cua so chuong trinh de DUNG toan bo lich.
4. Lich 11/13/15/17/19/21 gio Ha Noi, tiep tuc 11h ngay hom sau.
   Chon khung gio chua bat dau; mo sau 11:00:00 se cho 13h.
   Lan dau vao chat kiem tra mot luot roi ve trang chu neu con thoi gian.
   Moi phien quay vao chat truoc 30s. Sau khi phien KET THUC,
   giu chat 5 phut roi ve trang chu cho phien tiep theo.
5. Phien dau moi lan khoi dong chi UI: bam hong bao moi dau tien va Mo.
   Chi hoc cach gui/ID lam moc API khi thay yeu cau Mo thuc te tu UI.
   Khong can phan hoi thanh cong de hoc moc. Neu chua bam/gui duoc,
   phien sau van UI de hoc lai. Hien ro cac moc bam va loi HTTP.
6. Sau khi hoc UI, API du doan toi da 2 ID, moi ID gui MOT lan/phien.
   Neu 15h xac nhan 111: 17h thu 112,113.
   Neu 17h xac nhan 113: 19h thu 112,114.
   Neu 19h xac nhan 112: 21h thu 114,115; moc cao nhat van la 113.
   Khi nhieu ID con thieu, luan phien mot ID con thieu + mot ID phia truoc.
   Day la DU DOAN; may chu co the phat ID/gio khac, gui som co the that bai.
7. Chi loai ID khoi du doan phien SAU neu thay trong su kien chat phu hop,
   yeu cau UI da Mo, hoac API tra code 1. HTTP 200 mot minh khong du.
   ID moi gui thu, timeout hoac code khac chua ro van duoc giu de xet lai.
   Cho phep ID ra khong theo thu tu; bo qua tin lap cua ID da xac nhan tu phien truoc.
8. API chay trong CUNG TAB va phien dang nhap, dung bo gui/xac thuc cua trang.
   Hai ID cung nham moc gio + offset, moi yeu cau timeout 30s.
   UI van theo doi chat, chi mo mot hong bao moi, thu Mo lan 2 sau 500ms
   neu nut kha dung. Khong mo khoa nut dang xu ly. UI giu timeout goc cua trang.
   Toi da 2 API + 2 UI/phien. API da thanh cong cung ID thi bo UI trung.
   API thanh cong ID khac khong tu huy luot UI cua hong bao dang chon.
9. Giam anh/video/tracker, giu tai nguyen nut Mo va xac minh dang nhap.
   Theo doi socket khi cho chat; mat ket noi cho 12s, toi da 3 lan khoi phuc,
   cach nhau it nhat 15s. Khong tai lai khi da chon hong bao/gui yeu cau nhan.
   API duoc nap lai sau reload truoc khi gui; neu khong dung duoc se ghi ly do.
10. Bao cao reports/pa1dual2-....json co tung ID, source api/ui, thoi diem gui,
    HTTP/code/loi, ID da xac nhan, ID con cho, moc bam va ket noi lai.
    Bao cao khong luu cookie, mat khau, token, chu ky, body hoac chat thuong.
    Thoi gian co Z trong JSON la UTC, cong 7h de doc theo gio Ha Noi.
11. Bo nho reports/pa1dual2-state.json duoc luu sau moi phien.
    Mo lai CUNG start-pa1dual2.cmd se nho ID da co va ID con thieu,
    nhung phien dau van UI de kiem tra lai cach gui va dang nhap hien tai.
    Tai lai ZIP vao thu muc moi tao bo nho RIENG. Khong tu doc bao cao ban cu.
    File bo nho hong duoc giu thanh .invalid.json va chuong trinh hoc lai bang UI.
12. Can giu chuong trinh, tab, VPS va mang hoat dong. Thu nho duoc.
    Hai tac vu van chung JavaScript, duong mang va may chu; tab do co the lam API cham.
    Cong cu khong tang bang thong, khong bao dam het nghen hay nhan duoc hong bao.
    Kiem tra lich su tren trang khi timeout; may chu co the da xu ly du phan hoi bi mat.
    Ban nang cap chi thu tren may chu mo phong; chua gui lenh nhan that tu Codex.
