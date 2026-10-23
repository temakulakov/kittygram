import React from "react";

export const AppContext = React.createContext({});

export const useApp = () => React.useContext(AppContext);
