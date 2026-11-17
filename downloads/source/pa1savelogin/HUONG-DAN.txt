PA1SAVELOGIN 0.9.0

1. Dong ban cu. Mo start-pa1retry500.cmd trong thu muc nay.
   Can Node.js 22+ va Edge/Chrome tren Windows duoc cac phan mem nay ho tro.
   npm ci cai playwright-core 1.63.0 theo lockfile; khong can tep cua ban cu.
2. Nhap link HTTPS, chon Edge/Chrome, chon gio bat dau.
   Enter o muc gio = khung chua bat dau gan nhat, tinh lai sau dang nhap.
   Tu dang nhap va xac minh CAPTCHA/OTP; cho toi da 120 giay.
3. Lich 11/13/15/17/19/21 gio Ha Noi UTC+7; sau 21h cho 11h ngay sau.
   Moi phien tai lai trang mot lan tai phut 57:00, kiem tra dang nhap,
   vao chat truoc 15 giay. Khoi dong sau moc tai lai thi bo qua tai lai muon.
   Moi phien giu chat 5 phut sau khi xong, ve home va tu cho phien ke tiep.
4. Hong bao moi dau tien: chon the ngay, bam Mo sau it nhat 100ms tinh tu
   luc chuong trinh nhan tin. Neu giao dien chua san sang, bam som nhat khi co
   nut; khong them 100ms nua neu da cho qua moc nay.
5. Sau 500ms tinh tu lan bam Mo dau THUC TE, neu chua co phan hoi:
   chon lai CUNG the hong bao, giai phong rieng co dang Mo rbIsOpening,
   cho nut cap nhat trang thai roi bam Mo them mot lan. Neu giao dien dap ung
   kip, hai lan Mo o khoang T+100ms va T+600ms tinh tu luc nhan tin.
   Toi da 2 yeu cau qua nut goc, mot tab, cung ID, khong co luong API rieng.
   Neu luot dau co phan hoi HTTP truoc moc thu hai thi huy luot thu hai.
   Khong doi sang hong bao khac; giu kiem tra dang nhap/hop ket qua/quyen.
   Chi xu ly co dang Mo; khong tu go disabled doc lap hay bo qua CAPTCHA.
   Neu nut khong san sang trong 1.5s, het cua so hoac Stop thi huy luot hai.
6. Hai yeu cau da gui duoc theo doi rieng, giu ca hai phan hoi trong bao cao.
   Neu bat ky yeu cau nao tra code=1 thi outcome.state=confirmed-success;
   successfulRequestNumbers ghi so yeu cau thanh cong. HTTP 200 khong tu
   dong la thanh cong; timeout khong chung minh may chu chua xu ly.
7. Bao cao reports/pa1retry500-<gio-phien>-<thoi-diem>.json:
   release=0.9.0-savelogin; requests la danh sach cac yeu cau da quan sat.
   request (so it) van la yeu cau DAU, dung outcome de xem ket qua tong.
   clicks ghi actualFirstOpenDelayMs va secondOpen.cardClickedAt/clickedAt,
   actualDelayMs, openingFlagReleased va ly do neu luot hai bi bo qua.
   requestObserved la trinh duyet da quan sat yeu cau thu hai;
   allowedByRequestGuard la yeu cau do da qua bo gioi han cua chuong trinh.
   Hai truong nay khong tu chung minh may chu da nhan/xu ly thanh cong.
8. Giu cache, giam anh/video/tracker/favicon trang tri, uu tien tab T-15s/T-3s,
   giam chan doan DOM trong cua so quan trong va khoi phuc ket noi co gioi han.
   Timeout XHR Mo toi thieu 30s; khong doi token/xac thuc/chu ky/noi dung gui.
   Nhan Enter trong cua so chuong trinh hoac dong trinh duyet de DUNG TOAN BO.
9. Moc Z la UTC, cong 7 gio de doc theo gio Ha Noi. Khong luu mat khau,
   cookie, token, chu ky hay noi dung chat thuong vao bao cao.
10. Kiem thu bang Chromium va trang mo phong; chua thu nhan that tren trang
    dich. Can bao cao that de xac nhan hanh vi cua giao dien hien tai.
    Hai luot thu khong bao dam tang ty le nhan hay rut ngan thoi gian may chu.

11. LUU DANG NHAP (chi tren may cua ban):
    link-login/link.json luu dia chi HTTPS sau khi dang nhap thanh cong.
    cookie-tai-khoan/session.json luu cookie + localStorage cua phien.
    Hai thu muc nam CANH start-pa1retry500.cmd, duoc tao sau lan luu dau.
    Thieu thu muc/file link hop le: coi nhu lan dau, khong nap cookie cu.
    Co link nhung thieu/loi phien: dung link da nho, dang nhap thu cong 120s.
    Co du hai: thu nap phien, van doi trang xac nhan dang nhap roi moi chay.
    Enter tai cau hoi link de giu dia chi cu; nhap dia chi moi de doi link.
    Doi ten mien thi khong nap phien cua mien cu; luu cap moi sau dang nhap.
12. Cap nhat phien sau dang nhap, sau tai lai phut 57, sau moi luot va
    dinh ky 5 phut khi khong sat gio chay. Hoan luu gan moc phat de giu UI.
    Dung bang Enter, doi thong bao luu xong roi chep HAI thu muc sang may khac.
    Tren may khac: tai/giai nen chuong trinh, chep hai thu muc vao CANH tep
    start-pa1retry500.cmd, roi chay. Khong can chep ho so Edge/Chrome.
    Neu dong han trinh duyet, mat dien hoac trang khong phan hoi, dung ban
    luu gan nhat; chuong trinh khong ghi de phien hop le bang trang da logout.
13. Day la tep phien CO THE DOC DUOC de chuyen may; nguoi co tep co the
    truy cap tai khoan. Giu rieng; khong gui tep phien/cookie vao cuoc tro
    chuyen, GitHub hay ZIP cong khai. ZIP phat hanh KHONG chua hai thu muc nay.
    Bao cao chi ghi trang thai luu/khoi phuc, khong ghi gia tri cookie/token.
    Trang co the tu choi phien do het han, doi IP/thiet bi hoac yeu cau OTP/
    CAPTCHA; khi do dang nhap lai trong 120s. Khong bao dam phien chuyen may
    luon duoc chap nhan. Trang can du lieu chi o RAM/sessionStorage/IndexedDB
    co the yeu cau dang nhap lai; ban nay luu cookie va localStorage.
