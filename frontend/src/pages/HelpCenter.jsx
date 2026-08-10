import { ArrowLeft, BookOpen, Headphones, MessageSquareText, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function HelpCenter() {
  const navigate = useNavigate();
  const { user, getRoleRedirectPath } = useAuth();
  const roles = user?.roles || [];
  const home = getRoleRedirectPath(roles);
  const supportPath = roles.some((role) => ["flat_owner", "resident_rental"].includes(role))
    ? "/resident/helpdesk"
    : roles.some((role) => ["super_admin", "admin", "committee_member"].includes(role))
      ? "/admin/helpdesk"
      : "/gate/maintenance";

  return (
    <main className="min-h-screen bg-[#fbf9f6] p-5 md:p-10">
      <div className="max-w-4xl mx-auto">
        <button type="button" onClick={() => navigate(home)} className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#0f2336]"><ArrowLeft size={16}/>Back to dashboard</button>
        <div className="mt-8"><p className="text-xs font-bold uppercase tracking-widest text-primary">SocietySync Support</p><h1 className="text-3xl font-extrabold text-[#0f2336] mt-2">How can we help?</h1><p className="text-gray-500 mt-2">Find the right workflow or contact your society support team.</p></div>
        <div className="grid md:grid-cols-3 gap-5 mt-8">
          <HelpCard icon={MessageSquareText} title="Report an issue" body="Create and track a helpdesk request with updates and attachments." action="Open Helpdesk" onClick={() => navigate(supportPath)}/>
          <HelpCard icon={BookOpen} title="Using SocietySync" body="Use the dashboard menu to access billing, visitors, amenities, and community tools."/>
          <HelpCard icon={ShieldCheck} title="Access problems" body="If your role or unit is incorrect, contact a society administrator for verification."/>
        </div>
        <div className="mt-6 bg-[#0f2336] text-white rounded-3xl p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5"><div className="flex gap-4"><Headphones className="text-primary"/><div><h2 className="font-bold">Need more help?</h2><p className="text-sm text-white/60 mt-1">Send a request through Helpdesk so it is tracked and assigned.</p></div></div><button type="button" onClick={() => navigate(supportPath)} className="px-5 py-2.5 rounded-xl bg-white text-[#0f2336] text-sm font-bold">Contact Support</button></div>
      </div>
    </main>
  );
}

function HelpCard({ icon: Icon, title, body, action, onClick }) {
  return <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6"><div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Icon size={21}/></div><h2 className="font-bold text-[#0f2336] mt-5">{title}</h2><p className="text-sm text-gray-500 mt-2 leading-relaxed">{body}</p>{action && <button type="button" onClick={onClick} className="text-sm font-bold text-primary mt-5">{action} →</button>}</section>;
}
