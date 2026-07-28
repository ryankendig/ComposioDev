import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.jsx";

Sentry.init({
  dsn: "https://3dfca827875737833085cff8d4a7cc6b@o4504964736155648.ingest.us.sentry.io/4507896984698880",
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: []
  },
});

const container = document.getElementById("app");
const root = createRoot(container);
root.render(<App />);
