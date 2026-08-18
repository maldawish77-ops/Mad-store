# MAD Store — Production v5

نسخة إنتاج مستقلة عن Replit.

## ما تم تجهيزه
- Node.js + Express
- Neon PostgreSQL بدل SQLite المحلي
- الدفع عند الاستلام محذوف
- Moyasar للدفع الإلكتروني فقط
- الطلب يبدأ `awaiting_payment` ولا يصبح `new` إلا بعد تحقق الخادم من Moyasar
- التحقق من حالة `paid` + المبلغ + العملة قبل اعتماد الطلب
- لوحة إدارة ومنتجات وطلبات وحسابات عملاء
- Docker + Vercel configuration
- صور المنتجات الجديدة تُحفظ Data URL داخل PostgreSQL لتفادي فقدان ملفات الرفع على الاستضافات عديمة التخزين الدائم

## متغيرات الإنتاج المطلوبة
انسخ `.env.example` إلى إعدادات الاستضافة، ولا ترفع ملف `.env` إلى Git.

المطلوب:
- `DATABASE_URL`
- `ADMIN_TOKEN`
- `SESSION_SECRET`
- `PUBLIC_BASE_URL`
- `MOYASAR_PUBLISHABLE_KEY`
- `MOYASAR_SECRET_KEY`

## تشغيل Docker
```bash
docker compose up -d --build
```

## Vercel
المشروع يحتوي `vercel.json`. اربط المشروع وأضف متغيرات البيئة السابقة ثم انشره.

## ملاحظة الدفع
لن يسمح الخادم بإنشاء طلب بيع قابل للاعتماد إذا لم تكن مفاتيح Moyasar مضبوطة. لا يتم إنقاص المخزون إلا بعد التحقق الخلفي من نجاح الدفع.
