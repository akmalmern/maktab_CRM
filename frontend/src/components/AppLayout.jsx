import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout } from "../features/auth/authSlice";
import { useGetAuthMeQuery, useLogoutAuthMutation } from "../services/api/authApi";
import LanguageSwitcher from "./LanguageSwitcher";
import { Button } from "./ui";

function Icon({ path }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function resolveAssetUrl(filePath) {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://"))
    return filePath;
  const base = import.meta.env.VITE_API_URL || window.location.origin;
  return `${base}${filePath}`;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function SidebarContent({
  role,
  menuItems,
  onLogout,
  onNavigate,
  t,
  currentUser,
}) {
  const avatarUrl = resolveAssetUrl(currentUser?.avatarPath || "");
  const displayName =
    currentUser?.fullName || currentUser?.username || t("Unknown");

  return (
    <>
      <div>
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white/80 p-3 shadow-sm ring-1 ring-slate-200/60">
          <div className="h-12 w-12 overflow-hidden rounded-full border border-slate-300/80 bg-slate-100 shadow-inner">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="profile avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-600">
                {getInitials(displayName)}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {displayName}
            </p>
            <p className="truncate text-xs text-slate-500">
              @{currentUser?.username || "-"}
            </p>
          </div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {t("Maktab CRM")}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {t("Panel")}
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          {t("Rol")}: {t(`roles.${role}`, { defaultValue: role })}
        </p>
      </div>

      <nav className="mt-6 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={
              item.to === "/admin" ||
              item.to === "/teacher" ||
              item.to === "/student" ||
              item.to === "/manager"
            }
            onClick={onNavigate}
          className={({ isActive }) =>
              `flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                isActive
                  ? "border border-indigo-300/80 bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100"
                  : "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-white hover:shadow-sm"
              }`
            }
          >
            <Icon path={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 space-y-2 border-t border-slate-200/80 pt-4">
        <Button onClick={onLogout} variant="danger" className="w-full">
          {t("Logout")}
        </Button>
      </div>
    </>
  );
}

export default function AppLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAppSelector((state) => state.auth.role);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentUserQuery = useGetAuthMeQuery(undefined, { skip: !isAuthenticated });
  const [logoutAuth] = useLogoutAuthMutation();
  const currentUser = currentUserQuery.data?.user || null;

  const menuByRole = useMemo(
    () => ({
      ADMIN: [
        {
          to: "/admin",
          label: t("Dashboard"),
          icon: "M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8v-9h-8v9Zm0-11h8V3h-8v7Z",
        },
        {
          to: "/admin/teachers",
          label: t("Teachers"),
          icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M9 7a4 4 0 1 0 0 .01M18 8a3 3 0 1 1 0-6",
        },
        {
          to: "/admin/fanlar",
          label: t("Fanlar Boshqaruvi"),
          icon: "M4 6.5A2.5 2.5 0 0 1 6.5 4H20v14H6.5A2.5 2.5 0 0 0 4 20.5M4 6.5v14M8 8h8M8 12h6",
        },
        {
          to: "/admin/students",
          label: t("Students"),
          icon: "M4 19.5V17a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2.5M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
        },
        {
          to: "/admin/sinflar",
          label: t("Sinflar Boshqaruvi"),
          icon: "M3 7.5 12 3l9 4.5M5 10v8h14v-8M9 21h6",
        },
        {
          to: "/admin/dars-jadval",
          label: t("Dars Jadvali"),
          icon: "M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
        },
        {
          to: "/admin/davomat",
          label: t("Davomat"),
          icon: "M9 11.5 11.5 14 15 10.5M4 5h16v14H4zM8 3v4M16 3v4",
        },
        {
          to: "/admin/moliya",
          label: t("Moliya"),
          icon: "M3 7h18M6 4h12v6H6V4Zm-2 8h16a2 2 0 0 1 2 2v6H2v-6a2 2 0 0 1 2-2Zm6 3h4",
        },
      ],
      TEACHER: [
        {
          to: "/teacher",
          label: t("Bosh sahifa"),
          icon: "M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8v-9h-8v9Zm0-11h8V3h-8v7Z",
        },
        {
          to: "/teacher/jadval",
          label: t("Mening Jadvalim"),
          icon: "M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
        },
        {
          to: "/teacher/davomat",
          label: t("Davomat"),
          icon: "M9 11.5 11.5 14 15 10.5M4 5h16v14H4zM8 3v4M16 3v4",
        },
        {
          to: "/teacher/baholar",
          label: t("Baholar"),
          icon: "M12 3v18M3 12h18",
        },
      ],
      STUDENT: [
        {
          to: "/student",
          label: t("Bosh sahifa"),
          icon: "M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8v-9h-8v9Zm0-11h8V3h-8v7Z",
        },
        {
          to: "/student/jadval",
          label: t("Mening Jadvalim"),
          icon: "M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z",
        },
        {
          to: "/student/davomat",
          label: t("Mening Davomatim"),
          icon: "M9 11.5 11.5 14 15 10.5M4 5h16v14H4zM8 3v4M16 3v4",
        },
        {
          to: "/student/baholar",
          label: t("Mening Baholarim"),
          icon: "M12 3v18M3 12h18",
        },
      ],
      MANAGER: [
        {
          to: "/manager",
          label: t("Bosh sahifa"),
          icon: "M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8v-9h-8v9Zm0-11h8V3h-8v7Z",
        },
        {
          to: "/manager/qarzdorlar",
          label: t("Qarzdorlar"),
          icon: "M3 7h18M6 4h12v6H6V4Zm-2 8h16a2 2 0 0 1 2 2v6H2v-6a2 2 0 0 1 2-2Zm6 3h4",
        },
      ],
    }),
    [t],
  );
  const menuItems = menuByRole[role] || [];

  const labelMap = useMemo(
    () => ({
      admin: t("roles.ADMIN"),
      teacher: t("roles.TEACHER"),
      student: t("roles.STUDENT"),
      manager: t("roles.MANAGER"),
      teachers: t("Oqituvchilar"),
      fanlar: t("Fanlar Boshqaruvi"),
      students: t("Students"),
      sinflar: t("Sinflar Boshqaruvi"),
      "dars-jadval": t("Dars Jadvali"),
      davomat: t("Davomat"),
      moliya: t("Moliya"),
      baholar: t("Baholar"),
      jadval: t("Dars Jadvali"),
      qarzdorlar: t("Qarzdorlar"),
      login: t("Login"),
    }),
    [t],
  );

  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const crumbs = [
      {
        path: "/",
        label: t("Bosh sahifa"),
      },
    ];
    segments.forEach((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join("/")}`;
      const previous = segments[index - 1];
      const isIdLike = segment.length > 12 && !labelMap[segment];
      let label = labelMap[segment] || segment;
      if (index === 0) {
        label = t(`roles.${segment.toUpperCase()}`, { defaultValue: label });
      }
      if (isIdLike && (previous === "teachers" || previous === "students")) {
        label = t("Batafsil");
      }
      crumbs.push({ path, label });
    });
    if (!segments.length) return [{ path: "/", label: t("Bosh sahifa") }];
    return crumbs;
  }, [labelMap, location.pathname, t]);

  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || t("Panel");

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [sidebarOpen]);

  async function handleLogout() {
    try {
      await logoutAuth().unwrap();
    } catch {
      // intentionally ignored
    }

    dispatch(logout());
    toast.info(t("Tizimdan chiqdingiz"));
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="mx-auto flex w-full max-w-[1680px] gap-4 px-2 py-2 lg:px-4 lg:py-4">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_10px_36px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/50 backdrop-blur lg:block">
          <div className="h-full overflow-y-auto pr-1">
            <SidebarContent
              role={role}
              menuItems={menuItems}
              onLogout={handleLogout}
              t={t}
              currentUser={currentUser}
            />
          </div>
        </aside>

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200/80 bg-white/95 p-5 shadow-2xl backdrop-blur transition-transform lg:hidden ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-hidden={!sidebarOpen}
        >
          <div className="h-full overflow-y-auto pr-1">
            <SidebarContent
              role={role}
              menuItems={menuItems}
              onLogout={handleLogout}
              onNavigate={() => setSidebarOpen(false)}
              t={t}
              currentUser={currentUser}
            />
          </div>
        </aside>

        <main className="w-full p-2 lg:p-0">
          <header className="mb-4 rounded-3xl border border-slate-200/90 bg-white/90 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-200/50 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2 lg:hidden">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSidebarOpen(true)}
                    aria-label={t("Menu")}
                  >
                    <HamburgerIcon />
                  </Button>
                </div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                    {pageTitle}
                  </h2>
                  <nav
                    className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
                    aria-label="Breadcrumb"
                  >
                  {breadcrumbs.map((crumb, index) => (
                    <span
                      key={crumb.path}
                      className="inline-flex items-center gap-1"
                    >
                      {index > 0 && <span>/</span>}
                      {index === breadcrumbs.length - 1 ? (
                        <span className="font-medium text-slate-700">
                          {crumb.label}
                        </span>
                      ) : (
                        <Link
                          to={crumb.path}
                          className="rounded-md px-1.5 py-0.5 hover:bg-slate-100 hover:text-slate-800"
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </span>
                  ))}
                </nav>
              </div>
               <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 px-2 py-1 shadow-sm ring-1 ring-slate-200/60 sm:w-auto">
                 <LanguageSwitcher compact />
               </div>
             </div>
           </header>
          <div className="space-y-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
