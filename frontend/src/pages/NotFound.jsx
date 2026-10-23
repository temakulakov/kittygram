import React from "react";
import { Link } from "react-router-dom";

import { Empty } from "../components/ui";

export const NotFound = ({ text = "Такой страницы нет." }) => (
  <main className="page">
    <div className="container">
      <Empty icon="🙀" title="Ничего не нашлось">
        {text}{" "}
        <Link to="/" style={{ color: "var(--accent)" }}>
          На главную
        </Link>
      </Empty>
    </div>
  </main>
);
