import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Settings, LogOut, HelpCircle, Menu, X } from "lucide-react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import NotificationMenu from "@/features/realtime/NotificationMenu";

export default function DashboardLayout({
  sidebarItems,
  userRole,
  userName = "SocietySync",
  children,
}) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const scrollRef = useRef(null);
  const { scrollY } = useScroll({ container: scrollRef });
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const searchResults = search.trim()
    ? sidebarItems.filter((item) => item.href && item.label.toLowerCase().includes(search.trim().toLowerCase()))
    : sidebarItems.filter((item) => item.href);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  const handleLogout = async () => {
    const logoutRequest = logout();
    navigate("/signin", { replace: true });
    await logoutRequest;
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if (!search.trim()) return;
    const destination = searchResults[0];
    if (destination) {
      setSearchOpen(false);
      navigate(destination.href);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex text-[#111827]">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-gradient-to-b from-[#0f1a2b] to-[#1a2d48] text-white flex flex-col hidden md:flex border-r border-[#1a2d48]">
        {/* Brand */}
        <div className="h-20 flex items-center px-6 gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight leading-none text-white">SocietySync</div>
            <div className="text-[10px] font-medium text-white/50 tracking-widest uppercase mt-1">
              {userRole}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              to={item.href || "#"}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                item.active
                  ? "text-primary-foreground"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.active && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/20"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <item.icon size={18} className={`relative z-10 ${item.active ? "" : "opacity-80"}`} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 space-y-1 shrink-0 mb-4 px-4 border-t border-white/10">
          <Link
            to="/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <HelpCircle size={18} className="opacity-80" />
            Help Center
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={18} className="opacity-80" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile navigation drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-[#0f1a2b]/60 backdrop-blur-sm" />
          <aside id="mobile-dashboard-navigation" role="dialog" aria-modal="true" aria-label="Dashboard navigation" className="relative w-72 max-w-[85vw] h-full bg-gradient-to-b from-[#0f1a2b] to-[#1a2d48] text-white shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
              <div>
                <div className="font-bold text-lg">SocietySync</div>
                <div className="text-[10px] text-white/50 tracking-widest uppercase">{userRole}</div>
              </div>
              <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="p-2 rounded-xl text-white/70 hover:bg-white/10 hover:text-white"><X size={20}/></button>
            </div>
            <div className="px-4 pt-5">
              <label className="relative block"><span className="sr-only">Search mobile navigation</span><Search size={16} className="absolute left-3 top-3 text-white/40"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu..." className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder:text-white/40 outline-none focus:border-primary"/></label>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {searchResults.map((item) => (
                <Link key={item.label} to={item.href || "#"} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold ${item.active ? "bg-primary text-primary-foreground" : "text-white/70 hover:bg-white/5 hover:text-white"}`}>
                  <item.icon size={18}/><span>{item.label}</span>
                </Link>
              ))}
              {searchResults.length === 0 && <p className="px-3 py-4 text-sm text-white/50">No matching destination.</p>}
            </nav>
            <div className="p-4 border-t border-white/10 space-y-1">
              <Link to="/help" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 text-sm text-white/70"><HelpCircle size={18}/>Help Center</Link>
              <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-white/70"><LogOut size={18}/>Logout</button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fbf9f6] relative h-screen">
        {/* Header (Absolute position for smooth floating) */}
        <motion.header 
          animate={{
            width: scrolled ? "calc(100% - 32px)" : "100%",
            y: scrolled ? 16 : 0,
            borderRadius: scrolled ? "9999px" : "0px",
            left: scrolled ? 16 : 0,
            paddingLeft: scrolled ? "1.5rem" : "1.5rem",
            paddingRight: scrolled ? "1.5rem" : "1.5rem",
          }}
          transition={{ type: "spring", stiffness: 200, damping: 50 }}
          className={`h-16 absolute top-0 z-30 flex items-center justify-between shrink-0 mx-auto ${
            scrolled ? "bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200" : "bg-white/70 backdrop-blur-xl border-b border-gray-200/50"
          }`}
        >
          <button type="button" aria-label="Open navigation menu" aria-controls="mobile-dashboard-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="md:hidden p-2 mr-2 text-gray-500 rounded-xl hover:bg-gray-100">
            <Menu size={20}/>
          </button>
          {/* Search */}
          <form onSubmit={submitSearch} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }} className="relative w-64 lg:w-80 hidden sm:block group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search navigation..."
              aria-label="Search dashboard navigation"
              className="w-full h-9 pl-9 pr-4 rounded-full bg-gray-100/80 border border-transparent text-sm focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 focus:outline-none placeholder:text-gray-400 transition-all"
            />
            {searchOpen && (
              <div className="absolute top-11 left-0 right-0 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden py-2 z-50">
                {searchResults.length ? searchResults.slice(0, 5).map((item) => (
                  <button key={item.label} type="button" onClick={() => { setSearchOpen(false); navigate(item.href); }} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-gray-50">
                    <item.icon size={16} className="text-gray-400"/><span className="font-semibold text-gray-700">{item.label}</span>
                  </button>
                )) : <p className="px-4 py-3 text-sm text-gray-500">No matching destination.</p>}
              </div>
            )}
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="font-semibold text-sm hidden lg:block text-gray-700">{userName}</div>
            <div className="h-5 w-px bg-gray-200 mx-1 hidden lg:block"></div>
            <NotificationMenu />
            <button type="button" aria-label="Account settings" onClick={() => navigate("/account")} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all">
              <Settings size={18} />
            </button>
            <button type="button" aria-label="Open profile" onClick={() => navigate("/account")} className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden border border-primary/20 ml-2 cursor-pointer ring-2 ring-transparent hover:ring-primary/30 transition-all">
              <span className="w-full h-full flex items-center justify-center text-[10px] font-extrabold text-primary" aria-hidden="true">{userName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "SS"}</span>
            </button>
          </div>
        </motion.header>

        {/* Page Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pt-16">
          {children}
        </div>
      </main>
    </div>
  );
}
