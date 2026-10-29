# TISC 2026 Certificate Portal

เว็บรับ certificate โดยใช้ UX/UI เดิม: **เลือกทีม → เลือกชื่อ → กรอกนามสกุล → ดาวน์โหลด PNG ของตนเอง**

Frontend อยู่ GitHub Pages และฝัง Apps Script ผ่าน iframe ตามระบบ onsite เดิม ชีตและ Drive อยู่ private ไม่ใช้โควต้าส่งเมล ไม่เปลี่ยนข้อมูล Attendance และไม่มี dashboard staff สาธารณะ

## ไฟล์ที่ใช้

- `index.html`, `config.js`: หน้าเว็บ GitHub Pages
- `apps-script/Code.gs`, `apps-script/App.html`, `apps-script/appsscript.json`: ใส่ใน Apps Script โปรเจกต์ใหม่
- `tests/backend.test.cjs`: ทดสอบสิทธิ์และไฟล์ด้วย Apps Script mocks ใน Node

ไม่ต้อง upload Excel, CSV, certificate หรือข้อมูลส่วนบุคคลเข้า GitHub

## 1. ตั้ง Apps Script ใหม่

สร้างโปรเจกต์ที่ [script.google.com](https://script.google.com/) โดยใช้บัญชีเจ้าของที่อ่าน Google Sheet และ certificate ทุกไฟล์ได้ **แยกจากระบบ onsite และสคริปต์ส่งเมลเดิม**

1. วาง `apps-script/Code.gs` ใน Code.gs
2. เพิ่มไฟล์ HTML ชื่อ **App** แล้ววาง `apps-script/App.html` ทั้งหมด
3. Project Settings → Show appsscript.json manifest file → วาง manifest ที่ให้มา
4. Project Settings → Script Properties เพิ่ม:

| Property | ค่าที่ใส่ |
|---|---|
| `CERTIFICATE_SHEET_ID` | ID ของ Google Sheet ที่มีแท็บ Email Send |
| `CERTIFICATE_ROOT_ID` | ID โฟลเดอร์ TISC Certificate หลักบน Drive |

รหัสทั้งสองคือส่วนระหว่าง `/d/` กับ `/edit` ของ Sheet และส่วนหลัง `/folders/` ของโฟลเดอร์ Drive ตามลิงก์ที่ผู้ดูแลมี ไม่ใส่ลิงก์เต็ม ไม่ใส่ credentials ใน config.js

ระบบเริ่มต้นปิดอยู่ เรียก `enablePortal` จากตัวแก้ไขด้วยบัญชีเจ้าของเมื่อพร้อม ระบบจะตั้ง `PORTAL_ENABLED=YES` ให้เอง เรียก `disablePortal` เมื่อต้องการหยุดให้ดาวน์โหลด

### เงื่อนไขเปิดให้ดาวน์โหลดใน Email Send

ใช้หัวตารางแถว **8** และอ่านตามชื่อคอลัมน์ ไม่ผูกกับตัวอักษรคอลัมน์:

- `DataCheck = VERIFIED_MAPPING`
- `Issue` ว่าง
- `Approved = YES` (เป็นการอนุมัติเผยแพร่ใบผ่านเว็บด้วย)
- `DriveCheck = PATH_SIZE_MATCH`
- ชื่อ เมล ทีม รอบ Track path รหัสไฟล์และ SHA256 ครบ พร้อมมีนามสกุล

แถว HOLD/REVIEW หรือ NO ไม่แสดงให้เลือก และเรียก API ข้ามเงื่อนไขไม่ได้ ไม่จำเป็นต้องเป็นผู้มา onsite เพื่อรับ certificate ฐานสิทธิ์คือ Email Send เท่านั้น

**ถ้าเคย Approved YES ทั้งหมดสำหรับส่งเมล ให้ตรวจรายการนั้นก่อน enablePortal เพราะแถวที่ผ่านเงื่อนไขจะพร้อมให้ดาวน์โหลดทันที** ไม่แก้ข้อมูลหรืออนุมัติให้เอง

## 2. Deploy เป็น Web app ใหม่

Deploy → New deployment → Web app:

- Execute as: **Me**
- Who has access: **Anyone** (หากองค์กรอนุญาต)
- อนุญาต OAuth ให้โปรเจกต์อ่าน Google Sheet และ Drive
- คัดลอกลิงก์ **`/exec` ใหม่** ของ certificate portal ไม่ใช้ลิงก์ onsite เดิม ไม่ใช้ `/dev`

ทดสอบลิงก์ตรงด้วย browser ที่ไม่ได้ล็อกอินบัญชีเจ้าของ: เลือกทีม/ชื่อ กรอกนามสกุล → Prepare download → Save certificate (PNG) ตรวจว่าเป็นใบของตนเอง และ wrong surname ดาวน์โหลดไม่ได้

ทุกครั้งที่แก้ Code.gs/App.html ให้ Deploy → Manage deployments → Edit → New version → Deploy

## 3. เชื่อม GitHub Pages

แก้ `config.js`:

```js
window.TISC_CERTIFICATE_APP_URL = 'ใส่ลิงก์ /exec ใหม่จากขั้นก่อน';
```

ค่าใช้ได้ต้องเป็น `https://script.google.com/macros/s/<deployment-id>/exec` เท่านั้น หากยังว่าง หน้าเว็บแสดงข้อความยังไม่เปิดให้บริการโดยไม่โหลดระบบเก่า

Repo Settings → Pages → Deploy from a branch → main → /(root) → Save ใช้ URL ที่ GitHub Pages แสดงหลัง deploy แล้ว

## วิธีตรวจสอบก่อนประกาศลิงก์

- ตรวจมือถือและ desktop รวม Chrome/Safari ตามอุปกรณ์ผู้เข้าร่วม
- เลือกทีมและชื่อแล้วตรวจชื่อย่อ กรอกนามสกุลตามส่วนท้ายสุดของชื่อที่ลงทะเบียน เช่น Jane van Smith ให้กรอก Smith (พฤติกรรมเดิม)
- แถว HOLD/REVIEW/NO ไม่ปรากฏ; 3 รายที่ยังค้างต้องแก้ก่อนเปิดสิทธิ์
- ดาวน์โหลดแล้วตรวจไฟล์จริง ชื่อ รอบ Track และไม่มีการเปลี่ยน Drive ให้ public
- ทดสอบชื่อผิด 5 ครั้งจะพัก ID นั้นประมาณ 10 นาที; session มีอายุ 10 นาที และดาวน์โหลดได้ไม่เกิน 5 ครั้งต่อ session
- Logout หรือแก้ชื่อ/เมล/ทีม/ไฟล์/สถานะในชีตแล้ว token เดิมต้องใช้ไม่ได้
- ทดสอบ network error และ session หมดอายุ

## ขอบเขตการตรวจสิทธิ์

นามสกุลเป็นข้อมูลที่คนอื่นอาจทราบ จึงเป็นการยืนยันแบบเดิม ไม่ใช่รหัสผ่านหรือ OTP ทีมต้องยอมรับระดับการตรวจแบบนี้ก่อนเปิดเว็บ หากต้องการหลักฐานว่าเป็นเจ้าของเมลจริง ต้องเพิ่ม OTP/Google sign-in ภายหลัง

ข้อยกเว้นรายบุคคล: `TISC26-CERT-0250` ที่มีชื่อ `Phuwasid` เพียงคำเดียว ใช้ค่าจาก `RecipientEmail` ยืนยันแทนนามสกุล หน้าเว็บจะเปลี่ยนเป็น Registered email เมื่อเลือกชื่อ ไม่แสดงอีเมลจริงในรายการ และไม่อนุญาตช่องว่าง รายอื่นยังใช้นามสกุลตามเดิม อีเมลในกรณีนี้เป็นเพียงข้อมูลสำหรับตรวจเทียบ ไม่ใช่ OTP หรือการพิสูจน์ว่าเข้าถึงกล่องเมลได้

GitHub iframe ซ่อน endpoint ได้เพียงจาก address bar ผู้ใช้ยังตรวจ URL Apps Script ได้ใน source/Network ตามแบบที่เลือก ระบบจึงตรวจสิทธิ์ทุกครั้งที่ backend และไม่พึ่งการซ่อน URL

Session อยู่ฝั่ง server/cache; token อยู่ในหน่วยความจำหน้าเว็บ ไม่บันทึก localStorage หรือ URL ไม่ส่งเมล/Drive ID/Sheet ID ใน public roster ไม่เปิดโหลดไฟล์ของสมาชิกทีมคนอื่น ไฟล์ถูกอ่านเป็น bytes หลังตรวจชื่อ รอบ Track โฟลเดอร์แม่และ SHA256 แล้วเท่านั้น PNG จำกัดขนาด 8 MB ต่อไฟล์ ไม่ส่ง Drive URL ให้ browser

## ทดสอบในเครื่อง

```sh
node --test tests/backend.test.cjs
```

ชุดทดสอบใช้ service mocks ไม่ส่งเมลและไม่เปลี่ยนข้อมูล Google จริง ผลในเครื่องไม่ใช่การยืนยัน OAuth, deployment และการดาวน์โหลดบน browser จริง ต้อง smoke test หลัง deploy ใหม่ด้วย

อ้างอิง: [Apps Script web apps](https://developers.google.com/apps-script/guides/web), [google.script.run](https://developers.google.com/apps-script/guides/html/communication), [HTML sandbox/download restrictions](https://developers.google.com/apps-script/guides/html/restrictions)
