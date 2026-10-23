import React from "react";
import { BrowserRouter, Redirect, Route, Switch } from "react-router-dom";

import { api, getToken } from "../api";
import { AppContext } from "../context";
import { AuthPage } from "../pages/AuthPage";
import { CatFormPage } from "../pages/CatFormPage";
import { CatPage } from "../pages/CatPage";
import { CatsPage } from "../pages/CatsPage";
import { EventFormPage } from "../pages/EventFormPage";
import { EventPage } from "../pages/EventPage";
import { EventsPage } from "../pages/EventsPage";
import { MyPage } from "../pages/MyPage";
import { NotFound } from "../pages/NotFound";
import { Footer, Header, Toasts } from "./layout";
import { Loader, ProtectedRoute } from "./ui";

let toastId = 0;

export default function App() {
  const [user, setUser] = React.useState(null);
  const [ready, setReady] = React.useState(!getToken());
  const [toasts, setToasts] = React.useState([]);

  const toast = React.useCallback((text, type = "ok") => {
    toastId += 1;
    const id = toastId;
    setToasts((items) => [...items, { id, text, type }]);
    setTimeout(
      () => setToasts((items) => items.filter((item) => item.id !== id)),
      3500
    );
  }, []);

  React.useEffect(() => {
    if (getToken()) {
      api
        .me()
        .then(setUser)
        .catch(() => setUser(null))
        .finally(() => setReady(true));
    }
    const onExpired = () => setUser(null);
    window.addEventListener("auth-expired", onExpired);
    return () => window.removeEventListener("auth-expired", onExpired);
  }, []);

  const context = React.useMemo(
    () => ({ user, setUser, toast }),
    [user, toast]
  );

  return (
    <AppContext.Provider value={context}>
      <BrowserRouter>
        <div className="app">
          <Header />
          {!ready ? (
            <Loader />
          ) : (
            <Switch>
              <Route path="/signin">
                {user ? <Redirect to="/" /> : <AuthPage mode="signin" />}
              </Route>
              <Route path="/signup">
                {user ? <Redirect to="/" /> : <AuthPage mode="signup" />}
              </Route>
              <ProtectedRoute exact path="/">
                <CatsPage />
              </ProtectedRoute>
              <ProtectedRoute exact path="/cats/add">
                <CatFormPage />
              </ProtectedRoute>
              <ProtectedRoute exact path="/cats/:id/edit">
                <CatFormPage />
              </ProtectedRoute>
              <ProtectedRoute exact path="/cats/:id">
                <CatPage />
              </ProtectedRoute>
              <ProtectedRoute exact path="/events">
                <EventsPage />
              </ProtectedRoute>
              <ProtectedRoute exact path="/events/new">
                <EventFormPage />
              </ProtectedRoute>
              <ProtectedRoute exact path="/events/:id/edit">
                <EventFormPage />
              </ProtectedRoute>
              <ProtectedRoute exact path="/events/:id">
                <EventPage />
              </ProtectedRoute>
              <ProtectedRoute exact path="/my">
                <MyPage />
              </ProtectedRoute>
              <Route>
                <NotFound />
              </Route>
            </Switch>
          )}
          <Footer />
          <Toasts items={toasts} />
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
