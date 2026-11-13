PA1RETRY500 CLOCK120 0.5.2 - ban goc, them link, login 120 giay va tu chon gio

1. Dong cac ban cu. Mo start-pa1retry500.cmd trong thu muc nay.
   Can Node.js 22+ va Edge/Chrome tren Windows duoc cac phan mem nay ho tro.
   npm ci tai playwright-core 1.63.0 theo lockfile. Khong can tep cua ban cu.
2. Nhap LINK HTTPS dang dung TRUOC khi trinh duyet mo.
   Enter de giu link hay8888.ink cu. Neu link cu khong hoat dong, dan link moi.
   Khong nhap link co ten dang nhap/mat khau. Khong tu doi mien hay vuot CAPTCHA.
3. Chon 1=Edge (mac dinh), 2=Chrome.
   Hien gio hien tai theo Ha Noi UTC+7, ngay/thang/nam va dot sap toi.
   Chon MOT gio 11/13/15/17/19/21; Enter de TU CHON dot chua bat dau gan nhat.
   Vi du 16:20 -> 17:00; sau 21:00 -> 11:00 ngay hom sau.
   Nhap mot gio cu the da qua thi chon gio do vao ngay hom sau.
   Lich duoc tinh lai sau khi tra loi cac cau hoi, tranh giu goi y da cu.
   Hien gio se vao chat va thoi gian con cho. Dung dong ho VPS, doi ve gio Ha Noi.
   Chon che do 1=bam Mo, thu them sau 500ms; 2=chi quan sat.
4. Tu dang nhap va xac minh CAPTCHA/OTP trong trinh duyet.
   Sau buoc mo trang, cho toi da 120 giay de trang xac nhan dang nhap.
   Dang nhap som thi tiep tuc ngay. Het 120 giay thi ghi bao cao, dung va dong
   trinh duyet; chua bam nhan. Chon gio con du thoi gian de dang nhap.
   Neu khung gio da chon da ket thuc thi phien dung som theo lich goc.
5. Giu cach chay PA1RETRY500 goc: ghe chat, ve trang chu, quay lai truoc gio
   da chon 30 giay. Chi chon hong bao moi dau tien trong cua so 60 giay.
6. Toi da 2 cu bam Mo cho CUNG hong bao, lan them sau 500ms tinh tu lan Mo
   dau tien. Chi bam neu nut con kha dung; giu khoa dang mo cua trang.
   Co phan hoi thi huy lan bam chua thuc hien. Khong doan ID/gui API truc tiep.
7. Giu nguyen bo giam anh/video/tracker va khoi phuc ket noi cua ZIP goc:
   cho 12s, toi da 3 lan, cach nhau it nhat 15s. Khong thay doi timeout HTTP.
8. Day la ban chay MOT PHIEN nhu ban cu, khong tu lap ca ngay.
   Xong phien, xem ket qua tren trang roi nhan Enter de dong trinh duyet.
   Chay lai start-pa1retry500.cmd de chon dot khac.
9. Nhan Enter trong cua so chuong trinh de DUNG khi dang cho.
   Bao cao reports/pa1retry500-....json co release 0.5.2-clock120.
   Khong luu mat khau, cookie, token, chu ky hay noi dung chat thuong.
   Thoi gian co Z trong JSON la UTC, cong 7 gio de doc theo gio Ha Noi.
10. Ket thuc phien hien gio hien tai va khung tiep theo neu ban chay lai.
    Bao cao co muc clock: currentAt, selection, nextStartAt, followingStartAt.
    Khong tu dong lap phien hay gui lenh o khung tiep theo.
11. Them link, deadline login va hien/tinh gio; bon module bam/500ms/ket noi/chan doan
    duoc giu nguyen tung byte tu ZIP goc. Khong dua co che PA1SINGLE vao ban nay.
    Kiem thu mo phong khong bao dam nhan thanh cong khi chay that.
