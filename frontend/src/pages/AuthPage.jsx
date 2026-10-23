import React from "react";
import { Link, useHistory, useLocation } from "react-router-dom";

import { api } from "../api";
import { Button, Field, Input } from "../components/ui";
import { useApp } from "../context";
import logo from "../images/logo.svg";
import { fieldErrors } from "../utils";

export const AuthPage = ({ mode }) => {
  const isSignUp = mode === "signup";
  const { setUser, toast } = useApp();
  const history = useHistory();
  const location = useLocation();
  const [form, setForm] = React.useState({ username: "", password: "" });
  const [errors, setErrors] = React.useState({});
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => setErrors({}), [mode]);

  const onChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      if (isSignUp) {
        await api.register(form.username, form.password);
      }
      await api.login(form.username, form.password);
      const me = await api.me();
      setUser(me);
      toast(isSignUp ? "Аккаунт создан. Добро пожаловать!" : `Привет, ${me.username}!`);
      const from = (location.state && location.state.from) || { pathname: "/" };
      history.replace(from);
    } catch (error) {
      const fields = fieldErrors(error);
      if (fields.non_field_errors) {
        fields.non_field_errors = "Неверное имя пользователя или пароль.";
      }
      setErrors(fields);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth">
      <div className="panel auth__card">
        <img className="auth__logo" src={logo} alt="" />
        <h1 className="auth__title">{isSignUp ? "Регистрация" : "Вход"}</h1>
        <p className="auth__hint">
          {isSignUp
            ? "Создайте аккаунт, чтобы добавлять котиков"
            : "Войдите, чтобы смотреть котиков и встречи"}
        </p>
        <form className="form-stack" onSubmit={submit} noValidate>
          <Field label="Имя пользователя" error={errors.username}>
            <Input
              name="username"
              autoComplete="username"
              value={form.username}
              onChange={onChange}
              error={errors.username}
              autoFocus
            />
          </Field>
          <Field label="Пароль" error={errors.password}>
            <Input
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={form.password}
              onChange={onChange}
              error={errors.password}
            />
          </Field>
          {errors.non_field_errors && (
            <div className="field__error">{errors.non_field_errors}</div>
          )}
          <Button type="submit" loading={loading}>
            {isSignUp ? "Зарегистрироваться" : "Войти"}
          </Button>
        </form>
        <p className="auth__switch">
          {isSignUp ? (
            <>
              Уже есть аккаунт? <Link to="/signin">Войти</Link>
            </>
          ) : (
            <>
              Ещё нет аккаунта? <Link to="/signup">Зарегистрироваться</Link>
            </>
          )}
        </p>
        {!isSignUp && (
          <div className="demo-hint">
            Тестовый вход: anna / KittyPass2026
          </div>
        )}
      </div>
    </main>
  );
};
