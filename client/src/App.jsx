import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";
import SubNavbar from "./components/SubNavbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import SocialButtons from "./components/SocialButtons";
import SignupInvitePopup from "./components/SignupInvitePopup";
import "./styles/signup-invite-popup.css";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text)' }}>
      <ScrollToTop />
      <Navbar />
      <SubNavbar />
      <div className="subnavbar-spacer"></div>
      <SocialButtons />
      <div className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Outlet />
      </div>
      <Footer />
      <SignupInvitePopup />
    </div>
  );
}
