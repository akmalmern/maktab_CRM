# Release Health Checklist

## Pre-release
- [ ] `cd backend && npm test`
- [ ] `cd backend && npx prisma validate`
- [ ] `cd frontend && npm run lint`
- [ ] `cd frontend && npm test`
- [ ] `cd frontend && npm run i18n:check`
- [ ] `node tools/repo-baseline.mjs`

## Deploy paytida
- [ ] `npx prisma migrate deploy`
- [ ] backend container `Up`
- [ ] frontend container `Up`
- [ ] `/health` yashil
- [ ] `/ready` yashil
- [ ] monitoring token bilan `/metrics` yashil

## Business smoke
- [ ] login ishlaydi
- [ ] finance payment ishlaydi
- [ ] payroll generate ishlaydi
- [ ] payroll pay ishlaydi
- [ ] payroll reverse ishlaydi

## Release candidate sign-off
- [ ] audit log va auth eventlar yozilmoqda
- [ ] error payload `X-Error-Code` qaytaryapti
- [ ] export/summaries katta datasetda timeout bermayapti
