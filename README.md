# Montrax — Ombor va Sotuv Boshqarish Tizimi

Telefon do'koni uchun ko'p filialli ombor, sotuv, mijoz (qarz) va hisobot
tizimi. Next.js 15 (App Router) + Prisma + PostgreSQL + NextAuth v5 asosida
qurilgan.

## Filiallar

Hozircha ikki filial mavjud: **Namangan** va **Toshkent**. Har filialning
o'z sotuvchisi bor — sotuvchi faqat o'z filialining telefon/sotuv/mijoz
ma'lumotlarini ko'radi va boshqaradi (`lib/access-control.ts`). Owner barcha
filiallarni ko'radi va ular orasida taqqoslay oladi (`hisobotlar` sahifasi).

Filial va sotuvchi hisoblari `prisma/seed.ts` orqali yaratiladi:

```bash
npm run prisma:seed
```

Login/parol `.env` faylidagi `NAMANGAN_SELLER_LOGIN`, `NAMANGAN_SELLER_PASSWORD`,
`TOSHKENT_SELLER_LOGIN`, `TOSHKENT_SELLER_PASSWORD` qiymatlaridan olinadi.
Birinchi kirishdan keyin "Xodimlar" sahifasidan parolni almashtirib qo'yish
tavsiya etiladi.

## Chek (PDF) va telefonni xavfsiz o'chirish

- **PDF chek**: "Sotuv" sahifasidagi har bir sotuv qatorida "🧾 Chek" —
  do'kon nomi, filial, telefon, narx va (kreditga bo'lsa) mijoz/qarz
  ma'lumotlari bilan tayyor PDF ochiladi (chop etish yoki saqlash mumkin).
- **Soft-delete**: telefon o'chirilganda baza yozuvi butunlay
  o'chirilmaydi, faqat `deletedAt` belgilanadi — ro'yxatlarda ko'rinmay
  qoladi, lekin eski sotuvlar/audit tarixi buzilmaydi. Bir xil IMEI
  o'chirilgandan keyin qaytadan ishlatilishi mumkin.

## Ombor: rasm, filiallar orasida ko'chirish, Excel import

- **Rasm**: har bir telefon kartochkasida "+ Rasm" tugmasi — Vercel Blob
  orqali saqlanadi (Vercel'da Storage → Blob'ni yoqish kifoya,
  `BLOB_READ_WRITE_TOKEN` avtomatik qo'shiladi). Yoqilmagan bo'lsa, rasm
  funksiyasi shunchaki ishlamaydi, qolgan tizim normal davom etadi.
- **Filiallar orasida ko'chirish**: faqat OWNER (egasi) bir filialdan
  ikkinchisiga telefon ko'chira oladi — har bir kartochkada "🔁 Ko'chirish"
  tugmasi.
- **Excel/CSV import**: "Ombor" sahifasida "📥 Excel'dan import" — avval
  shablonni yuklab oling, to'ldiring (Model, Brend, Rang, Xotira (GB), IMEI,
  Holati, Tan narxi, Sotuv narxi), qaytadan yuklang. Bir martada 500 tagacha
  qator, har bir qator alohida tekshiriladi (bitta xato qatordagi
  boshqalarni to'xtatmaydi).

## Telegram bot (qarz eslatmalari, xavfsizlik, kunlik hisobot)

Bot quyidagi holatlarda admin (siz)ga avtomatik xabar yuboradi:

- 🧾 Kreditga (bo'lib to'lashga) yangi sotuv qilinganda
- ⚠️ Mijozning qarz muddati o'tib, "muddati o'tgan" statusiga o'tganda
- 🔐 Telefon o'chirilganda (qaytarib bo'lmaydigan amal)
- 📊 Har kuni ertalab (09:00, Toshkent vaqti) — barcha filiallar bo'yicha qisqa hisobot

Shuningdek, botga buyruq yozib, joyida ma'lumot so'rash mumkin:

| Buyruq | Natija |
|---|---|
| `/holat` | Shu oy bo'yicha filiallar holati |
| `/bugun` | Bugungi sotuvlar (har filial) |
| `/qarzlar` | Muddati o'tgan qarzlar ro'yxati |
| `/yordam` | Buyruqlar ro'yxati |

### Sozlash (deploy qilingandan keyin, bir marta)

1. `.env`da `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`,
   `TELEGRAM_WEBHOOK_SECRET`, `CRON_SECRET` borligiga ishonch hosil qiling
   (qiymatlar tayyor — `.env.example`ga qarang).
2. Vercel loyihasining "Environment Variables" bo'limiga ham AYNAN shu
   to'rt qiymatni qo'shing (production muhitida ham ishlashi uchun).
3. Webhookni ro'yxatdan o'tkazish:

   ```bash
   WEBHOOK_URL="https://SIZNING-DOMAIN.vercel.app/api/telegram/webhook" \
     npm run telegram:setup-webhook
   ```

4. Botga Telegram'da `/yordam` deb yozing — javob kelishi kerak.

### Xavfsizlik

- Bot **faqat** `TELEGRAM_ADMIN_CHAT_ID`dagi chat bilan gaplashadi — boshqa
  hech kim botdan ma'lumot ola olmaydi, garchi tokenni topib olsa ham.
- Webhook so'rovlari Telegram'ning o'zi yuborgan `secret_token` orqali
  tasdiqlanadi (`TELEGRAM_WEBHOOK_SECRET`).
- Cron endpointlar (`/api/cron/*`) Vercel'ning o'zi yuboradigan
  `Authorization: Bearer $CRON_SECRET` header orqali himoyalangan.
- Hech qanday token/parol kod ichida yozilmagan — barchasi `.env` orqali
  (bu fayl `.gitignore`da bloklangan, GitHub'ga hech qachon yuklanmaydi).

## Boshqa skriptlar

```bash
npm install                # paketlarni o'rnatish (prisma generate avtomatik ishlaydi)
npm run dev                 # lokal ishga tushirish
npm run build                # production build
npm run prisma:migrate       # yangi migratsiya (lokal)
npm run prisma:studio        # bazani vizual ko'rish
```

> ⚠️ Bu safar `photoUrl` maydoni va yangi audit harakatlari (`PHONE_TRANSFERRED`,
> `PHONE_IMPORTED`) qo'shildi — production bazada (Railway) buni qo'llash uchun:
> `npx prisma migrate deploy` ishga tushiring (deploy oqimingiz buni
> avtomatik bajarayotgan bo'lishi mumkin — Railway sozlamalarini tekshiring).
