import { useState } from "react";
import { useLeagueData } from "./lib/useLeagueData.js";
import { BottomNav } from "./components/ui.jsx";
import HomeView from "./views/HomeView.jsx";
import SpieleView from "./views/SpieleView.jsx";
import RanglisteView from "./views/RanglisteView.jsx";
import StatistikenView from "./views/StatistikenView.jsx";
import ProfilView from "./views/ProfilView.jsx";
import AdminView from "./views/AdminView.jsx";

export default function Shell({ token, profile, onLogout }) {
  const data = useLeagueData(token);
  const [tab, setTab] = useState("home");
  const [selectedId, setSelectedId] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  // Aus Home/anderswo zu einem konkreten Spiel-Tipp springen.
  function goToTip(matchId) {
    setSelectedId(matchId);
    setAdminOpen(false);
    setTab("spiele");
  }

  function changeTab(next) {
    setAdminOpen(false);
    if (next === "spiele") setSelectedId(null); // beim Tab-Wechsel zur Liste
    setTab(next);
  }

  return (
    <div className="min-h-dvh pb-[4.75rem]">
      {adminOpen ? (
        <AdminView
          token={token}
          profile={profile}
          data={data}
          onBack={() => setAdminOpen(false)}
        />
      ) : (
        <>
          {tab === "home" && (
            <HomeView profile={profile} data={data} onTip={goToTip} onTab={changeTab} />
          )}
          {tab === "spiele" && (
            <SpieleView
              token={token}
              profile={profile}
              data={data}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
          {tab === "rangliste" && <RanglisteView data={data} />}
          {tab === "statistiken" && <StatistikenView profile={profile} data={data} />}
          {tab === "profil" && (
            <ProfilView
              profile={profile}
              data={data}
              onLogout={onLogout}
              onOpenAdmin={() => setAdminOpen(true)}
            />
          )}
        </>
      )}

      <BottomNav active={tab} onChange={changeTab} />
    </div>
  );
}
