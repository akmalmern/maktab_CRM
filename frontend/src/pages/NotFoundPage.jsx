import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">404</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-900">Sahifa topilmadi</h1>
      <Link to="/" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        Dashboardga qaytish
      </Link>
    </div>
  );
}
