import { ArrowLeft, Building2, Mail, Moon, Phone, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

const roleLabel = (role) => role?.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AccountPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, getRoleRedirectPath } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const home = getRoleRedirectPath(user?.roles);
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "SocietySync User";
  const section = searchParams.get("section") === "settings" ? "settings" : "profile";

  return (
    <main className="min-h-screen bg-[#fbf9f6] dark:bg-background p-5 md:p-10 transition-colors">
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={() => navigate(home)} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#0f2336]"><ArrowLeft size={16}/>Back to dashboard</button>
        <div className="mt-8 bg-white dark:bg-card rounded-3xl border border-gray-100 dark:border-border shadow-sm overflow-hidden transition-colors">
          <div className="bg-gradient-to-br from-[#0f1a2b] to-[#1a2d48] p-8 text-white flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center"><UserRound size={30}/></div>
            <div><p className="text-xs uppercase tracking-widest text-white/50">Account</p><h1 className="text-2xl font-extrabold mt-1">{fullName}</h1></div>
          </div>
          <div className="px-7 md:px-9 pt-6 flex gap-2 border-b border-gray-100">
            <button type="button" onClick={() => setSearchParams({})} aria-pressed={section === "profile"} className={`px-4 py-3 text-sm font-bold border-b-2 ${section === "profile" ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>Profile</button>
            <button type="button" onClick={() => setSearchParams({ section: "settings" })} aria-pressed={section === "settings"} className={`px-4 py-3 text-sm font-bold border-b-2 ${section === "settings" ? "border-primary text-primary" : "border-transparent text-gray-500"}`}>Preferences</button>
          </div>
          {section === "profile" ? (
            <div className="p-7 md:p-9 grid sm:grid-cols-2 gap-5">
              <ProfileField icon={Mail} label="Email" value={user?.email || "Not provided"}/>
              <ProfileField icon={Phone} label="Phone" value={user?.phone_number || "Not provided"}/>
              <ProfileField icon={Building2} label="Unit" value={user?.flat_number || "Not assigned"}/>
              <ProfileField icon={Building2} label="Building" value={user?.building_block || "Not assigned"}/>
              <div className="sm:col-span-2 p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><ShieldCheck size={16}/>Access roles</div>
                <div className="flex flex-wrap gap-2 mt-3">{(user?.roles || []).map((role) => <span key={role} className="px-3 py-1.5 bg-white border rounded-xl text-sm font-semibold text-[#0f2336]">{roleLabel(role)}</span>)}</div>
              </div>
            </div>
          ) : (
            <div className="p-7 md:p-9">
              <div className="p-5 rounded-2xl border border-gray-100 flex items-center justify-between gap-4">
                <div><p className="font-bold text-[#0f2336]">Appearance</p><p className="text-sm text-gray-500 mt-1">Choose the theme used on this device.</p></div>
                <button type="button" onClick={toggleTheme} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200">
                  {theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}Use {theme === "dark" ? "light" : "dark"} theme
                </button>
              </div>
            </div>
          )}
        </div>
        {section === "profile" && <p className="text-xs text-gray-400 text-center mt-5">Contact society administration if your verified profile or unit assignment needs correction.</p>}
      </div>
    </main>
  );
}

function ProfileField({ icon: Icon, label, value }) {
  return <div className="p-5 rounded-2xl border border-gray-100"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><Icon size={15}/>{label}</div><p className="font-semibold text-[#0f2336] mt-2 break-words">{value}</p></div>;
}
