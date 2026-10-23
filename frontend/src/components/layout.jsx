import React from "react";
import { Link, NavLink, useHistory } from "react-router-dom";

import { api } from "../api";
import { useApp } from "../context";
import logo from "../images/logo.svg";
import logoutIcon from "../images/logout.svg";
import { Button } from "./ui";

export const Header = () => {
  const { user, setUser, toast } = useApp();
  const history = useHistory();

  const logout = async () => {
    await api.logout().catch(() => null);
    setUser(null);
    toast("Вы вышли из аккаунта");
    history.push("/signin");
  };

  return (
    <header className="header">
      <div className="container header__inner">
        <Link className="logo" to="/">
          <img src={logo} alt="" />
          <span>Kittygram</span>
        </Link>
        {user && (
          <nav className="nav">
            <NavLink
              exact
              to="/"
              className="nav__link"
              activeClassName="nav__link_active"
              isActive={(match, location) =>
                location.pathname === "/" ||
                location.pathname.startsWith("/cats")
              }
            >
              Котики
            </NavLink>
            <NavLink
              to="/events"
              className="nav__link"
              activeClassName="nav__link_active"
            >
              Встречи
            </NavLink>
            <NavLink
              to="/my"
              className="nav__link"
              activeClassName="nav__link_active"
            >
              Мои записи
            </NavLink>
          </nav>
        )}
        {user && (
          <div className="header__user">
            <span className="avatar">{user.username[0]}</span>
            <span className="username">{user.username}</span>
            <Button
              variant="ghost"
              className="btn_icon"
              title="Выйти"
              onClick={logout}
            >
              <img src={logoutIcon} alt="Выйти" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export const Footer = () => (
  <footer className="footer">
    <div className="container footer__inner" style={{ padding: "18px 24px" }}>
      <span>Kittygram {new Date().getFullYear()}</span>
      <span>
        <a href="/api/docs/">Документация API</a> ·{" "}
        <a href="https://github.com/temakulakov/kittygram">GitHub</a>
      </span>
    </div>
  </footer>
);

export const Toasts = ({ items }) => (
  <div className="toasts">
    {items.map((item) => (
      <div
        key={item.id}
        className={`toast ${item.type === "error" ? "toast_error" : ""}`}
      >
        <span className="toast__dot" />
        {item.text}
      </div>
    ))}
  </div>
);
