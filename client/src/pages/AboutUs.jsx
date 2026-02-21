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
              {t("aboutUs.owner")}
            </p>
            <p className="page-text">
              {t("aboutUs.dedication")}
            </p>
            <p className="page-text">
              {t("aboutUs.commitment")}
            </p>
            <p className="page-text page-about-chatgpt">
              <a
                href="https://chat.openai.com"
                target="_blank"
                rel="noopener noreferrer"
                className="about-chatgpt-link"
              >
                {t("aboutUs.askChatgpt")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
