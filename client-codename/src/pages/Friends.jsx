import React from "react";
import FriendSearch from "../components/FriendsComps/FriendSearch";
import FriendsPendingRequests from "../components/FriendsComps/FriendsPendingRequests";
import FriendsList from "../components/FriendsComps/FriendsList";
import BackgroundImage from "../components/UI/BackgroundImage";
import Header from "../components/UI/Header";
import Footer from "../components/UI/Footer";
import codenamesImage from "../assets/codename.png";

const HEADER_HEIGHT = 64; // px, adjust if needed
const FOOTER_HEIGHT = 40; // px, adjust if needed

const Friends = () => {
  return (
    <div className="flex flex-col h-screen relative overflow-hidden">
      <Header />
      <BackgroundImage image={codenamesImage} />

      <main
        className="relative z-10 flex-1 min-h-0 flex flex-col px-4 pt-8 pb-4 text-white"
        dir="rtl"
        style={{
          maxHeight: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT}px)`
        }}
      >
        <div className="text-center mb-4">
          <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 drop-shadow-lg">
            ניהול חברים
          </h1>
        </div>
        {/* חיפוש שחקנים - בר עליון */}
        <div className="max-w-xl mx-auto w-full mb-6">
          <FriendSearch />
        </div>
        {/* גריד 2 עמודות: בקשות/הזמנות + רשימת חברים */}
        <div
          className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full"
          style={{ maxHeight: `calc(100vh - ${HEADER_HEIGHT + FOOTER_HEIGHT + 120}px)` }}
        >
          {/* בקשות/הזמנות */}
          <div className="md:col-span-1 flex flex-col h-full overflow-y-auto max-h-full">
            <div className="bg-white bg-opacity-80 rounded-2xl shadow p-4 h-full flex flex-col overflow-y-auto max-h-full">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-center">
                <span className="ml-2">⏳</span> בקשות והזמנות
              </h2>
              <div className="flex-1 overflow-y-auto min-h-0">
                <FriendsPendingRequests />
              </div>
            </div>
          </div>
          {/* רשימת חברים */}
          <div className="md:col-span-2 flex flex-col h-full overflow-y-auto max-h-full">
            <div className="bg-white bg-opacity-80 rounded-2xl shadow p-4 h-full flex flex-col overflow-y-auto max-h-full">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-center">
                <span className="ml-2">🧑‍🤝‍🧑</span> רשימת חברים קיימים
              </h2>
              <div className="flex-1 overflow-y-auto min-h-0">
                <FriendsList />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Friends;
