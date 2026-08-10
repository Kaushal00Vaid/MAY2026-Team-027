import { ArrowLeft, Building2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const roleLabel = (role) => role?.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AccountPage() {
  const navigate = useNavigate();
  const { user, getRoleRedirectPath } = useAuth();
  const home = getRoleRedirectPath(user?.roles);
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "SocietySync User";

  return (
    <main className="min-h-screen bg-[#fbf9f6] p-5 md:p-10">
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={() => navigate(home)} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#0f2336]"><ArrowLeft size={16}/>Back to dashboard</button>
        <div className="mt-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-[#0f1a2b] to-[#1a2d48] p-8 text-white flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center"><UserRound size={30}/></div>
            <div><p className="text-xs uppercase tracking-widest text-white/50">Account & Profile</p><h1 className="text-2xl font-extrabold mt-1">{fullName}</h1></div>
          </div>
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
        </div>
        <p className="text-xs text-gray-400 text-center mt-5">Contact society administration if your verified profile or unit assignment needs correction.</p>
      </div>
    </main>
  );
}

function ProfileField({ icon: Icon, label, value }) {
  return <div className="p-5 rounded-2xl border border-gray-100"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400"><Icon size={15}/>{label}</div><p className="font-semibold text-[#0f2336] mt-2 break-words">{value}</p></div>;
}
