import { createContext, useContext } from 'react';
import { RequestInitWithPathPrefix } from './types';

// Represents the context object for injecting request options.
//
// Example:
//
// <ServiceContext.Provider value={options}>
//   {children}
// </ServiceContext.Provider>
//
// Where options can include `pathPrefix` or any of the options in `RequestInit`.
//
// https://microsoft.github.io/PowerBI-JavaScript/interfaces/_node_modules_typedoc_node_modules_typescript_lib_lib_dom_d_.requestinit.html
export const ServiceContext = createContext({} as RequestInitWithPathPrefix);

// useServiceContext returns the current request options from the context.
export const useServiceContext = () => {
  return useContext(ServiceContext);
};
