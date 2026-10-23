import React from "react";
import ReactDOM from "react-dom";
import { Link, Redirect, Route } from "react-router-dom";

import { getToken } from "../api";
import { colorInfo, isDark, plural } from "../utils";

export const ProtectedRoute = ({ children, ...rest }) => (
  <Route
    {...rest}
    render={({ location }) =>
      getToken() ? (
        children
      ) : (
        <Redirect to={{ pathname: "/signin", state: { from: location } }} />
      )
    }
  />
);

export const Spinner = ({ dark = false }) => (
  <span className={`spinner ${dark ? "spinner_dark" : ""}`} />
);

export const Loader = () => (
  <div className="center">
    <Spinner dark />
  </div>
);

export const Button = ({
  children,
  variant = "",
  small = false,
  loading = false,
  className = "",
  ...props
}) => (
  <button
    className={`btn ${variant ? `btn_${variant}` : ""} ${
      small ? "btn_small" : ""
    } ${className}`}
    disabled={loading || props.disabled}
    {...props}
  >
    {loading ? <Spinner dark={variant === "ghost"} /> : children}
  </button>
);

export const Field = ({ label, error, children, className = "" }) => (
  <label className={`field ${className}`}>
    {label && <span className="field__label">{label}</span>}
    {children}
    {error && <span className="field__error">{error}</span>}
  </label>
);

export const Input = ({ error, className = "", ...props }) => (
  <input
    className={`input ${error ? "input_invalid" : ""} ${className}`}
    {...props}
  />
);

export const Toggle = ({ checked, onChange, children }) => (
  <label className="toggle">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="toggle__track" />
    {children}
  </label>
);

export const ColorChip = ({ color }) => {
  const info = colorInfo(color);
  return (
    <span className="chip">
      <span className="swatch" style={{ background: info.hex }} />
      {info.title}
    </span>
  );
};

export const ColorBadge = ({ color }) => {
  const info = colorInfo(color);
  return (
    <span
      className="badge"
      style={{
        background: info.hex,
        color: isDark(info.hex) ? "#fff" : "#1f2027",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {info.title}
    </span>
  );
};

export const Empty = ({ icon = "🐾", title, children }) => (
  <div className="empty appear">
    <div className="empty__icon">{icon}</div>
    <div className="empty__title">{title}</div>
    <div>{children}</div>
  </div>
);

export const SkeletonGrid = ({ count = 8, height = 260 }) => (
  <div className="grid">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height }} />
    ))}
  </div>
);

export const Pagination = ({ count, page, pageSize = 10, onChange }) => {
  const pages = Math.ceil(count / pageSize);
  if (pages <= 1) return null;
  const go = (value) => {
    onChange(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="pagination">
      <button disabled={page === 1} onClick={() => go(page - 1)}>
        ‹
      </button>
      {Array.from({ length: pages }).map((_, i) => (
        <button
          key={i}
          className={page === i + 1 ? "current" : ""}
          disabled={page === i + 1}
          onClick={() => go(i + 1)}
        >
          {i + 1}
        </button>
      ))}
      <button disabled={page === pages} onClick={() => go(page + 1)}>
        ›
      </button>
    </div>
  );
};

export const Modal = ({ title, text, onClose, children }) => {
  React.useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__title">{title}</div>
        {text && <div className="modal__text">{text}</div>}
        {children}
      </div>
    </div>,
    document.body
  );
};

export const Confirm = ({ title, text, action, danger, onConfirm, onClose }) => {
  const [loading, setLoading] = React.useState(false);
  const confirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };
  return (
    <Modal title={title} text={text} onClose={onClose}>
      <div className="form-actions">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button
          variant={danger ? "danger" : ""}
          loading={loading}
          onClick={confirm}
        >
          {action}
        </Button>
      </div>
    </Modal>
  );
};

export const Places = ({ event }) => {
  const taken = Math.min(event.participants_count, event.capacity);
  const percent = Math.round((taken / event.capacity) * 100);
  const full = event.free_places === 0;
  return (
    <div className="places">
      <div className="places__head">
        <span>
          {event.participants_count} из {event.capacity}
        </span>
        <StatusBadge event={event} />
      </div>
      <div className="progress">
        <div
          className={`progress__bar ${full ? "progress__bar_full" : ""}`}
          style={{ width: `${Math.max(percent, 3)}%` }}
        />
      </div>
      {event.waitlist_count > 0 && (
        <div className="muted mt-8" style={{ fontSize: 13 }}>
          В листе ожидания: {event.waitlist_count}
        </div>
      )}
    </div>
  );
};

export const StatusBadge = ({ event }) => {
  if (event.is_cancelled) {
    return <span className="badge badge_danger">Отменена</span>;
  }
  if (new Date(event.starts_at) <= new Date()) {
    return <span className="badge badge_muted">Прошла</span>;
  }
  if (event.free_places === 0) {
    return <span className="badge badge_warn">Мест нет</span>;
  }
  return (
    <span className="badge badge_ok">
      {event.free_places}{" "}
      {plural(event.free_places, "место", "места", "мест")}
    </span>
  );
};

export const BackLink = ({ to, children = "Назад" }) => (
  <Link className="back" to={to}>
    ← {children}
  </Link>
);
