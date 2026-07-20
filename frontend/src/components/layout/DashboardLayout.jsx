import { Link } from "react-router-dom";
import { Search, Bell, Settings, LogOut, HelpCircle } from "lucide-react";

export default function DashboardLayout({
  sidebarItems,
  userRole,
  userName = "SocietySync",
  children,
}) {
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                item.active
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={18} className={item.active ? "" : "opacity-80"} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 space-y-1 shrink-0 mb-4 px-4 border-t border-white/10">
          <Link
            to="#"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <HelpCircle size={18} className="opacity-80" />
            Help Center
          </Link>
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={18} className="opacity-80" />
            Logout
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fbf9f6]">
        {/* Header */}
        <header className="h-16 sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-6 shrink-0">
          {/* Search */}
          <div className="relative w-80 hidden sm:block group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search residents, tickets, plates..."
              className="w-full h-9 pl-9 pr-4 rounded-full bg-gray-100/80 border border-transparent text-sm focus:bg-white focus:border-primary/30 focus:ring-4 focus:ring-primary/10 focus:outline-none placeholder:text-gray-400 transition-all"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4 ml-auto">
            <div className="font-semibold text-sm hidden sm:block text-gray-700">{userName}</div>
            <div className="h-5 w-px bg-gray-200 mx-1 hidden sm:block"></div>
            <button className="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all">
              <Settings size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary/10 overflow-hidden border border-primary/20 ml-2 cursor-pointer ring-2 ring-transparent hover:ring-primary/30 transition-all">
              <img
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=f3f4f6"
                alt="User avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
