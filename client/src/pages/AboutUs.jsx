import { useTranslation } from "react-i18next";
import "../styles/about-us.css";

export default function AboutUs() {
  const { t } = useTranslation();

  return (
    <main className="page-about-us">
      <div className="container-main">
        <h1 className="page-title">{t("aboutUs.title")}</h1>
        <div className="page-card">
          <div className="page-content">
            <p className="page-text-large">
              {t("aboutUs.welcome")}
            </p>
            <p className="page-text">
              {t("aboutUs.dedication")}
            </p>
            <p className="page-text">
              {t("aboutUs.commitment")}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
