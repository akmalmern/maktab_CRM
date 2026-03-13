# Docker Ishga Tushirish

Loyiha uchun Docker konfiguratsiyasi development oqimini buzmasdan qo'shildi. Tarkib:

- `postgres`: lokal ma'lumotlar bazasi
- `backend`: Express + Prisma API
- `frontend`: Vite dev server

## 1. Ishga tushirish

Root papkadan:

```bash
docker compose up --build
```

Ochish manzillari:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/health`
- Backend ready: `http://localhost:5000/ready`
- PostgreSQL: `localhost:5432`

## 2. Custom env ishlatish

Kerak bo'lsa compose bilan env fayl uzatish mumkin:

```bash
docker compose --env-file .env.docker.example up --build
```

Amaliyotda alohida `.env.docker` ishlatish ma'qul. Shu namunadagi qiymatlarni o'zingizga moslang.

## 3. Foydali buyruqlar

Migratsiya qo'llash:

```bash
docker compose exec backend npx prisma migrate deploy
```

Seed ishlatish:

```bash
docker compose exec backend npm run seed:docker
```

Agar seed juda og'ir bo'lsa, yengil variant:

```bash
docker compose exec -e SEED_STUDENT_COUNT=300 -e SEED_INCLUDE_PAYROLL=false backend npm run seed:docker
```

Log ko'rish:

```bash
docker compose logs -f backend
docker compose logs -f frontend
```

To'xtatish:

```bash
docker compose down
```

DB volume bilan tozalash:

```bash
docker compose down -v
```

## 4. Muhim eslatmalar

- `uploads/` host mashinada saqlanadi, container qayta yaratilsa ham fayllar yo'qolmaydi.
- `backend` har startda `prisma migrate deploy` bajaradi. Development uchun qulay, production uchun alohida release step yaxshiroq.
- Dependency yangilanganda eski `node_modules` volume bilan konflikt bo'lsa `docker compose down -v` qilib qayta ko'taring.
- Frontend default holatda backendga Vite proxy orqali ulanadi. `VITE_API_URL` bo'sh bo'lsa brauzer so'rovlari nisbiy yo'l bilan ketadi.

## 5. Production varianti

Production uchun alohida fayl qo'shilgan:

- `docker-compose.prod.yml`
- `.env.docker.prod.example`

Bu variantda:

- frontend `nginx` orqali serve qilinadi
- `/api` va `/uploads` nginx orqali backendga proxy bo'ladi
- backend startup paytida migratsiya qilmaydi
- migratsiya alohida release step sifatida ishlaydi

### Production ishga tushirish tartibi

1. Env tayyorlang:

```bash
cp .env.docker.prod.example .env.docker.prod
```

2. Migratsiyani alohida bajaring:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod --profile ops run --rm backend-migrate
```

3. Asosiy servislarni ko'taring:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.docker.prod up --build -d
```

4. Ochish manzili:

```bash
http://localhost:8080
```

### Production foydasi

- image hajmi kichrayadi
- runtime containerda dev dependency qolmaydi
- frontend statik serve qilinadi
- release oqimi aniq bo'ladi: `migrate` va `app start` alohida
