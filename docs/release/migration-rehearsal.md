# Migration Rehearsal

## Maqsad
Release oldidan migration oqimi qayta-qayta bir xil natija berishini tekshirish.

## Bosqichlar
1. Staging yoki lokal production DB snapshot oling.
2. Shu snapshotdan alohida rehearsal DB yarating.
3. Migrationni rehearsal DB ga qo'llang:
```bash
cd backend
npx prisma migrate deploy
npx prisma validate
```
4. Smoke tekshiruv:
```bash
npm test
node ../tools/release-smoke.mjs
```
5. Muhim querylar:
- login
- finance student payment
- payroll generate / pay / reverse
- summary / export

## Muvaffaqiyat mezoni
- `migrate deploy` xatosiz tugashi
- schema drift bo'lmasligi
- smoke testlar yashil
- key endpointlar `5xx` qaytarmasligi

## Rehearsal logida yozib qo'yiladigan narsa
- deploy sanasi va commit SHA
- migrationlar ro'yxati
- runtime vaqti
- rollback uchun kerakli snapshot nomi
