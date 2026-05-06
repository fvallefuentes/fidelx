"use client";
import { useEffect, useState } from "react";

interface MerchantRow {
  id: string; name: string | null; email: string; plan: string;
  createdAt: string; _count: { programs: number; staff: number };
}

export default function AdminPage() {
  const [merchants, setMerchants] = useState<MerchantRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/merchants").then(r => r.json()).then(setMerchants).finally(() => setLoading(false));
  }, []);

  const PLAN_LABELS: Record<string,string> = { FREE:"Gratuit", ESSENTIAL:"Essentiel", GROWTH:"Croissance", MULTI_SITE:"Multi-sites" };

  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:320}}><div className="dx-spinner"/></div>;

  return (
    <div className="dx-page">
      <div className="dx-page-head">
        <h1 className="dx-page-title">Administration</h1>
        <p className="dx-page-sub">{merchants.length} commerçant{merchants.length!==1?"s":""} inscrits</p>
      </div>
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
              {["Nom","Email","Plan","Programmes","Staff","Inscrit le"].map(h=>(
                <th key={h} style={{padding:"12px 16px",textAlign:"left",color:"rgba(255,255,255,0.38)",fontSize:11,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {merchants.map((m,i)=>(
              <tr key={m.id} style={{borderBottom:i<merchants.length-1?"1px solid rgba(255,255,255,0.06)":undefined}}>
                <td style={{padding:"12px 16px",color:"rgba(255,255,255,0.85)",fontWeight:500}}>{m.name||"—"}</td>
                <td style={{padding:"12px 16px",color:"rgba(255,255,255,0.55)"}}>{m.email}</td>
                <td style={{padding:"12px 16px"}}><span style={{background:"rgba(212,255,78,0.1)",border:"1px solid rgba(212,255,78,0.18)",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#d4ff4e",fontWeight:600}}>{PLAN_LABELS[m.plan]??m.plan}</span></td>
                <td style={{padding:"12px 16px",color:"rgba(255,255,255,0.55)",textAlign:"center"}}>{m._count.programs}</td>
                <td style={{padding:"12px 16px",color:"rgba(255,255,255,0.55)",textAlign:"center"}}>{m._count.staff}</td>
                <td style={{padding:"12px 16px",color:"rgba(255,255,255,0.4)",fontSize:12}}>{new Date(m.createdAt).toLocaleDateString("fr-CH")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
