import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import SubNavbar from "./components/SubNavbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import SignupInvitePopup from "./components/SignupInvitePopup";
import SocialButtons from "./components/SocialButtons";
import "./styles/signup-invite-popup.css";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    const url = window.location.href;
    
    if (url.includes('success.html')) {
      alert('Payment successful! Your transaction has been completed.');
    } else if (url.includes('failed.html')) {
      alert('Payment failed! Please try again.');
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text)' }}>
      <ScrollToTop />
      <SocialButtons />
      <Navbar />
      <SubNavbar />
      <div className="subnavbar-spacer"></div>
      <div className="flex-1" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <Outlet />
      </div>
      <Footer />
      <SignupInvitePopup />
    </div>
  );
}
