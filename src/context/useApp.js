import { useContext } from 'react';
import { AppContext } from './appContextValue.js';

export const useApp = () => useContext(AppContext);
