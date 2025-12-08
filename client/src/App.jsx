import { Outlet } from "react-router-dom";
import { useLanguage } from "./context/LanguageContext";
import Navbar from "./components/Navbar";
import SubNavbar from "./components/SubNavbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import SocialButtons from "./components/SocialButtons";

export default function App() {
  const { isRTL } = useLanguage();

  return (
    <div className={`min-h-screen flex flex-col ${isRTL ? "rtl" : "ltr"}`} dir={isRTL ? "rtl" : "ltr"}>
      <ScrollToTop />
      <Navbar />
      <SubNavbar />
      <div className="subnavbar-spacer"></div>
      <SocialButtons />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
