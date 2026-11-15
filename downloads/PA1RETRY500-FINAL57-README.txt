PA1RETRY500 FINAL57 0.7.2

1. Dong ban cu. Mo start-pa1retry500.cmd trong thu muc nay.
   Can Node.js 22+ va Edge/Chrome tren Windows duoc cac phan mem nay ho tro.
   npm ci cai playwright-core 1.63.0 theo lockfile; khong can tep cua ban cu.
2. Nhap link HTTPS, chon Edge/Chrome, chon gio BAT DAU.
   Enter o muc gio = khung chua bat dau gan nhat, tinh lai sau dang nhap.
   Tu dang nhap va xac minh CAPTCHA/OTP; cho toi da 120 giay.
   Moi thong tin dang nhap chi o trong phien trinh duyet dang mo.
3. Lich tu lap: 11/13/15/17/19/21 gio Ha Noi UTC+7.
   Sau 21h cho 11h ngay hom sau. Gio da lo duoc bo qua, khong chay bu.
   Chi mot tab, mot luong bam UI. Khong co luong API hay du doan ID.
4. Moi phien tai lai trang MOT LAN tai phut 57:00 cua gio truoc.
   Vi du phien 19h: 18:57:00 tai lai, 18:59:45 vao chat, 19h cho hong bao.
   Tai lai ngay trong tab/phien hien tai, khong xoa cookie/localStorage.
   Sau tai lai kiem tra dang nhap, cho toi da 120 giay neu can dang nhap lai.
   Khoi dong sau moc 57:00: BO QUA tai lai cua phien do, van vao chat 59:45.
   Neu VPS ngu/lenh bi tre qua 5s so voi moc tai lai: bo qua tai lai muon.
   Tai lai co gioi han 30s; neu loi thi dung luot tai dang treo, kiem tra
   dang nhap va tiep tuc neu trang con su dung duoc. Khong tai lai lap lien tuc.
5. Moi phien vao chat TRUOC 15 GIAY; cho hong bao moi trong 60 giay.
   Lan dau van ghe chat ngan roi ve home nhu ban PEAK15.
   Chon hong bao moi dau tien; giu tin neu giao dien dang chuan bi/noi lai.
   Giu module bam cua PA1RETRY500: thu Mo them sau 500ms cho CUNG hong bao,
   toi da 2 lan; van ton trong khoa dang Mo va hop ket qua cua trang.
6. Giu HTTP cache va giam anh/video/tracker/favicon trang tri.
   Giu anh CAPTCHA va nut hong bao. Uu tien tab T-15s va T-3s.
   Tam dung animation quang cao/media phu neu tim thay, khoi phuc sau phien.
   Giam quet DOM/chan doan dinh ky trong cua so quan trong.
   Giu khoi phuc co gioi han: cho 12s, toi da 3 lan, cach it nhat 15s.
   Khong khoi phuc bang reload khi da chon/gui Mo.
7. XHR Mo do trang tu tao co timeout toi thieu 30s.
   Khong doi xac thuc/chu ky/noi dung gui, khong doi timeout token.
   Cho phan hoi khong bao dam nhan duoc; HTTP 200 khong dong nghia thanh cong.
8. Sau moi phien luu bao cao, giu chat 5 phut, ve home va tu cho phien sau.
   Nhan Enter trong cua so chuong trinh hoac dong trinh duyet de DUNG TOAN BO.
   Khong can nhan Enter de chuyen phien. Giu VPS thuc de lich co the chay.
9. Bao cao reports/pa1retry500-<gio-phien>-<thoi-diem>.json.
   release=0.7.2-final57; preRunReload ghi moc/trang thai/ket qua tai lai.
   continuous va postRun ghi lich tiep theo va buoc ve home.
   Moc Z la UTC; cong 7 gio de doc theo gio Ha Noi.
   Bao cao khong luu mat khau, cookie, token, chu ky hay noi dung chat thuong.
10. Ban chot tinh nang theo yeu cau; khong bao dam nhan hong bao thanh cong
    hoac loai bo do tre tu duong truyen/may chu. Khong vuot CAPTCHA.
