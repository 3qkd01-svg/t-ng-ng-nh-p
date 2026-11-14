PA1RETRY500 AUTO120 0.6.0 - tu dong lap cac phien

1. Dong ban cu. Mo start-pa1retry500.cmd trong thu muc nay.
   Can Node.js 22+ va Edge/Chrome tren Windows duoc cac phan mem nay ho tro.
   npm ci tai playwright-core 1.63.0 theo lockfile; khong can tep cua ban cu.
2. Nhap link HTTPS dang dung, chon Edge/Chrome, chon GIO BAT DAU.
   Enter o muc gio = khung chua bat dau gan nhat.
   Gio duoc tinh theo Ha Noi UTC+7, hien ngay/thang/nam.
   Gio ban nhap chi la PHIEN DAU; sau do lap 11/13/15/17/19/21.
   Sau 21h thi tu cho 11h ngay hom sau. Neu VPS ngu/tre, bo qua gio da lo,
   khong gui don de chay bu cac phien cu.
3. Chon che do 1=bam Mo va thu them sau 500ms; 2=chi quan sat.
   Tu dang nhap va xac minh CAPTCHA/OTP. Cho toi da 120 giay sau buoc mo trang.
   Dang nhap som thi tiep tuc ngay. Gio phien dau duoc tinh lai sau dang nhap.
   Het han hoac mat dang nhap: dung, khong tu nhap tai khoan/mat khau.
4. Chi MOT tab va MOT phien dang nhap trong suot lich chay.
   Lan dau ghe chat roi ve trang chu. Khong lap buoc ghe chat o moi phien.
   Moi phien vao chat truoc 30 giay; cho hong bao moi trong 60 giay.
   Lan ghe chat ban dau loi thi van thu lai tai moc vao chat da hen.
5. Chi chon hong bao moi dau tien. Giu module bam va thu 500ms cua PA1RETRY500
   goc: toi da 2 lan bam Mo cho cung hong bao, giu khoa dang mo cua trang.
   Khong doan ID, khong co luong API rieng, khong tao lai request nhan.
6. Chi XHR Mo do trang tu tao duoc tang thoi gian cho toi thieu 30 giay.
   Khong doi xac thuc/chu ky/noi dung gui; khong doi timeout token/endpoint khac.
   Trang van co the tu huy vi ly do khac. Timeout khong chung minh may chu
   chua xu ly; xem lich su nhan tren trang de xac nhan ket qua that.
7. XONG MOI PHIEN: luu bao cao, giu chat 5 phut tinh tu luc ket thuc, ve
   trang chu, tu cho phien ke tiep. Khong can nhan Enter/chay lai/dang nhap lai
   neu phien dang nhap van hop le. Phien loi/khong co hong bao van tiep tuc lich.
8. Nhan Enter trong cua so chuong trinh de DUNG TOAN BO lich.
   Dong trinh duyet cung dung. Khong bam Enter chi de chuyen sang phien sau.
9. Bao cao reports/pa1retry500-<gio-phien>-<thoi-diem>.json.
   Co release 0.6.0-auto120, muc continuous va postRun de biet lich con chay,
   gio tiep theo va luc ve trang chu. Moi phien dat lai bo dem/budget/listener.
   Bo do chan doan duoc don dep giua cac phien, khong tich luy sampler sau reload.
   Khong luu mat khau, cookie, token, chu ky hay noi dung chat thuong.
   Moc co Z la UTC; cong 7 gio de doc theo gio Ha Noi.
10. Giu giam anh/video/tracker va module khoi phuc ket noi goc: cho 12s,
    toi da 3 lan, cach nhau it nhat 15s; khong reload khi da chon/gui Mo.
    Kiem thu tren mo phong khong bao dam nhan thanh cong hay het nghen mang.
    Khong vuot CAPTCHA, khong tu doi mien, khong sua dong ho Windows.
