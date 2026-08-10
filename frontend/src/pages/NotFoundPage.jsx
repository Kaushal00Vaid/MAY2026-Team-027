import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return <main className="min-h-screen bg-[#fbf9f6] flex items-center justify-center p-6 text-center"><div><div className="text-7xl font-extrabold text-primary/20">404</div><h1 className="text-3xl font-extrabold text-[#0f2336] mt-3">Page not found</h1><p className="text-gray-500 mt-3">The page may have moved or the address may be incorrect.</p><div className="flex justify-center gap-3 mt-7"><button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 bg-white border rounded-xl text-sm font-bold flex items-center gap-2"><ArrowLeft size={16}/>Go back</button><button type="button" onClick={() => navigate("/")} className="px-5 py-2.5 bg-[#0f2336] text-white rounded-xl text-sm font-bold flex items-center gap-2"><Home size={16}/>Home</button></div></div></main>;
}
